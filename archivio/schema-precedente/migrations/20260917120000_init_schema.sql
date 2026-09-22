-- =====================================================================
-- Campagna Amica Digital — Schema iniziale Supabase
-- Campo Zero · migrazione 1:1 da Base44 + estensioni pilot
--
-- PRINCIPI
--  1. Migrazione fedele: i nomi di tabelle/colonne replicano le entita'
--     Base44 cosi' come le usa il frontend (235 chiamate). Nessun refactor
--     in questa fase: le stranezze note sono marcate [DEBITO TECNICO].
--  2. Campi impliciti Base44 replicati ovunque: id, created_date,
--     updated_date, created_by. Il frontend li usa e non va toccato.
--  3. Enum come CHECK constraint, non tipi ENUM Postgres: evolvibili
--     senza migrazioni bloccanti.
--  4. Nessun dato hardcodato su un singolo mercato. Multi-mercato nativo.
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------
-- 0. INFRASTRUTTURA COMUNE
-- ---------------------------------------------------------------------

-- Ogni tabella eredita questi campi (Base44 li crea in automatico).
-- created_by contiene l'EMAIL, non l'uuid: il frontend confronta con
-- user.email in 2 punti. Manteniamo la semantica originale.

create or replace function public.set_updated_date()
returns trigger language plpgsql as $$
begin
  new.updated_date = now();
  return new;
end $$;

create or replace function public.set_created_by()
returns trigger language plpgsql security definer as $$
begin
  if new.created_by is null then
    new.created_by = auth.jwt() ->> 'email';
  end if;
  return new;
end $$;

-- Applica i trigger standard a una tabella
create or replace function public.apply_standard_triggers(tbl text)
returns void language plpgsql as $$
begin
  execute format(
    'create trigger %I before update on public.%I
       for each row execute function public.set_updated_date()',
    'trg_' || tbl || '_updated', tbl);
  execute format(
    'create trigger %I before insert on public.%I
       for each row execute function public.set_created_by()',
    'trg_' || tbl || '_createdby', tbl);
end $$;

-- ---------------------------------------------------------------------
-- 1. IDENTITA' E RUOLI
-- ---------------------------------------------------------------------

-- Base44 esponeva User.role / User.role_confirmed via auth.me().
-- Qui: profiles 1:1 con auth.users, popolata da trigger al signup.

create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text not null unique,
  full_name      text,
  avatar_url     text,
  role           text not null default 'client'
                 check (role in ('admin','client','producer','staff')),
  role_confirmed boolean not null default false,
  phone          text,
  created_date   timestamptz not null default now(),
  updated_date   timestamptz not null default now(),
  created_by     text
);
comment on table public.profiles is
  'Profilo utente. Sostituisce l''entita'' User di Base44.';

-- Whitelist accessi amministrativi. Il bottone Admin in login verifica qui
-- DOPO l'accesso Google: nessuno diventa admin auto-dichiarandosi.
create table public.admin_whitelist (
  email        text primary key,
  livello      text not null default 'nazionale'
               check (livello in ('nazionale','regionale','provinciale')),
  ambito       text,          -- es. 'Lazio' o 'RM'; null = tutta Italia
  note         text,
  attivo       boolean not null default true,
  created_date timestamptz not null default now(),
  created_by   text
);
comment on table public.admin_whitelist is
  'Chi puo'' accedere all''area Admin e su quale ambito territoriale.';

-- Creazione automatica del profilo al primo accesso (Google OAuth incluso)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_role text := 'client';
begin
  if exists (select 1 from public.admin_whitelist
             where lower(email) = lower(new.email) and attivo) then
    v_role := 'admin';
  end if;

  insert into public.profiles (id, email, full_name, avatar_url, role, role_confirmed)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name',
             new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    v_role,
    v_role = 'admin'
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper riusati da tutte le policy RLS (vedi migration successiva)
create or replace function public.current_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_email()
returns text language sql stable as $$
  select auth.jwt() ->> 'email'
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

-- ---------------------------------------------------------------------
-- 2. GERARCHIA TERRITORIALE  [NUOVO — richiesto dall'area Admin]
-- ---------------------------------------------------------------------
-- Base44 aveva solo Market.city e Market.region: insufficiente per il
-- drill-down quartiere -> comune -> provincia -> regione -> Italia.
-- Lookup ISTAT normalizzata + denormalizzazione su markets per query veloci.

create table public.regioni (
  codice_istat text primary key,
  nome         text not null unique,
  ripartizione text   -- Nord-ovest, Nord-est, Centro, Sud, Isole
);

create table public.province (
  sigla         text primary key,          -- RM, MI, NA...
  nome          text not null,
  codice_istat  text not null unique,
  regione_istat text not null references public.regioni(codice_istat)
);
create index on public.province (regione_istat);

create table public.comuni (
  codice_istat   text primary key,
  nome           text not null,
  provincia_sigla text not null references public.province(sigla),
  cap_principale text
);
create index on public.comuni (provincia_sigla);
create index on public.comuni using gin (nome gin_trgm_ops);

-- Quartiere/municipio: esiste solo nelle citta' grandi, quindi tabella
-- separata e opzionale invece di una colonna sempre vuota.
create table public.quartieri (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  comune_istat  text not null references public.comuni(codice_istat),
  municipio     text,
  unique (comune_istat, nome)
);
create index on public.quartieri (comune_istat);

-- ---------------------------------------------------------------------
-- 3. MERCATI
-- ---------------------------------------------------------------------

create table public.markets (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  address       text,
  city          text not null,
  region        text,
  latitude      double precision,
  longitude     double precision,
  schedule      text,
  image_url     text,
  company_ids   text[] not null default '{}',   -- [DEBITO TECNICO] vedi companies.market_ids
  -- estensione territoriale
  comune_istat  text references public.comuni(codice_istat),
  quartiere_id  uuid references public.quartieri(id),
  codice_mercato text unique,                   -- identificativo Campagna Amica
  attivo        boolean not null default true,
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now(),
  created_by    text
);
create index on public.markets (comune_istat);
create index on public.markets (quartiere_id);
create index on public.markets (city);
create index on public.markets using gin (name gin_trgm_ops);
comment on column public.markets.company_ids is
  '[DEBITO TECNICO] Relazione duplicata con companies.market_ids. '
  'Migrata 1:1 da Base44 per non toccare il frontend. '
  'Normalizzare in tabella ponte dopo il pilot.';

-- Vista territoriale completa: base di ogni drill-down dell'area Admin
create view public.v_markets_territorio as
select m.id, m.name, m.city, m.attivo,
       q.nome  as quartiere,
       c.nome  as comune,   c.codice_istat as comune_istat,
       p.nome  as provincia, p.sigla       as provincia_sigla,
       r.nome  as regione,   r.codice_istat as regione_istat,
       r.ripartizione
  from public.markets m
  left join public.quartieri q on q.id = m.quartiere_id
  left join public.comuni    c on c.codice_istat = m.comune_istat
  left join public.province  p on p.sigla = c.provincia_sigla
  left join public.regioni   r on r.codice_istat = p.regione_istat;

-- ---------------------------------------------------------------------
-- 4. AZIENDE E PRODOTTI
-- ---------------------------------------------------------------------

create table public.companies (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text,
  website          text,
  logo_url         text,
  cover_image_url  text,
  category         text check (category in
                     ('ortofrutticola','lattiero_casearia','vinicola','olearia',
                      'cerealicola','zootecnica','apicoltura','altro')),
  region           text,
  city             text,
  phone            text,
  email            text,
  market_ids       text[] not null default '{}',  -- [DEBITO TECNICO]
  market_schedules jsonb  not null default '[]'::jsonb,
  is_registered    boolean not null default false,
  -- campi necessari al DDT (dati fiscali del mittente)
  partita_iva      text,
  codice_fiscale   text,
  ragione_sociale  text,
  sede_indirizzo   text,
  sede_comune_istat text references public.comuni(codice_istat),
  created_date     timestamptz not null default now(),
  updated_date     timestamptz not null default now(),
  created_by       text
);
create index on public.companies (created_by);
create index on public.companies using gin (market_ids);
create index on public.companies using gin (name gin_trgm_ops);

create table public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  price        numeric(10,2) not null,
  unit         text check (unit in ('kg','lt','pz','confezione')),
  image_url    text,
  category     text check (category in
                 ('frutta','verdura','formaggi','salumi','olio','vino',
                  'miele','pane_pasta','conserve','altro')),
  company_id   uuid not null references public.companies(id) on delete cascade,
  available    boolean not null default true,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text
);
create index on public.products (company_id);
create index on public.products (company_id, available);

create table public.product_stocks (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  product_id    uuid references public.products(id) on delete cascade,
  name          text,
  quantity      numeric(12,3) not null default 0,
  min_threshold numeric(12,3),
  notes         text,
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now(),
  created_by    text
);
create index on public.product_stocks (company_id);
create index on public.product_stocks (product_id);

-- ---------------------------------------------------------------------
-- 5. ORDINI, PREFERITI, RECENSIONI
-- ---------------------------------------------------------------------

create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete restrict,
  company_name  text,
  market_id     uuid not null references public.markets(id) on delete restrict,
  market_name   text,
  items         jsonb not null default '[]'::jsonb,
  total_amount  numeric(10,2),
  status        text not null default 'in_attesa'
                check (status in ('in_attesa','confermato','pronto','ritirato','annullato')),
  pickup_date   date,
  notes         text,
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now(),
  created_by    text
);
create index on public.orders (company_id, created_date desc);
create index on public.orders (created_by, created_date desc);
create index on public.orders (market_id);

create table public.favorites (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid references public.companies(id) on delete cascade,
  market_id    uuid references public.markets(id) on delete cascade,
  product_id   uuid references public.products(id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text,
  constraint favorites_one_target check (
    (company_id is not null)::int + (market_id is not null)::int
    + (product_id is not null)::int = 1)
);
create index on public.favorites (created_by);

create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  rating       numeric(2,1) not null check (rating >= 1 and rating <= 5),
  message      text,
  reply        text,
  reply_date   timestamptz,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text
);
create index on public.reviews (company_id);
create unique index on public.reviews (company_id, created_by);  -- una recensione per utente

-- ---------------------------------------------------------------------
-- 6. STAFF, COMUNICAZIONI, EVENTI
-- ---------------------------------------------------------------------

create table public.staff_members (
  id                uuid primary key default gen_random_uuid(),
  market_id         uuid not null references public.markets(id) on delete cascade,
  full_name         text not null,
  email             text not null,
  phone             text,
  position          text check (position in ('market_manager','coordinator','administrator')),
  is_active         boolean not null default true,
  market_confirmed  boolean not null default false,
  created_date      timestamptz not null default now(),
  updated_date      timestamptz not null default now(),
  created_by        text
);
create unique index on public.staff_members (lower(email), market_id);
create index on public.staff_members (market_id);

create table public.staff_messages (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  type         text not null check (type in ('closure','special_opening','event')),
  is_mandatory boolean not null default false,
  market_id    uuid references public.markets(id) on delete cascade,
  location     text not null,
  event_date   date not null,
  time_start   text,
  time_end     text,
  details      text,
  is_published boolean not null default false,
  attachments  jsonb not null default '[]'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text
);
create index on public.staff_messages (market_id, is_published, event_date);

create table public.staff_message_reads (
  id             uuid primary key default gen_random_uuid(),
  message_id     uuid not null references public.staff_messages(id) on delete cascade,
  producer_email text not null,
  company_id     uuid references public.companies(id) on delete cascade,
  read_at        timestamptz,
  feedback       text,
  created_date   timestamptz not null default now(),
  updated_date   timestamptz not null default now(),
  created_by     text
);
create unique index on public.staff_message_reads (message_id, lower(producer_email));

create table public.market_events (
  id                     uuid primary key default gen_random_uuid(),
  market_id              uuid not null references public.markets(id) on delete cascade,
  event_date             date not null,
  time_start             text,
  time_end               text,
  title                  text,
  capacity               integer,
  registered_company_ids text[] not null default '{}',
  created_date           timestamptz not null default now(),
  updated_date           timestamptz not null default now(),
  created_by             text
);
create index on public.market_events (market_id, event_date);

create table public.producer_event_rsvps (
  id             uuid primary key default gen_random_uuid(),
  message_id     uuid not null references public.staff_messages(id) on delete cascade,
  company_id     uuid not null references public.companies(id) on delete cascade,
  producer_email text not null,
  market_id      uuid not null references public.markets(id) on delete cascade,
  status         text not null default 'pending'
                 check (status in ('pending','accepted','declined')),
  created_date   timestamptz not null default now(),
  updated_date   timestamptz not null default now(),
  created_by     text
);
create unique index on public.producer_event_rsvps (message_id, company_id);
create index on public.producer_event_rsvps (market_id);

create table public.company_market_assignments (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  market_event_id     uuid not null references public.market_events(id) on delete cascade,
  assigned_product_ids text[] not null default '{}',
  stand_number        text,
  status              text not null default 'pending'
                      check (status in ('pending','confirmed','completed','cancelled')),
  notes               text,
  created_date        timestamptz not null default now(),
  updated_date        timestamptz not null default now(),
  created_by          text
);
create unique index on public.company_market_assignments (company_id, market_event_id);

-- ---------------------------------------------------------------------
-- 7. BISOGNI AZIENDE, AFFITTI BANCHI, FORNITORI
-- ---------------------------------------------------------------------

create table public.company_needs (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  market_id      uuid not null references public.markets(id) on delete cascade,
  category       text not null check (category in
                   ('bags','materials','urgent','maintenance','other')),
  title          text not null,
  description    text,
  size           text,
  price          numeric(10,2),
  quantity       numeric(12,3),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid')),
  priority       text not null default 'medium' check (priority in ('low','medium','high')),
  status         text not null default 'open'
                 check (status in ('open','in_progress','resolved','closed')),
  due_date       date,
  notes          text,
  created_date   timestamptz not null default now(),
  updated_date   timestamptz not null default now(),
  created_by     text
);
create index on public.company_needs (market_id, status);
create index on public.company_needs (company_id);

create table public.stall_rentals (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  market_id         uuid not null references public.markets(id) on delete cascade,
  stall_number      text,
  monthly_rent      numeric(10,2),
  rental_start_date date,
  rental_end_date   date,
  payment_method    text,
  status            text,
  created_date      timestamptz not null default now(),
  updated_date      timestamptz not null default now(),
  created_by        text
);
create index on public.stall_rentals (market_id);
create index on public.stall_rentals (company_id);

create table public.rental_payments (
  id              uuid primary key default gen_random_uuid(),
  stall_rental_id uuid not null references public.stall_rentals(id) on delete cascade,
  company_id      uuid not null references public.companies(id) on delete cascade,
  market_id       uuid not null references public.markets(id) on delete cascade,
  amount          numeric(10,2) not null,
  payment_date    date,
  period_month    integer not null check (period_month between 1 and 12),
  period_year     integer not null,
  payment_method  text check (payment_method in ('bank_transfer','cash','check','stripe')),
  status          text not null default 'pending' check (status in ('paid','pending','overdue')),
  receipt_url     text,
  created_date    timestamptz not null default now(),
  updated_date    timestamptz not null default now(),
  created_by      text
);
create unique index on public.rental_payments (stall_rental_id, period_year, period_month);
create index on public.rental_payments (market_id, status);

create table public.suppliers (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  name         text not null,
  category     text,
  contact_name text,
  email        text,
  phone        text,
  description  text,
  notes        text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text
);
create index on public.suppliers (company_id);

create table public.supplier_payments (
  id             uuid primary key default gen_random_uuid(),
  supplier_id    uuid not null references public.suppliers(id) on delete cascade,
  company_id     uuid not null references public.companies(id) on delete cascade,
  description    text not null,
  amount         numeric(10,2) not null,
  due_date       date not null,
  status         text not null default 'da_pagare'
                 check (status in ('da_pagare','pagato','scaduto')),
  payment_method text check (payment_method in ('bonifico','contanti','assegno','altro')),
  notes          text,
  created_date   timestamptz not null default now(),
  updated_date   timestamptz not null default now(),
  created_by     text
);
create index on public.supplier_payments (company_id, status);
create index on public.supplier_payments (supplier_id);

-- ---------------------------------------------------------------------
-- 8. NOTIFICHE E NEWS
-- ---------------------------------------------------------------------

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_email   text not null,
  title        text not null,
  message      text,
  type         text not null default 'generic'
               check (type in ('new_product','order_update','generic')),
  company_id   uuid references public.companies(id) on delete cascade,
  product_id   uuid references public.products(id) on delete cascade,
  order_id     uuid references public.orders(id) on delete cascade,
  message_id   uuid references public.staff_messages(id) on delete cascade,
  read         boolean not null default false,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text
);
create index on public.notifications (lower(user_email), read, created_date desc);

create table public.news_cache (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  date         text,
  url          text,
  source       text not null,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text
);
create index on public.news_cache (created_date desc);

-- ---------------------------------------------------------------------
-- 9. HELPER RLS DIPENDENTI DALLE TABELLE
-- ---------------------------------------------------------------------
-- Definite qui e non nella sezione 1: una funzione 'language sql' viene
-- validata alla creazione, quindi le tabelle devono gia' esistere.

-- Mercato di competenza dello staff loggato
create or replace function public.staff_market_id()
returns uuid language sql stable security definer set search_path = public as $$
  select market_id from public.staff_members
   where lower(email) = lower(auth.jwt() ->> 'email')
     and is_active limit 1
$$;

-- Azienda del produttore loggato
create or replace function public.my_company_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.companies
   where lower(created_by) = lower(auth.jwt() ->> 'email') limit 1
$$;

-- ---------------------------------------------------------------------
-- 10. TRIGGER STANDARD SU TUTTE LE TABELLE
-- ---------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','markets','companies','products','product_stocks','orders',
    'favorites','reviews','staff_members','staff_messages','staff_message_reads',
    'market_events','producer_event_rsvps','company_market_assignments',
    'company_needs','stall_rentals','rental_payments','suppliers',
    'supplier_payments','notifications','news_cache'
  ] loop
    perform public.apply_standard_triggers(t);
  end loop;
end $$;
