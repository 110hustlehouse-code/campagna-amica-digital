/** Avvisa il produttore che ha ricevuto una recensione. */
import { serviceClient, ok, errore, preflight } from '../_shared/comune.ts'

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre
  try {
    const { review_id } = await req.json()
    if (!review_id) return errore('review_id mancante')

    const db = serviceClient()
    const { data: rec } = await db
      .from('reviews').select('id, rating, message, company_id').eq('id', review_id).maybeSingle()
    if (!rec) return errore('Recensione inesistente', 404)

    const { data: azienda } = await db
      .from('companies').select('created_by').eq('id', rec.company_id).maybeSingle()
    if (!azienda?.created_by) return ok({ success: true, avvisati: 0 })

    await db.from('notifications').insert({
      user_email: azienda.created_by,
      title: 'Nuova recensione',
      message: `Hai ricevuto ${rec.rating} stelle${rec.message ? ': ' + rec.message.slice(0, 100) : ''}`,
      type: 'generic',
      company_id: rec.company_id,
    })
    return ok({ success: true, avvisati: 1 })
  } catch (e) {
    return errore(e instanceof Error ? e.message : 'Errore imprevisto', 500)
  }
})
