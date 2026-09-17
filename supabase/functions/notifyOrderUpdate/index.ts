/** Avvisa il cliente quando cambia lo stato del suo ordine. */
import { serviceClient, ok, errore, preflight } from '../_shared/comune.ts'

const TESTI: Record<string, string> = {
  confermato: 'Il tuo ordine e stato confermato',
  pronto: 'Il tuo ordine e pronto per il ritiro',
  ritirato: 'Ordine ritirato. Grazie!',
  annullato: 'Il tuo ordine e stato annullato',
}

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre
  try {
    const { order_id } = await req.json()
    if (!order_id) return errore('order_id mancante')

    const db = serviceClient()
    const { data: ordine } = await db
      .from('orders').select('id, status, created_by, company_name').eq('id', order_id).maybeSingle()
    if (!ordine?.created_by) return ok({ success: true, avvisati: 0 })

    const testo = TESTI[ordine.status]
    if (!testo) return ok({ success: true, saltato: true })

    const { error } = await db.from('notifications').insert({
      user_email: ordine.created_by,
      title: 'Aggiornamento ordine',
      message: `${ordine.company_name ?? 'Il produttore'}: ${testo}`,
      type: 'order_update',
      order_id: ordine.id,
    })
    if (error) return errore(error.message, 500)

    return ok({ success: true, avvisati: 1 })
  } catch (e) {
    return errore(e instanceof Error ? e.message : 'Errore imprevisto', 500)
  }
})
