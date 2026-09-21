-- ---------------------------------------------------------------------------
-- RIPARAZIONE del file originale 20260603000014_cron_missing_ddt.sql
--
-- Il blocco passato a cron.schedule() era racchiuso fra $$ ... $$, gli stessi
-- delimitatori del do $$ ... $$ esterno: il primo $$ interno chiudeva il
-- blocco esterno e il resto veniva letto come SQL sciolto.
--   ERROR: syntax error at or near "select"
-- Non dipende dall'ambiente: non si applica da nessuna parte, nemmeno con
-- pg_cron installato. Qui il blocco interno usa il tag $job$.
-- ---------------------------------------------------------------------------

-- Migration: cron per checkMissingDdtAtMarketStart
-- Richiede pg_cron abilitato (Supabase Pro / Enterprise).
-- Sul piano Free usare una Supabase Scheduled Edge Function via Dashboard.
--
-- La Edge Function valuta internamente la finestra ±10 min rispetto a
-- "30 minuti dopo lo start_time dell'evento" → eseguirla ogni 5 minuti
-- è sicuro (nessun duplicato grazie ai check delivery_notes e absences).

-- Helper per ottenere l'URL del progetto dal Vault (pattern già in uso nel progetto)
-- Se get_supabase_url() non esiste ancora, sarà già definita dalla migration 009.

-- Nota: richiede pg_cron + pg_net installati e abilitati dal Dashboard Supabase.
-- Su piano Free: abilitare manualmente da Extensions tab.

do $$
begin
  -- Esegui solo se pg_cron è disponibile
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'check-missing-ddt-every-5-min',
      '*/5 * * * *',
      $job$
        select net.http_post(
          url     := get_supabase_url() || '/functions/v1/checkMissingDdtAtMarketStart',
          headers := jsonb_build_object(
            'Content-Type',    'application/json',
            'x-webhook-secret', (
              select decrypted_secret from vault.decrypted_secrets
              where name = 'webhook_shared_secret' limit 1
            )
          ),
          body    := '{}'::jsonb
        )
      $job$
    );
  end if;
end;
$$;
