/** Rappresentanti produttori: persone (non aziende) con accesso alla sola chat staff del mercato. */
import { supabase, unwrapOne, unwrapMany } from './client'
import type { Tables, TablesInsert } from './types'

export type MarketRepresentative = Tables<'market_representatives'>

export async function getRepresentativesByMarket(marketId: string): Promise<MarketRepresentative[]> {
  return unwrapMany(
    await supabase.from('market_representatives').select('*')
      .eq('market_id', marketId).order('created_at', { ascending: false }),
    'Rappresentanti produttori')
}

export async function addRepresentative(r: TablesInsert<'market_representatives'>): Promise<MarketRepresentative> {
  return unwrapOne(
    await supabase.from('market_representatives').insert(r).select().single(),
    'Aggiunta rappresentante')
}

export async function removeRepresentative(id: string): Promise<void> {
  const { error } = await supabase.from('market_representatives').delete().eq('id', id)
  if (error) throw error
}

/** Il/i mercato/i per cui l'utente corrente è rappresentante (per l'app Produttore). */
export async function getMyRepresentations(): Promise<MarketRepresentative[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  return unwrapMany(
    await supabase.from('market_representatives').select('*').eq('user_id', user.id),
    'Le mie rappresentanze')
}
