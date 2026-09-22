/**
 * Utilita' condivise dalle Edge Functions.
 *
 * Il client con service role scavalca le policy RLS: e' necessario per
 * scrivere notifiche ad altri utenti, ma va usato con attenzione. Ogni
 * funzione deve verificare da se' chi sta chiamando quando l'operazione
 * riguarda dati altrui.
 */
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Client con pieni poteri: scavalca RLS. */
export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )
}

/** Utente che ha effettuato la chiamata, ricavato dal token. */
export async function utenteChiamante(req: Request) {
  const auth = req.headers.get('Authorization')
  if (!auth) return null
  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: auth } }, auth: { persistSession: false } },
  )
  const { data: { user } } = await client.auth.getUser()
  if (!user) return null
  const { data: profilo } = await client
    .from('profiles').select('*').eq('id', user.id).maybeSingle()
  return profilo ? { ...profilo, id: user.id } : null
}

export function ok(data: unknown = { success: true }) {
  return new Response(JSON.stringify(data), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

export function errore(messaggio: string, stato = 400) {
  return new Response(JSON.stringify({ error: messaggio }), {
    status: stato,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

/** Gestione uniforme della preflight CORS. */
export function preflight(req: Request) {
  return req.method === 'OPTIONS' ? new Response('ok', { headers: CORS }) : null
}
