-- ============================================================
-- Campagna Amica Hub — Schema completo (21 entità)
-- Migrazione da Base44 → Supabase
-- ============================================================

-- Abilita estensioni necessarie
create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS
-- Estende auth.users con campi app-specifici (ruolo, stato)
-- ============================================================
create table public.users (
  id            uuid        primary key references auth.users(id) on delete cascade,
  email         text,
  role          text        check (role in ('admin','client','producer','staff')),
  role_confirmed boolean   not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.users is 'Profili utente estesi — 1:1 con auth.users';

-- ============================================================
-- MARKETS
-- ============================================================
create table public.markets (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  address     text,
  city        text        not null,
  region      text,
  latitude    numeric,
  longitude   numeric,
  schedule    text,
  image_url   text,
  -- array denormalizzato mantenuto per compatibilità con il frontend durante la migrazione
  company_ids text[]      not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.markets is 'Mercati Campagna Amica';

-- ============================================================
-- COMPANIES
-- ============================================================
create table public.companies (
  id               uuid        primary key default gen_random_uuid(),
  -- owner_id: UUID dell'utente produttore che gestisce questa azienda
  owner_id         uuid        references auth.users(id) on delete set null,
  name             text        not null,
  description      text,
  website          text,
  logo_url         text,
  cover_image_url  text,
  category         text        check (category in (
                     'ortofrutticola','lattiero_casearia','vinicola','olearia',
                     'cerealicola','zootecnica','apicoltura','altro'
                   )),
  region           text,
  city             text,
  phone            text,
  email            text,
  -- array denormalizzato mantenuto per compatibilità frontend
  market_ids       text[]      not null default '{}',
  -- oggetto json: [{market_id, days, time_start, time_end, notes}]
  market_schedules jsonb       not null default '[]',
  is_registered    boolean     not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table public.companies is 'Aziende produttrici';

-- ============================================================
-- PRODUCTS
-- ============================================================
create table public.products (
  id          uuid        primary key default gen_random_uuid(),
  company_id  uuid        not null references public.companies(id) on delete cascade,
  name        text        not null,
  description text,
  price       numeric     not null,
  unit        text        check (unit in ('kg','lt','pz','confezione')),
  image_url   text,
  category    text        check (category in (
                'frutta','verdura','formaggi','salumi','olio',
                'vino','miele','pane_pasta','conserve','altro'
              )),
  available   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.products is 'Prodotti delle aziende';

-- ============================================================
-- ORDERS
-- items: [{product_id, product_name, quantity, unit_price, total}]
-- ============================================================
create table public.orders (
  id           uuid        primary key default gen_random_uuid(),
  -- user_id aggiunto per RLS (client che ha fatto l'ordine)
  user_id      uuid        references auth.users(id) on delete set null,
  company_id   uuid        not null references public.companies(id) on delete restrict,
  company_name text,
  market_id    uuid        not null references public.markets(id) on delete restrict,
  market_name  text,
  items        jsonb       not null default '[]',
  total_amount numeric,
  status       text        not null default 'in_attesa'
                           check (status in ('in_attesa','confermato','pronto','ritirato','annullato')),
  pickup_date  date,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table public.orders is 'Ordini dei clienti verso le aziende';

-- ============================================================
-- FAVORITES
-- ============================================================
create table public.favorites (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  company_id uuid        references public.companies(id) on delete cascade,
  market_id  uuid        references public.markets(id) on delete cascade,
  product_id uuid        references public.products(id) on delete cascade,
  created_at timestamptz not null default now()
);
comment on table public.favorites is 'Preferiti utente (aziende, mercati, prodotti)';

-- ============================================================
-- MARKET EVENTS
-- ============================================================
create table public.market_events (
  id                     uuid        primary key default gen_random_uuid(),
  market_id              uuid        not null references public.markets(id) on delete cascade,
  event_date             date        not null,
  time_start             text,
  time_end               text,
  title                  text,
  capacity               integer,
  -- array denormalizzato mantenuto per compatibilità
  registered_company_ids text[]      not null default '{}',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
comment on table public.market_events is 'Eventi organizzati nei mercati';

-- ============================================================
-- COMPANY MARKET ASSIGNMENTS
-- ============================================================
create table public.company_market_assignments (
  id                   uuid        primary key default gen_random_uuid(),
  company_id           uuid        not null references public.companies(id) on delete cascade,
  market_event_id      uuid        not null references public.market_events(id) on delete cascade,
  -- array denormalizzato mantenuto per compatibilità
  assigned_product_ids text[]      not null default '{}',
  stand_number         text,
  status               text        not null default 'pending'
                                   check (status in ('pending','confirmed','completed','cancelled')),
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
comment on table public.company_market_assignments is 'Iscrizione aziende agli eventi mercato con stand';

-- ============================================================
-- STAFF MEMBERS
-- ============================================================
create table public.staff_members (
  id               uuid        primary key default gen_random_uuid(),
  -- user_id: link all'account Supabase Auth dello staff
  user_id          uuid        references auth.users(id) on delete set null,
  market_id        uuid        not null references public.markets(id) on delete cascade,
  full_name        text        not null,
  email            text        not null,
  phone            text,
  position         text        check (position in ('market_manager','coordinator','administrator')),
  is_active        boolean     not null default true,
  market_confirmed boolean     not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table public.staff_members is 'Responsabili di mercato (ruolo staff)';

-- ============================================================
-- STAFF MESSAGES
-- Comunicazioni dello staff verso i produttori del mercato
-- attachments: [{name, url, type}]
-- ============================================================
create table public.staff_messages (
  id           uuid        primary key default gen_random_uuid(),
  created_by   uuid        references auth.users(id) on delete set null,
  market_id    uuid        references public.markets(id) on delete set null,
  title        text        not null,
  description  text,
  type         text        not null check (type in ('closure','special_opening','event')),
  is_mandatory boolean     not null default false,
  location     text        not null,
  event_date   date        not null,
  time_start   text,
  time_end     text,
  details      text,
  is_published boolean     not null default false,
  attachments  jsonb       not null default '[]',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table public.staff_messages is 'Comunicazioni staff → produttori (chiusure, aperture, eventi)';

-- ============================================================
-- STAFF MESSAGE READS
-- Traccia le letture dei produttori sulle comunicazioni staff
-- ============================================================
create table public.staff_message_reads (
  id             uuid        primary key default gen_random_uuid(),
  message_id     uuid        not null references public.staff_messages(id) on delete cascade,
  user_id        uuid        references auth.users(id) on delete set null,
  company_id     uuid        references public.companies(id) on delete set null,
  producer_email text        not null,
  read_at        timestamptz not null default now(),
  feedback       text,
  created_at     timestamptz not null default now()
);
comment on table public.staff_message_reads is 'Conferme di lettura + feedback dei produttori';

-- ============================================================
-- COMPANY NEEDS
-- Richieste/bisogni del produttore al mercato
-- ============================================================
create table public.company_needs (
  id             uuid        primary key default gen_random_uuid(),
  company_id     uuid        not null references public.companies(id) on delete cascade,
  market_id      uuid        not null references public.markets(id) on delete cascade,
  category       text        not null check (category in ('bags','materials','urgent','maintenance','other')),
  title          text        not null,
  description    text,
  size           text,
  price          numeric,
  quantity       numeric,
  payment_status text        not null default 'unpaid' check (payment_status in ('unpaid','paid')),
  priority       text        not null default 'medium' check (priority in ('low','medium','high')),
  status         text        not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  due_date       date,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
comment on table public.company_needs is 'Bisogni/richieste delle aziende ai mercati';

-- ============================================================
-- PRODUCER EVENT RSVPs
-- Risposta del produttore agli inviti eventi staff
-- ============================================================
create table public.producer_event_rsvps (
  id             uuid        primary key default gen_random_uuid(),
  message_id     uuid        not null references public.staff_messages(id) on delete cascade,
  company_id     uuid        not null references public.companies(id) on delete cascade,
  user_id        uuid        references auth.users(id) on delete set null,
  producer_email text        not null,
  market_id      uuid        not null references public.markets(id) on delete cascade,
  status         text        not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
comment on table public.producer_event_rsvps is 'RSVP produttori agli eventi facoltativi';

-- ============================================================
-- PRODUCT STOCKS
-- Inventario prodotti dell'azienda
-- ============================================================
create table public.product_stocks (
  id            uuid        primary key default gen_random_uuid(),
  company_id    uuid        not null references public.companies(id) on delete cascade,
  product_id    uuid        not null references public.products(id) on delete cascade,
  quantity      numeric     not null,
  min_threshold numeric,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (company_id, product_id)
);
comment on table public.product_stocks is 'Giacenze di magazzino per prodotto';

-- ============================================================
-- STALL RENTALS
-- Contratti di affitto banco nel mercato
-- ============================================================
create table public.stall_rentals (
  id                 uuid        primary key default gen_random_uuid(),
  company_id         uuid        not null references public.companies(id) on delete cascade,
  market_id          uuid        not null references public.markets(id) on delete cascade,
  stall_number       text,
  monthly_rent       numeric     not null,
  rental_start_date  date        not null,
  rental_end_date    date,
  payment_method     text        check (payment_method in ('bank_transfer','cash','check','stripe')),
  status             text        not null default 'active'
                                 check (status in ('active','suspended','terminated')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
comment on table public.stall_rentals is 'Contratti affitto banco mercato';

-- ============================================================
-- RENTAL PAYMENTS
-- Pagamenti mensili degli affitti banco
-- ============================================================
create table public.rental_payments (
  id              uuid        primary key default gen_random_uuid(),
  stall_rental_id uuid        not null references public.stall_rentals(id) on delete cascade,
  company_id      uuid        not null references public.companies(id) on delete cascade,
  market_id       uuid        not null references public.markets(id) on delete cascade,
  amount          numeric     not null,
  payment_date    date,
  period_month    integer     not null check (period_month between 1 and 12),
  period_year     integer     not null,
  payment_method  text        check (payment_method in ('bank_transfer','cash','check','stripe')),
  status          text        not null default 'pending'
                              check (status in ('paid','pending','overdue')),
  receipt_url     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.rental_payments is 'Pagamenti mensili affitto banco';

-- ============================================================
-- SUPPLIERS
-- Fornitori privati del produttore
-- ============================================================
create table public.suppliers (
  id           uuid        primary key default gen_random_uuid(),
  company_id   uuid        not null references public.companies(id) on delete cascade,
  name         text        not null,
  contact_name text,
  phone        text,
  email        text,
  category     text        check (category in (
                 'materie_prime','packaging','attrezzature','servizi','trasporti','altro'
               )),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table public.suppliers is 'Rubrica fornitori privata del produttore';

-- ============================================================
-- SUPPLIER PAYMENTS
-- Scadenze pagamenti verso i fornitori
-- ============================================================
create table public.supplier_payments (
  id             uuid        primary key default gen_random_uuid(),
  supplier_id    uuid        not null references public.suppliers(id) on delete cascade,
  company_id     uuid        not null references public.companies(id) on delete cascade,
  description    text        not null,
  amount         numeric     not null,
  due_date       date        not null,
  status         text        not null default 'da_pagare'
                             check (status in ('da_pagare','pagato','scaduto')),
  payment_method text        check (payment_method in ('bonifico','contanti','assegno','altro')),
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
comment on table public.supplier_payments is 'Scadenze e pagamenti verso i fornitori';

-- ============================================================
-- REVIEWS
-- ============================================================
create table public.reviews (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  company_id uuid        not null references public.companies(id) on delete cascade,
  rating     integer     not null check (rating between 1 and 5),
  message    text,
  reply      text,
  reply_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.reviews is 'Recensioni clienti alle aziende';

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table public.notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references auth.users(id) on delete cascade,
  user_email text        not null,
  title      text        not null,
  message    text,
  type       text        not null default 'generic'
                         check (type in ('new_product','order_update','generic')),
  company_id uuid        references public.companies(id) on delete set null,
  product_id uuid        references public.products(id) on delete set null,
  order_id   uuid        references public.orders(id) on delete set null,
  message_id uuid        references public.staff_messages(id) on delete set null,
  read       boolean     not null default false,
  created_at timestamptz not null default now()
);
comment on table public.notifications is 'Notifiche in-app per ogni utente';

-- ============================================================
-- NEWS CACHE
-- Cache delle notizie Coldiretti/Campagna Amica (aggiornata via Edge Function)
-- ============================================================
create table public.news_cache (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  description text,
  date        text,
  url         text,
  source      text        not null,
  created_at  timestamptz not null default now()
);
comment on table public.news_cache is 'Cache notizie da Coldiretti e Campagna Amica';

-- ============================================================
-- INDICI per performance
-- ============================================================

-- orders: ricerche frequenti per utente, azienda, stato
create index idx_orders_user_id    on public.orders(user_id);
create index idx_orders_company_id on public.orders(company_id);
create index idx_orders_market_id  on public.orders(market_id);
create index idx_orders_status     on public.orders(status);

-- products: filtro per azienda
create index idx_products_company_id on public.products(company_id);
create index idx_products_available  on public.products(available);

-- favorites: accesso per utente
create index idx_favorites_user_id on public.favorites(user_id);

-- notifications: accesso per utente, non lette
create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_read    on public.notifications(read) where read = false;

-- market_events: query per mercato e data
create index idx_market_events_market_id  on public.market_events(market_id);
create index idx_market_events_event_date on public.market_events(event_date);

-- company_needs: query per mercato e stato
create index idx_company_needs_market_id on public.company_needs(market_id);
create index idx_company_needs_status    on public.company_needs(status);

-- staff_messages: query per mercato
create index idx_staff_messages_market_id on public.staff_messages(market_id);

-- reviews: query per azienda
create index idx_reviews_company_id on public.reviews(company_id);

-- stall_rentals: query per mercato
create index idx_stall_rentals_market_id  on public.stall_rentals(market_id);
create index idx_stall_rentals_company_id on public.stall_rentals(company_id);
