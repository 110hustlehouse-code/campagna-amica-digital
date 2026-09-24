/** Ammonizioni e blocchi banco emessi dall'amministrazione. */
import { supabase, unwrapOne, unwrapMany } from './client'
import type { Tables, TablesInsert } from './types'

export type StallSanction = Tables<'stall_sanctions'>
export type SanctionType = StallSanction['type']

export async function getSanctionsByCompany(companyId: string): Promise<StallSanction[]> {
  return unwrapMany(
    await supabase.from('stall_sanctions').select('*').eq('company_id', companyId)
      .order('created_at', { ascending: false }),
    'Sanzioni dell\'azienda')
}

export async function getSanctionsByMarket(marketId: string): Promise<StallSanction[]> {
  return unwrapMany(
    await supabase.from('stall_sanctions').select('*, companies(name)').eq('market_id', marketId)
      .order('created_at', { ascending: false }),
    'Sanzioni del mercato') as unknown as StallSanction[]
}

/** Tutte le segnalazioni escalated, in attesa di valutazione amministrativa. */
export async function getReportsEscalated(): Promise<any[]> {
  const { data, error } = await supabase
    .from('missing_ddt_reports')
    .select('*, companies(name), markets(name)')
    .eq('status', 'escalated')
    .order('data_evento', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createWarning(
  companyId: string, marketId: string, reason: string, reportId: string | null, issuedBy: string,
): Promise<StallSanction> {
  const payload: TablesInsert<'stall_sanctions'> = {
    company_id: companyId, market_id: marketId, type: 'warning',
    reason, report_id: reportId, issued_by: issuedBy,
  }
  return unwrapOne(await supabase.from('stall_sanctions').insert(payload).select().single(), 'Ammonizione')
}

export async function createBlock(
  companyId: string, marketId: string, reason: string,
  blockedFrom: string, blockedUntil: string, reportId: string | null, issuedBy: string,
): Promise<StallSanction> {
  const payload: TablesInsert<'stall_sanctions'> = {
    company_id: companyId, market_id: marketId, type: 'stall_block',
    reason, blocked_from: blockedFrom, blocked_until: blockedUntil,
    report_id: reportId, issued_by: issuedBy,
  }
  return unwrapOne(await supabase.from('stall_sanctions').insert(payload).select().single(), 'Blocco banco')
}

export async function liftBlock(id: string, reason: string, liftedBy: string): Promise<StallSanction> {
  return unwrapOne(
    await supabase.from('stall_sanctions')
      .update({ lifted_at: new Date().toISOString(), lift_reason: reason, lifted_by: liftedBy })
      .eq('id', id).select().single(),
    'Revoca blocco')
}

/** Marca la segnalazione come risolta dopo che l'admin ha emesso un provvedimento (o deciso di non emetterne). */
export async function risolviSegnalazione(reportId: string): Promise<void> {
  const { error } = await supabase.from('missing_ddt_reports').update({ status: 'resolved' }).eq('id', reportId)
  if (error) throw error
}
export type CompanyMarketEscalation = Tables<'company_market_escalations'>

/** Ammonizione emessa direttamente dallo staff (non passa dall'amministrazione). */
export async function createWarningStaff(
  companyId: string, marketId: string, reason: string, reportId: string | null, staffUserId: string,
): Promise<StallSanction> {
  return createWarning(companyId, marketId, reason, reportId, staffUserId)
}

/** Escalation automatiche aperte, generate dopo 3 ammonizioni sullo stesso mercato. */
export async function getEscalationsAperte(): Promise<any[]> {
  const { data, error } = await supabase
    .from('company_market_escalations')
    .select('*, companies(name), markets(name)')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function risolviEscalation(id: string): Promise<void> {
  const { error } = await supabase
    .from('company_market_escalations')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}