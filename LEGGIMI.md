# DDT — documento di trasporto

## File

- `src/pages/producer/ProducerDDT.jsx` — NUOVO, emissione lato produttore
- `src/pages/staff/StaffDDT.jsx` — NUOVO, documenti in arrivo al mercato
- `src/components/layout/ProducerLayout.jsx` — voce DDT nella barra
- `src/components/layout/StaffLayout.jsx` — voce DDT nella barra
- `src/App.jsx` — le due rotte

```
npm run build
```

Non serve SQL: le tabelle ci sono dal primo giorno.

## Come funziona per il produttore

1. **Nuovo** → sceglie il mercato di destinazione e la causale
2. Aggiunge la merce, prendendola dal proprio catalogo o scrivendola
3. **Crea bozza** — modificabile quanto si vuole, nessun numero assegnato
4. **Emetti** — il documento riceve il numero progressivo e diventa
   immutabile
5. **Consegnato** quando la merce arriva
6. **Annulla** se c'è un errore: il documento resta negli archivi con il
   motivo, e se ne emette uno nuovo

## Perche' la bozza non ha numero

Il progressivo dei DDT non puo' avere buchi. Se il numero venisse
assegnato alla creazione, ogni bozza abbandonata brucerebbe un numero
della serie. Viene assegnato all'emissione, quando il documento diventa
reale.

## Come funziona per lo staff

Vede i documenti in arrivo al proprio mercato dall'inizio del mese, con
il conteggio di documenti, aziende coinvolte e consegne. Puo' cercare per
azienda o numero e aprire il dettaglio della merce.

Non puo' modificarli: il DDT appartiene a chi lo emette.

## Nella barra di navigazione

Lato produttore, DDT prende il posto di "AI", che resta raggiungibile
dalla home. Lato staff prende il posto di "Affitti", raggiungibile dalla
dashboard. Le barre hanno cinque posti e il DDT e' la funzione che vale
di piu' mostrare.

## Cosa manca ancora

- **PDF stampabile**: ora la stampa usa quella del browser. Un PDF
  formale con logo e firma va fatto in una Edge Function.
- **Firma di ricezione**: la tabella ha i campi, l'interfaccia no.
- **Vista admin nazionale**: e' la fase successiva.
