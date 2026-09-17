/**
 * Adesione o rifiuto di un produttore a un evento facoltativo.
 * Avvisa lo staff del mercato della risposta ricevuta.
 */
import { serviceClient, utenteChiamante, ok, errore, preflight } from '../_shared/comune.ts'

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre

  try {
    const utente = await utenteChiamante(req)
    if (!utente) return errore('Non autenticato', 401)

    const { message_id, company_id, market_id, status } = await req.json()
    if (!message_id || !company_id || !market_id || !status) {
      return errore('Dati incompleti')
    }
    if (!['pending', 'accepted', 'declined'].includes(status)) {
      return errore('Stato non valido')
    }

    const db = serviceClient()

    // L'azienda deve appartenere a chi chiama.
    const { data: azienda } = await db
      .from('companies').select('id, name, created_by').eq('id', company_id).maybeSingle()
    if (!azienda) return errore('Azienda inesistente', 404)
    if (azienda.created_by?.toLowerCase() !== utente.email.toLowerCase()) {
      return errore('Non autorizzato per questa azienda', 403)
    }

    const { error } = await db.from('producer_event_rsvps').upsert({
      message_id, company_id, market_id,
      producer_email: utente.email, status,
    }, { onConflict: 'message_id,company_id' })
    if (error) return errore(error.message, 500)

    // Avviso allo staff del mercato.
    const { data: staff } = await db
      .from('staff_members').select('email')
      .eq('market_id', market_id).eq('is_active', true)

    const { data: msg } = await db
      .from('staff_messages').select('title').eq('id', message_id).maybeSingle()

    if (staff?.length) {
      const verbo = status === 'accepted' ? 'ha aderito a' : 'ha rifiutato'
      await db.from('notifications').insert(
        staff.map((s) => ({
          user_email: s.email,
          title: 'Risposta a un evento',
          message: `${azienda.name} ${verbo} "${msg?.title ?? 'evento'}"`,
          type: 'generic',
          message_id,
          company_id,
        })),
      )
    }

    return ok({ success: true })
  } catch (e) {
    return errore(e instanceof Error ? e.message : 'Errore imprevisto', 500)
  }
})
