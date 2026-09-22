-- ============================================================
-- Campagna Amica Hub — Trigger DB → Edge Functions
-- Usa pg_net per chiamare le Edge Functions come webhook HTTP.
--
-- PREREQUISITI:
--   1. Abilitare l'estensione pg_net nel Supabase dashboard
--      (Database → Extensions → pg_net)
--   2. Impostare la variabile @project_ref con l'ID progetto Supabase
--      oppure sostituire manualmente l'URL nelle funzioni trigger.
--
-- I trigger chiamano le Edge Functions tramite HTTP POST asincrono.
-- Le chiamate avvengono con il service role key archiviato come
-- secret Supabase (SUPABASE_SERVICE_ROLE_KEY).
-- ============================================================

-- Abilita pg_net (già abilitato automaticamente su Supabase, ma per sicurezza)
create extension if not exists pg_net;

-- ============================================================
-- Helper: ottiene l'URL base delle Edge Functions
-- (sostituire con il proprio project ref)
-- ============================================================
-- Nota: nel progetto Supabase reale questo sarà qualcosa come:
-- https://<project-ref>.supabase.co/functions/v1

-- ============================================================
-- TRIGGER 1: notifyOrderUpdate
-- Chiamata quando lo status di un ordine cambia
-- ============================================================
create or replace function trigger_notify_order_update()
returns trigger language plpgsql as $$
declare
  service_role_key text := current_setting('app.supabase_service_role_key', true);
  project_url      text := current_setting('app.supabase_url', true);
begin
  if NEW.status <> OLD.status then
    perform net.http_post(
      url     := project_url || '/functions/v1/notifyOrderUpdate',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body    := jsonb_build_object(
        'data',     row_to_json(NEW),
        'old_data', row_to_json(OLD)
      )
    );
  end if;
  return NEW;
end;
$$;

create or replace trigger on_order_status_change
  after update on public.orders
  for each row execute function trigger_notify_order_update();

-- ============================================================
-- TRIGGER 2: notifyProducerOrderEdit
-- Chiamata quando un ordine viene modificato (NON solo status)
-- ============================================================
create or replace function trigger_notify_producer_order_edit()
returns trigger language plpgsql as $$
declare
  service_role_key text := current_setting('app.supabase_service_role_key', true);
  project_url      text := current_setting('app.supabase_url', true);
  changed_fields   text[] := '{}';
begin
  -- Rileva quali campi son cambiati
  if NEW.items::text <> OLD.items::text then
    changed_fields := changed_fields || 'items';
  end if;
  if NEW.total_amount <> OLD.total_amount then
    changed_fields := changed_fields || 'total_amount';
  end if;
  if NEW.pickup_date is distinct from OLD.pickup_date then
    changed_fields := changed_fields || 'pickup_date';
  end if;
  if NEW.notes is distinct from OLD.notes then
    changed_fields := changed_fields || 'notes';
  end if;
  if NEW.status <> OLD.status then
    changed_fields := changed_fields || 'status';
  end if;

  if array_length(changed_fields, 1) > 0 then
    perform net.http_post(
      url     := project_url || '/functions/v1/notifyProducerOrderEdit',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body    := jsonb_build_object(
        'data',           row_to_json(NEW),
        'old_data',       row_to_json(OLD),
        'changed_fields', to_json(changed_fields)
      )
    );
  end if;
  return NEW;
end;
$$;

create or replace trigger on_order_edit
  after update on public.orders
  for each row execute function trigger_notify_producer_order_edit();

-- ============================================================
-- TRIGGER 3: notifyFavoriteProduct
-- Chiamata quando un utente aggiunge un preferito con company_id
-- ============================================================
create or replace function trigger_notify_favorite_product()
returns trigger language plpgsql as $$
declare
  service_role_key text := current_setting('app.supabase_service_role_key', true);
  project_url      text := current_setting('app.supabase_url', true);
begin
  if NEW.company_id is not null then
    perform net.http_post(
      url     := project_url || '/functions/v1/notifyFavoriteProduct',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body    := jsonb_build_object(
        'data', row_to_json(NEW)
      )
    );
  end if;
  return NEW;
end;
$$;

create or replace trigger on_favorite_insert
  after insert on public.favorites
  for each row execute function trigger_notify_favorite_product();

-- ============================================================
-- TRIGGER 4: notifyReview
-- Chiamata quando viene creata una nuova recensione
-- ============================================================
create or replace function trigger_notify_review()
returns trigger language plpgsql as $$
declare
  service_role_key text := current_setting('app.supabase_service_role_key', true);
  project_url      text := current_setting('app.supabase_url', true);
begin
  perform net.http_post(
    url     := project_url || '/functions/v1/notifyReview',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body    := jsonb_build_object(
      'record', row_to_json(NEW)
    )
  );
  return NEW;
end;
$$;

create or replace trigger on_review_insert
  after insert on public.reviews
  for each row execute function trigger_notify_review();

-- ============================================================
-- TRIGGER 5: checkSeasonalityAndNotify
-- Chiamata quando un prodotto viene reso disponibile
-- ============================================================
create or replace function trigger_check_seasonality()
returns trigger language plpgsql as $$
declare
  service_role_key text := current_setting('app.supabase_service_role_key', true);
  project_url      text := current_setting('app.supabase_url', true);
begin
  -- Solo quando available diventa true
  if NEW.available = true and (OLD.available is null or OLD.available = false) then
    perform net.http_post(
      url     := project_url || '/functions/v1/checkSeasonalityAndNotify',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body    := jsonb_build_object(
        'record', row_to_json(NEW)
      )
    );
  end if;
  return NEW;
end;
$$;

create or replace trigger on_product_available
  after insert or update on public.products
  for each row execute function trigger_check_seasonality();

-- ============================================================
-- CONFIGURAZIONE VARIABILI (da eseguire dopo ogni deploy)
-- Impostare queste variabili con i valori reali del progetto.
-- In Supabase Cloud usare invece la Dashboard → Database → Vault
-- oppure definire le variabili a livello di session nella connessione.
-- ============================================================
-- ALTER DATABASE postgres SET app.supabase_url = 'https://<ref>.supabase.co';
-- ALTER DATABASE postgres SET app.supabase_service_role_key = '<service-role-key>';
