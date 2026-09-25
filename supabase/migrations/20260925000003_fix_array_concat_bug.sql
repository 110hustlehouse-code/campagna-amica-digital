-- Fix: changed_fields || 'stringa' è ambiguo per Postgres — a volte
-- interpreta la stringa come un array letterale da parsare invece che
-- come singolo elemento da accodare, fallendo con "malformed array
-- literal". array_append() non ha questa ambiguità.
create or replace function public.trigger_notify_producer_order_edit()
returns trigger language plpgsql as $function$
declare
  project_url      text := public.get_supabase_url();
  service_role_key text := public.get_service_role_key();
  webhook_secret   text := public.get_webhook_secret();
  changed_fields   text[] := '{}';
begin
  if NEW.items::text <> OLD.items::text             then changed_fields := array_append(changed_fields, 'items');        end if;
  if NEW.total_amount <> OLD.total_amount            then changed_fields := array_append(changed_fields, 'total_amount'); end if;
  if NEW.pickup_date is distinct from OLD.pickup_date then changed_fields := array_append(changed_fields, 'pickup_date'); end if;
  if NEW.notes is distinct from OLD.notes            then changed_fields := array_append(changed_fields, 'notes');        end if;
  if NEW.status <> OLD.status                        then changed_fields := array_append(changed_fields, 'status');       end if;

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
$function$;