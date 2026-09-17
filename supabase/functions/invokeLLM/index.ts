/**
 * Chiamata a un modello linguistico.
 *
 * Sostituisce integrations.Core.InvokeLLM di Base44. La chiave del
 * fornitore resta qui, lato server: non deve mai raggiungere il browser.
 *
 * Configurare in Supabase (Edge Functions -> Secrets):
 *   ANTHROPIC_API_KEY
 */
import { utenteChiamante, ok, errore, preflight } from '../_shared/comune.ts'

const MODELLO = 'claude-sonnet-4-20250514'

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre

  try {
    // Solo utenti autenticati: una chiamata AI costa, non si espone a chiunque.
    const utente = await utenteChiamante(req)
    if (!utente) return errore('Non autenticato', 401)

    const chiave = Deno.env.get('ANTHROPIC_API_KEY')
    if (!chiave) return errore('ANTHROPIC_API_KEY non configurata', 500)

    const { prompt, response_json_schema, file_urls } = await req.json()
    if (!prompt) return errore('prompt mancante')

    // I file (listini in PDF o foto) vengono allegati al messaggio.
    const contenuto: unknown[] = []
    for (const url of (file_urls ?? []).slice(0, 5)) {
      try {
        const r = await fetch(url)
        const tipo = r.headers.get('content-type') ?? ''
        const buf = new Uint8Array(await r.arrayBuffer())
        const b64 = btoa(String.fromCharCode(...buf))
        if (tipo.includes('pdf')) {
          contenuto.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } })
        } else if (tipo.startsWith('image/')) {
          contenuto.push({ type: 'image', source: { type: 'base64', media_type: tipo, data: b64 } })
        }
      } catch {
        // Un allegato irraggiungibile non deve far fallire tutta la richiesta.
      }
    }

    const istruzioni = response_json_schema
      ? `${prompt}\n\nRispondi ESCLUSIVAMENTE con JSON valido conforme a questo schema, senza testo attorno:\n${JSON.stringify(response_json_schema)}`
      : prompt
    contenuto.push({ type: 'text', text: istruzioni })

    const risposta = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': chiave,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODELLO,
        max_tokens: 4096,
        messages: [{ role: 'user', content: contenuto }],
      }),
    })

    if (!risposta.ok) {
      return errore(`Modello non raggiungibile: ${await risposta.text()}`, 502)
    }

    const dati = await risposta.json()
    const testo: string = dati.content?.[0]?.text ?? ''

    if (response_json_schema) {
      // Il modello a volte incornicia il JSON in un blocco markdown.
      const pulito = testo.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      try {
        return ok(JSON.parse(pulito))
      } catch {
        return errore('Il modello non ha restituito JSON valido', 502)
      }
    }

    return ok({ text: testo })
  } catch (e) {
    return errore(e instanceof Error ? e.message : 'Errore imprevisto', 500)
  }
})
