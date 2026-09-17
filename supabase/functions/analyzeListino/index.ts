/**
 * Estrae i prodotti da un listino caricato (PDF o foto) e li salva nel
 * catalogo dell'azienda.
 *
 * E' la funzione che rende praticabile l'onboarding di un produttore:
 * invece di inserire cento prodotti a mano, carica il listino che gia'
 * usa e il catalogo si popola.
 */
import { serviceClient, utenteChiamante, ok, errore, preflight } from '../_shared/comune.ts'

const CATEGORIE = ['frutta','verdura','formaggi','salumi','olio','vino','miele','pane_pasta','conserve','altro']
const UNITA = ['kg','lt','pz','confezione']

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre
  try {
    const utente = await utenteChiamante(req)
    if (!utente) return errore('Non autenticato', 401)

    const { file_url, company_id } = await req.json()
    if (!file_url || !company_id) return errore('Dati incompleti')

    const db = serviceClient()

    // Il listino si carica solo nel proprio catalogo.
    const { data: azienda } = await db
      .from('companies').select('created_by').eq('id', company_id).maybeSingle()
    if (azienda?.created_by?.toLowerCase() !== utente.email.toLowerCase()) {
      return errore('Non autorizzato per questa azienda', 403)
    }

    const chiave = Deno.env.get('ANTHROPIC_API_KEY')
    if (!chiave) return errore('ANTHROPIC_API_KEY non configurata', 500)

    const r = await fetch(file_url)
    const tipo = r.headers.get('content-type') ?? ''
    const buf = new Uint8Array(await r.arrayBuffer())
    const b64 = btoa(String.fromCharCode(...buf))

    const allegato = tipo.includes('pdf')
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } }
      : { type: 'image', source: { type: 'base64', media_type: tipo || 'image/jpeg', data: b64 } }

    const istruzioni = `Analizza questo listino di un'azienda agricola italiana ed estrai tutti i prodotti.

Per ciascuno indica:
- name: nome del prodotto
- price: prezzo come numero (solo la cifra)
- unit: una fra ${UNITA.join(', ')}
- category: una fra ${CATEGORIE.join(', ')}
- description: descrizione breve, massimo 100 caratteri

Rispondi SOLO con un oggetto JSON nella forma {"prodotti": [...]}, senza testo attorno.
Se un prezzo non e leggibile, ometti quel prodotto invece di inventarlo.`

    const risposta = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': chiave, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [{ role: 'user', content: [allegato, { type: 'text', text: istruzioni }] }],
      }),
    })
    if (!risposta.ok) return errore(`Analisi non riuscita: ${await risposta.text()}`, 502)

    const dati = await risposta.json()
    const testo: string = dati.content?.[0]?.text ?? ''
    const pulito = testo.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    let estratti: { prodotti?: unknown[] }
    try { estratti = JSON.parse(pulito) } catch { return errore('Listino non interpretabile', 502) }

    const prodotti = (estratti.prodotti ?? [])
      .map((p) => p as Record<string, unknown>)
      .filter((p) => p.name && typeof p.price === 'number')
      .map((p) => ({
        company_id,
        name: String(p.name).slice(0, 200),
        price: Number(p.price),
        unit: UNITA.includes(String(p.unit)) ? String(p.unit) : 'kg',
        category: CATEGORIE.includes(String(p.category)) ? String(p.category) : 'altro',
        description: p.description ? String(p.description).slice(0, 300) : null,
        available: true,
      }))

    if (prodotti.length === 0) return ok({ success: true, inseriti: 0, prodotti: [] })

    const { data: creati, error } = await db.from('products').insert(prodotti).select()
    if (error) return errore(error.message, 500)

    return ok({ success: true, inseriti: creati?.length ?? 0, prodotti: creati })
  } catch (e) {
    return errore(e instanceof Error ? e.message : 'Errore imprevisto', 500)
  }
})
