/**
 * invoke-llm
 * Wrapper Anthropic (Claude) per le chiamate LLM dell'app.
 * Sostituisce Base44's integrations.Core.InvokeLLM.
 *
 * Richiede env: ANTHROPIC_API_KEY
 *
 * Body: { prompt, response_json_schema?, add_context_from_internet?, model? }
 * Response: oggetto JSON estratto oppure { text: string }
 */
import { corsHeaders, supabase, getUserFromRequest } from '../_shared/supabase.ts';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 4096;

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
    // Require authenticated user (any role)
    const user = await getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500, headers: corsHeaders });
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

    // When add_context_from_internet is requested, fetch relevant web pages
    // and prepend their content to the prompt
    let finalPrompt = prompt;
    if (add_context_from_internet) {
      // Extract URLs from the prompt to fetch
      const urlPattern = /https?:\/\/[^\s,)'"]+/g;
      const urls = prompt.match(urlPattern) ?? [];

      const fetchedContents: string[] = [];
      for (const rawUrl of urls.slice(0, 3)) { // limit to 3 URLs
        try {
          // H3 — SSRF: validate URL before fetching
          if (BLOCKED_URL_RE.test(rawUrl)) continue;
          const parsedUrl = new URL(rawUrl);
          if (!ALLOWED_HOSTS.has(parsedUrl.hostname)) continue;

          const resp = await fetch(parsedUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CampagnaAmicaBot/1.0)' },
            signal: AbortSignal.timeout(8000),
            redirect: 'error', // prevent redirect to private IPs
          });
          if (resp.ok) {
            let text = await resp.text();
            // Strip HTML tags and collapse whitespace
            text = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            // Limit content size
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

    // Build request body per l'API Messages di Anthropic
    const requestBody: Record<string, unknown> = {
      model,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: finalPrompt }],
    };

    // Per uno schema JSON, si forza uno strumento (tool use): è il modo
    // affidabile di ottenere output strutturato da Claude, non esiste un
    // equivalente diretto di response_format di OpenAI.
    if (response_json_schema) {
      requestBody.tools = [{
        name: 'structured_response',
        description: 'Restituisce la risposta nello schema richiesto.',
        input_schema: response_json_schema,
      }];
      requestBody.tool_choice = { type: 'tool', name: 'structured_response' };
    }

    const anthropicResp = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!anthropicResp.ok) {
      const errText = await anthropicResp.text();
      return Response.json({ error: `Anthropic error: ${errText}` }, { status: anthropicResp.status, headers: corsHeaders });
    }

    const anthropicData = await anthropicResp.json();
    const content: Array<{ type: string; text?: string; input?: unknown }> = anthropicData.content ?? [];

    if (response_json_schema) {
      const toolUse = content.find((c) => c.type === 'tool_use');
      if (toolUse?.input !== undefined) {
        return Response.json(toolUse.input, { headers: corsHeaders });
      }
      // Fallback: se per qualche motivo non arriva un tool_use, restituisci il testo.
      const rawText = content.find((c) => c.type === 'text')?.text ?? '';
      return Response.json({ text: rawText }, { headers: corsHeaders });
    }

    const rawText = content.find((c) => c.type === 'text')?.text ?? '';
    return Response.json({ text: rawText }, { headers: corsHeaders });
  } catch (err: unknown) {
    console.error('[invoke-llm]', err instanceof Error ? err.message : String(err));
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
});