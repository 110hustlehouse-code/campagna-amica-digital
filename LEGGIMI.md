# Repository unificato — riorganizzazione di `supabase/`

Chiude i punti **6** (la CI validava lo schema sbagliato) e **7** (repo ibrido) della lista.

---

## Il problema che risolve

Il repository era in tre stati contemporaneamente:

- il **frontend** parla lo schema unificato
- `supabase/migrations/` conteneva le 8 migration del **17 settembre**, cioè lo schema superato
- `supabase/unificato/` conteneva le 7 nuove, sciolte dal resto
- `supabase/functions/` conteneva **12 Edge Function scritte per lo schema vecchio**

E soprattutto: **le 24 Edge Function realmente deployate non erano versionate da nessuna parte.** Vivevano solo in `gianluca_tmp`, una cartella temporanea del Codespace. Se quel Codespace venisse ricreato, il codice che gira in produzione esisterebbe solo nel repository di Gianluca.

La CI, intanto, era verde: ricostruiva da zero uno schema che nessuno usa più. Una pipeline che valida la cosa sbagliata è peggio di nessuna pipeline, perché dà una sicurezza che non c'è.

---

## Com'è adesso

```
supabase/
  migrations/     28 file — la catena unificata completa, in ordine di timestamp
  functions/      24 Edge Function, le stesse che girano su Supabase
  seed/           01 territorio · 02 mercato pilota · 03 utenti di prova
  prova/          impalcatura e controlli per la CI — MAI su Supabase
archivio/
  schema-precedente/   le 8 migration e le 12 funzioni del vecchio schema
```

Lo schema vecchio non si cancella: si archivia. Se un domani serve ricostruire la storia del progetto — e in una trattativa su chi ha fatto cosa può servire — quei file sono la prova datata di un lavoro reale.

---

## La CI, rifatta

Il job `database` adesso punta alla catena giusta e fa quattro controlli:

1. **Lo schema si ricostruisce da zero.** È il controllo che avrebbe intercettato le cinque migration rotte trovate domenica.
2. **Le sei funzioni admin rispondono** — e, subito dopo, **rifiutano un chiamante senza ruolo**. Servono entrambe le verifiche: un test che provasse solo la prima passerebbe anche con il controllo di ruolo rimosso per sbaglio, cioè esattamente nel caso che deve intercettare.
3. Nessuna tabella senza RLS.
4. Nessuna funzione admin raggiungibile da `anon`.

Il job `frontend` fa `tsc`, `build`, e due grep che fanno fallire la build:

- una chiave di servizio o una chiave API dentro `src/`
- un riferimento residuo a `media.base44.com`

Quest'ultimo è pensato apposta per il punto 5: finché quei 13 file non sono sistemati la build resta rossa, così il problema non si dimentica invece di essere risolto.

`pg_net` e `pg_cron` non esistono su un Postgres nudo: la CI neutralizza quelle righe **in una copia temporanea**. I file nel repository restano quelli veri, che su Supabase servono.

---

## Come applicarlo

**1. Pulizia** — sposta il vecchio in archivio e toglie i file di appoggio:

```bash
cd /workspaces/campagna-amica-digital && bash PULIZIA.sh
```

Metti prima `PULIZIA.sh` nella radice del repo (è dentro il pacchetto).

**2. Estrai il pacchetto** nella radice: sovrascrive `supabase/` e `.github/workflows/ci.yml`.

**3. Controlla** cosa è cambiato prima di committare:

```bash
cd /workspaces/campagna-amica-digital && git status --short | head -40
```

Ti aspetti: molti file spostati in `archivio/`, `supabase/migrations/` con 28 file, `supabase/functions/` con 24 cartelle, `supabase/unificato/` sparita.

**4. Verifica che compili ancora** (la pulizia non tocca `src/`, ma è un controllo da due secondi):

```bash
cd /workspaces/campagna-amica-digital && npx tsc --noEmit && npm run build 2>&1 | tail -2
```

**5. Commit e push.**

La CI diventerà **rossa** al primo push, e va bene così: il controllo su `media.base44.com` fallisce finché il punto 5 non è chiuso. È il promemoria che si voleva.

---

## Verificato

La catena è stata applicata su PostgreSQL 16 esattamente come la esegue la CI — stessa neutralizzazione delle estensioni, stesso ordine:

```
28 migration        applicate senza errori
01_territorio       20 regioni, 5 province
6 funzioni admin    rispondono con un admin
                    rifiutano senza ruolo  (insufficient_privilege)
```
