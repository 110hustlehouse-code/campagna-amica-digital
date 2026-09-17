import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Vai sui siti www.coldiretti.it e www.campagnamica.it e recupera le ultime 6 notizie pubblicate (3 da ciascun sito).
    Per ogni notizia restituisci: titolo, breve descrizione (max 120 caratteri), data di pubblicazione (formato italiano es: "2 aprile 2026"), url della notizia, e la fonte ("Coldiretti" oppure "Campagna Amica").
    Restituisci solo notizie reali e verificate presenti su quei siti. Non inventare notizie.`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        news: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              date: { type: "string" },
              url: { type: "string" },
              source: { type: "string" }
            }
          }
        }
      }
    }
  });

  return Response.json({ news: result.news || [] });
});