/** Eventi di mercato e adesioni dei produttori. */
import { supabase, unwrapOne, unwrapMany } from './client'
import type { Tables, TablesInsert } from './types'

export type MarketEvent = Tables<'market_events'>
export type Rsvp = Tables<'producer_event_rsvps'>
export type RsvpStatus = Rsvp['status']
export type Assignment = Tables<'company_market_assignments'>

export async function getEventsByMarket(marketId: string, dal?: string): Promise<MarketEvent[]> {
  let q = supabase.from('market_events').select('*').eq('market_id', marketId)
  if (dal) q = q.gte('event_date', dal)
  return unwrapMany(await q.order('event_date'), 'Eventi del mercato')
}

export async function createEvent(e: TablesInsert<'market_events'>): Promise<MarketEvent> {
  return unwrapOne(await supabase.from('market_events').insert(e).select().single(),
    'Creazione evento')
}

export async function getRsvpsByMarket(marketId: string): Promise<Rsvp[]> {
  return unwrapMany(
    await supabase.from('producer_event_rsvps').select('*').eq('market_id', marketId),
    'Adesioni del mercato')
}

export async function getMyRsvps(companyId: string): Promise<Rsvp[]> {
  return unwrapMany(
    await supabase.from('producer_event_rsvps').select('*').eq('company_id', companyId),
    'Le mie adesioni')
}

/** Adesione o rifiuto. Un produttore risponde una sola volta per evento. */
export async function rispondiEvento(
  messageId: string, companyId: string, marketId: string, status: RsvpStatus,
): Promise<Rsvp> {
  const { data: { user } } = await supabase.auth.getUser()
  return unwrapOne(
    await supabase.from('producer_event_rsvps').upsert({
      message_id: messageId,
      company_id: companyId,
      market_id: marketId,
      producer_email: user?.email ?? '',
      status,
    }, { onConflict: 'message_id,company_id' }).select().single(),
    'Risposta all\'evento')
}

export async function getAssignments(eventId: string): Promise<Assignment[]> {
  return unwrapMany(
    await supabase.from('company_market_assignments').select('*')
      .eq('market_event_id', eventId),
    'Assegnazioni banchi')
}

export async function assignStand(a: TablesInsert<'company_market_assignments'>): Promise<Assignment> {
  return unwrapOne(
    await supabase.from('company_market_assignments').upsert(a, {
      onConflict: 'company_id,market_event_id',
    }).select().single(),
    'Assegnazione banco')
}

/** Comunicazioni facoltative di un mercato: quelle che richiedono adesione. */
export async function getOptionalMessages(marketId: string) {
  return unwrapMany(
    await supabase.from('staff_messages').select('*')
      .eq('market_id', marketId).eq('is_mandatory', false)
      .order('event_date', { ascending: false }).limit(50),
    'Eventi facoltativi')
}

/** Tutti gli eventi di mercato visibili. */
export async function getAllMarketEvents(): Promise<MarketEvent[]> {
  return unwrapMany(
    await supabase.from('market_events').select('*')
      .order('event_date', { ascending: false }),
    'Tutti gli eventi')
}

export async function getAssignmentsByCompany(companyId: string): Promise<Assignment[]> {
  return unwrapMany(
    await supabase.from('company_market_assignments').select('*').eq('company_id', companyId),
    'Assegnazioni azienda')
}
