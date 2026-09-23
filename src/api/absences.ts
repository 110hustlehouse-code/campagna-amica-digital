/** Assenze dei produttori ai mercati — segnalate dal produttore, gestite dallo staff. */
import { supabase, unwrapOne, unwrapMany } from './client'
import type { Tables, TablesInsert, TablesUpdate } from './types'

export type Absence = Tables<'absences'>
export type AbsenceStatus = Absence['status']

export async function getAbsencesByMarket(marketId: string): Promise<Absence[]> {
  return unwrapMany(
    await supabase.from('absences').select('*, companies(name)').eq('market_id', marketId)
      .order('created_at', { ascending: false }),
    'Assenze del mercato') as unknown as Absence[]
}

export async function getAbsencesByCompany(companyId: string): Promise<Absence[]> {
  return unwrapMany(
    await supabase.from('absences').select('*').eq('company_id', companyId)
      .order('created_at', { ascending: false }),
    'Assenze dell\'azienda')
}

export async function createAbsence(a: TablesInsert<'absences'>): Promise<Absence> {
  return unwrapOne(await supabase.from('absences').insert(a).select().single(),
    'Segnalazione assenza')
}

export async function updateAbsence(id: string, patch: TablesUpdate<'absences'>): Promise<Absence> {
  return unwrapOne(
    await supabase.from('absences').update(patch).eq('id', id).select().single(),
    'Aggiornamento assenza')
}

export const ETICHETTE_STATO: Record<AbsenceStatus, string> = {
  reported: 'Segnalata',
  acknowledged: 'Presa in carico',
  resolved: 'Gestita',
}