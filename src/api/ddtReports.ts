/** Segnalazioni di DDT mancante — lo staff le vede e agisce. */
import { supabase, unwrapOne, unwrapMany } from './client'
import type { Tables, TablesUpdate } from './types'

export type MissingDdtReport = Tables<'missing_ddt_reports'>
export type ReportStatus = MissingDdtReport['status']
export type StaffAction = NonNullable<MissingDdtReport['staff_action']>

export async function getReportsByMarket(marketId: string, soloAperte = true): Promise<MissingDdtReport[]> {
  let q = supabase.from('missing_ddt_reports').select('*, companies(name)').eq('market_id', marketId)
  if (soloAperte) q = q.eq('status', 'open')
  return unwrapMany(await q.order('data_evento', { ascending: false }), 'Segnalazioni DDT mancante') as unknown as MissingDdtReport[]
}

/**
 * Lo staff agisce su una segnalazione. 'dismiss' la chiude subito
 * (falso allarme); 'escalate' e 'request_suspension' la passano
 * all'amministrazione, che la valuterà nella Fase 4.
 */
export async function agisciSuSegnalazione(
  id: string, azione: StaffAction, nota: string | null, staffUserId: string,
): Promise<MissingDdtReport> {
  // 'warn' è gestito interamente dallo staff (l'ammonizione è già
  // stata emessa): la segnalazione è chiusa, non serve amministrazione
  // — a meno che non sia la terza, nel qual caso ci pensa il trigger
  // di escalation automatica, non questo stato.
  const statoRisultante =
    azione === 'dismiss' ? 'dismissed'
    : azione === 'warn' ? 'resolved'
    : 'escalated'

  const patch: TablesUpdate<'missing_ddt_reports'> = {
    staff_action: azione,
    staff_note: nota,
    staff_user_id: staffUserId,
    staff_action_at: new Date().toISOString(),
    status: statoRisultante,
  }
  return unwrapOne(
    await supabase.from('missing_ddt_reports').update(patch).eq('id', id).select().single(),
    'Aggiornamento segnalazione')
}

export const ETICHETTE_STATUS: Record<ReportStatus, string> = {
  open: 'Da valutare',
  escalated: 'Segnalata ad amministrazione',
  dismissed: 'Archiviata',
  resolved: 'Risolta',
}

export const ETICHETTE_AZIONE: Record<StaffAction, string> = {
  escalate: 'Segnala ad amministrazione',
  request_suspension: 'Richiedi sospensione',
  dismiss: 'Archivia (falso allarme)',
}
/** Le segnalazioni ammonite dallo staff per un'azienda su un mercato — usate nella cronologia sanzioni per mostrare da dove nasce un provvedimento. */
export async function getReportsAmmoniteByCompanyMarket(companyId: string, marketId: string): Promise<MissingDdtReport[]> {
  return unwrapMany(
    await supabase.from('missing_ddt_reports').select('*')
      .eq('company_id', companyId).eq('market_id', marketId).eq('staff_action', 'warn')
      .order('data_evento', { ascending: false }),
    'Segnalazioni ammonite')
}