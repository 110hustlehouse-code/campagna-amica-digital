-- ============================================================
-- Stagionalità legata al DDT emesso (non più alla disponibilità
-- a catalogo). Rimuove anche la dipendenza da OpenAI.
-- ============================================================

-- 1. Stagionalità: solo frutta e verdura fresca (esclude erbe_spezie,
--    che mescola erbe fresche e spezie secche — le spezie secche
--    non sono mai "fuori stagione").
create table if not exists public.seasonal_products (
  id         uuid primary key default gen_random_uuid(),
  match_key  text not null unique,
  category   text not null check (category in ('frutta','verdura')),
  months     int[] not null,
  created_at timestamptz not null default now()
);
comment on table public.seasonal_products is 'Stagionalità frutta/verdura italiana, mesi 1-12.';

insert into public.seasonal_products (match_key, category, months) values
  ('fragole','frutta','{4,5,6}'),
  ('ciliegie','frutta','{5,6,7}'),
  ('albicocche','frutta','{6,7}'),
  ('pesche','frutta','{7,8,9}'),
  ('nettarine','frutta','{7,8,9}'),
  ('melone','frutta','{7,8,9}'),
  ('anguria','frutta','{7,8,9}'),
  ('cocomero','frutta','{7,8,9}'),
  ('fichi','frutta','{8,9,10}'),
  ('uva','frutta','{9,10,11}'),
  ('melograno','frutta','{10,11,12}'),
  ('castagne','frutta','{10,11}'),
  ('prugne','frutta','{8,9,10}'),
  ('susine','frutta','{7,8,9}'),
  ('arance','frutta','{1,2,3,12}'),
  ('mandarini','frutta','{1,2,12}'),
  ('clementine','frutta','{1,2,11,12}'),
  ('limoni','frutta','{1,2,3,4,12}'),
  ('kiwi','frutta','{1,2,3,4,12}'),
  ('bergamotto','frutta','{1,2,3,12}'),
  ('pere','frutta','{1,2,8,9,10,11,12}'),
  ('mele','frutta','{1,2,3,9,10,11,12}'),
  ('noci','frutta','{10,11,12}'),
  ('nocciole','frutta','{9,10,11}'),
  ('mandorle','frutta','{8,9,10}'),
  ('peperoni','verdura','{7,8,9,10}'),
  ('pomodori','verdura','{6,7,8,9,10}'),
  ('pomodorini','verdura','{6,7,8,9,10}'),
  ('melanzane','verdura','{7,8,9,10}'),
  ('zucchine','verdura','{5,6,7,8,9,10}'),
  ('cetrioli','verdura','{6,7,8,9}'),
  ('fagiolini','verdura','{6,7,8,9}'),
  ('spinaci','verdura','{1,2,3,4,10,11,12}'),
  ('cavolo nero','verdura','{1,2,3,11,12}'),
  ('verza','verdura','{1,2,3,11,12}'),
  ('finocchi','verdura','{1,2,3,12}'),
  ('porri','verdura','{1,2,3,10,11,12}'),
  ('carciofi','verdura','{2,3,4,5,10,11,12}'),
  ('asparagi','verdura','{3,4,5,6}'),
  ('piselli','verdura','{4,5,6}'),
  ('fave','verdura','{4,5,6}'),
  ('ravanelli','verdura','{4,5,6,10,11}'),
  ('lattuga','verdura','{4,5,6,7,8,9,10}'),
  ('rucola','verdura','{4,5,6,7,8,9,10}'),
  ('zucca','verdura','{10,11,12}'),
  ('broccoli','verdura','{10,11,12,1,2,3}'),
  ('cavolfiore','verdura','{10,11,12,1,2,3}'),
  ('radicchio','verdura','{10,11,12,1,2,3}'),
  ('barbabietole','verdura','{9,10,11,12}'),
  ('cipolle','verdura','{6,7,8,9,10,11}'),
  ('aglio','verdura','{5,6,7,8}'),
  ('cime di rapa','verdura','{1,2,3,4,11,12}'),
  ('cicoria','verdura','{1,2,3,4,11,12}'),
  ('puntarelle','verdura','{1,2,3,11,12}'),
  ('topinambur','verdura','{11,12,1,2,3}'),
  ('fagioli borlotti','verdura','{8,9,10}'),
  ('fagioli','verdura','{8,9,10}')
on conflict (match_key) do nothing;

-- 2. Segnalazione persistente, stesso pattern di missing_ddt_reports
create table if not exists public.seasonal_alert_reports (
  id                    uuid primary key default gen_random_uuid(),
  delivery_note_id      uuid not null references public.delivery_notes(id) on delete cascade,
  delivery_note_item_id uuid not null references public.delivery_note_items(id) on delete cascade,
  company_id            uuid not null references public.companies(id) on delete cascade,
  market_id             uuid not null references public.markets(id) on delete cascade,
  product_name          text not null,
  seasonal_match        text not null,
  month_detected        int not null,
  season_months         int[] not null,
  status                text not null default 'open'
                        check (status in ('open','dismissed','resolved')),
  staff_note            text,
  staff_user_id         uuid references public.users(id),
  staff_action_at       timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (delivery_note_item_id)
);
comment on table public.seasonal_alert_reports is 'Segnalazioni di prodotti fuori stagione rilevate su un DDT emesso.';

create index if not exists idx_seasonal_alert_market  on public.seasonal_alert_reports(market_id, status);
create index if not exists idx_seasonal_alert_company on public.seasonal_alert_reports(company_id);

create trigger seasonal_alert_reports_updated_at
  before update on public.seasonal_alert_reports
  for each row execute function update_updated_at_column();

alter table public.seasonal_alert_reports enable row level security;

create policy "seasonal_alert_reports: staff or admin read"
  on public.seasonal_alert_reports for select
  using (is_staff_for_market(market_id) or is_admin());

create policy "seasonal_alert_reports: staff or admin update"
  on public.seasonal_alert_reports for update
  using (is_staff_for_market(market_id) or is_admin())
  with check (is_staff_for_market(market_id) or is_admin());

-- 3. Rimuovi il vecchio trigger su products, qualunque sia il suo nome
do $$
declare
  r record;
begin
  for r in
    select t.tgname, c.relname
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_proc p on p.oid = t.tgfoid
    where p.proname = 'trigger_check_seasonality'
      and not t.tgisinternal
  loop
    execute format('drop trigger if exists %I on public.%I', r.tgname, r.relname);
  end loop;
end $$;

drop function if exists public.trigger_check_seasonality();

-- 4. Nuovo trigger: quando un DDT passa a 'issued'
create or replace function public.trigger_check_seasonality_ddt()
returns trigger language plpgsql as $$
declare
  project_url      text := public.get_supabase_url();
  service_role_key text := public.get_service_role_key();
  webhook_secret   text := public.get_webhook_secret();
begin
  if NEW.status = 'issued' and (OLD.status is distinct from 'issued') then
    perform net.http_post(
      url     := project_url || '/functions/v1/checkSeasonalityAndNotify',
      headers := jsonb_build_object(
        'Content-Type',     'application/json',
        'Authorization',    'Bearer ' || service_role_key,
        'x-webhook-secret', coalesce(webhook_secret, '')
      ),
      body    := jsonb_build_object('delivery_note_id', NEW.id)
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists ddt_check_seasonality on public.delivery_notes;
create trigger ddt_check_seasonality
  after update on public.delivery_notes
  for each row execute function public.trigger_check_seasonality_ddt();