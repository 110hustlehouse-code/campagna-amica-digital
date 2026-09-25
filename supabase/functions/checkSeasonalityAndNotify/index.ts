/**
 * checkSeasonalityAndNotify
 * Quando un DDT viene emesso, controlla le righe corrispondenti a
 * prodotti freschi (frutta/verdura) e segnala allo staff quelle
 * fuori stagione. Deterministico, nessuna chiamata AI.
 *
 * Triggered da DB trigger su public.delivery_notes (status -> 'issued').
 * Self-contained: nessun import da _shared (deploy da Dashboard).
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

function validateWebhookSecret(req: Request): boolean {
  const secret = Deno.env.get('WEBHOOK_SHARED_SECRET');
  if (!secret) {
    console.warn('[validateWebhookSecret] WEBHOOK_SHARED_SECRET not set — denying request');
    return false;
  }
  const incoming = req.headers.get('x-webhook-secret') ?? '';
  if (incoming.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < incoming.length; i++) diff |= incoming.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!validateWebhookSecret(req)) {
    return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const deliveryNoteId = body.delivery_note_id;
    if (!deliveryNoteId) {
      return Response.json({ skipped: true, reason: 'No delivery_note_id' }, { headers: corsHeaders });
    }

    const { data: ddt } = await supabase
      .from('delivery_notes')
      .select('id, company_id, market_id, status')
      .eq('id', deliveryNoteId)
      .single();

    if (!ddt || ddt.status !== 'issued') {
      return Response.json({ skipped: true, reason: 'DDT not found or not issued' }, { headers: corsHeaders });
    }

    // Righe DDT con prodotto collegato, filtrate a frutta/verdura
    const { data: items } = await supabase
      .from('delivery_note_items')
      .select('id, product_id, product_name, products!inner(category)')
      .eq('delivery_note_id', deliveryNoteId)
      .in('products.category', ['frutta', 'verdura']);

    if (!items?.length) {
      return Response.json({ skipped: true, reason: 'No fresh-produce items on this DDT' }, { headers: corsHeaders });
    }

    const { data: seasonalProducts } = await supabase
      .from('seasonal_products')
      .select('match_key, months');

    if (!seasonalProducts?.length) {
      return Response.json({ skipped: true, reason: 'No seasonal_products configured' }, { headers: corsHeaders });
    }

    const currentMonth = new Date().getMonth() + 1; // 1-12

    type Alert = {
      delivery_note_id: string;
      delivery_note_item_id: string;
      company_id: string;
      market_id: string;
      product_name: string;
      seasonal_match: string;
      month_detected: number;
      season_months: number[];
    };
    const alerts: Alert[] = [];

    for (const item of items as any[]) {
      const norm = (item.product_name ?? '').toLowerCase().trim();
      const match = seasonalProducts.find((sp: { match_key: string }) => {
        const escaped = sp.match_key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`\\b${escaped}\\b`, 'i');
        return re.test(norm);
      });
      if (match && !match.months.includes(currentMonth)) {
        alerts.push({
          delivery_note_id: deliveryNoteId,
          delivery_note_item_id: item.id,
          company_id: ddt.company_id,
          market_id: ddt.market_id,
          product_name: item.product_name,
          seasonal_match: match.match_key,
          month_detected: currentMonth,
          season_months: match.months,
        });
      }
    }

    if (!alerts.length) {
      return Response.json({ skipped: true, reason: 'All fresh items in season' }, { headers: corsHeaders });
    }

    const { error } = await supabase
      .from('seasonal_alert_reports')
      .upsert(alerts, { onConflict: 'delivery_note_item_id', ignoreDuplicates: true });

    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    return Response.json({ created: alerts.length, alerts }, { headers: corsHeaders });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
});