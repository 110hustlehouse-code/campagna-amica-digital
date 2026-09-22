/**
 * verify-reseller-password
 *
 * Verifica la password di un rivenditore e, se corretta, restituisce
 * direttamente i prodotti dell'azienda con i prezzi del listino
 * corrispondente. Unico punto dell'app che può leggere
 * reseller_passwords e product_reseller_prices per conto di terzi —
 * lo fa con la service role, mai esponendo le righe al client.
 *
 * Nota: a differenza delle altre Edge Function, questa è
 * autosufficiente (nessun import da _shared/) perché il deploy da
 * dashboard Supabase bundlea un solo file, senza la cartella
 * condivisa. Se in futuro il deploy da CLI torna a funzionare, va
 * bene comunque così: è solo più verbosa, non è un problema.
 *
 * Body: { company_id: string, password: string }
 * Response: { success: boolean, pricelist_id?, label?, products?: [...] }
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

const MAX_ATTEMPTS = 8;
const WINDOW_MINUTES = 15;

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { company_id, password } = body ?? {};

    if (!company_id || !password) {
      return Response.json({ error: 'company_id e password sono obbligatori' }, { status: 400, headers: corsHeaders });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
    const { count: attemptCount } = await supabase
      .from('reseller_login_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company_id)
      .eq('ip_address', ip)
      .gte('attempted_at', windowStart);

    if ((attemptCount ?? 0) >= MAX_ATTEMPTS) {
      return Response.json(
        { error: 'Troppi tentativi. Riprova tra qualche minuto.' },
        { status: 429, headers: corsHeaders },
      );
    }

    await supabase.from('reseller_login_attempts').insert({ company_id, ip_address: ip });

    const { data: candidates } = await supabase
      .from('reseller_passwords')
      .select('id, pricelist_id, label, password_salt, password_hash')
      .eq('company_id', company_id)
      .is('revoked_at', null);

    let matched: { pricelist_id: number; label: string | null } | null = null;
    for (const c of candidates ?? []) {
      const computed = await sha256Hex(c.password_salt + password);
      if (computed === c.password_hash) {
        matched = { pricelist_id: c.pricelist_id, label: c.label };
        break;
      }
    }

    if (!matched) {
      return Response.json({ success: false }, { headers: corsHeaders });
    }

    const { data: products } = await supabase
      .from('products')
      .select('id, name, description, unit, image_url, category, available, code, ingredients, box_configs, vat_rate, contains_gluten, contains_crustaceans, contains_eggs, contains_fish, contains_peanuts, contains_soy, contains_milk, contains_nuts, contains_celery, contains_mustard, contains_sesame, contains_sulphites, contains_lupin, contains_molluscs')
      .eq('company_id', company_id)
      .eq('available', true);

    const productIds = (products ?? []).map((p) => p.id);

    const { data: prices } = await supabase
      .from('product_reseller_prices')
      .select('product_id, price')
      .in('product_id', productIds.length ? productIds : ['00000000-0000-0000-0000-000000000000'])
      .eq('pricelist_id', matched.pricelist_id);

    const priceByProduct = new Map((prices ?? []).map((p) => [p.product_id, Number(p.price)]));

    const merged = (products ?? [])
      .filter((p) => priceByProduct.has(p.id))
      .map((p) => ({ ...p, reseller_price: priceByProduct.get(p.id) }));

    return Response.json(
      { success: true, pricelist_id: matched.pricelist_id, label: matched.label, products: merged },
      { headers: corsHeaders },
    );
  } catch (err: unknown) {
    console.error('[verify-reseller-password]', err instanceof Error ? err.message : String(err));
    return Response.json({ error: 'Errore interno' }, { status: 500, headers: corsHeaders });
  }
});