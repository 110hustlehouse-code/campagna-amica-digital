/** Chat di gruppo staff-staff per mercato. */
import { supabase, unwrapOne, unwrapMany } from './client'
import type { Tables, TablesInsert } from './types'

export type StaffChatMessage = Tables<'staff_chat_messages'>

export async function getChatMessages(marketId: string): Promise<StaffChatMessage[]> {
  return unwrapMany(
    await supabase.from('staff_chat_messages').select('*')
      .eq('market_id', marketId).order('created_at', { ascending: true }),
    'Messaggi chat staff')
}

export async function sendChatMessage(m: TablesInsert<'staff_chat_messages'>): Promise<StaffChatMessage> {
  return unwrapOne(
    await supabase.from('staff_chat_messages').insert(m).select().single(),
    'Invio messaggio')
}

export async function deleteChatMessage(id: string): Promise<void> {
  const { error } = await supabase.from('staff_chat_messages').delete().eq('id', id)
  if (error) throw error
}
