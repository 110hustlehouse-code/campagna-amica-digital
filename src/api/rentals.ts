/** Affitti dei banchi e relativi pagamenti. */
import { supabase, unwrapOne, unwrapMany } from './client'
import type { Tables, TablesInsert, TablesUpdate } from './types'

export type StallRental = Tables<'stall_rentals'>
export type RentalPayment = Tables<'rental_payments'>
export type PaymentStatus = RentalPayment['status']

export async function getRentalsByMarket(marketId: string): Promise<StallRental[]> {
  return unwrapMany(
    await supabase.from('stall_rentals').select('*, companies(name)')
      .eq('market_id', marketId).order('stall_number'),
    'Affitti del mercato') as unknown as StallRental[]
}

export async function getRentalsByCompany(companyId: string): Promise<StallRental[]> {
  return unwrapMany(
    await supabase.from('stall_rentals').select('*').eq('company_id', companyId),
    'Affitti dell\'azienda')
}

export async function createRental(r: TablesInsert<'stall_rentals'>): Promise<StallRental> {
  return unwrapOne(await supabase.from('stall_rentals').insert(r).select().single(),
    'Creazione affitto')
}

export async function updateRental(
  id: string, patch: TablesUpdate<'stall_rentals'>,
): Promise<StallRental> {
  return unwrapOne(
    await supabase.from('stall_rentals').update(patch).eq('id', id).select().single(),
    'Aggiornamento affitto')
}

export async function getPayments(rentalId: string): Promise<RentalPayment[]> {
  return unwrapMany(
    await supabase.from('rental_payments').select('*')
      .eq('stall_rental_id', rentalId)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false }),
    'Pagamenti affitto')
}

/** Pagamenti insoluti di un mercato: la vista che interessa allo staff. */
export async function getUnpaidByMarket(marketId: string): Promise<RentalPayment[]> {
  return unwrapMany(
    await supabase.from('rental_payments').select('*, companies(name)')
      .eq('market_id', marketId).in('status', ['pending', 'overdue'])
      .order('period_year').order('period_month'),
    'Pagamenti in sospeso') as unknown as RentalPayment[]
}

/**
 * Registra un pagamento. Il vincolo di unicita' su
 * (affitto, anno, mese) impedisce di registrare due volte lo stesso
 * canone: upsert aggiorna invece di duplicare.
 */
export async function registraPagamento(p: TablesInsert<'rental_payments'>): Promise<RentalPayment> {
  return unwrapOne(
    await supabase.from('rental_payments').upsert(p, {
      onConflict: 'stall_rental_id,period_year,period_month',
    }).select().single(),
    'Registrazione pagamento')
}

/** Affitti di tutti i mercati visibili all'utente. */
export async function getAllRentals(): Promise<StallRental[]> {
  return unwrapMany(
    await supabase.from('stall_rentals').select('*, companies(name)')
      .order('rental_start_date', { ascending: false }),
    'Tutti gli affitti') as unknown as StallRental[]
}

export async function deleteRental(id: string): Promise<void> {
  const { error } = await supabase.from('stall_rentals').delete().eq('id', id)
  if (error) throw error
}
