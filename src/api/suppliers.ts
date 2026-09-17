/**
 * Fornitori dell'azienda e pagamenti.
 *
 * Dati riservati al produttore: le policy escludono lo staff di mercato.
 * Sono rapporti commerciali privati e non devono essere visibili a chi
 * gestisce il mercato.
 */
import { supabase, unwrapOne, unwrapMany } from './client'
import type { Tables, TablesInsert, TablesUpdate } from './types'

export type Supplier = Tables<'suppliers'>
export type SupplierPayment = Tables<'supplier_payments'>

export async function getSuppliers(companyId: string): Promise<Supplier[]> {
  return unwrapMany(
    await supabase.from('suppliers').select('*').eq('company_id', companyId).order('name'),
    'Fornitori')
}

export async function createSupplier(s: TablesInsert<'suppliers'>): Promise<Supplier> {
  return unwrapOne(await supabase.from('suppliers').insert(s).select().single(),
    'Creazione fornitore')
}

export async function updateSupplier(
  id: string, patch: TablesUpdate<'suppliers'>,
): Promise<Supplier> {
  return unwrapOne(
    await supabase.from('suppliers').update(patch).eq('id', id).select().single(),
    'Aggiornamento fornitore')
}

export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase.from('suppliers').delete().eq('id', id)
  if (error) throw error
}

export async function getSupplierPayments(companyId: string): Promise<SupplierPayment[]> {
  return unwrapMany(
    await supabase.from('supplier_payments').select('*, suppliers(name)')
      .eq('company_id', companyId).order('due_date'),
    'Pagamenti fornitori') as unknown as SupplierPayment[]
}

/** Scadenze non saldate, dalla piu' urgente. */
export async function getScadenze(companyId: string): Promise<SupplierPayment[]> {
  return unwrapMany(
    await supabase.from('supplier_payments').select('*, suppliers(name)')
      .eq('company_id', companyId).in('status', ['da_pagare', 'scaduto'])
      .order('due_date'),
    'Scadenze fornitori') as unknown as SupplierPayment[]
}

export async function createPayment(p: TablesInsert<'supplier_payments'>): Promise<SupplierPayment> {
  return unwrapOne(await supabase.from('supplier_payments').insert(p).select().single(),
    'Creazione pagamento')
}

export async function segnaPagato(id: string): Promise<SupplierPayment> {
  return unwrapOne(
    await supabase.from('supplier_payments').update({ status: 'pagato' })
      .eq('id', id).select().single(),
    'Pagamento saldato')
}
