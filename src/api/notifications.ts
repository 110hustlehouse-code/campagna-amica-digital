/**
 * Notifiche.
 *
 * Le notifiche vengono CREATE dalle Edge Functions con la service key,
 * non dal browser: un utente non puo' scrivere notifiche a un altro.
 * Qui si leggono e si segnano come lette.
 */
import { supabase, unwrapOne, unwrapMany } from './client'
import type { Tables } from './types'

export type Notification = Tables<'notifications'>

export async function getMyNotifications(soloNonLette = false): Promise<Notification[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return []
  let q = supabase.from('notifications').select('*').ilike('user_email', user.email)
  if (soloNonLette) q = q.eq('read', false)
  return unwrapMany(await q.order('created_at', { ascending: false }).limit(100),
    'Notifiche')
}

export async function contaNonLette(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return 0
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .ilike('user_email', user.email).eq('read', false)
  if (error) throw error
  return count ?? 0
}

export async function segnaLetta(id: string): Promise<Notification> {
  return unwrapOne(
    await supabase.from('notifications').update({ read: true })
      .eq('id', id).select().single(),
    'Notifica letta')
}

export async function segnaTutteLette(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return
  const { error } = await supabase.from('notifications')
    .update({ read: true }).ilike('user_email', user.email).eq('read', false)
  if (error) throw error
}

export async function eliminaNotifica(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', id)
  if (error) throw error
}

/** Notifiche in tempo reale per l'utente collegato. */
export function subscribeNotifications(email: string, onChange: () => void): () => void {
  const ch = supabase
    .channel(`notifications:${email}`)
    .on('postgres_changes',
        { event: '*', schema: 'public', table: 'notifications',
          filter: `user_email=eq.${email}` }, onChange)
    .subscribe()
  return () => { void supabase.removeChannel(ch) }
}
