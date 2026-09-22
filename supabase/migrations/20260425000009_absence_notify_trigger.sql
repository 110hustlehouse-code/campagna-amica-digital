-- Trigger pg_net: ad ogni INSERT in absences, notifica lo staff via Edge Function
create or replace function public.notify_absence_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url    text;
  v_secret text;
begin
  -- legge URL e service-role da Vault (vedi cerebrum 2026-04-20: ALTER DATABASE non disponibile su piano Free)
  select decrypted_secret into v_url    from vault.decrypted_secrets where name = 'app.supabase_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'app.supabase_service_role_key';

  perform net.http_post(
    url     := v_url || '/functions/v1/notifyAbsence',
    headers := jsonb_build_object(
      'Content-Type',      'application/json',
      'Authorization',     'Bearer ' || v_secret,
      'X-Webhook-Secret',  v_secret
    ),
    body    := jsonb_build_object('record', row_to_json(NEW))
  );
  return NEW;
end;
$$;

drop trigger if exists trg_absences_notify on public.absences;
create trigger trg_absences_notify
  after insert on public.absences
  for each row execute function public.notify_absence_on_insert();
