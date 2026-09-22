-- ============================================================
-- C4 fix (revisione) — pg_net triggers leggono webhook_secret
-- da Supabase Vault invece che da GUC (ALTER DATABASE non
-- è disponibile senza piano Pro).
--
-- PREREQUISITI (eseguire una sola volta nel SQL Editor):
--   CREATE EXTENSION IF NOT EXISTS supabase_vault;
--   SELECT vault.create_secret('<openssl rand -hex 32>', 'webhook_shared_secret');
--
-- Impostare lo stesso valore in:
--   Dashboard → Edge Functions → Secrets → WEBHOOK_SHARED_SECRET
-- ============================================================


-- ============================================================
-- Helper: legge webhook_shared_secret dal Vault
-- (security definer per accedere a vault.decrypted_secrets)
-- ============================================================
create or replace function public.get_webhook_secret()
returns text language sql security definer set search_path = public as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'webhook_shared_secret'
  limit 1;
$$;


-- ============================================================
-- TRIGGER 1: notifyOrderUpdate
-- ============================================================
create or replace function trigger_notify_order_update()
returns trigger language plpgsql as $$
declare
  service_role_key text := current_setting('app.supabase_service_role_key', true);
  project_url      text := current_setting('app.supabase_url', true);
  webhook_secret   text := public.get_webhook_secret();
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
-- TRIGGER 2: notifyProducerOrderEdit
-- ============================================================
create or replace function trigger_notify_producer_order_edit()
returns trigger language plpgsql as $$
declare
  service_role_key text := current_setting('app.supabase_service_role_key', true);
  project_url      text := current_setting('app.supabase_url', true);
  webhook_secret   text := public.get_webhook_secret();
  changed_fields   text[] := '{}';
begin
  if NEW.items::text <> OLD.items::text             then changed_fields := changed_fields || 'items';        end if;
  if NEW.total_amount <> OLD.total_amount            then changed_fields := changed_fields || 'total_amount'; end if;
  if NEW.pickup_date is distinct from OLD.pickup_date then changed_fields := changed_fields || 'pickup_date'; end if;
  if NEW.notes is distinct from OLD.notes            then changed_fields := changed_fields || 'notes';        end if;
  if NEW.status <> OLD.status                        then changed_fields := changed_fields || 'status';       end if;

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
-- TRIGGER 3: notifyFavoriteProduct
-- ============================================================
create or replace function trigger_notify_favorite_product()
returns trigger language plpgsql as $$
declare
  service_role_key text := current_setting('app.supabase_service_role_key', true);
  project_url      text := current_setting('app.supabase_url', true);
  webhook_secret   text := public.get_webhook_secret();
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
-- TRIGGER 4: notifyReview
-- ============================================================
create or replace function trigger_notify_review()
returns trigger language plpgsql as $$
declare
  service_role_key text := current_setting('app.supabase_service_role_key', true);
  project_url      text := current_setting('app.supabase_url', true);
  webhook_secret   text := public.get_webhook_secret();
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
-- TRIGGER 5: checkSeasonalityAndNotify
-- ============================================================
create or replace function trigger_check_seasonality()
returns trigger language plpgsql as $$
declare
  service_role_key text := current_setting('app.supabase_service_role_key', true);
  project_url      text := current_setting('app.supabase_url', true);
  webhook_secret   text := public.get_webhook_secret();
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
