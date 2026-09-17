/**
 * Avvisa i produttori di un mercato quando viene pubblicata una
 * comunicazione (chiusura, apertura straordinaria, evento).
 *
 * Per gli eventi facoltativi crea anche le richieste di adesione in
 * stato "in attesa", una per azienda del mercato.
 */
import { serviceClient, ok, errore, preflight } from '../_shared/comune.ts'

const ETICHETTE: Record<string, { titolo: string; emoji: string }> = {
  closure:          { titolo: 'Avviso: chiusura mercato', emoji: '⚠️' },
  special_opening:  { titolo: 'Apertura straordinaria',   emoji: '✨' },
  event:            { titolo: 'Nuovo evento',             emoji: '📅' },
}

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre

  try {
    const body = await req.json()
    const db = serviceClient()

    const messageId = body.message_id ?? body.event?.data?.id
    if (!messageId) return errore('message_id mancante')

    const { data: msg } = await db
      .from('staff_messages').select('*').eq('id', messageId).maybeSingle()

    if (!msg || !msg.is_published) return ok({ success: true, saltato: true })

    // Aziende del mercato interessato
    const { data: aziende } = await db
      .from('companies').select('id, created_by, is_registered')
      .contains('market_ids', [msg.market_id])

    const aziendeAttive = (aziende ?? []).filter((c) => c.is_registered && c.created_by)
    if (aziendeAttive.length === 0) return ok({ success: true, avvisati: 0 })

    const et = ETICHETTE[msg.type] ?? { titolo: 'Nuova comunicazione', emoji: '📢' }
    const testo = `${et.emoji} ${msg.title}${msg.description ? ' — ' + msg.description : ''}`

    // Notifiche
    const { error: errNotif } = await db.from('notifications').insert(
      aziendeAttive.map((c) => ({
        user_email: c.created_by!,
        title: et.titolo,
        message: testo,
        type: 'generic',
        message_id: msg.id,
      })),
    )
    if (errNotif) return errore(`Notifiche: ${errNotif.message}`, 500)

    // Eventi facoltativi: richieste di adesione
    let adesioni = 0
    if (msg.type === 'event' && !msg.is_mandatory && msg.market_id) {
      const righe = aziendeAttive.map((c) => ({
        message_id: msg.id,
        company_id: c.id,
        producer_email: c.created_by!,
        market_id: msg.market_id!,
        status: 'pending' as const,
      }))
      const { error } = await db
        .from('producer_event_rsvps')
        .upsert(righe, { onConflict: 'message_id,company_id', ignoreDuplicates: true })
      if (!error) adesioni = righe.length
    }

    return ok({ success: true, avvisati: aziendeAttive.length, adesioni })
  } catch (e) {
    return errore(e instanceof Error ? e.message : 'Errore imprevisto', 500)
  }
})
