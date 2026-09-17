/** Avvisa il produttore che lo staff ha risposto a una sua segnalazione. */
import { serviceClient, ok, errore, preflight } from '../_shared/comune.ts'

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre
  try {
    const { need_id, message } = await req.json()
    if (!need_id) return errore('need_id mancante')

    const db = serviceClient()
    const { data: bisogno } = await db
      .from('company_needs').select('id, title, company_id').eq('id', need_id).maybeSingle()
    if (!bisogno) return errore('Segnalazione inesistente', 404)

    const { data: azienda } = await db
      .from('companies').select('created_by').eq('id', bisogno.company_id).maybeSingle()
    if (!azienda?.created_by) return ok({ success: true, avvisati: 0 })

    const { error } = await db.from('notifications').insert({
      user_email: azienda.created_by,
      title: 'Risposta dallo staff',
      message: `${bisogno.title}: ${message ?? 'la tua segnalazione e stata presa in carico'}`,
      type: 'generic',
      company_id: bisogno.company_id,
    })
    if (error) return errore(error.message, 500)

    return ok({ success: true, avvisati: 1 })
  } catch (e) {
    return errore(e instanceof Error ? e.message : 'Errore imprevisto', 500)
  }
})
