# Notizie dalla cache invece che da una ricerca a ogni visita

## Cosa faceva

Ogni apertura della home lanciava una ricerca web con AI per recuperare
le notizie Coldiretti. Con un utente e' un dettaglio. Su 1.000 mercati
sarebbe una chiamata AI per ogni visita di ogni cliente, per contenuti
che cambiano due volte al giorno — e la home resterebbe lenta ogni volta.

## Cosa fa ora

Legge dalla tabella `news_cache`, che viene aggiornata dalla funzione
`refreshColdirettiNews`. Se la cache e' vuota la sezione non compare,
invece di mostrare un riquadro vuoto o un errore.

Il design e' invariato: cambia solo da dove arrivano i dati.

## Perche' questo risolve anche l'errore della home

`invokeLLM` non e' pubblicata, perche' serve la chiave Anthropic. Con
questa modifica la home non ne ha piu' bisogno: funziona anche senza AI.

## Per avere notizie vere

1. Imposta la chiave vera:
   `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`

2. Pubblica le funzioni AI:
   `supabase functions deploy invokeLLM analyzeListino refreshColdirettiNews --use-api`

3. Programma l'aggiornamento due volte al giorno.
   Su Supabase -> SQL Editor:

```sql
select cron.schedule(
  'notizie-coldiretti',
  '0 7,19 * * *',
  $$ select net.http_post(
       url := 'https://jkrzjlfgchzbuqpfsdoh.supabase.co/functions/v1/refreshColdirettiNews',
       headers := '{"Content-Type":"application/json"}'::jsonb
     ) $$
);
```

Richiede le estensioni `pg_cron` e `pg_net`, che si attivano da
Database -> Extensions.

Senza questo passaggio l'app funziona lo stesso: la sezione notizie
semplicemente non compare.
