/** Mercati e gerarchia territoriale. */
import { supabase, unwrapMany, unwrapOne } from './client'
import type { Tables, TablesInsert, TablesUpdate, Views } from './types'

export type Market = Tables<'markets'>
export type MarketTerritorio = Views<'v_markets_territorio'>

export async function getMarkets(): Promise<Market[]> {
  return unwrapMany(
    await supabase.from('markets').select('*').eq('attivo', true).order('name'),
    'Elenco mercati')
}

export async function getMarket(id: string): Promise<Market | null> {
  const { data, error } = await supabase
    .from('markets').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

/** Mercati con regione, provincia, comune e quartiere risolti. */
export async function getMarketsTerritorio(): Promise<MarketTerritorio[]> {
  return unwrapMany(
    await supabase.from('v_markets_territorio').select('*').order('regione'),
    'Mercati per territorio')
}

export async function getMarketsByRegione(regione: string): Promise<MarketTerritorio[]> {
  return unwrapMany(
    await supabase.from('v_markets_territorio').select('*')
      .eq('regione', regione).order('comune'),
    `Mercati della regione ${regione}`)
}

export async function updateMarket(id: string, patch: TablesUpdate<'markets'>): Promise<Market> {
  return unwrapOne(
    await supabase.from('markets').update(patch).eq('id', id).select().single(),
    'Aggiornamento mercato')
}

export async function createMarket(m: TablesInsert<'markets'>): Promise<Market> {
  return unwrapOne(
    await supabase.from('markets').insert(m).select().single(),
    'Creazione mercato')
}
export type StatoDisponibilita =
  | 'nessun_mercato' | 'non_ancora_aperto' | 'disponibile' | 'assente' | 'in_attesa_ddt'

/** Stato di un'azienda in un mercato, oggi (o alla data indicata). */
export async function getStatoDisponibilita(
  companyId: string, marketId: string, data?: string,
): Promise<StatoDisponibilita> {
  const { data: risultato, error } = await supabase.rpc('stato_disponibilita_azienda', {
    p_company_id: companyId,
    p_market_id: marketId,
    ...(data ? { p_data: data } : {}),
  })
  if (error) throw error
  return risultato as StatoDisponibilita
}

/** Se l'azienda è bloccata ora in questo mercato, la data di fine blocco. Altrimenti null. */
export async function getBloccoAttivoFinoA(companyId: string, marketId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('blocco_attivo_fino_a', {
    p_company_id: companyId, p_market_id: marketId,
  })
  if (error) throw error
  return data as string | null
}
