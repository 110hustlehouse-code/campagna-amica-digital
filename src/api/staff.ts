/** Staff di mercato, comunicazioni ed eventi. */
import { supabase, unwrapOne, unwrapMany, DataError } from './client'
import type { Tables, TablesInsert, TablesUpdate } from './types'

export type StaffMember = Tables<'staff_members'>
export type StaffMessage = Tables<'staff_messages'>
export type StaffMessageRead = Tables<'staff_message_reads'>
export type MessageType = StaffMessage['type']

/** Mercato di competenza dello staff collegato. Null se non e' staff. */
export async function getMyMarketId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null
  const { data, error } = await supabase
    .from('staff_members').select('market_id')
    .ilike('email', user.email).eq('is_active', true).maybeSingle()
  if (error) throw error
  return data?.market_id ?? null
}

export async function getStaffByMarket(marketId: string): Promise<StaffMember[]> {
  return unwrapMany(
    await supabase.from('staff_members').select('*')
      .eq('market_id', marketId).eq('is_active', true).order('full_name'),
    'Team del mercato')
}

export async function addStaffMember(m: TablesInsert<'staff_members'>): Promise<StaffMember> {
  return unwrapOne(await supabase.from('staff_members').insert(m).select().single(),
    'Aggiunta membro dello staff')
}

export async function updateStaffMember(
  id: string, patch: TablesUpdate<'staff_members'>,
): Promise<StaffMember> {
  return unwrapOne(
    await supabase.from('staff_members').update(patch).eq('id', id).select().single(),
    'Aggiornamento membro dello staff')
}

/** Comunicazioni pubblicate di un mercato, dalla piu' recente. */
export async function getPublishedMessages(marketId: string): Promise<StaffMessage[]> {
  return unwrapMany(
    await supabase.from('staff_messages').select('*')
      .eq('market_id', marketId).eq('is_published', true)
      .order('event_date', { ascending: false }),
    'Comunicazioni del mercato')
}

/** Tutte le comunicazioni, bozze comprese: visibile solo allo staff. */
export async function getAllMessages(marketId: string): Promise<StaffMessage[]> {
  return unwrapMany(
    await supabase.from('staff_messages').select('*')
      .eq('market_id', marketId).order('event_date', { ascending: false }),
    'Tutte le comunicazioni')
}

export async function createMessage(m: TablesInsert<'staff_messages'>): Promise<StaffMessage> {
  return unwrapOne(await supabase.from('staff_messages').insert(m).select().single(),
    'Creazione comunicazione')
}

export async function publishMessage(id: string): Promise<StaffMessage> {
  return unwrapOne(
    await supabase.from('staff_messages').update({ is_published: true })
      .eq('id', id).select().single(),
    'Pubblicazione comunicazione')
}

export async function deleteMessage(id: string): Promise<void> {
  const { error } = await supabase.from('staff_messages').delete().eq('id', id)
  if (error) throw error
}

/** Segna una comunicazione come letta dal produttore collegato. */
export async function markMessageRead(
  messageId: string,
  companyId: string | null,
  feedback?: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return
  const { error } = await supabase.from('staff_message_reads').upsert({
    message_id: messageId,
    producer_email: user.email,
    company_id: companyId,
    read_at: new Date().toISOString(),
    ...(feedback !== undefined ? { feedback } : {}),
  }, { onConflict: 'message_id,producer_email' })
  if (error) throw error
}

export async function getMessageReads(messageId: string): Promise<StaffMessageRead[]> {
  return unwrapMany(
    await supabase.from('staff_message_reads').select('*').eq('message_id', messageId),
    'Letture della comunicazione')
}

export function subscribeMessages(marketId: string, onChange: () => void): () => void {
  const ch = supabase
    .channel(`staff_messages:${marketId}`)
    .on('postgres_changes',
        { event: '*', schema: 'public', table: 'staff_messages',
          filter: `market_id=eq.${marketId}` }, onChange)
    .subscribe()
  return () => { void supabase.removeChannel(ch) }
}

/** Tutti i membri dello staff visibili all'utente (RLS limita al proprio mercato). */
export async function getAllStaffMembers(): Promise<StaffMember[]> {
  return unwrapMany(
    await supabase.from('staff_members').select('*').order('full_name'),
    'Elenco staff')
}

export async function deleteStaffMember(id: string): Promise<void> {
  const { error } = await supabase.from('staff_members').delete().eq('id', id)
  if (error) throw error
}

/** Comunicazioni di tutti i mercati visibili (per la pagina redazionale). */
export async function getAllStaffMessages(): Promise<StaffMessage[]> {
  return unwrapMany(
    await supabase.from('staff_messages').select('*')
      .order('created_date', { ascending: false }),
    'Comunicazioni')
}

export async function updateMessage(
  id: string, patch: TablesUpdate<'staff_messages'>,
): Promise<StaffMessage> {
  return unwrapOne(
    await supabase.from('staff_messages').update(patch).eq('id', id).select().single(),
    'Aggiornamento comunicazione')
}

/** Comunicazioni pubblicate di tutti i mercati (bacheca generale). */
export async function getPublishedMessagesAll(limite = 20): Promise<StaffMessage[]> {
  return unwrapMany(
    await supabase.from('staff_messages').select('*')
      .eq('is_published', true).order('created_date', { ascending: false }).limit(limite),
    'Bacheca')
}

/** Comunicazioni per tipo (eventi, chiusure, aperture straordinarie). */
export async function getMessagesByType(tipo: StaffMessage['type']): Promise<StaffMessage[]> {
  return unwrapMany(
    await supabase.from('staff_messages').select('*')
      .eq('type', tipo).order('event_date', { ascending: false }),
    'Comunicazioni per tipo')
}

/** Record staff dell'utente collegato, o null se non e' staff. */
export async function getMyStaffMember(): Promise<StaffMember | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null
  const { data, error } = await supabase
    .from('staff_members').select('*')
    .ilike('email', user.email).eq('is_active', true)
    .order('updated_date', { ascending: false }).limit(1).maybeSingle()
  if (error) throw error
  return data
}

/** Numero di bisogni ancora aperti in un mercato (per il badge). */
export async function contaBisogniAperti(marketId: string): Promise<number> {
  const { count, error } = await supabase
    .from('company_needs')
    .select('*', { count: 'exact', head: true })
    .eq('market_id', marketId).eq('status', 'open')
  if (error) throw error
  return count ?? 0
}

/**
 * Associa l'utente collegato a un mercato come staff.
 * Se il record esiste lo aggiorna, altrimenti lo crea.
 */
export async function confermaMercatoStaff(marketId: string): Promise<StaffMember> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) throw new DataError('Nessun utente collegato')

  const { data: profilo } = await supabase
    .from('profiles').select('full_name').eq('id', user.id).maybeSingle()
  const nome = profilo?.full_name ?? user.email

  const { data: esistente } = await supabase
    .from('staff_members').select('*').ilike('email', user.email).maybeSingle()

  if (esistente) {
    return unwrapOne(
      await supabase.from('staff_members')
        .update({ market_id: marketId, market_confirmed: true, full_name: nome, is_active: true })
        .eq('id', esistente.id).select().single(),
      'Conferma mercato')
  }

  return unwrapOne(
    await supabase.from('staff_members').insert({
      email: user.email, full_name: nome, market_id: marketId,
      market_confirmed: true, position: 'market_manager', is_active: true,
    }).select().single(),
    'Iscrizione staff al mercato')
}
