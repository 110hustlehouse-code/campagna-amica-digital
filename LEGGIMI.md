# Frontend agganciato allo schema unificato

`npx tsc --noEmit` a **zero**, `npm run build` completata. 26 file toccati.

---

## 1. La decisione, in breve

Base il **tuo** frontend, non il suo. Quattro ragioni, tutte verificabili:

- il suo passa da un adattatore che riproduce l'interfaccia Base44 su Supabase (`src/api/entities/_adapter.js`): traduce `-created_date` in `{field:'created_at', ascending:false}` e rimappa i nomi. È la cosa che avevi escluso a settembre, e tenerla significa portarsi i nomi di Base44 per sempre
- il tuo è tipizzato: il compilatore ha trovato **82 errori in 7 file** in tre secondi, tutti nel data layer, zero nelle 77 pagine. Sul suo, JavaScript senza tipi, la stessa operazione sarebbe grep e speranza
- la sua area direzione — 4 pagine, 840 righe — non contiene **nessun** riferimento a regione, provincia, comune o quartiere: il drill-down nazionale da lui non esiste
- è la versione che Campagna Amica ha già visto

Dal suo restano da prendere tre cose, non ancora fatte: le pagine **Affitti** e **Problemi** della direzione, e l'aggancio a `verify-access-code` che elimina i codici in chiaro.

---

## 2. Due migration nuove

Oltre alle cinque già consegnate:

**`20260921000004_users_profilo.sql`** — `public.users` ha solo id, email, role e role_confirmed: abbastanza per autorizzare, non per l'interfaccia. Il frontend mostra il nome in 33 punti e il telefono in 18 — fra cui il dettaglio ordine, dove lo staff deve poter chiamare chi ha prenotato. Aggiunge `full_name`, `phone`, `avatar_url`, aggiorna `handle_new_user()` perché copi il nome dai metadati di registrazione, e aggiunge la policy che lascia all'utente il proprio profilo ma non il proprio ruolo.

**`20260921000005_mercati_azienda.sql`** — porta `sincronizza_mercati_azienda()` sul nuovo schema. L'operazione tocca `companies.market_ids` e `markets.company_ids`, due array che devono restare in accordo; un produttore può scrivere sulla propria azienda ma non su `markets`, quindi dal frontend l'aggiornamento riuscirebbe a metà e le due liste divergerebbero in silenzio. Qui è una transazione sola, con la proprietà verificata dentro.

---

## 3. Cosa è cambiato nel frontend

### Rinomine, sei file

`profiles` → `users` · `company_needs` → `producer_needs` · `created_date` → `created_at` · `updated_date` → `updated_at`

Lo schema di Gianluca usa `_at`; il tuo replicava `_date` di Base44.

`favorites` ora richiede `user_id`: senza, la riga non appartiene a nessuno e le policy non saprebbero a chi mostrarla. `aggiungiPreferito` lo prende dalla sessione.

### `ddt.ts`, riscritto

Non era una rinomina. Nel suo schema il ciclo di vita del DDT passa da Edge Function che girano con la service key — `issueDdt`, `signDdt`, `cancelDdt`, `exportDdtPDF` — perché il progressivo va assegnato lato server con lock: due emissioni simultanee non devono poter ottenere lo stesso numero.

Cambiamenti che si vedono nell'interfaccia:

- **Non esiste più lo stato "consegnato".** Gli stati sono `draft`, `issued`, `cancelled`, e la consegna è la **firma**: `signed_at`, `signed_by_recipient_user_id`, `signature_method`. Non è un flag, è una prova con data e autore. `segnaConsegnato()` è diventata `firmaDdt()`.
- **Le righe non hanno prezzo.** Un DDT non è una fattura. Ho tolto il campo "€ unitario" dall'editor e al suo posto ci sono **lotto** e **data di scadenza**, che il suo schema porta e che sono la tracciabilità vera — l'argomento con Coldiretti.
- Il numero non è una colonna: `progressive_number` e `progressive_year` si compongono con l'helper `numeroCompleto()`.

### Andamento

`ddt_consegna_media_gg` è diventata `ddt_firma_media_gg`, affiancata da `ddt_non_firmati`.

E la pagina adesso **dichiara la copertura della stima**: siccome il valore merce è calcolato al prezzo di catalogo e le righe senza prodotto collegato valgono zero, sotto il grafico compare che percentuale delle righe ha un prezzo. Senza quel numero, un totale basso non si distingue da un dato mancante — e a un dirigente non si mostra una cifra che non sa quanto vale.

---

## 4. Come applicarlo

Le due migration nuove, sul progetto `campagna-amica-unificato`:

```bash
psql -W -h aws-0-eu-west-2.pooler.supabase.com -p 5432 -U postgres.otefhryrnajzfyaiwmja -d postgres -v ON_ERROR_STOP=1 -f _migrations_nuove/20260921000004_users_profilo.sql
```

```bash
psql -W -h aws-0-eu-west-2.pooler.supabase.com -p 5432 -U postgres.otefhryrnajzfyaiwmja -d postgres -v ON_ERROR_STOP=1 -f _migrations_nuove/20260921000005_mercati_azienda.sql
```

Poi i file del frontend: estrai il pacchetto nella radice del tuo repo, sovrascrive i 26 file elencati. Poi:

```bash
npx tsc --noEmit && npm run build
```

Infine cambia `.env.local` perché punti al progetto nuovo: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` li trovi in Supabase → Project Settings → API.

---

## 5. Cosa manca ancora

1. **Le Edge Functions non sono deployate** sul progetto nuovo. Senza `issueDdt`, `signDdt`, `cancelDdt` il DDT si crea in bozza ma non si emette. Sono 25 sue più le tue: è il prossimo blocco di lavoro.
2. **Nessun collaudo in browser.** Compila e costruisce, ma non ho potuto provarlo contro il database vero: il mio ambiente non raggiunge Supabase. Appena le Edge Function sono su, va rifatto il giro con `strumenti/diagnostica.mjs` sui quattro ruoli.
3. **Pagine Affitti e Problemi** da portare dalla sua direzione.
4. **`verify-access-code`** al posto dei codici in chiaro in `RoleSelect.jsx`.
5. **La CI** va puntata sulla catena unificata, aggiungendo il controllo che l'ha resa utile: che lo schema si ricostruisca da zero.
