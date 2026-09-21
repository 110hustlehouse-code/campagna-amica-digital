/**
 * Autenticazione e profilo utente.
 *
 * Il ruolo NON viene mai deciso dal browser: e' un campo della tabella
 * profiles, scritto da trigger lato database. Il bottone "Accesso
 * amministrazione" nella pagina di login si limita ad avviare l'accesso
 * Google; e' il database, tramite admin_whitelist, a stabilire se quella
 * persona e' un amministratore.
 */
import { supabase, DataError } from './client'
import type { Tables } from './types'

export type Profile = Tables<'users'>
export type Role = Profile['role']

/** Avvia l'accesso con Google. Al ritorno l'utente e' autenticato. */
export async function signInWithGoogle(redirectTo?: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectTo ?? `${window.location.origin}/` },
  })
  if (error) throw new DataError(`Accesso Google non riuscito: ${error.message}`)
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw new DataError(`Uscita non riuscita: ${error.message}`)
}

/** Profilo dell'utente collegato, o null se non autenticato. */
export async function getMyProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('users').select('*').eq('id', user.id).maybeSingle()
  if (error) throw new DataError(`Lettura profilo: ${error.message}`)
  return data
}

/**
 * Conferma il ruolo scelto nella schermata di benvenuto.
 *
 * Un utente non puo' promuoversi ad admin: la policy consente di
 * aggiornare solo il proprio profilo, e il tipo qui esclude 'admin'.
 * Il ruolo admin arriva unicamente dalla whitelist lato database.
 */
export async function confirmRole(role: Exclude<Role, 'admin'>): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new DataError('Nessun utente collegato')

  const { data, error } = await supabase
    .from('users')
    .update({ role, role_confirmed: true })
    .eq('id', user.id)
    .select()
    .single()
  if (error) throw new DataError(`Conferma ruolo: ${error.message}`)
  return data
}

/** Vero se l'utente collegato e' un amministratore. */
export async function isAdmin(): Promise<boolean> {
  const p = await getMyProfile()
  return p?.role === 'admin'
}

/** Notifica i cambi di sessione (login, logout, refresh del token). */
export function onAuthChange(cb: (signedIn: boolean) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(!!session))
  return () => data.subscription.unsubscribe()
}

/**
 * Aggiorna i dati del proprio profilo.
 * Ruolo e conferma ruolo non passano da qui: hanno funzioni dedicate e
 * regole proprie.
 */
export async function aggiornaProfilo(
  patch: { full_name?: string; phone?: string; avatar_url?: string },
): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new DataError('Nessun utente collegato')
  const { data, error } = await supabase
    .from('users').update(patch).eq('id', user.id).select().single()
  if (error) throw new DataError(`Aggiornamento profilo: ${error.message}`)
  return data
}
