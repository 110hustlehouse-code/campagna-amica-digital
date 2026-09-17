/**
 * Aggiorna la cache delle notizie Coldiretti.
 *
 * Pensata per essere richiamata da un job programmato (Supabase ->
 * Database -> Cron), non a ogni apertura dell'app: le notizie cambiano
 * poche volte al giorno e ogni chiamata ha un costo.
 */
import { serviceClient, ok, errore, preflight } from '../_shared/comune.ts'

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre
  try {
    const chiave = Deno.env.get('ANTHROPIC_API_KEY')
    if (!chiave) return errore('ANTHROPIC_API_KEY non configurata', 500)

    const risposta = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': chiave, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
        messages: [{
          role: 'user',
          content: `Cerca le 6 notizie piu recenti da Coldiretti e Campagna Amica su agricoltura italiana, mercati contadini e filiera corta.

Rispondi SOLO con JSON: {"notizie":[{"title":"","description":"","date":"","url":"","source":""}]}
Usa solo notizie reali con URL verificabili. Se non ne trovi, restituisci un elenco vuoto.`,
        }],
      }),
    })
    if (!risposta.ok) return errore(`Ricerca non riuscita: ${await risposta.text()}`, 502)

    const dati = await risposta.json()
    const testo = (dati.content ?? [])
      .filter((b: Record<string, unknown>) => b.type === 'text')
      .map((b: Record<string, unknown>) => b.text).join('')
    const pulito = String(testo).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const m = pulito.match(/\{[\s\S]*\}/)
    if (!m) return ok({ success: true, aggiornate: 0 })

    const { notizie } = JSON.parse(m[0]) as { notizie?: Record<string, string>[] }
    const valide = (notizie ?? []).filter((n) => n.title && n.url)
    if (valide.length === 0) return ok({ success: true, aggiornate: 0 })

    const db = serviceClient()
    // Sostituisce la cache: le notizie vecchie non servono piu'.
    await db.from('news_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const { error } = await db.from('news_cache').insert(
      valide.map((n) => ({
        title: n.title, description: n.description ?? null,
        date: n.date ?? null, url: n.url, source: n.source ?? 'Coldiretti',
      })),
    )
    if (error) return errore(error.message, 500)

    return ok({ success: true, aggiornate: valide.length })
  } catch (e) {
    return errore(e instanceof Error ? e.message : 'Errore imprevisto', 500)
  }
})
