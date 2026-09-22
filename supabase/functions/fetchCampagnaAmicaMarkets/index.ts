/**
 * fetchCampagnaAmicaMarkets
 * Importa mercati da campagnamica.it tramite web fetch + LLM.
 * Solo per admin. Crea mercati nuovi (non modifica quelli esistenti).
 *
 * Richiede env: OPENAI_API_KEY
 */
import { corsHeaders, supabase, getUserFromRequest } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Auth check — only admin
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403, headers: corsHeaders });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500, headers: corsHeaders });
    }

    // Fetch the markets page
    const pageResp = await fetch('https://www.campagnamica.it/la-nostra-rete/mercati-a-km-0/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CampagnaAmicaBot/1.0)' },
      signal: AbortSignal.timeout(12000),
    });

    let html = '';
    if (pageResp.ok) {
      const rawHtml = await pageResp.text();
      html = rawHtml
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 12000);
    }

    const prompt = `Estrai i dati dei mercati Campagna Amica dal seguente testo HTML grezzo.
Per ogni mercato estrai: nome, città, regione, indirizzo, giorni di apertura (es: "Sabato e Domenica"), orari (es: "08:00 - 14:00").
Se il testo non contiene dati sufficienti, restituisci un array vuoto.

Testo:
${html || '(pagina non disponibile)'}`;

    const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'markets_response',
            schema: {
              type: 'object',
              properties: {
                markets: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      city: { type: 'string' },
                      region: { type: 'string' },
                      address: { type: 'string' },
                      opening_days: { type: 'string' },
                      opening_hours: { type: 'string' },
                    },
                    required: ['name', 'city'],
                  },
                },
              },
            },
            strict: false,
          },
        },
      }),
    });

    if (!openaiResp.ok) {
      return Response.json({ error: `OpenAI error: ${await openaiResp.text()}` }, { status: 500, headers: corsHeaders });
    }

    const openaiData = await openaiResp.json();
    const raw = openaiData.choices?.[0]?.message?.content ?? '{}';
    let markets: Array<{ name: string; city: string; region?: string; address?: string; opening_days?: string; opening_hours?: string }> = [];
    try {
      markets = JSON.parse(raw).markets ?? [];
    } catch {
      markets = [];
    }

    // Fetch existing markets for deduplication
    const { data: existingMarkets } = await supabase
      .from('markets')
      .select('name, city');

    const created: unknown[] = [];
    for (const market of markets) {
      const exists = (existingMarkets ?? []).some(
        (m: { name: string; city: string }) => m.name === market.name && m.city === market.city
      );
      if (!exists) {
        const { data: newMarket, error } = await supabase.from('markets').insert({
          name: market.name,
          city: market.city,
          region: market.region || null,
          address: market.address || null,
          schedule: [market.opening_days, market.opening_hours].filter(Boolean).join(' · ') || null,
        }).select().single();
        if (!error && newMarket) created.push(newMarket);
      }
    }

    return Response.json({
      success: true,
      total_imported: markets.length,
      new_markets: created.length,
      created_markets: created,
    }, { headers: corsHeaders });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
});
