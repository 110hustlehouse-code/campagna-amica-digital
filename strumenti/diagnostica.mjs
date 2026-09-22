/**
 * Diagnostica automatica dell'app.
 *
 * Apre l'app in un browser vero, effettua l'accesso, visita le pagine
 * principali e riporta gli errori di ciascuna. Serve a non dover
 * copiare a mano la console del browser.
 *
 * Uso:
 *   npm run dev              (in un terminale, lasciandolo aperto)
 *   node strumenti/diagnostica.mjs     (in un secondo terminale)
 *
 * Con un ruolo diverso:
 *   RUOLO=produttore node strumenti/diagnostica.mjs
 *   RUOLO=staff node strumenti/diagnostica.mjs
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:5173'
const PASSWORD = process.env.PASSWORD ?? 'CircoMassimo2026'
const UTENTI = {
  cliente:    process.env.EMAIL_CLIENTE    ?? 'cliente@prova.it',
  produttore: process.env.EMAIL_PRODUTTORE ?? 'produttore@prova.it',
  staff:      process.env.EMAIL_STAFF      ?? 'staff@prova.it',
  admin:      process.env.EMAIL_ADMIN      ?? 'admin@prova.it',
}
const ruolo = process.env.RUOLO ?? 'cliente'
const email = UTENTI[ruolo] ?? ruolo

const PERCORSI = {
  cliente:    ['/home', '/mercati', '/aziende', '/preferiti', '/ordini', '/stagionalita', '/profilo'],
  produttore: ['/produttore', '/produttore/prodotti', '/produttore/ordini', '/produttore/azienda',
               '/produttore/mercati', '/produttore/disponibilita', '/produttore/fornitori',
               '/produttore/ddt', '/produttore/listino-ai'],
  staff:      ['/staff', '/staff/bisogni', '/staff/crea-evento', '/staff/affitti',
               '/staff/team', '/staff/assenze', '/staff/profilo', '/staff/ddt'],
  admin:      ['/admin', '/admin/andamento', '/admin/ddt'],
}

const browser = await chromium.launch()
const page = await browser.newPage()
const errori = []
page.on('pageerror', (e) => errori.push('JS: ' + e.message))
page.on('console', (m) => {
  if (m.type() !== 'error') return
  const t = m.text()
  if (/manifest|CORS|preload|DevTools|Future Flag/i.test(t)) return   // rumore di Codespaces
  errori.push('console: ' + t.slice(0, 200))
})

console.log(`\nAccesso come ${email}...`)
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.fill('input[type="email"]', email)
await page.fill('input[type="password"]', PASSWORD)
await page.click('button[type="submit"]')
await page.waitForTimeout(3500)

const dopoLogin = await page.locator('body').innerText()
if (/Email o password non corretti/i.test(dopoLogin)) {
  console.log('ACCESSO FALLITO: utente inesistente o password sbagliata.')
  console.log('Crea gli utenti in Supabase -> Authentication -> Users, con Auto Confirm User attivo.')
  await browser.close(); process.exit(1)
}
console.log('Accesso riuscito.\n')

let problemi = 0
for (const percorso of (PERCORSI[ruolo] ?? PERCORSI.cliente)) {
  errori.length = 0
  await page.goto(BASE + percorso, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(2000)

  const testo = (await page.locator('body').innerText().catch(() => '')).trim()
  const vuota = testo.length < 20
  const esploso = /non si è caricata|Questa pagina non/i.test(testo)

  if (errori.length === 0 && !vuota && !esploso) {
    console.log(`  OK    ${percorso}`)
  } else {
    problemi++
    console.log(`  KO    ${percorso}`)
    if (vuota) console.log('        pagina vuota')
    if (esploso) console.log('        ' + testo.split('\n').slice(0, 6).join(' | '))
    errori.slice(0, 3).forEach((e) => console.log('        ' + e))
  }
}

// La scheda di un mercato, presa dall'elenco.
if (ruolo === 'cliente') {
  errori.length = 0
  await page.goto(BASE + '/mercati', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const link = page.locator('a[href^="/mercati/"]').first()
  if (await link.count()) {
    const href = await link.getAttribute('href')
    await link.click()
    await page.waitForTimeout(2500)
    const testo = (await page.locator('body').innerText().catch(() => '')).trim()
    console.log(`\n  scheda mercato (${href}):`)
    console.log(errori.length || testo.length < 20
      ? '  KO    ' + (testo.split('\n').slice(0, 8).join(' | ') || 'pagina vuota')
      : '  OK    ' + testo.split('\n').slice(0, 3).join(' | '))
    errori.slice(0, 5).forEach((e) => console.log('        ' + e))
  } else {
    console.log('\n  nessun mercato nell\'elenco: controlla che il seed sia stato eseguito')
  }
}

console.log(`\n${problemi === 0 ? 'Nessun problema rilevato.' : problemi + ' pagine con problemi.'}\n`)
await browser.close()
