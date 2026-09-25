/** Segnalazioni di prodotti fuori stagione rilevate su un DDT emesso — lo staff le vede e le chiude. */
import { supabase, unwrapMany, DataError } from './client'
import type { Tables } from './types'

export type SeasonalAlertReport = Tables<'seasonal_alert_reports'>

export async function getSegnalazioniStagionaliMercato(marketId: string) {
  const query = supabase
    .from('seasonal_alert_reports')
    .select('*')
    .eq('market_id', marketId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
  return unwrapMany(await query) as Promise<SeasonalAlertReport[]>
}

export async function risolviSegnalazioneStagionale(id: string, staffNote?: string) {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('seasonal_alert_reports')
    .update({
      status: 'resolved',
      staff_note: staffNote ?? null,
      staff_user_id: user?.id ?? null,
      staff_action_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw new DataError(error.message, error)
}