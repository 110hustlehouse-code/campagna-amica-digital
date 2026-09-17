import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/* deno-lint-ignore no-undef */ Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch markets from Campagna Amica
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Estrai i dati dei mercati da https://www.campagnamica.it/la-nostra-rete/mercati-a-km-0/
      
Per ogni mercato estrai: nome, città, regione, indirizzo, giorni di apertura (es: Sabato e Domenica), orari (es: 08:00 - 14:00).

Restituisci come array JSON con struttura:
[
  {
    "name": "Nome Mercato",
    "city": "Città",
    "region": "Regione",
    "address": "Indirizzo completo",
    "opening_days": "Giorni apertura",
    "opening_hours": "Orari"
  }
]`,
      add_context_from_internet: true,
      response_json_schema: {
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
                opening_hours: { type: 'string' }
              }
            }
          }
        }
      }
    });

    const markets = response.markets || [];
    const created = [];

    // Check existing markets and create new ones
    const existingMarkets = await base44.asServiceRole.entities.Market.list('-created_date', 1000);

    for (const market of markets) {
      const exists = existingMarkets.some(m => m.name === market.name && m.city === market.city);
      
      if (!exists) {
        const newMarket = await base44.asServiceRole.entities.Market.create({
          name: market.name,
          city: market.city,
          region: market.region,
          address: market.address,
          opening_days: market.opening_days,
          opening_hours: market.opening_hours
        });
        created.push(newMarket);
      }
    }

    return Response.json({
      success: true,
      total_imported: markets.length,
      new_markets: created.length,
      created_markets: created
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});