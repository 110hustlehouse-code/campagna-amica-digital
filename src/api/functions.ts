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
/**
 * Come invokeFunction, ma per risposte binarie (PDF, file). Il metodo
 * standard supabase.functions.invoke() decodifica sempre la risposta
 * come testo/JSON: per un PDF questo corrompe i byte in modo
 * irreversibile (un PDF non è testo UTF-8 valido). Qui si fa una fetch
 * diretta all'URL della funzione, chiedendo esplicitamente arrayBuffer.
 */
export async function invokeFunctionBinaria(
  nome: string,
  payload: Record<string, unknown>,
): Promise<ArrayBuffer> {
  const { data: { session } } = await supabase.auth.getSession()
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${nome}`

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  })

  if (!resp.ok) {
    const errText = await resp.text()
    throw new DataError(`Funzione ${nome}: ${errText}`)
  }

  return resp.arrayBuffer()
}