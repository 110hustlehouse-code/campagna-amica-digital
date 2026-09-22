/**
 * fetchColdirettiNews
 * Recupera le ultime notizie da coldiretti.it e campagnamica.it tramite web fetch + LLM.
 * Restituisce le notizie senza salvarle su DB (usa refreshColdirettiNews per la cache).
 *
 * Richiede env: OPENAI_API_KEY
 */
import { corsHeaders } from '../_shared/supabase.ts';

interface NewsItem {
  title: string;
  description: string;
  date: string;
  url: string;
  source: string;
}

async function fetchAndExtractNews(baseUrl: string, source: string, apiKey: string): Promise<NewsItem[]> {
  // Fetch homepage
  const resp = await fetch(baseUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CampagnaAmicaBot/1.0)' },
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) return [];

  let html = await resp.text();
  // Strip tags, collapse whitespace, limit
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
             .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
             .replace(/<[^>]+>/g, ' ')
             .replace(/\s+/g, ' ')
             .trim()
             .substring(0, 10000);

  const prompt = `Sei un assistente che estrae notizie da testo HTML grezzo di un sito web.
Il testo seguente proviene da ${baseUrl} (fonte: ${source}).
Identifica le ultime 3 notizie/articoli presenti e per ciascuna estrai:
- title: titolo dell'articolo
- description: breve descrizione (max 120 caratteri)
- date: data di pubblicazione in formato italiano (es: "2 aprile 2026"), oppure stringa vuota se non disponibile
- url: URL completo dell'articolo (se disponibile, altrimenti usa "${baseUrl}")
- source: "${source}"

Testo:
${html}`;

  const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'news_response',
          schema: {
            type: 'object',
            properties: {
              news: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    date: { type: 'string' },
                    url: { type: 'string' },
                    source: { type: 'string' },
                  },
                  required: ['title', 'url', 'source'],
                },
              },
            },
          },
          strict: false,
        },
      },
    }),
  });

  if (!openaiResp.ok) return [];
  const data = await openaiResp.json();
  const raw = data.choices?.[0]?.message?.content ?? '{}';
  try {
    const parsed = JSON.parse(raw);
    return (parsed.news ?? []) as NewsItem[];
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500, headers: corsHeaders });
    }

    const [coldirettiNews, campagnaNews] = await Promise.all([
      fetchAndExtractNews('https://www.coldiretti.it', 'Coldiretti', apiKey),
      fetchAndExtractNews('https://www.campagnamica.it', 'Campagna Amica', apiKey),
    ]);

    const news = [...coldirettiNews.slice(0, 3), ...campagnaNews.slice(0, 3)];

    return Response.json({ news }, { headers: corsHeaders });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
});
