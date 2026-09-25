/**
 * invoke-llm
 * Wrapper OpenAI per le chiamate LLM dell'app.
 * Sostituisce Base44's integrations.Core.InvokeLLM.
 *
 * Richiede env: OPENAI_API_KEY
 *
 * Body: { prompt, response_json_schema?, add_context_from_internet?, model? }
 * Response: oggetto JSON estratto oppure { text: string }
 */
import { corsHeaders, supabase, getUserFromRequest } from '../_shared/supabase.ts';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o';

// H3 — SSRF protection: block private/loopback ranges
const BLOCKED_URL_RE = /^(https?:)?\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1|fc00:)/i;
// Only allow fetching from these specific domains
const ALLOWED_HOSTS = new Set([
  'coldiretti.it', 'www.coldiretti.it',
  'campagnamica.it', 'www.campagnamica.it',
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500, headers: corsHeaders });
    }

    // H4 — Rate limit: max 10 calls per minute per user
    const windowStart = new Date(Date.now() - 60_000).toISOString();
    const { count: callCount } = await supabase
      .from('api_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('endpoint', 'invoke-llm')
      .gte('called_at', windowStart);

    if ((callCount ?? 0) >= 10) {
      return Response.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429, headers: corsHeaders });
    }
    await supabase.from('api_rate_limits').insert({ user_id: user.id, endpoint: 'invoke-llm' });

    const body = await req.json();
    const {
      prompt,
      response_json_schema,
      add_context_from_internet = false,
      model = DEFAULT_MODEL,
    } = body;

    if (!prompt) {
      return Response.json({ error: 'prompt is required' }, { status: 400, headers: corsHeaders });
    }

    let finalPrompt = prompt;
    if (add_context_from_internet) {
      const urlPattern = /https?:\/\/[^\s,)'"]+/g;
      const urls = prompt.match(urlPattern) ?? [];

      const fetchedContents: string[] = [];
      for (const rawUrl of urls.slice(0, 3)) {
        try {
          if (BLOCKED_URL_RE.test(rawUrl)) continue;
          const parsedUrl = new URL(rawUrl);
          if (!ALLOWED_HOSTS.has(parsedUrl.hostname)) continue;

          const resp = await fetch(parsedUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CampagnaAmicaBot/1.0)' },
            signal: AbortSignal.timeout(8000),
            redirect: 'error',
          });
          if (resp.ok) {
            let text = await resp.text();
            text = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            text = text.substring(0, 8000);
            fetchedContents.push(`=== Contenuto da ${rawUrl} ===\n${text}`);
          }
        } catch {
          // Skip unreachable or blocked URLs
        }
      }

      if (fetchedContents.length > 0) {
        finalPrompt = `${fetchedContents.join('\n\n')}\n\n---\n${prompt}`;
      }
    }

    const requestBody: Record<string, unknown> = {
      model,
      messages: [{ role: 'user', content: finalPrompt }],
    };

    if (response_json_schema) {
      requestBody.response_format = {
        type: 'json_schema',
        json_schema: {
          name: 'structured_response',
          schema: response_json_schema,
          strict: false,
        },
      };
    }

    const openaiResp = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!openaiResp.ok) {
      const errText = await openaiResp.text();
      return Response.json({ error: `OpenAI error: ${errText}` }, { status: openaiResp.status, headers: corsHeaders });
    }

    const openaiData = await openaiResp.json();
    const rawText = openaiData.choices?.[0]?.message?.content ?? '';

    if (response_json_schema) {
      try {
        return Response.json(JSON.parse(rawText), { headers: corsHeaders });
      } catch {
        return Response.json({ text: rawText }, { headers: corsHeaders });
      }
    }

    return Response.json({ text: rawText }, { headers: corsHeaders });
  } catch (err: unknown) {
    console.error('[invoke-llm]', err instanceof Error ? err.message : String(err));
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
});