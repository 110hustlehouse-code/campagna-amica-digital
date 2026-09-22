/**
 * checkSeasonalityAndNotify
 * Quando un prodotto viene reso disponibile, verifica se contiene ingredienti
 * fuori stagione e notifica lo staff.
 *
 * Triggered from DB webhook on INSERT/UPDATE to public.products (available = true).
 * Richiede env: OPENAI_API_KEY
 */
import { corsHeaders, supabase, bulkCreateNotifications, validateWebhookSecret } from '../_shared/supabase.ts';

// Dati stagionali italiani (mese 0 = gennaio, 11 = dicembre)
const SEASONAL_DATA = [
  { name: 'peperoni', months: [6, 7, 8, 9] },
  { name: 'pomodori', months: [5, 6, 7, 8, 9] },
  { name: 'pomodorini', months: [5, 6, 7, 8, 9] },
  { name: 'melanzane', months: [6, 7, 8, 9] },
  { name: 'zucchine', months: [4, 5, 6, 7, 8, 9] },
  { name: 'cetrioli', months: [5, 6, 7, 8] },
  { name: 'fagiolini', months: [5, 6, 7, 8] },
  { name: 'fragole', months: [3, 4, 5] },
  { name: 'ciliegie', months: [4, 5, 6] },
  { name: 'albicocche', months: [5, 6] },
  { name: 'pesche', months: [6, 7, 8] },
  { name: 'nettarine', months: [6, 7, 8] },
  { name: 'melone', months: [6, 7, 8] },
  { name: 'anguria', months: [6, 7, 8] },
  { name: 'cocomero', months: [6, 7, 8] },
  { name: 'fichi', months: [7, 8, 9] },
  { name: 'uva', months: [8, 9, 10] },
  { name: 'melograno', months: [9, 10, 11] },
  { name: 'castagne', months: [9, 10] },
  { name: 'prugne', months: [7, 8, 9] },
  { name: 'susine', months: [6, 7, 8] },
  { name: 'arance', months: [0, 1, 2, 11] },
  { name: 'mandarini', months: [0, 1, 11] },
  { name: 'clementine', months: [0, 1, 10, 11] },
  { name: 'limoni', months: [0, 1, 2, 3, 11] },
  { name: 'kiwi', months: [0, 1, 2, 3, 11] },
  { name: 'bergamotto', months: [0, 1, 2, 11] },
  { name: 'pere', months: [0, 1, 7, 8, 9, 10, 11] },
  { name: 'mele', months: [0, 1, 2, 8, 9, 10, 11] },
  { name: 'noci', months: [9, 10, 11] },
  { name: 'nocciole', months: [8, 9, 10] },
  { name: 'mandorle', months: [7, 8, 9] },
  { name: 'spinaci', months: [0, 1, 2, 3, 9, 10, 11] },
  { name: 'cavolo nero', months: [0, 1, 2, 10, 11] },
  { name: 'verza', months: [0, 1, 2, 10, 11] },
  { name: 'finocchi', months: [0, 1, 2, 11] },
  { name: 'porri', months: [0, 1, 2, 9, 10, 11] },
  { name: 'carciofi', months: [1, 2, 3, 4, 9, 10, 11] },
  { name: 'asparagi', months: [2, 3, 4, 5] },
  { name: 'piselli', months: [3, 4, 5] },
  { name: 'fave', months: [3, 4, 5] },
  { name: 'ravanelli', months: [3, 4, 5, 9, 10] },
  { name: 'lattuga', months: [3, 4, 5, 6, 7, 8, 9] },
  { name: 'rucola', months: [3, 4, 5, 6, 7, 8, 9] },
  { name: 'zucca', months: [9, 10, 11] },
  { name: 'broccoli', months: [9, 10, 11, 0, 1, 2] },
  { name: 'cavolfiore', months: [9, 10, 11, 0, 1, 2] },
  { name: 'radicchio', months: [9, 10, 11, 0, 1, 2] },
  { name: 'barbabietole', months: [8, 9, 10, 11] },
  { name: 'cipolle', months: [5, 6, 7, 8, 9, 10] },
  { name: 'aglio', months: [4, 5, 6, 7] },
  { name: 'cime di rapa', months: [0, 1, 2, 3, 10, 11] },
  { name: 'cicoria', months: [0, 1, 2, 3, 10, 11] },
  { name: 'puntarelle', months: [0, 1, 2, 10, 11] },
  { name: 'topinambur', months: [10, 11, 0, 1, 2] },
  { name: 'funghi porcini', months: [8, 9, 10] },
  { name: 'funghi', months: [8, 9, 10] },
  { name: 'basilico', months: [4, 5, 6, 7, 8, 9] },
  { name: 'origano', months: [5, 6, 7, 8] },
  { name: 'peperoncino', months: [7, 8, 9] },
  { name: 'fagioli borlotti', months: [7, 8, 9] },
  { name: 'fagioli', months: [7, 8, 9] },
];

const MONTH_NAMES = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // C4 — only pg_net DB triggers may call this function
  if (!validateWebhookSecret(req)) {
    return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500, headers: corsHeaders });
    }

    const body = await req.json();
    // Support DB webhook (record) and direct call (data or body itself)
    const product = body.record ?? body.data ?? body;
    const productId = body.record?.id ?? body.event?.entity_id ?? product?.id;

    if (!product?.name) {
      return Response.json({ skipped: true, reason: 'No product name' }, { headers: corsHeaders });
    }

    if (!product.available) {
      return Response.json({ skipped: true, reason: 'Product not available' }, { headers: corsHeaders });
    }

    const currentMonth = new Date().getMonth();

    // Step 1: Use LLM to identify seasonal ingredients
    const llmResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Sei un esperto di cucina italiana e stagionalità dei prodotti.
Analizza il nome e la descrizione di questo prodotto alimentare e identifica TUTTI gli ingredienti o componenti che potrebbero essere prodotti stagionali (frutta, verdura, erbe aromatiche) italiani.

Prodotto: "${product.name}"
Descrizione: "${product.description || ''}"

Rispondi con una lista JSON di ingredienti stagionali riconosciuti (in italiano, al singolare o plurale, in minuscolo).
Considera anche ingredienti impliciti: es. "pizza margherita" → pomodori, basilico; "pesto" → basilico; "caponata" → melanzane, pomodori.
Se non ci sono ingredienti stagionali, restituisci lista vuota.`,
        }],
        temperature: 0.1,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'ingredients',
            schema: {
              type: 'object',
              properties: {
                ingredients: { type: 'array', items: { type: 'string' } },
              },
            },
            strict: false,
          },
        },
      }),
    });

    if (!llmResp.ok) {
      return Response.json({ skipped: true, reason: 'LLM error' }, { headers: corsHeaders });
    }
    const llmData = await llmResp.json();
    let detectedIngredients: string[] = [];
    try {
      detectedIngredients = JSON.parse(llmData.choices?.[0]?.message?.content ?? '{}').ingredients ?? [];
    } catch { /* keep empty */ }

    if (detectedIngredients.length === 0) {
      return Response.json({ skipped: true, reason: 'No seasonal ingredients detected' }, { headers: corsHeaders });
    }

    // Step 2: Find out-of-season ingredients
    const outOfSeason: Array<{ name: string; seasonalMonths: string }> = [];
    for (const ingredient of detectedIngredients) {
      const norm = ingredient.toLowerCase().trim();
      const match = SEASONAL_DATA.find(sp => norm.includes(sp.name) || sp.name.includes(norm));
      if (match && !match.months.includes(currentMonth)) {
        outOfSeason.push({
          name: ingredient,
          seasonalMonths: match.months.map(m => MONTH_NAMES[m]).join(', '),
        });
      }
    }

    if (outOfSeason.length === 0) {
      return Response.json({ skipped: true, reason: 'All ingredients in season' }, { headers: corsHeaders });
    }

    // Step 3: Verify company is a registered producer
    if (!product.company_id) {
      return Response.json({ skipped: true, reason: 'No company_id on product' }, { headers: corsHeaders });
    }

    const { data: company } = await supabase
      .from('companies')
      .select('name, is_registered')
      .eq('id', product.company_id)
      .single();

    if (!company) return Response.json({ skipped: true, reason: 'Company not found' }, { headers: corsHeaders });
    if (!company.is_registered) return Response.json({ skipped: true, reason: 'Company not registered' }, { headers: corsHeaders });

    // Step 4: Get active staff members
    const { data: staffMembers } = await supabase
      .from('staff_members')
      .select('email, user_id')
      .eq('is_active', true);

    if (!staffMembers?.length) {
      return Response.json({ notified: false, reason: 'No active staff' }, { headers: corsHeaders });
    }

    // Step 5: Build + send notifications
    const ingredientsList = outOfSeason.map(i => `${i.name} (stagione: ${i.seasonalMonths})`).join(', ');
    const title = `⚠️ Prodotto fuori stagione: ${product.name}`;
    const message = `Il produttore "${company.name}" ha reso disponibile "${product.name}" che contiene ingredienti fuori stagione a ${MONTH_NAMES[currentMonth]}: ${ingredientsList}.`;

    await bulkCreateNotifications(
      staffMembers.map((s: { email: string; user_id?: string }) => ({
        user_email: s.email,
        user_id: s.user_id ?? undefined,
        title,
        message,
        type: 'generic' as const,
        company_id: product.company_id ?? null,
        product_id: productId ?? null,
      }))
    );

    return Response.json({
      notified: true,
      staffCount: staffMembers.length,
      outOfSeasonIngredients: outOfSeason,
      productName: product.name,
    }, { headers: corsHeaders });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
});
