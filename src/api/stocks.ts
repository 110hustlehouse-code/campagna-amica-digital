/** Scorte di magazzino del produttore. */
import { supabase, unwrapOne, unwrapMany } from './client'
import type { Tables, TablesInsert, TablesUpdate } from './types'

export type ProductStock = Tables<'product_stocks'>

export async function getStocks(companyId: string): Promise<ProductStock[]> {
  return unwrapMany(
    await supabase.from('product_stocks').select('*')
      .eq('company_id', companyId).order('name'),
    'Scorte')
}

export async function createStock(s: TablesInsert<'product_stocks'>): Promise<ProductStock> {
  return unwrapOne(await supabase.from('product_stocks').insert(s).select().single(),
    'Creazione scorta')
}

export async function updateStock(
  id: string, patch: TablesUpdate<'product_stocks'>,
): Promise<ProductStock> {
  return unwrapOne(
    await supabase.from('product_stocks').update(patch).eq('id', id).select().single(),
    'Aggiornamento scorta')
}

export async function deleteStock(id: string): Promise<void> {
  const { error } = await supabase.from('product_stocks').delete().eq('id', id)
  if (error) throw error
}
