/**
 * Serie storiche e metriche operative per l'area amministrazione.
 *
 * Tutte le aggregazioni girano nel database (funzioni SECURITY DEFINER
 * che verificano il ruolo admin): il browser riceve poche decine di
 * righe gia' sommate, mai i documenti di partenza.
 *
 * Il livello e l'ambito seguono la stessa gerarchia della panoramica:
 * italia -> regione -> provincia -> comune -> quartiere -> mercato.
 */
import { supabase, DataError } from './client'

/** I livelli su cui si puo' calcolare una serie. Include 'mercato'. */
export const LIVELLI_SERIE = [
  'italia', 'regione', 'provincia', 'comune', 'quartiere', 'mercato',
] as const
export type LivelloSerie = (typeof LIVELLI_SERIE)[number]

export interface MeseSerie {
  mese: string
  ordini_numero: number
  ordini_valore: number
  ddt_numero: number
  merce_valore: number
  merce_quantita: number
  affitti_valore: number
  aziende_attive: number
  clienti_attivi: number
  /** Quante righe DDT hanno un prezzo di catalogo: la copertura della stima. */
  righe_con_prezzo: number
  righe_totali: number
}

export interface MetricheOperative {
  aziende_totali: number
  aziende_con_ddt: number
  aziende_con_catalogo: number
  aziende_dormienti: number
  prodotti_totali: number
  prodotti_disponibili: number
  clienti_con_ordini: number
  clienti_ricorrenti: number
  ordini_totali: number
  scontrino_medio: number
  ddt_firma_media_gg: number
  ddt_non_firmati: number
  recensione_media: number
  bisogni_aperti: number
  affitti_non_saldati: number
}

export interface VoceComposizione {
  tipo: 'categoria' | 'azienda' | 'mercato'
  etichetta: string
  valore: number
  quantita: number
  numero: number
}

export interface Periodo {
  dal?: string
  al?: string
}

/** Serie mensile continua: i mesi senza dati tornano a zero, non mancano. */
export async function getSerieStorica(
  livello: LivelloSerie,
  ambito: string | null = null,
  mesi = 24,
): Promise<MeseSerie[]> {
  const { data, error } = await supabase.rpc('serie_storica_fatturato', {
    p_livello: livello, p_ambito: ambito, p_mesi: mesi,
  } as never)
  if (error) throw new DataError(`Serie storica: ${error.message}`, error)
  return (data as unknown as MeseSerie[]) ?? []
}

export async function getMetricheOperative(
  livello: LivelloSerie,
  ambito: string | null = null,
  p: Periodo = {},
): Promise<MetricheOperative | null> {
  const { data, error } = await supabase.rpc('metriche_operative', {
    p_livello: livello, p_ambito: ambito,
    p_dal: p.dal ?? null, p_al: p.al ?? null,
  } as never)
  if (error) throw new DataError(`Metriche operative: ${error.message}`, error)
  const righe = data as unknown as MetricheOperative[]
  return righe?.[0] ?? null
}

export async function getComposizione(
  livello: LivelloSerie,
  ambito: string | null = null,
  p: Periodo & { limite?: number } = {},
): Promise<VoceComposizione[]> {
  const { data, error } = await supabase.rpc('composizione_fatturato', {
    p_livello: livello, p_ambito: ambito,
    p_dal: p.dal ?? null, p_al: p.al ?? null,
    p_limite: p.limite ?? 8,
  } as never)
  if (error) throw new DataError(`Composizione: ${error.message}`, error)
  return (data as unknown as VoceComposizione[]) ?? []
}
