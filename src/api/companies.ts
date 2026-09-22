/** Aziende agricole. */
import { supabase, unwrapMany, unwrapOne } from './client'
import type { Tables, TablesInsert, TablesUpdate } from './types'

export type Company = Tables<'companies'>

export async function getCompanies(): Promise<Company[]> {
  return unwrapMany(await supabase.from('companies').select('*').order('name'),
    'Elenco aziende')
}

export async function getCompany(id: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

/** Aziende presenti in un mercato. market_ids e' un array di id testuali. */
export async function getCompaniesByMarket(marketId: string): Promise<Company[]> {
  return unwrapMany(
    await supabase.from('companies').select('*')
      .contains('market_ids', [marketId]).order('name'),
    'Aziende del mercato')
}

/** Azienda del produttore collegato. Null se non l'ha ancora creata. */
export async function getMyCompany(): Promise<Company | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  // limit(1) e non maybeSingle(): se per qualsiasi ragione esistessero
  // due righe, maybeSingle fallirebbe e porterebbe giu' l'intera area
  // produttore. Qui si prende la piu' recente e si va avanti.
  const { data, error } = await supabase
    .from('companies').select('*')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0] ?? null
}

export async function createCompany(c: TablesInsert<'companies'>): Promise<Company> {
  return unwrapOne(await supabase.from('companies').insert(c).select().single(),
    'Creazione azienda')
}

export async function updateCompany(id: string, patch: TablesUpdate<'companies'>): Promise<Company> {
  return unwrapOne(
    await supabase.from('companies').update(patch).eq('id', id).select().single(),
    'Aggiornamento azienda')
}

/** Aziende registrate, in ordine alfabetico. */
export async function getRegisteredCompanies(): Promise<Company[]> {
  return unwrapMany(
    await supabase.from('companies').select('*').eq('is_registered', true).order('name'),
    'Aziende registrate')
}

/**
 * Imposta i mercati in cui l'azienda e' presente.
 *
 * Passa da una funzione del database perche' l'operazione tocca anche
 * la tabella markets, che un produttore non puo' modificare
 * direttamente. La funzione verifica la proprieta' dell'azienda e
 * aggiorna entrambi i lati della relazione in una sola transazione.
 */
export async function sincronizzaMercati(
  companyId: string,
  marketIds: string[],
): Promise<void> {
  const { error } = await supabase.rpc('sincronizza_mercati_azienda', {
    p_company_id: companyId,
    p_market_ids: marketIds,
  })
  if (error) throw error
}
