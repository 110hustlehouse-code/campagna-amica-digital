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
  if (!user?.email) return null
  const { data, error } = await supabase
    .from('companies').select('*')
    .ilike('created_by', user.email).maybeSingle()
  if (error) throw error
  return data
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
