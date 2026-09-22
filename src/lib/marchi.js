/**
 * Marchi del progetto — unico punto di verita'.
 *
 * Nell'applicazione compaiono esclusivamente marchi di proprieta' Campo
 * Zero: il marchio del progetto "Campagna Amica Digital" e il marchio
 * aziendale Campo Zero. Nessun marchio di terzi viene riprodotto.
 *
 * Del marchio di progetto esistono due versioni: a colori per i fondi
 * chiari, e una versione chiara per i fondi scuri, dove il verde del
 * lettering non avrebbe contrasto. Campo Zero e' un tondo su disco
 * bianco e si legge su qualsiasi fondo: versione unica.
 */
const BASE =
  'https://otefhryrnajzfyaiwmja.supabase.co/storage/v1/object/public/public-assets/marchi'

export const MARCHIO_PROGETTO = {
  src: `${BASE}/campagna-amica-digital.png`,
  // TODO: sostituire con la versione chiara ufficiale appena arriva dal grafico —
  // per ora si usa la stessa immagine anche su fondo scuro.
  srcChiaro: `${BASE}/campagna-amica-digital-chiaro.png`,
  alt: 'Campagna Amica Digital',
}

export const MARCHIO_CAMPO_ZERO = {
  src: `${BASE}/campo-zero.png`,
  alt: 'Campo Zero',
}

/** Immagine di apertura della home. Generata, non di terzi. */
export const IMMAGINE_APERTURA = `${BASE}/home-apertura.jpg`
