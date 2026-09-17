/**
 * Client Supabase — unico punto di configurazione dell'applicazione.
 *
 * Nessun altro file crea un client. Nessun file contiene chiavi: URL e
 * chiave anonima arrivano dalle variabili d'ambiente (.env.local in
 * sviluppo, impostazioni di progetto su Vercel in produzione).
 *
 * La chiave anon e' pubblica per definizione: viaggia nel browser. Cio'
 * che protegge i dati sono le policy RLS, non la segretezza della chiave.
 * La service key NON deve mai comparire nel frontend: vive solo nelle
 * Edge Functions.
 */
import { createClient } from '@supabase/supabase-js'
import type { PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js'
import type { Database } from './types'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Configurazione Supabase mancante. Creare .env.local con ' +
    'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (vedi .env.example).'
  )
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,   // necessario per il ritorno da Google OAuth
  },
})

/** Errore applicativo con messaggio leggibile dall'utente finale. */
export class DataError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'DataError'
  }
}

/**
 * Normalizza gli errori di Supabase.
 *
 * Nota importante: quando RLS nega la lettura, Supabase non restituisce
 * un errore ma un elenco VUOTO. Un risultato vuoto puo' quindi voler dire
 * "non ci sono dati" oppure "non hai il permesso di vederli": e' un
 * comportamento voluto (non rivela l'esistenza del dato) di cui tenere
 * conto quando si scrivono i messaggi nell'interfaccia.
 */
/** Un singolo record atteso: usare dopo .single(). */
export function unwrapOne<T>(res: PostgrestSingleResponse<T>, contesto: string): T {
  if (res.error) throw new DataError(`${contesto}: ${res.error.message}`, res.error)
  if (res.data === null) throw new DataError(`${contesto}: nessun record trovato`)
  return res.data
}

/** Un elenco: un risultato vuoto e' legittimo, non e' un errore. */
export function unwrapMany<T>(res: PostgrestResponse<T>, contesto: string): T[] {
  if (res.error) throw new DataError(`${contesto}: ${res.error.message}`, res.error)
  return res.data ?? []
}
