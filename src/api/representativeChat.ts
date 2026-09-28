/** Canale diretto tra il rappresentante produttori e il coordinatore/responsabile del mercato. */
import { supabase, unwrapOne, unwrapMany } from './client'
import type { Tables, TablesInsert } from './types'

export type RepresentativeChatMessage = Tables<'representative_chat_messages'>

export async function getRepresentativeChatMessages(marketId: string): Promise<RepresentativeChatMessage[]> {
  return unwrapMany(
    await supabase.from('representative_chat_messages').select('*')
      .eq('market_id', marketId).order('created_at', { ascending: true }),
    'Messaggi canale rappresentante')
}

export async function sendRepresentativeChatMessage(m: TablesInsert<'representative_chat_messages'>): Promise<RepresentativeChatMessage> {
  return unwrapOne(
    await supabase.from('representative_chat_messages').insert(m).select().single(),
    'Invio messaggio')
}

export async function deleteRepresentativeChatMessage(id: string): Promise<void> {
  const { error } = await supabase.from('representative_chat_messages').delete().eq('id', id)
  if (error) throw error
}
