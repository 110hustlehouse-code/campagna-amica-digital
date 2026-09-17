# Area amministrazione

## 1. SQL — per primo

`8_admin.sql` nel SQL Editor. Crea tre funzioni:

- `metriche_territorio` — aggrega a qualsiasi livello: Italia, regione,
  provincia, comune, quartiere
- `riepilogo_nazionale` — i numeri di testa della dashboard
- `ddt_nazionali` — il registro completo con il territorio risolto

Le aggregazioni girano nel database. Sommare l'archivio DDT nazionale nel
browser significherebbe scaricarlo tutto a ogni apertura della pagina.

Le tre funzioni sono revocate a `anon`: le puo' eseguire solo un utente
autenticato, e le policy filtrano comunque cio' che vede.

## 2. File dell'app

```
npm run build
```

## 3. Come si entra

Chi ha ruolo `admin` viene portato in `/admin` appena accede, senza
passare dalla scelta del ruolo. Gli altri, se provano ad andarci, vengono
rimandati indietro.

Il controllo nel browser serve solo a nascondere il menu: la protezione
vera e' nel database.

## Panoramica

Quattro numeri in testa — mercati attivi, aziende, DDT del periodo, merce
tracciata — e sotto la tabella territoriale.

Si parte dalle regioni. Toccando una riga si scende: regione → province →
comuni → quartieri → mercati. Il percorso in alto riporta indietro a
qualsiasi livello.

Nella colonna DDT il secondo numero e' quello dei documenti gia'
consegnati: la distanza fra i due dice quanto la rete chiude il ciclo.

## Registro DDT

Tutti i documenti nazionali, filtrabili per periodo, regione e stato,
con ricerca per azienda o mercato.

- **CSV** esporta quello che si sta guardando, per Excel
- **Analizza** manda al modello i totali per regione e chiede una lettura
  in cinque frasi. Al modello vanno solo gli aggregati, mai i documenti:
  i dati delle singole aziende non escono dal database.

"Analizza" richiede la chiave Anthropic e la funzione `invokeLLM`
pubblicata. Senza, il resto della pagina funziona lo stesso.

## Diagnostica

Ora copre anche admin e le nuove pagine:

```
RUOLO=admin node strumenti/diagnostica.mjs
```
