/**
 * Documento di Trasporto.
 *
 * Il ciclo di vita non passa da qui. Emissione, firma e annullamento sono
 * Edge Function che girano con la service key: il numero progressivo deve
 * essere assegnato lato server con lock, altrimenti due emissioni simultanee
 * possono ottenere lo stesso numero — e una numerazione fiscale con un buco
 * o un duplicato e' un problema che si scopre mesi dopo, in un controllo.
 *
 * Questo modulo si limita a leggere, a creare bozze e a chiamare quelle
 * funzioni. Non aggira nessuna regola: le espone in modo leggibile.
 */
import { supabase, DataError, unwrapMany, unwrapOne } from './client'
import { invokeFunction } from './functions'
import type { Tables, TablesInsert, TablesUpdate } from './types'

export type Ddt = Tables<'delivery_notes'>
export type DdtRiga = Tables<'delivery_note_items'>
export type DdtStato = Ddt['status']
export type DdtCausale = Ddt['causale']

export interface DdtCompleto extends Ddt {
  righe: DdtRiga[]
}

/** Numero leggibile: progressivo/anno, oppure null finche' e' in bozza. */
export function numeroCompleto(d: Pick<Ddt, 'progressive_number' | 'progressive_year'>): string | null {
  return d.progressive_number == null ? null : `${d.progressive_number}/${d.progressive_year}`
}

export async function getDdtByCompany(companyId: string, anno?: number): Promise<Ddt[]> {
  let q = supabase.from('delivery_notes').select('*').eq('company_id', companyId)
  if (anno) q = q.eq('progressive_year', anno)
  return unwrapMany(await q.order('issue_date', { ascending: false }), 'DDT azienda')
}

export async function getDdtByMarket(marketId: string, dal?: string, al?: string): Promise<Ddt[]> {
  let q = supabase.from('delivery_notes').select('*').eq('market_id', marketId)
  if (dal) q = q.gte('issue_date', dal)
  if (al) q = q.lte('issue_date', al)
  return unwrapMany(await q.order('issue_date', { ascending: false }), 'DDT mercato')
}

export async function getDdt(id: string): Promise<DdtCompleto | null> {
  const { data, error } = await supabase
    .from('delivery_notes').select('*, delivery_note_items(*)').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return null
  const { delivery_note_items, ...testata } = data as Ddt & { delivery_note_items: DdtRiga[] }
  return {
    ...testata,
    righe: [...delivery_note_items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
  }
}

/**
 * Crea una bozza con le sue righe.
 *
 * Numero e anno restano nulli: li assegna l'emissione. Una bozza
 * abbandonata non deve bruciare un numero fiscale.
 */
export async function creaBozzaDdt(
  testata: Omit<TablesInsert<'delivery_notes'>, 'progressive_number' | 'progressive_year' | 'status'>,
  righe: Omit<TablesInsert<'delivery_note_items'>, 'delivery_note_id' | 'position'>[],
): Promise<DdtCompleto> {
  if (righe.length === 0) {
    throw new DataError('Un DDT deve contenere almeno una riga')
  }

  const nuova: TablesInsert<'delivery_notes'> = { ...testata, status: 'draft' }
  const ddt = unwrapOne(
    await supabase.from('delivery_notes').insert(nuova).select().single(),
    'Creazione bozza DDT')

  const { error } = await supabase.from('delivery_note_items').insert(
    righe.map((r, i) => ({ ...r, delivery_note_id: ddt.id, position: i + 1 })))

  if (error) {
    // La testata senza righe non serve a nessuno: si rimuove.
    await supabase.from('delivery_notes').delete().eq('id', ddt.id)
    throw new DataError(`Righe DDT: ${error.message}`, error)
  }

  return (await getDdt(ddt.id))!
}

export async function aggiornaBozza(
  id: string,
  patch: TablesUpdate<'delivery_notes'>,
): Promise<Ddt> {
  return unwrapOne(
    await supabase.from('delivery_notes').update(patch).eq('id', id).select().single(),
    'Aggiornamento bozza DDT')
}

/**
 * Emette il documento: assegna il progressivo e lo rende immutabile.
 * La numerazione e' presa dal database con lock di riga dentro la Edge
 * Function, quindi due emissioni contemporanee non collidono.
 */
export async function emettiDdt(id: string): Promise<DdtCompleto> {
  await invokeFunction('issueDdt', { deliveryNoteId: id })
  return (await getDdt(id))!
}

/**
 * Firma di ricevuta del destinatario. Sostituisce il vecchio
 * "segna consegnato": qui la consegna non e' un flag, e' una firma
 * con data e autore — che e' cio' che rende il documento una prova.
 */
export async function firmaDdt(id: string): Promise<Ddt> {
  await invokeFunction('signDdt', { deliveryNoteId: id })
  return (await getDdt(id))! as Ddt
}

export async function annullaDdt(id: string, motivo: string): Promise<Ddt> {
  if (!motivo.trim()) throw new DataError('Indicare il motivo dell\'annullamento')
  await invokeFunction('cancelDdt', { deliveryNoteId: id, reason: motivo })
  return (await getDdt(id))! as Ddt
}

/** Genera il PDF del documento e restituisce l'URL da cui scaricarlo. */
export async function pdfDdt(id: string): Promise<{ url: string }> {
  return invokeFunction<{ url: string }>('exportDdtPDF', { deliveryNoteId: id })
}

/**
 * Totali del documento.
 *
 * Calcolati qui e non nel database perche' le righe non portano un prezzo:
 * un DDT non e' una fattura. Quantita' e peso sono dati reali; il valore,
 * quando serve, si stima altrove sul prezzo di catalogo.
 */
export async function totaliDdt(id: string): Promise<{
  righe: number; quantita: number; peso_kg: number
}> {
  const { data, error } = await supabase
    .from('delivery_note_items').select('quantity, weight_kg').eq('delivery_note_id', id)
  if (error) throw error
  const righe = data ?? []
  return {
    righe: righe.length,
    quantita: righe.reduce((s, r) => s + Number(r.quantity ?? 0), 0),
    peso_kg: righe.reduce((s, r) => s + Number(r.weight_kg ?? 0), 0),
  }
}

export const ETICHETTE_STATO: Record<NonNullable<DdtStato>, string> = {
  draft: 'Bozza',
  issued: 'Emesso',
  cancelled: 'Annullato',
}

export const ETICHETTE_CAUSALE: Record<NonNullable<DdtCausale>, string> = {
  vendita: 'Vendita',
  conto_vendita: 'Conto vendita',
  conto_deposito: 'Conto deposito',
  reso: 'Reso',
  omaggio: 'Omaggio',
  campionatura: 'Campionatura',
  conto_lavorazione: 'Conto lavorazione',
  conto_visione: 'Conto visione',
  trasferimento_interno: 'Trasferimento interno',
}

export const ETICHETTE_TRASPORTO: Record<string, string> = {
  mittente: 'A cura del mittente',
  vettore: 'A cura del vettore',
  destinatario: 'A cura del destinatario',
}
/**
 * Prodotti coperti da un DDT emesso per un'azienda in una data.
 * Usata per avvisare il produttore, alla conferma di un ordine, se
 * qualche articolo ordinato non risulta arrivato al mercato quel
 * giorno — protegge sia il cliente (niente conferme di merce che non
 * c'è) sia Campagna Amica (tracciabilità).
 */
export async function getProdottiCopertiDaDdt(companyId: string, data: string): Promise<Set<string>> {
  const { data: ddt } = await supabase
    .from('delivery_notes')
    .select('id, delivery_note_items(product_id)')
    .eq('company_id', companyId)
    .eq('transport_date', data)
    .eq('status', 'issued')

  const idsCoperti = new Set<string>()
  for (const doc of ddt ?? []) {
    for (const riga of (doc as any).delivery_note_items ?? []) {
      if (riga.product_id) idsCoperti.add(riga.product_id)
    }
  }
  return idsCoperti
}
/**
 * True se il produttore ha ancora qualcosa da fare oggi sul DDT:
 * almeno un mercato aperto oggi (fra quelli dell'azienda) senza
 * ancora un DDT emesso né un'assenza dichiarata. Usata per decidere
 * se mostrare il tab DDT nella bottom bar.
 */
export async function haAncoraDdtDaFareOggi(companyId: string, marketIds: string[]): Promise<boolean> {
  if (!marketIds.length) return false
  const oggi = new Date().toISOString().slice(0, 10)

  for (const marketId of marketIds) {
    const { data: aperto } = await supabase.rpc('is_market_open_on', { p_market_id: marketId, p_data: oggi })
    if (!aperto) continue

    const { count: ddtCount } = await supabase
      .from('delivery_notes').select('id', { count: 'exact', head: true })
      .eq('company_id', companyId).eq('market_id', marketId)
      .eq('transport_date', oggi).eq('status', 'issued')
    if ((ddtCount ?? 0) > 0) continue

    const { count: absenceCount } = await supabase
      .from('absences').select('id', { count: 'exact', head: true })
      .eq('company_id', companyId).eq('market_id', marketId).eq('absence_date', oggi)
    if ((absenceCount ?? 0) > 0) continue

    return true // almeno un mercato aperto oggi senza DDT né assenza: c'è ancora da fare
  }
  return false
}