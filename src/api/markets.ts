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
