-- ============================================================
-- pg_net triggers: leggi supabase_url e service_role_key
-- dal Vault invece che da GUC (ALTER ROLE non disponibile
-- senza privilegi sufficienti su Supabase Free/Starter).
--
-- PREREQUISITI (eseguire UNA VOLTA nel SQL Editor):
--
--   SELECT vault.create_secret(
--     'https://<tuo-project-ref>.supabase.co',
--     'supabase_url'
--   );
--   SELECT vault.create_secret(
--     '<tua-service-role-key>',
--     'supabase_service_role_key'
--   );
--
-- Trovi entrambi i valori in:
--   Dashboard → Project Settings → API
--   - Project URL
--   - service_role (secret)
-- ============================================================


-- ============================================================
-- Helper: legge supabase_url dal Vault
-- ============================================================
create or replace function public.get_supabase_url()
returns text language sql security definer set search_path = public as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'supabase_url'
  limit 1;
$$;

-- ============================================================
-- Helper: legge supabase_service_role_key dal Vault
-- ============================================================
create or replace function public.get_service_role_key()
returns text language sql security definer set search_path = public as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'supabase_service_role_key'
  limit 1;
$$;


-- ============================================================
-- TRIGGER 1: notifyOrderUpdate
-- ============================================================
create or replace function trigger_notify_order_update()
returns trigger language plpgsql as $$
declare
  project_url      text := public.get_supabase_url();
  service_role_key text := public.get_service_role_key();
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
  project_url      text := public.get_supabase_url();
  service_role_key text := public.get_service_role_key();
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
  project_url      text := public.get_supabase_url();
  service_role_key text := public.get_service_role_key();
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
      body    := jsonb_build_object('data', row_to_json(NEW))
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
  project_url      text := public.get_supabase_url();
  service_role_key text := public.get_service_role_key();
  webhook_secret   text := public.get_webhook_secret();
begin
  perform net.http_post(
    url     := project_url || '/functions/v1/notifyReview',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'Authorization',    'Bearer ' || service_role_key,
      'x-webhook-secret', coalesce(webhook_secret, '')
    ),
    body    := jsonb_build_object('record', row_to_json(NEW))
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
  project_url      text := public.get_supabase_url();
  service_role_key text := public.get_service_role_key();
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
      body    := jsonb_build_object('record', row_to_json(NEW))
    );
  end if;
  return NEW;
end;
$$;
