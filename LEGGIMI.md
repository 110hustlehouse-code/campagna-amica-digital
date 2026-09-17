# Edge Functions + correzione profilo produttore

## 1. Prima il file SQL

`6_mercati_azienda.sql` nel SQL Editor di Supabase.

Corregge il bug per cui il produttore non riusciva a salvare il profilo:
il salvataggio doveva aggiornare l'elenco aziende dentro i mercati, ma le
policy lo vietano (giustamente). Ora c'e' una funzione che lo fa in modo
controllato, verificando che l'azienda sia davvero di chi la modifica.

## 2. I file dell'app

Sostituiscono i precedenti. Poi:

```
npx tsc --noEmit
npm run build
```

## 3. Le Edge Functions

12 funzioni, in `supabase/functions/`.

### Installazione degli strumenti

```
npm install -g supabase
supabase login
supabase link --project-ref jkrzjlfgchzbuqpfsdoh
```

### Chiave per le funzioni con AI

Tre funzioni usano un modello linguistico: `invokeLLM`, `analyzeListino`,
`refreshColdirettiNews`. Serve una chiave Anthropic, presa da
console.anthropic.com:

```
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

La chiave resta lato server. Non finisce mai nel browser.

### Pubblicazione

```
supabase functions deploy --no-verify-jwt notifyProducersNewCommunication
supabase functions deploy rsvpProducerEvent
supabase functions deploy notifyProducerNeedResponse
supabase functions deploy replyToReview
supabase functions deploy notifyOrderUpdate
supabase functions deploy notifyReview
supabase functions deploy notifyFavoriteProduct
supabase functions deploy deleteUserAccount
supabase functions deploy invokeLLM
supabase functions deploy analyzeListino
supabase functions deploy exportOrdersPDF
supabase functions deploy refreshColdirettiNews
```

Oppure tutte insieme:

```
supabase functions deploy
```

## Cosa fa ciascuna

| Funzione | Quando entra in gioco |
|---|---|
| notifyProducersNewCommunication | lo staff pubblica un evento o un avviso |
| rsvpProducerEvent | un produttore aderisce o rifiuta un evento |
| notifyProducerNeedResponse | lo staff risponde a una segnalazione |
| replyToReview | il produttore risponde a una recensione |
| notifyOrderUpdate | cambia lo stato di un ordine |
| notifyReview | arriva una nuova recensione |
| notifyFavoriteProduct | un'azienda seguita pubblica un prodotto |
| deleteUserAccount | l'utente cancella il proprio account |
| invokeLLM | funzioni AI generiche |
| analyzeListino | il produttore carica il listino e il catalogo si popola |
| exportOrdersPDF | riepilogo ordini stampabile |
| refreshColdirettiNews | aggiorna le notizie (da programmare, non a ogni accesso) |

## Nota su deleteUserAccount

Un'azienda che ha gia' emesso DDT non viene cancellata ma disattivata: i
documenti di trasporto sono atti fiscali e devono restare. E' una scelta
deliberata, non una dimenticanza.

## Verifica

Non ho potuto eseguire il type-check completo delle funzioni: la rete del
mio ambiente blocca il registro dei pacchetti Deno. La sintassi e'
verificata; eventuali errori di tipo emergeranno al deploy, che li
segnala con precisione. Se qualcuno fallisce, mandami il messaggio.
