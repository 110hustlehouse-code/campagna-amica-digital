/**
 * Risposta del produttore a una recensione.
 *
 * Passa da qui e non da un update diretto perche' va avvisato anche
 * l'autore della recensione, che e' un altro utente.
 */
import { serviceClient, utenteChiamante, ok, errore, preflight } from '../_shared/comune.ts'

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre
  try {
    const utente = await utenteChiamante(req)
    if (!utente) return errore('Non autenticato', 401)

    const { review_id, reply } = await req.json()
    if (!review_id || !reply?.trim()) return errore('Dati incompleti')

    const db = serviceClient()
    const { data: rec } = await db
      .from('reviews').select('id, company_id, created_by').eq('id', review_id).maybeSingle()
    if (!rec) return errore('Recensione inesistente', 404)

    // Solo il proprietario dell'azienda recensita puo' rispondere.
    const { data: azienda } = await db
      .from('companies').select('name, created_by').eq('id', rec.company_id).maybeSingle()
    if (azienda?.created_by?.toLowerCase() !== utente.email.toLowerCase()) {
      return errore('Non autorizzato', 403)
    }

    const { error } = await db.from('reviews')
      .update({ reply, reply_date: new Date().toISOString() })
      .eq('id', review_id)
    if (error) return errore(error.message, 500)

    if (rec.created_by) {
      await db.from('notifications').insert({
        user_email: rec.created_by,
        title: 'Risposta alla tua recensione',
        message: `${azienda?.name ?? 'Il produttore'} ha risposto: ${reply.slice(0, 120)}`,
        type: 'generic',
        company_id: rec.company_id,
      })
    }

    return ok({ success: true })
  } catch (e) {
    return errore(e instanceof Error ? e.message : 'Errore imprevisto', 500)
  }
})
