/**
 * Verifica dei codici di accesso per produttori e staff.
 *
 * Il confronto avviene lato server. I codici stanno in variabili d'ambiente
 * della Edge Function, che limita i tentativi falliti a cinque ogni quindici
 * minuti e assegna il ruolo con la chiave di servizio — l'unica che puo'
 * farlo, perche' un trigger impedisce a chiunque di cambiarsi il ruolo da
 * solo.
 *
 * Un controllo fatto nel browser sarebbe inutile: il codice finirebbe nel
 * bundle, leggibile da chiunque apra gli strumenti di sviluppo.
 */
import { invokeFunction } from './functions'
import { DataError } from './client'

export type RuoloConCodice = 'producer' | 'staff' | 'direzione'

const MESSAGGI: Record<string, string> = {
  'Unauthorized': 'Devi accedere prima di inserire il codice',
  'Invalid role': 'Ruolo non valido',
  'code and role required': 'Inserisci il codice',
  'Invalid code': 'Codice non valido',
  'Too many failed attempts. Try again later.':
    'Troppi tentativi falliti. Riprova fra un quarto d’ora.',
}

export async function verificaCodiceAccesso(
  codice: string,
  ruolo: RuoloConCodice,
): Promise<void> {
  try {
    await invokeFunction('verify-access-code', { code: codice, role: ruolo })
  } catch (e) {
    // La funzione risponde con messaggi in inglese pensati per gli
    // sviluppatori: qui diventano frasi che ha senso mostrare a un
    // produttore al banco.
    const grezzo = e instanceof Error ? e.message : String(e)
    const noto = Object.keys(MESSAGGI).find((k) => grezzo.includes(k))
    throw new DataError(noto ? MESSAGGI[noto] : 'Codice non valido')
  }
}
