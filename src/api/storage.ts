/**
 * Caricamento file su Supabase Storage.
 *
 * Sostituisce integrations.Core.UploadFile di Base44. I file vanno in
 * bucket pubblici: le immagini di prodotti, loghi e mercati sono
 * destinate a essere viste da chiunque usi l'app.
 *
 * I documenti riservati (firme DDT, ricevute) useranno un bucket
 * privato con URL firmati a scadenza: si aggiungera' quando servira'.
 */
import { supabase, DataError } from './client'

export type Bucket = 'prodotti' | 'aziende' | 'mercati' | 'allegati'

/** Nome file univoco che conserva l'estensione originale. */
function nomeUnivoco(file: File): string {
  const punto = file.name.lastIndexOf('.')
  const est = punto > -1 ? file.name.slice(punto) : ''
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${est}`
}

/** Carica un file e restituisce l'URL pubblico. */
export async function uploadFile(
  file: File,
  bucket: Bucket = 'allegati',
  cartella?: string,
): Promise<{ file_url: string; path: string }> {
  const path = cartella ? `${cartella}/${nomeUnivoco(file)}` : nomeUnivoco(file)

  const { error } = await supabase.storage.from(bucket)
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw new DataError(`Caricamento file: ${error.message}`, error)

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return { file_url: data.publicUrl, path }
}

export async function deleteFile(bucket: Bucket, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw new DataError(`Eliminazione file: ${error.message}`, error)
}
