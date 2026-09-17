/** Notizie Coldiretti memorizzate nella cache. */
import { supabase, unwrapMany } from './client'
import type { Tables } from './types'

export type News = Tables<'news_cache'>

export async function getNews(limite = 6): Promise<News[]> {
  return unwrapMany(
    await supabase.from('news_cache').select('*')
      .order('created_date', { ascending: false }).limit(limite),
    'Notizie')
}
