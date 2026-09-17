/**
 * Chiamata alle Edge Functions.
 *
 * Sostituisce base44.functions.invoke(). Le funzioni girano su Deno
 * lato Supabase e usano la service key, quindi possono fare cose che il
 * browser non puo': scrivere notifiche ad altri utenti, generare PDF,
 * interrogare servizi esterni.
 */
import { supabase, DataError } from './client'

export async function invokeFunction<T = unknown>(
  nome: string,
  payload?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(nome, {
    body: payload ?? {},
  })
  if (error) throw new DataError(`Funzione ${nome}: ${error.message}`, error)
  return data as T
}
