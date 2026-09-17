/**
 * Avvisa chi di dovere quando lo staff pubblica una comunicazione.
 *
 * CHI RICEVE COSA
 *   Produttori del mercato: tutto. Chiusure, aperture straordinarie ed
 *   eventi li riguardano direttamente, devono organizzarsi.
 *
 *   Clienti che seguono il mercato: solo chiusure e aperture
 *   straordinarie, cioe' le informazioni che cambiano i loro piani.
 *   Gli eventi rivolti ai produttori non li riguardano: notificarli
 *   otterrebbe solo che disattivino le notifiche, e a quel punto non
 *   leggerebbero piu' nemmeno l'avviso di chiusura.
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

    // Clienti che seguono questo mercato: solo per cio' che li riguarda.
    let clientiAvvisati = 0
    if (msg.type === 'closure' || msg.type === 'special_opening') {
      const { data: seguaci } = await db
        .from('favorites').select('created_by').eq('market_id', msg.market_id)

      const emailProduttori = new Set(aziendeAttive.map((c) => c.created_by!.toLowerCase()))
      const destinatari = [...new Set(
        (seguaci ?? [])
          .map((f) => f.created_by)
          .filter((e): e is string => !!e && !emailProduttori.has(e.toLowerCase())),
      )]

      if (destinatari.length > 0) {
        const titoloCliente = msg.type === 'closure'
          ? 'Mercato chiuso'
          : 'Apertura straordinaria'
        await db.from('notifications').insert(
          destinatari.map((email) => ({
            user_email: email,
            title: titoloCliente,
            message: testo,
            type: 'generic',
            message_id: msg.id,
          })),
        )
        clientiAvvisati = destinatari.length
      }
    }

    return ok({
      success: true,
      produttori: aziendeAttive.length,
      clienti: clientiAvvisati,
      adesioni,
    })
  } catch (e) {
    return errore(e instanceof Error ? e.message : 'Errore imprevisto', 500)
  }
})
