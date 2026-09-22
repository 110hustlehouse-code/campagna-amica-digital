/**
 * Area rivenditori: password/listini gestiti dal produttore,
 * verifica pubblica lato cliente.
 *
 * L'hash della password si genera qui, nel browser, con la stessa
 * identica funzione (SHA-256 su salt+password) usata dentro l'Edge
 * Function verify-reseller-password — la Web Crypto API è la stessa
 * su browser e Deno, quindi i due lati restano sempre coerenti senza
 * bisogno di un terzo posto dove tenerli sincronizzati.
 */
import { supabase, unwrapMany, unwrapOne } from './client'
import { invokeFunction } from './functions'
import type { Tables } from './types'

export type ResellerPassword = Tables<'reseller_passwords'>
export type ResellerPrice = Tables<'product_reseller_prices'>

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function randomSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Password del produttore per la propria azienda, mascherate lato UI (mai mostrate in chiaro dopo la creazione). */
export async function getResellerPasswords(companyId: string): Promise<ResellerPassword[]> {
  return unwrapMany(
    await supabase.from('reseller_passwords').select('*').eq('company_id', companyId).order('pricelist_id'),
    'Password rivenditori',
  )
}

/** Crea una nuova password per un listino (1 o 2). L'hash si calcola qui, mai la password in chiaro finisce nel database. */
export async function createResellerPassword(
  companyId: string,
  pricelistId: 1 | 2,
  label: string,
  password: string,
): Promise<ResellerPassword> {
  const salt = randomSalt()
  const hash = await sha256Hex(salt + password)
  return unwrapOne(
    await supabase
      .from('reseller_passwords')
      .insert({ company_id: companyId, pricelist_id: pricelistId, label, password_salt: salt, password_hash: hash })
      .select()
      .single(),
    'Creazione password rivenditore',
  )
}

/** Revoca (non cancella: resta lo storico) una password. */
export async function revokeResellerPassword(id: string): Promise<void> {
  const { error } = await supabase
    .from('reseller_passwords')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

/** Prezzi rivenditore di un prodotto (entrambi i listini, se impostati). */
export async function getResellerPrices(productId: string): Promise<ResellerPrice[]> {
  return unwrapMany(
    await supabase.from('product_reseller_prices').select('*').eq('product_id', productId),
    'Prezzi rivenditore',
  )
}

/** Imposta (o aggiorna) il prezzo di un prodotto per un listino. */
export async function setResellerPrice(productId: string, pricelistId: 1 | 2, price: number): Promise<void> {
  const { error } = await supabase
    .from('product_reseller_prices')
    .upsert({ product_id: productId, pricelist_id: pricelistId, price, updated_at: new Date().toISOString() },
      { onConflict: 'product_id,pricelist_id' })
  if (error) throw error
}

/** Toglie il prezzo di un prodotto da un listino (il prodotto sparisce da quel catalogo rivenditore). */
export async function removeResellerPrice(productId: string, pricelistId: 1 | 2): Promise<void> {
  const { error } = await supabase
    .from('product_reseller_prices')
    .delete()
    .eq('product_id', productId)
    .eq('pricelist_id', pricelistId)
  if (error) throw error
}

export interface ResellerCatalogProduct {
  id: string
  name: string
  description: string | null
  unit: string
  image_url: string | null
  category: string | null
  code: string | null
  ingredients: string | null
  box_configs: string | null
  vat_rate: number
  reseller_price: number
  [key: string]: unknown // i flag contains_* arrivano dinamicamente
}

export interface ResellerLoginResult {
  success: boolean
  pricelist_id?: 1 | 2
  label?: string | null
  products?: ResellerCatalogProduct[]
  error?: string
}

/** Verifica pubblica: chiamata dalla pagina di login rivenditore, nessun account richiesto. */
export async function verifyResellerPassword(companyId: string, password: string): Promise<ResellerLoginResult> {
  return invokeFunction<ResellerLoginResult>('verify-reseller-password', { company_id: companyId, password })
}