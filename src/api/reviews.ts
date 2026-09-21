/**
 * Recensioni delle aziende.
 *
 * Il produttore puo' rispondere ma non modificare voto e testo: e'
 * imposto da un trigger nel database, non dall'interfaccia.
 */
import { supabase, unwrapOne, unwrapMany } from './client'
import type { Tables, TablesInsert } from './types'

export type Review = Tables<'reviews'>

export async function getReviews(companyId: string): Promise<Review[]> {
  return unwrapMany(
    await supabase.from('reviews').select('*')
      .eq('company_id', companyId).order('created_at', { ascending: false }),
    'Recensioni')
}

export async function getMediaVoti(companyId: string): Promise<{ media: number; totale: number }> {
  const { data, error } = await supabase
    .from('reviews').select('rating').eq('company_id', companyId)
  if (error) throw error
  const voti = data ?? []
  if (voti.length === 0) return { media: 0, totale: 0 }
  const somma = voti.reduce((s, r) => s + r.rating, 0)
  return { media: Math.round((somma / voti.length) * 10) / 10, totale: voti.length }
}

export async function scriviRecensione(r: TablesInsert<'reviews'>): Promise<Review> {
  return unwrapOne(await supabase.from('reviews').insert(r).select().single(),
    'Invio recensione')
}

/** Risposta del produttore. Voto e testo restano intoccabili. */
export async function rispondiRecensione(id: string, reply: string): Promise<Review> {
  return unwrapOne(
    await supabase.from('reviews')
      .update({ reply, reply_date: new Date().toISOString() })
      .eq('id', id).select().single(),
    'Risposta alla recensione')
}
