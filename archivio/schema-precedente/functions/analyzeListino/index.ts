/**
 * analyzeListino
 * Analizza un listino prezzi (PDF/immagine) con OpenAI Vision, estrae i prodotti,
 * salva i prodotti su DB, e in background genera immagini con gpt-image-1 per i
 * primi 3 prodotti aggiornando il loro image_url.
 *
 * Chiamata dal frontend: api.functions.invoke('analyzeListino', { file_url, company_id })
 * Richiede env: OPENAI_API_KEY
 *
 * Gestione formati input:
 *  - Immagini (PNG/JPEG/GIF/WEBP): inviate come image_url direttamente al modello
 *    (OpenAI scarica dal public bucket, no doppio upload).
 *  - PDF: caricati prima su OpenAI Files API (purpose: 'user_data'), poi referenziati
 *    nel messaggio con content type 'file'. Il path image_url di Chat Completions
 *    NON accetta PDF (errore invalid_image_format).
 *
 * Image generation:
 *  - Model: gpt-image-1 (dall-e-3 deprecato da OpenAI 2025).
 *  - Restituisce b64_json (non URL), che decodifichiamo e ricarichiamo su
 *    Supabase Storage (bucket public-assets, folder products/ai/) per avere
 *    URL permanenti — gli URL Azure di dall-e-3 scadevano dopo 1h.
 *  - Solo primi 3 prodotti per contenere i costi (~$0.042 cad medium quality).
 *  - Esecuzione in background via EdgeRuntime.waitUntil: la response al client
 *    parte appena i prodotti sono salvati nel DB, le immagini arrivano dopo.
 */
import { corsHeaders, supabase, getUserFromRequest } from '../_shared/supabase.ts';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_FILES_URL = 'https://api.openai.com/v1/files';
const IMAGE_GEN_URL = 'https://api.openai.com/v1/images/generations';

interface ProductDraft {
  name: string;
  description?: string;
  price: number;
  unit?: string;
  category?: string;
  image_url?: string;
}

/**
 * Determina se l'URL punta a un PDF. Controlla prima l'estensione (più affidabile
 * per i nostri URL Supabase Storage), poi come fallback un HEAD per il content-type.
 */
async function isPdfUrl(url: string): Promise<boolean> {
  const pathname = new URL(url).pathname.toLowerCase();
  if (pathname.endsWith('.pdf')) return true;
  if (/\.(png|jpe?g|gif|webp)$/.test(pathname)) return false;
  // Estensione ignota → controlla Content-Type
  try {
    const headResp = await fetch(url, { method: 'HEAD' });
    const ct = headResp.headers.get('content-type') ?? '';
    return ct.includes('application/pdf');
  } catch {
    return false;
  }
}

/**
 * Scarica il file dallo storage pubblico Supabase e lo carica su OpenAI Files API.
 * Ritorna il file_id da usare nel messaggio di Chat Completions con type: 'file'.
 */
async function uploadFileToOpenAI(fileUrl: string, apiKey: string): Promise<string> {
  const fileResp = await fetch(fileUrl);
  if (!fileResp.ok) throw new Error(`Storage download failed (${fileResp.status})`);
  const blob = await fileResp.blob();
  const filename = (new URL(fileUrl).pathname.split('/').pop() || 'listino.pdf').split('?')[0];

  const form = new FormData();
  form.append('file', blob, filename);
  form.append('purpose', 'user_data');

  const uploadResp = await fetch(OPENAI_FILES_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: form,
  });

  if (!uploadResp.ok) {
    const errText = await uploadResp.text();
    throw new Error(`OpenAI Files upload failed (${uploadResp.status}): ${errText}`);
  }
  const data = await uploadResp.json();
  if (!data?.id) throw new Error('OpenAI Files API: nessun file_id nella risposta');
  return data.id as string;
}

/**
 * Best-effort: cancella il file su OpenAI dopo l'analisi per non lasciarli accumulati.
 * Se fallisce, non blocchiamo il flusso.
 */
async function deleteOpenAIFile(fileId: string, apiKey: string): Promise<void> {
  try {
    await fetch(`${OPENAI_FILES_URL}/${fileId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
  } catch {
    /* ignored */
  }
}

/**
 * Genera un'immagine prodotto con OpenAI gpt-image-1, la scarica come base64,
 * la carica su Supabase Storage e ritorna l'URL pubblico permanente.
 *
 * Differenze chiave rispetto al deprecato dall-e-3:
 *  - model: 'gpt-image-1' (dall-e-3 dismesso da OpenAI)
 *  - response: b64_json (non url temporaneo Azure che scadeva dopo 1h)
 *  - quality enum: low/medium/high/auto (non standard/hd come dall-e-3)
 */
async function generateProductImage(productName: string, category: string, apiKey: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    console.log(`[generateProductImage] calling gpt-image-1 for "${productName}" (${category})`);
    const resp = await fetch(IMAGE_GEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: `Professional food photography of "${productName}", Italian artisan product, ${category}, on a rustic wooden table with natural light, clean background, high quality, appetizing`,
        n: 1,
        size: '1024x1024',
        quality: 'medium',
      }),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.log(`[generateProductImage] image-gen FAILED ${resp.status} for "${productName}": ${errText}`);
      return null;
    }
    const data = await resp.json();
    const b64 = data?.data?.[0]?.b64_json as string | undefined;
    if (!b64) {
      console.log(`[generateProductImage] no b64_json in response for "${productName}":`, JSON.stringify(data).slice(0, 300));
      return null;
    }

    // Decode base64 PNG → Uint8Array
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    // Upload su Supabase Storage (bucket public-assets, folder products/ai)
    const fileName = `products/ai/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const { error: uploadErr } = await supabase.storage
      .from('public-assets')
      .upload(fileName, bytes, { contentType: 'image/png', upsert: false });
    if (uploadErr) {
      console.log(`[generateProductImage] storage upload FAILED for "${productName}": ${uploadErr.message}`);
      return null;
    }

    const { data: pub } = supabase.storage.from('public-assets').getPublicUrl(fileName);
    const publicUrl = pub?.publicUrl;
    if (!publicUrl) {
      console.log(`[generateProductImage] no public URL after upload for "${productName}"`);
      return null;
    }

    console.log(`[generateProductImage] OK "${productName}" → ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[generateProductImage] THREW for "${productName}": ${msg}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    // H4 — Restrict to producer role only
    const userRole = (user as { role?: string }).role;
    if (userRole !== 'producer' && userRole !== 'admin') {
      return Response.json({ error: 'Forbidden: solo i produttori possono usare analyzeListino' }, { status: 403, headers: corsHeaders });
    }

    // H4 — Rate limit: max 5 calls per 24h per user
    const dayStart = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
    const { count: callCount } = await supabase
      .from('api_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('endpoint', 'analyzeListino')
      .gte('called_at', dayStart);

    if ((callCount ?? 0) >= 5) {
      return Response.json({ error: 'Limite giornaliero raggiunto (5 analisi/giorno). Riprova domani.' }, { status: 429, headers: corsHeaders });
    }
    await supabase.from('api_rate_limits').insert({ user_id: user.id, endpoint: 'analyzeListino' });

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500, headers: corsHeaders });
    }

    const { file_url, company_id } = await req.json();
    if (!file_url || !company_id) {
      return Response.json({ error: 'file_url e company_id richiesti' }, { status: 400, headers: corsHeaders });
    }

    // Step 0: determina formato e prepara il content per OpenAI.
    // Per PDF: serve passare dalla Files API (Chat Completions image_url accetta solo PNG/JPEG/GIF/WEBP).
    const pdf = await isPdfUrl(file_url);
    let openAIFileId: string | null = null;
    const promptText = `Analizza questo listino prezzi e estrai tutti i prodotti presenti.
Per ogni prodotto restituisci:
- name: nome del prodotto
- description: breve descrizione (opzionale)
- price: prezzo numerico in euro
- unit: unità di misura tra ["kg", "lt", "pz", "confezione"]
- category: categoria tra ["frutta", "verdura", "formaggi", "salumi", "olio", "vino", "miele", "pane_pasta", "conserve", "altro"]`;

    let userContent: unknown[];
    if (pdf) {
      try {
        openAIFileId = await uploadFileToOpenAI(file_url, apiKey);
      } catch (err) {
        return Response.json({ error: `Upload PDF a OpenAI fallito: ${err instanceof Error ? err.message : String(err)}` }, { status: 422, headers: corsHeaders });
      }
      userContent = [
        { type: 'text', text: promptText },
        { type: 'file', file: { file_id: openAIFileId } },
      ];
    } else {
      userContent = [
        { type: 'text', text: promptText },
        { type: 'image_url', image_url: { url: file_url, detail: 'high' } },
      ];
    }

    // Step 1: Extract products with OpenAI (Vision per immagini, file_id per PDF)
    const extractResp = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: userContent }],
        temperature: 0.1,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'listino',
            schema: {
              type: 'object',
              properties: {
                products: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      description: { type: 'string' },
                      price: { type: 'number' },
                      unit: { type: 'string', enum: ['kg', 'lt', 'pz', 'confezione'] },
                      category: { type: 'string' },
                    },
                    required: ['name', 'price'],
                  },
                },
              },
            },
            strict: false,
          },
        },
      }),
    });

    if (!extractResp.ok) {
      if (openAIFileId) await deleteOpenAIFile(openAIFileId, apiKey);
      return Response.json({ error: `OpenAI Vision error: ${await extractResp.text()}` }, { status: 422, headers: corsHeaders });
    }

    const extractData = await extractResp.json();
    let products: ProductDraft[] = [];
    try {
      products = JSON.parse(extractData.choices?.[0]?.message?.content ?? '{}').products ?? [];
    } catch { /* empty */ }

    // Il file PDF su OpenAI non serve più dopo l'estrazione (best-effort cleanup)
    if (openAIFileId) await deleteOpenAIFile(openAIFileId, apiKey);

    if (!products.length) {
      return Response.json({ error: 'Nessun prodotto trovato nel file' }, { status: 422, headers: corsHeaders });
    }

    // Step 2: SAVE FIRST — i prodotti vengono salvati subito SENZA immagine.
    // Così se DALL-E poi fallisce/timeout, i prodotti restano in DB (no perdita di lavoro).
    console.log(`[analyzeListino] ${products.length} products extracted, saving to DB before image generation`);
    const created: Array<{ id: string; name: string; category: string }> = [];
    for (const prod of products) {
      const { data: saved, error } = await supabase.from('products').insert({
        name: prod.name,
        description: prod.description || '',
        price: prod.price || 0,
        unit: prod.unit || 'pz',
        category: prod.category || 'altro',
        image_url: '',
        company_id,
        available: true,
      }).select('id, name, category').single();
      if (error) console.log(`[analyzeListino] insert FAILED for "${prod.name}": ${error.message}`);
      else if (saved) created.push(saved as { id: string; name: string; category: string });
    }
    console.log(`[analyzeListino] saved ${created.length}/${products.length} products to DB`);

    // Step 3: DALL-E in background per i primi 3, aggiornando image_url su DB man mano.
    // Usa EdgeRuntime.waitUntil quando disponibile per tenere viva la function dopo la
    // risposta. Fallback fire-and-forget per ambienti senza waitUntil (test locali).
    const toImage = created.slice(0, 3);
    if (toImage.length > 0) {
      const bgJob = (async () => {
        console.log(`[analyzeListino] [bg] starting DALL-E for ${toImage.length} products`);
        await Promise.all(toImage.map(async (p) => {
          const url = await generateProductImage(p.name, p.category ?? 'altro', apiKey);
          if (!url) {
            console.log(`[analyzeListino] [bg] no url for "${p.name}", skip update`);
            return;
          }
          const { error: updErr } = await supabase
            .from('products')
            .update({ image_url: url })
            .eq('id', p.id);
          if (updErr) console.log(`[analyzeListino] [bg] DB update failed for "${p.name}": ${updErr.message}`);
          else console.log(`[analyzeListino] [bg] DB updated image_url for "${p.name}"`);
        }));
        console.log(`[analyzeListino] [bg] DALL-E pass completed`);
      })();

      try {
        // @ts-ignore — EdgeRuntime è globale su Supabase Edge Runtime
        if (typeof EdgeRuntime !== 'undefined' && typeof EdgeRuntime.waitUntil === 'function') {
          // @ts-ignore
          EdgeRuntime.waitUntil(bgJob);
        } else {
          // Fallback: cattura unhandled rejection
          bgJob.catch((e) => console.log('[analyzeListino] [bg] unhandled', e));
        }
      } catch (e) {
        console.log('[analyzeListino] [bg] schedule error', e);
      }
    }

    return Response.json({ count: created.length, products: created, images_in_background: toImage.length }, { headers: corsHeaders });
  } catch (err: unknown) {
    console.error('[analyzeListino]', err instanceof Error ? err.message : String(err));
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
});
