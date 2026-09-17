/**
 * Documento di Trasporto.
 *
 * Regole imposte dal database, non da questo file:
 *  - il numero progressivo si ottiene solo all'emissione (emetti_ddt)
 *  - un DDT emesso non e' piu' modificabile: si annulla e si riemette
 *  - le righe si possono toccare solo finche' il documento e' in bozza
 *
 * Qui non si aggirano quelle regole: le si espone in modo leggibile.
 */
import { supabase, DataError, unwrapMany, unwrapOne } from './client'
import type { Tables, TablesInsert, TablesUpdate } from './types'

export type Ddt = Tables<'ddt'>
export type DdtRiga = Tables<'ddt_righe'>
export type DdtStato = Ddt['stato']
export type DdtCausale = Ddt['causale']

export interface DdtCompleto extends Ddt {
  righe: DdtRiga[]
}

export async function getDdtByCompany(companyId: string, anno?: number): Promise<Ddt[]> {
  let q = supabase.from('ddt').select('*').eq('company_id', companyId)
  if (anno) q = q.eq('anno', anno)
  return unwrapMany(await q.order('data_documento', { ascending: false }), 'DDT dell\'azienda')
}

export async function getDdtByMarket(marketId: string, dal?: string, al?: string): Promise<Ddt[]> {
  let q = supabase.from('ddt').select('*').eq('market_id', marketId)
  if (dal) q = q.gte('data_documento', dal)
  if (al) q = q.lte('data_documento', al)
  return unwrapMany(await q.order('data_documento', { ascending: false }), 'DDT del mercato')
}

export async function getDdt(id: string): Promise<DdtCompleto | null> {
  const { data, error } = await supabase
    .from('ddt').select('*, ddt_righe(*)').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return null
  const { ddt_righe, ...testata } = data as Ddt & { ddt_righe: DdtRiga[] }
  return {
    ...testata,
    righe: [...ddt_righe].sort((a, b) => a.riga_numero - b.riga_numero),
  }
}

/**
 * Crea una bozza con le sue righe.
 *
 * I dati fiscali del mittente vengono copiati dall'anagrafica azienda e
 * congelati nel documento: se domani l'azienda cambia ragione sociale, i
 * DDT gia' emessi devono restare come erano.
 */
export async function creaBozzaDdt(
  testata: Omit<TablesInsert<'ddt'>, 'numero' | 'anno' | 'stato'>,
  righe: Omit<TablesInsert<'ddt_righe'>, 'ddt_id' | 'riga_numero'>[],
): Promise<DdtCompleto> {
  if (righe.length === 0) {
    throw new DataError('Un DDT deve contenere almeno una riga')
  }

  const nuova: TablesInsert<'ddt'> = { ...testata, stato: 'bozza' }
  const ddt = unwrapOne(
    await supabase.from('ddt').insert(nuova).select().single(),
    'Creazione bozza DDT')

  const { error } = await supabase.from('ddt_righe').insert(
    righe.map((r, i) => ({ ...r, ddt_id: ddt.id, riga_numero: i + 1 })))

  if (error) {
    // La testata senza righe non serve a nessuno: si rimuove.
    await supabase.from('ddt').delete().eq('id', ddt.id)
    throw new DataError(`Righe DDT: ${error.message}`, error)
  }

  return (await getDdt(ddt.id))!
}

export async function aggiornaBozza(id: string, patch: TablesUpdate<'ddt'>): Promise<Ddt> {
  return unwrapOne(
    await supabase.from('ddt').update(patch).eq('id', id).select().single(),
    'Aggiornamento bozza DDT')
}

/**
 * Emette il documento: assegna il progressivo e lo rende immutabile.
 * La numerazione e' gestita dal database con lock di riga, quindi due
 * emissioni contemporanee non possono ottenere lo stesso numero.
 */
export async function emettiDdt(id: string): Promise<DdtCompleto> {
  const { error } = await supabase.rpc('emetti_ddt', { p_ddt_id: id })
  if (error) throw new DataError(`Emissione DDT: ${error.message}`, error)
  return (await getDdt(id))!
}

export async function segnaConsegnato(id: string, firmatoDa?: string): Promise<Ddt> {
  return unwrapOne(
    await supabase.from('ddt')
      .update({ stato: 'consegnato', data_consegna: new Date().toISOString(),
                firmato_da: firmatoDa ?? null })
      .eq('id', id).select().single(),
    'Consegna DDT')
}

export async function annullaDdt(id: string, motivo: string): Promise<Ddt> {
  if (!motivo.trim()) throw new DataError('Indicare il motivo dell\'annullamento')
  return unwrapOne(
    await supabase.from('ddt')
      .update({ stato: 'annullato', data_annullamento: new Date().toISOString(),
                motivo_annullamento: motivo })
      .eq('id', id).select().single(),
    'Annullamento DDT')
}

/** Totali di un documento, calcolati dal database. */
export async function totaliDdt(id: string) {
  const { data, error } = await supabase
    .from('v_ddt_totali').select('*').eq('ddt_id', id).maybeSingle()
  if (error) throw error
  return data
}

export const ETICHETTE_STATO: Record<DdtStato, string> = {
  bozza: 'Bozza',
  emesso: 'Emesso',
  consegnato: 'Consegnato',
  annullato: 'Annullato',
}

export const ETICHETTE_CAUSALE: Record<DdtCausale, string> = {
  vendita: 'Vendita',
  conto_visione: 'Conto visione',
  conto_deposito: 'Conto deposito',
  reso: 'Reso',
  trasferimento: 'Trasferimento',
  omaggio: 'Omaggio',
  riparazione: 'Riparazione',
  altro: 'Altro',
}
