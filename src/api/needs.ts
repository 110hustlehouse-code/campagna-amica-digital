/** Bisogni delle aziende segnalati allo staff del mercato. */
import { supabase, unwrapOne, unwrapMany } from './client'
import type { Tables, TablesInsert, TablesUpdate } from './types'

export type CompanyNeed = Tables<'producer_needs'>
export type NeedStatus = CompanyNeed['status']
export type NeedPriority = CompanyNeed['priority']
export type NeedCategory = CompanyNeed['category']

export async function getNeedsByMarket(
  marketId: string, soloAperti = false,
): Promise<CompanyNeed[]> {
  let q = supabase.from('producer_needs').select('*, companies(name)').eq('market_id', marketId)
  if (soloAperti) q = q.in('status', ['open', 'in_progress'])
  return unwrapMany(
    await q.order('priority', { ascending: false }).order('created_at', { ascending: false }),
    'Bisogni del mercato') as unknown as CompanyNeed[]
}

export async function getNeedsByCompany(companyId: string): Promise<CompanyNeed[]> {
  return unwrapMany(
    await supabase.from('producer_needs').select('*')
      .eq('company_id', companyId).order('created_at', { ascending: false }),
    'Bisogni dell\'azienda')
}

export async function createNeed(n: TablesInsert<'producer_needs'>): Promise<CompanyNeed> {
  return unwrapOne(await supabase.from('producer_needs').insert(n).select().single(),
    'Segnalazione bisogno')
}

export async function updateNeed(
  id: string, patch: TablesUpdate<'producer_needs'>,
): Promise<CompanyNeed> {
  return unwrapOne(
    await supabase.from('producer_needs').update(patch).eq('id', id).select().single(),
    'Aggiornamento bisogno')
}

export const ETICHETTE_CATEGORIA: Record<NeedCategory, string> = {
  bags: 'Sacchetti',
  materials: 'Materiali',
  urgent: 'Urgenze',
  maintenance: 'Manutenzione',
  other: 'Altro',
}

export const ETICHETTE_STATO: Record<NeedStatus, string> = {
  open: 'Aperto',
  in_progress: 'In lavorazione',
  resolved: 'Risolto',
  closed: 'Chiuso',
}

export const ETICHETTE_PRIORITA: Record<NeedPriority, string> = {
  low: 'Bassa',
  medium: 'Media',
  high: 'Alta',
}

/** Bisogni di tutti i mercati visibili all'utente. */
export async function getAllNeeds(): Promise<CompanyNeed[]> {
  return unwrapMany(
    await supabase.from('producer_needs').select('*')
      .order('created_at', { ascending: false }),
    'Tutti i bisogni')
}

export async function deleteNeed(id: string): Promise<void> {
  const { error } = await supabase.from('producer_needs').delete().eq('id', id)
  if (error) throw error
}

/** Storico delle risposte dello staff a un bisogno (una riga per ogni risposta). */
export type NeedResponse = Tables<'need_responses'>

export async function getResponsesByNeed(needId: string): Promise<NeedResponse[]> {
  return unwrapMany(
    await supabase.from('need_responses').select('*')
      .eq('need_id', needId).order('created_at', { ascending: true }),
    'Risposte al bisogno')
}

export async function getResponsesByNeeds(needIds: string[]): Promise<NeedResponse[]> {
  if (!needIds.length) return []
  return unwrapMany(
    await supabase.from('need_responses').select('*')
      .in('need_id', needIds).order('created_at', { ascending: true }),
    'Risposte ai bisogni')
}

export async function addNeedResponse(r: TablesInsert<'need_responses'>): Promise<NeedResponse> {
  return unwrapOne(await supabase.from('need_responses').insert(r).select().single(),
    'Invio risposta')
}
