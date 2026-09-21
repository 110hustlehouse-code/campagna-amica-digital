/** Preferiti del cliente: aziende, mercati o prodotti. */
import { supabase, unwrapOne, unwrapMany, DataError } from './client'
import type { Tables, TablesInsert } from './types'

export type Favorite = Tables<'favorites'>

export async function getMyFavorites(): Promise<Favorite[]> {
  return unwrapMany(
    await supabase.from('favorites')
      .select('*, companies(id, name, logo_url), markets(id, name, city), products(id, name, price)')
      .order('created_at', { ascending: false }),
    'Preferiti') as unknown as Favorite[]
}

/**
 * Un preferito punta a UNA sola cosa: azienda, mercato o prodotto.
 * Il vincolo e' anche nel database (favorites_one_target).
 */
export type Target =
  | { company_id: string }
  | { market_id: string }
  | { product_id: string }

export async function aggiungiPreferito(t: Target): Promise<Favorite> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new DataError('Nessun utente collegato')

  // In questo schema user_id e' obbligatorio su favorites: senza, la riga
  // non appartiene a nessuno e le policy non saprebbero a chi mostrarla.
  const riga: TablesInsert<'favorites'> = {
    user_id: user.id,
    company_id: 'company_id' in t ? t.company_id : null,
    market_id: 'market_id' in t ? t.market_id : null,
    product_id: 'product_id' in t ? t.product_id : null,
  }
  return unwrapOne(await supabase.from('favorites').insert(riga).select().single(),
    'Aggiunta ai preferiti')
}

export async function rimuoviPreferito(id: string): Promise<void> {
  const { error } = await supabase.from('favorites').delete().eq('id', id)
  if (error) throw error
}

/** Vero se l'elemento e' gia' nei preferiti dell'utente collegato. */
export async function isPreferito(t: Target): Promise<Favorite | null> {
  const [campo, valore] = Object.entries(t)[0] as [string, string]
  const { data, error } = await supabase
    .from('favorites').select('*').eq(campo, valore).maybeSingle()
  if (error) throw error
  return data
}
