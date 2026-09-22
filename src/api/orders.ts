/** Ordini dei clienti ai produttori. */
import { supabase, unwrapMany, unwrapOne } from './client'
import type { Tables, TablesInsert, TablesUpdate } from './types'

export type Order = Tables<'orders'>
export type OrderStatus = Order['status']

/** Riga dell'ordine. In tabella e' jsonb: qui le diamo una forma. */
export interface OrderItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total: number
}

export async function getMyOrders(): Promise<Order[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  // In questo schema l'ordine e' legato all'utente da user_id, non
  // dall'email: un indirizzo puo' cambiare, l'identificativo no.
  return unwrapMany(
    await supabase.from('orders').select('*')
      .eq('user_id', user.id).order('created_at', { ascending: false }),
    'I miei ordini')
}

export async function getOrdersByCompany(companyId: string): Promise<Order[]> {
  return unwrapMany(
    await supabase.from('orders').select('*')
      .eq('company_id', companyId).order('created_at', { ascending: false }),
    'Ordini ricevuti')
}

export async function getOrdersByMarket(marketId: string): Promise<Order[]> {
  return unwrapMany(
    await supabase.from('orders').select('*')
      .eq('market_id', marketId).order('created_at', { ascending: false }),
    'Ordini del mercato')
}

export async function createOrder(
  o: Omit<TablesInsert<'orders'>, 'items'> & { items: OrderItem[] },
): Promise<Order> {
  const { items, ...rest } = o
  const total = items.reduce((s, i) => s + i.total, 0)
  return unwrapOne(
    await supabase.from('orders')
      .insert({ ...rest, items: items as unknown as TablesInsert<'orders'>['items'],
                total_amount: total })
      .select().single(),
    'Creazione ordine')
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  return unwrapOne(
    await supabase.from('orders').update({ status }).eq('id', id).select().single(),
    'Aggiornamento stato ordine')
}

/** Le righe salvate come jsonb, rilette con la forma giusta. */
export function orderItems(o: Order): OrderItem[] {
  return Array.isArray(o.items) ? (o.items as unknown as OrderItem[]) : []
}

export function subscribeOrders(companyId: string, onChange: () => void): () => void {
  const ch = supabase
    .channel(`orders:${companyId}`)
    .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `company_id=eq.${companyId}` },
        onChange)
    .subscribe()
  return () => { void supabase.removeChannel(ch) }
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) throw error
}

export async function updateOrder(
  id: string, patch: TablesUpdate<'orders'>,
): Promise<Order> {
  return unwrapOne(
    await supabase.from('orders').update(patch).eq('id', id).select().single(),
    'Aggiornamento ordine')
}
