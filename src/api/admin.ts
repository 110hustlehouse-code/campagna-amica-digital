/**
 * Area amministrazione.
 *
 * Le aggregazioni girano nel database, non nel browser: sommare
 * l'archivio DDT nazionale lato client significherebbe scaricarlo
 * tutto a ogni apertura della pagina.
 */
import { supabase, DataError } from './client'

/** I livelli in cui si puo' scendere, nell'ordine. */
export const LIVELLI = ['italia', 'regione', 'provincia', 'comune', 'quartiere'] as const
export type Livello = (typeof LIVELLI)[number]

/** Cosa si vede a ciascun livello: l'etichetta di quello sotto. */
export const ETICHETTA_LIVELLO: Record<Livello, string> = {
  italia: 'Regioni',
  regione: 'Province',
  provincia: 'Comuni',
  comune: 'Quartieri',
  quartiere: 'Mercati',
}

export interface RigaTerritorio {
  chiave: string
  nome: string
  mercati: number
  aziende: number
  ddt_emessi: number
  ddt_consegnati: number
  quantita_totale: number
  valore_merce: number
  ordini: number
  prodotti: number
}

export interface Riepilogo {
  mercati_attivi: number
  aziende: number
  produttori: number
  clienti: number
  ddt_emessi: number
  ddt_consegnati: number
  ddt_annullati: number
  quantita_totale: number
  valore_merce: number
  ordini: number
  regioni_coperte: number
}

export interface DdtNazionale {
  id: string
  numero_completo: string | null
  data_documento: string
  mittente: string
  destinatario: string
  stato: string
  causale: string
  mercato: string | null
  comune: string | null
  provincia: string | null
  regione: string | null
  quantita: number
  valore: number
}

export interface Periodo {
  dal?: string
  al?: string
}

export async function getRiepilogo(p: Periodo = {}): Promise<Riepilogo> {
  const { data, error } = await supabase.rpc('riepilogo_nazionale', {
    p_dal: p.dal ?? null, p_al: p.al ?? null,
  } as never)
  if (error) throw new DataError(`Riepilogo: ${error.message}`, error)
  const righe = data as unknown as Riepilogo[]
  return righe?.[0] ?? {
    mercati_attivi: 0, aziende: 0, produttori: 0, clienti: 0,
    ddt_emessi: 0, ddt_consegnati: 0, ddt_annullati: 0,
    quantita_totale: 0, valore_merce: 0, ordini: 0, regioni_coperte: 0,
  }
}

/**
 * Esplode un territorio nel livello immediatamente sotto.
 * `ambito` e' la chiave restituita dal livello precedente.
 */
export async function getTerritorio(
  livello: Livello,
  ambito: string | null = null,
  p: Periodo = {},
): Promise<RigaTerritorio[]> {
  const { data, error } = await supabase.rpc('metriche_territorio', {
    p_livello: livello, p_ambito: ambito,
    p_dal: p.dal ?? null, p_al: p.al ?? null,
  } as never)
  if (error) throw new DataError(`Territorio: ${error.message}`, error)
  return (data as unknown as RigaTerritorio[]) ?? []
}

export async function getDdtNazionali(opzioni: {
  dal?: string; al?: string; regione?: string; stato?: string; limite?: number
} = {}): Promise<DdtNazionale[]> {
  const { data, error } = await supabase.rpc('ddt_nazionali', {
    p_dal: opzioni.dal ?? null,
    p_al: opzioni.al ?? null,
    p_regione: opzioni.regione ?? null,
    p_stato: opzioni.stato ?? null,
    p_limite: opzioni.limite ?? 100,
  } as never)
  if (error) throw new DataError(`Registro DDT: ${error.message}`, error)
  return (data as unknown as DdtNazionale[]) ?? []
}

/** Il livello successivo, o null se si e' in fondo. */
export function livelloSuccessivo(l: Livello): Livello | null {
  const i = LIVELLI.indexOf(l)
  return i >= 0 && i < LIVELLI.length - 1 ? LIVELLI[i + 1] : null
}
