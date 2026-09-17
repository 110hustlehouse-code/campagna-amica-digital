/**
 * Cancellazione dell'account su richiesta dell'utente.
 *
 * Elimina l'utente da auth: le tabelle collegate si svuotano da sole
 * grazie ai vincoli ON DELETE CASCADE definiti nello schema.
 *
 * I DDT NON vengono cancellati: sono documenti fiscali e devono restare
 * per legge. Restano legati all'azienda, non alla persona.
 */
import { serviceClient, utenteChiamante, ok, errore, preflight } from '../_shared/comune.ts'

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre
  try {
    const utente = await utenteChiamante(req)
    if (!utente) return errore('Non autenticato', 401)

    const db = serviceClient()

    // Un'azienda con DDT emessi non puo' sparire: si disattiva.
    const { data: aziende } = await db
      .from('companies').select('id').ilike('created_by', utente.email)

    for (const a of aziende ?? []) {
      const { count } = await db
        .from('ddt').select('*', { count: 'exact', head: true }).eq('company_id', a.id)
      if ((count ?? 0) > 0) {
        await db.from('companies').update({ is_registered: false }).eq('id', a.id)
      }
    }

    const { error } = await db.auth.admin.deleteUser(utente.id)
    if (error) return errore(error.message, 500)

    return ok({ success: true })
  } catch (e) {
    return errore(e instanceof Error ? e.message : 'Errore imprevisto', 500)
  }
})
