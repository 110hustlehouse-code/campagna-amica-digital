-- ============================================================
-- C4 security fix — Add X-Webhook-Secret header to all pg_net
-- trigger functions so notify/cron Edge Functions can validate
-- they are being called by the DB and not by an external attacker.
--
-- PREREQUISITES (run once after deploy):
--   ALTER DATABASE postgres
--     SET app.webhook_shared_secret = '<generate with: openssl rand -hex 32>';
--
-- Also set the WEBHOOK_SHARED_SECRET env var in the Supabase
-- Dashboard → Edge Functions → Secrets with the same value.
-- ============================================================

-- ============================================================
-- TRIGGER 1: notifyOrderUpdate (updated)
-- ============================================================
create or replace function trigger_notify_order_update()
returns trigger language plpgsql as $$
declare
  service_role_key  text := current_setting('app.supabase_service_role_key', true);
  project_url       text := current_setting('app.supabase_url', true);
  webhook_secret    text := current_setting('app.webhook_shared_secret', true);
begin
  if NEW.status <> OLD.status then
    perform net.http_post(
      url     := project_url || '/functions/v1/notifyOrderUpdate',
      headers := jsonb_build_object(
        'Content-Type',     'application/json',
        'Authorization',    'Bearer ' || service_role_key,
        'x-webhook-secret', coalesce(webhook_secret, '')
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

-- ============================================================
-- TRIGGER 2: notifyProducerOrderEdit (updated)
-- ============================================================
create or replace function trigger_notify_producer_order_edit()
returns trigger language plpgsql as $$
declare
  service_role_key  text := current_setting('app.supabase_service_role_key', true);
  project_url       text := current_setting('app.supabase_url', true);
  webhook_secret    text := current_setting('app.webhook_shared_secret', true);
  changed_fields    text[] := '{}';
begin
  if NEW.items::text <> OLD.items::text        then changed_fields := changed_fields || 'items';        end if;
  if NEW.total_amount <> OLD.total_amount       then changed_fields := changed_fields || 'total_amount'; end if;
  if NEW.pickup_date is distinct from OLD.pickup_date then changed_fields := changed_fields || 'pickup_date'; end if;
  if NEW.notes is distinct from OLD.notes       then changed_fields := changed_fields || 'notes';        end if;
  if NEW.status <> OLD.status                   then changed_fields := changed_fields || 'status';       end if;

  if array_length(changed_fields, 1) > 0 then
    perform net.http_post(
      url     := project_url || '/functions/v1/notifyProducerOrderEdit',
      headers := jsonb_build_object(
        'Content-Type',     'application/json',
        'Authorization',    'Bearer ' || service_role_key,
        'x-webhook-secret', coalesce(webhook_secret, '')
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

-- ============================================================
-- TRIGGER 3: notifyFavoriteProduct (updated)
-- ============================================================
create or replace function trigger_notify_favorite_product()
returns trigger language plpgsql as $$
declare
  service_role_key  text := current_setting('app.supabase_service_role_key', true);
  project_url       text := current_setting('app.supabase_url', true);
  webhook_secret    text := current_setting('app.webhook_shared_secret', true);
begin
  if NEW.company_id is not null then
    perform net.http_post(
      url     := project_url || '/functions/v1/notifyFavoriteProduct',
      headers := jsonb_build_object(
        'Content-Type',     'application/json',
        'Authorization',    'Bearer ' || service_role_key,
        'x-webhook-secret', coalesce(webhook_secret, '')
      ),
      body    := jsonb_build_object(
        'data', row_to_json(NEW)
      )
    );
  end if;
  return NEW;
end;
$$;

-- ============================================================
-- TRIGGER 4: notifyReview (updated)
-- ============================================================
create or replace function trigger_notify_review()
returns trigger language plpgsql as $$
declare
  service_role_key  text := current_setting('app.supabase_service_role_key', true);
  project_url       text := current_setting('app.supabase_url', true);
  webhook_secret    text := current_setting('app.webhook_shared_secret', true);
begin
  perform net.http_post(
    url     := project_url || '/functions/v1/notifyReview',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'Authorization',    'Bearer ' || service_role_key,
      'x-webhook-secret', coalesce(webhook_secret, '')
    ),
    body    := jsonb_build_object(
      'record', row_to_json(NEW)
    )
  );
  return NEW;
end;
$$;

-- ============================================================
-- TRIGGER 5: checkSeasonalityAndNotify (updated)
-- ============================================================
create or replace function trigger_check_seasonality()
returns trigger language plpgsql as $$
declare
  service_role_key  text := current_setting('app.supabase_service_role_key', true);
  project_url       text := current_setting('app.supabase_url', true);
  webhook_secret    text := current_setting('app.webhook_shared_secret', true);
begin
  if NEW.available = true and (OLD.available is null or OLD.available = false) then
    perform net.http_post(
      url     := project_url || '/functions/v1/checkSeasonalityAndNotify',
      headers := jsonb_build_object(
        'Content-Type',     'application/json',
        'Authorization',    'Bearer ' || service_role_key,
        'x-webhook-secret', coalesce(webhook_secret, '')
      ),
      body    := jsonb_build_object(
        'record', row_to_json(NEW)
      )
    );
  end if;
  return NEW;
end;
$$;

-- ============================================================
-- CONFIGURAZIONE (aggiornata)
-- Aggiungere anche webhook_shared_secret alle variabili GUC:
-- ALTER DATABASE postgres SET app.webhook_shared_secret = '<openssl rand -hex 32>';
-- E impostare la stessa stringa in Supabase Dashboard →
--   Edge Functions → Secrets → WEBHOOK_SHARED_SECRET
-- ============================================================
