/**
 * Modello di previsione del fatturato.
 *
 * COSA FA
 * Scompone la serie storica in tendenza e stagionalità, proietta i mesi
 * successivi e restituisce un intervallo, non un numero secco.
 *
 * PERCHÉ COSÌ
 * I mercati agricoli sono fortemente stagionali: una previsione che
 * ignora il mese sbaglia sistematicamente. Ma la stagionalità si può
 * stimare solo con almeno un ciclo completo di dati. Finché non c'è,
 * il modello usa la sola tendenza e lo dichiara.
 *
 * QUELLO CHE NON FA
 * Non inventa numeri quando i dati non bastano. Sotto i tre mesi di
 * storico non produce alcuna previsione: restituisce "dati
 * insufficienti". Un intervallo onesto costruisce fiducia; un numero
 * secco sbagliato la distrugge.
 */

export interface PuntoStorico {
  mese: string        // 'YYYY-MM-DD', primo giorno del mese
  valore: number
}

export interface PuntoPrevisto {
  mese: string
  atteso: number
  minimo: number
  massimo: number
}

export type Affidabilita = 'insufficiente' | 'indicativa' | 'discreta' | 'buona' | 'solida'

export interface Previsione {
  punti: PuntoPrevisto[]
  affidabilita: Affidabilita
  /** Frase pronta da mostrare: spiega su cosa si basa e quanto vale. */
  spiegazione: string
  /** Variazione percentuale attesa sul periodo equivalente precedente. */
  variazioneAttesa: number | null
  /** Quanti mesi con dati reali sono stati usati. */
  mesiUsati: number
  /** Stagionalità applicata. */
  stagionalita: boolean
  /** Scarto medio del modello sui dati storici, in percentuale. */
  erroreMedio: number | null
}

/** Regressione lineare ai minimi quadrati: y = a + b·x */
function regressione(valori: number[]): { a: number; b: number } {
  const n = valori.length
  if (n === 0) return { a: 0, b: 0 }
  if (n === 1) return { a: valori[0], b: 0 }

  const mediaX = (n - 1) / 2
  const mediaY = valori.reduce((s, v) => s + v, 0) / n

  let num = 0
  let den = 0
  valori.forEach((y, x) => {
    num += (x - mediaX) * (y - mediaY)
    den += (x - mediaX) ** 2
  })

  const b = den === 0 ? 0 : num / den
  return { a: mediaY - b * mediaX, b }
}

/**
 * Indici di stagionalità per mese (1-12).
 * Rapporto fra il valore osservato e la tendenza in quel punto: sopra 1
 * il mese rende più della media, sotto 1 meno.
 */
function indiciStagionali(
  storico: PuntoStorico[],
  trend: { a: number; b: number },
): Map<number, number> {
  const per = new Map<number, number[]>()

  storico.forEach((p, i) => {
    const atteso = trend.a + trend.b * i
    if (atteso <= 0) return
    const mese = new Date(p.mese).getMonth() + 1
    if (!per.has(mese)) per.set(mese, [])
    per.get(mese)!.push(p.valore / atteso)
  })

  const indici = new Map<number, number>()
  per.forEach((rapporti, mese) => {
    const medio = rapporti.reduce((s, r) => s + r, 0) / rapporti.length
    // Contenuto entro limiti ragionevoli: un solo mese eccezionale non
    // deve diventare una regola.
    indici.set(mese, Math.min(2, Math.max(0.5, medio)))
  })
  return indici
}

function mesiDopo(ultimo: string, n: number): string {
  const d = new Date(ultimo)
  d.setMonth(d.getMonth() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const DESCRIZIONE: Record<Affidabilita, string> = {
  insufficiente: 'Dati insufficienti per una previsione',
  indicativa: 'Indicazione di massima',
  discreta: 'Attendibile sul breve periodo',
  buona: 'Attendibile',
  solida: 'Solida',
}

/**
 * Proietta i prossimi mesi.
 *
 * @param storico serie mensile, in ordine cronologico
 * @param orizzonte quanti mesi proiettare
 */
export function prevedi(storico: PuntoStorico[], orizzonte = 3): Previsione {
  // I mesi a zero in coda sono mesi non ancora vissuti, non mesi a zero:
  // includerli schiaccerebbe la tendenza verso il basso.
  const serie = [...storico]
  while (serie.length && serie[serie.length - 1].valore === 0) serie.pop()

  // Gli zeri iniziali sono il periodo prima dell'avvio: si scartano.
  let inizio = 0
  while (inizio < serie.length && serie[inizio].valore === 0) inizio++
  const utile = serie.slice(inizio)

  const n = utile.length

  if (n < 3) {
    return {
      punti: [], affidabilita: 'insufficiente',
      spiegazione: n === 0
        ? 'Non ci sono ancora dati storici.'
        : `Solo ${n} ${n === 1 ? 'mese' : 'mesi'} di dati: servono almeno 3 mesi per stimare una tendenza.`,
      variazioneAttesa: null, mesiUsati: n, stagionalita: false, erroreMedio: null,
    }
  }

  const valori = utile.map((p) => p.valore)
  const trend = regressione(valori)

  const usaStagionalita = n >= 12
  const indici = usaStagionalita ? indiciStagionali(utile, trend) : new Map<number, number>()

  // Scarto del modello sui dati storici: è la base dell'intervallo.
  let sommaScarti = 0
  valori.forEach((y, i) => {
    const mese = new Date(utile[i].mese).getMonth() + 1
    const stimato = (trend.a + trend.b * i) * (indici.get(mese) ?? 1)
    sommaScarti += (y - stimato) ** 2
  })
  const scartoTipo = Math.sqrt(sommaScarti / n)
  const mediaStorica = valori.reduce((s, v) => s + v, 0) / n
  const erroreMedio = mediaStorica > 0 ? Math.round((scartoTipo / mediaStorica) * 100) : null

  const ultimoMese = utile[n - 1].mese
  const punti: PuntoPrevisto[] = []

  for (let k = 1; k <= orizzonte; k++) {
    const mese = mesiDopo(ultimoMese, k)
    const indiceMese = new Date(mese).getMonth() + 1
    const base = trend.a + trend.b * (n - 1 + k)
    const atteso = Math.max(0, base * (indici.get(indiceMese) ?? 1))

    // L'incertezza cresce con la distanza: più lontano si guarda, più
    // la banda si allarga.
    const ampiezza = scartoTipo * (1 + 0.4 * (k - 1)) * 1.4

    punti.push({
      mese,
      atteso: Math.round(atteso),
      minimo: Math.round(Math.max(0, atteso - ampiezza)),
      massimo: Math.round(atteso + ampiezza),
    })
  }

  let affidabilita: Affidabilita
  if (n >= 24) affidabilita = 'solida'
  else if (n >= 12) affidabilita = 'buona'
  else if (n >= 6) affidabilita = 'discreta'
  else affidabilita = 'indicativa'

  // Confronto con il periodo equivalente immediatamente precedente.
  const sommaPrevista = punti.reduce((s, p) => s + p.atteso, 0)
  const ultimiReali = valori.slice(-orizzonte).reduce((s, v) => s + v, 0)
  const variazioneAttesa = ultimiReali > 0
    ? Math.round(((sommaPrevista - ultimiReali) / ultimiReali) * 100)
    : null

  const parti = [
    `Basata su ${n} mesi di dati`,
    usaStagionalita
      ? 'con stagionalità stimata sui cicli già osservati'
      : 'senza stagionalità (serve almeno un anno di storico)',
  ]
  if (erroreMedio !== null) parti.push(`scarto medio del modello ${erroreMedio}%`)

  return {
    punti, affidabilita,
    spiegazione: `${DESCRIZIONE[affidabilita]}. ${parti.join(', ')}.`,
    variazioneAttesa, mesiUsati: n, stagionalita: usaStagionalita, erroreMedio,
  }
}

/** Confronto fra due periodi, per le variazioni mostrate accanto ai numeri. */
export function variazione(attuale: number, precedente: number): number | null {
  if (!precedente) return null
  return Math.round(((attuale - precedente) / precedente) * 100)
}
