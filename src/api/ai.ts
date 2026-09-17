/**
 * Funzioni di intelligenza artificiale.
 *
 * Sostituisce integrations.Core.InvokeLLM di Base44. La chiamata al
 * modello avviene in una Edge Function, non nel browser: la chiave del
 * fornitore AI non deve mai arrivare al client.
 *
 * L'AI e' presente solo dove serve davvero: catalogo prodotti dei
 * produttori e area amministrazione.
 */
import { invokeFunction } from './functions'

export interface RichiestaLLM {
  prompt: string
  /** Schema JSON della risposta attesa: il modello deve rispettarlo. */
  response_json_schema?: Record<string, unknown>
  /** URL di file da allegare (listini in PDF, foto di listini). */
  file_urls?: string[]
  /** Consente al modello di cercare in rete. */
  add_context_from_internet?: boolean
}

export async function invokeLLM<T = unknown>(req: RichiestaLLM): Promise<T> {
  return invokeFunction<T>('invokeLLM', req as unknown as Record<string, unknown>)
}

export async function generateImage(prompt: string): Promise<{ url: string }> {
  return invokeFunction<{ url: string }>('generateImage', { prompt })
}
