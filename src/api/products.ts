/** Catalogo prodotti. */
import { supabase, unwrapMany, unwrapOne } from './client'
import type { Tables, TablesInsert, TablesUpdate } from './types'

export type Product = Tables<'products'>

export async function getProductsByCompany(companyId: string): Promise<Product[]> {
  return unwrapMany(
    await supabase.from('products').select('*')
      .eq('company_id', companyId).order('name'),
    'Prodotti dell\'azienda')
}

export async function getAvailableProducts(companyId: string): Promise<Product[]> {
  return unwrapMany(
    await supabase.from('products').select('*')
      .eq('company_id', companyId).eq('available', true).order('name'),
    'Prodotti disponibili')
}

/** Prodotto con i dati dell'azienda: una query sola, non due. */
export async function getProductWithCompany(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*, companies(id, name, logo_url, city)')
    .eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function createProduct(p: TablesInsert<'products'>): Promise<Product> {
  return unwrapOne(await supabase.from('products').insert(p).select().single(),
    'Creazione prodotto')
}

/** Inserimento multiplo: usato dall'importazione listino con AI. */
export async function createProducts(ps: TablesInsert<'products'>[]): Promise<Product[]> {
  return unwrapMany(await supabase.from('products').insert(ps).select(),
    'Importazione prodotti')
}

export async function updateProduct(id: string, patch: TablesUpdate<'products'>): Promise<Product> {
  return unwrapOne(
    await supabase.from('products').update(patch).eq('id', id).select().single(),
    'Aggiornamento prodotto')
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

/** Sottoscrizione realtime: sostituisce entities.Product.subscribe() di Base44. */
export function subscribeProducts(companyId: string, onChange: () => void): () => void {
  const ch = supabase
    .channel(`products:${companyId}`)
    .on('postgres_changes',
        { event: '*', schema: 'public', table: 'products', filter: `company_id=eq.${companyId}` },
        onChange)
    .subscribe()
  return () => { void supabase.removeChannel(ch) }
}
