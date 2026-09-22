-- ============================================================
-- CATALOGO AVANZATO — estensione products + area rivenditori
-- Basato sul lavoro fatto per Le Faeta, generalizzato a
-- qualunque produttore e a qualunque categoria merceologica.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Categorie prodotto: lista ampliata, sempre a scelta fissa
-- ------------------------------------------------------------
alter table public.products drop constraint if exists products_category_check;
alter table public.products add constraint products_category_check
  check (category in (
    'frutta','verdura','formaggi','salumi','carne','pesce','olio','vino','birra',
    'miele','pane_pasta','dolci_pasticceria','uova','cereali_legumi',
    'conserve','erbe_spezie','altro'
  ));

-- ------------------------------------------------------------
-- 2. Campi avanzati sul prodotto: codice, ingredienti, formato
--    di vendita, IVA, i 14 allergeni del regolamento UE 1169/2011,
--    due listini per l'area rivenditori.
-- ------------------------------------------------------------
alter table public.products
  add column if not exists code               text,
  add column if not exists ingredients         text,
  add column if not exists box_configs         text,
  add column if not exists vat_rate            numeric not null default 10
                            check (vat_rate in (4, 10, 22)),
  add column if not exists price_list1         numeric,
  add column if not exists price_list2         numeric,
  -- I 14 allergeni obbligatori per legge (Reg. UE 1169/2011), non i 5 di Faeta.
  add column if not exists contains_gluten      boolean not null default false,
  add column if not exists contains_crustaceans boolean not null default false,
  add column if not exists contains_eggs        boolean not null default false,
  add column if not exists contains_fish        boolean not null default false,
  add column if not exists contains_peanuts     boolean not null default false,
  add column if not exists contains_soy         boolean not null default false,
  add column if not exists contains_milk        boolean not null default false,
  add column if not exists contains_nuts        boolean not null default false,
  add column if not exists contains_celery      boolean not null default false,
  add column if not exists contains_mustard     boolean not null default false,
  add column if not exists contains_sesame      boolean not null default false,
  add column if not exists contains_sulphites   boolean not null default false,
  add column if not exists contains_lupin       boolean not null default false,
  add column if not exists contains_molluscs    boolean not null default false;

comment on column public.products.price_list1 is 'Prezzo per il listino rivenditori 1 (opzionale)';
comment on column public.products.price_list2 is 'Prezzo per il listino rivenditori 2 (opzionale)';
comment on column public.products.vat_rate is 'Aliquota IVA: 4, 10 o 22 per cento';

-- ------------------------------------------------------------
-- 3. Password rivenditori — mai leggibile dal cliente.
--    Ogni azienda puo' avere piu' password, ciascuna assegnata
--    al listino 1 o al listino 2. La verifica avviene SOLO
--    tramite Edge Function con service role: nessuna policy
--    permette la lettura pubblica di questa tabella.
-- ------------------------------------------------------------
create table if not exists public.reseller_passwords (
  id            uuid        primary key default gen_random_uuid(),
  company_id    uuid        not null references public.companies(id) on delete cascade,
  pricelist_id  smallint    not null check (pricelist_id in (1, 2)),
  label         text,                    -- nome libero per riconoscerla (es. "Bar Rossi")
  password_salt text        not null,
  password_hash text        not null,    -- sha256(salt || password), mai la password in chiaro
  revoked_at    timestamptz,
  created_at    timestamptz not null default now()
);
comment on table public.reseller_passwords is
  'Password di accesso ai listini rivenditori. Verificate solo via Edge Function (service role) — nessuna policy pubblica.';

create index if not exists idx_reseller_passwords_company on public.reseller_passwords(company_id);

alter table public.reseller_passwords enable row level security;

-- Il produttore gestisce le proprie password (le crea, le vede mascherate, le revoca).
-- Nessuna policy di select pubblica: il verificatore vive nell'Edge Function.
create policy "reseller_passwords: owner or admin read"
  on public.reseller_passwords for select
  using (public.owns_company(company_id) or public.is_admin());

create policy "reseller_passwords: owner or admin insert"
  on public.reseller_passwords for insert
  with check (public.owns_company(company_id) or public.is_admin());

create policy "reseller_passwords: owner or admin update"
  on public.reseller_passwords for update
  using (public.owns_company(company_id) or public.is_admin());

create policy "reseller_passwords: owner or admin delete"
  on public.reseller_passwords for delete
  using (public.owns_company(company_id) or public.is_admin());

-- ------------------------------------------------------------
-- 4. Tentativi di accesso rivenditore — anti brute-force.
--    Senza questo, la password e' indovinabile a forza bruta
--    chiamando l'Edge Function in loop.
-- ------------------------------------------------------------
create table if not exists public.reseller_login_attempts (
  id           uuid        primary key default gen_random_uuid(),
  company_id   uuid        not null references public.companies(id) on delete cascade,
  ip_address   text        not null,
  attempted_at timestamptz not null default now()
);
comment on table public.reseller_login_attempts is
  'Log tentativi di login rivenditore, per il rate limit nella Edge Function. Nessuna policy pubblica: solo service role.';

create index if not exists idx_reseller_attempts_lookup
  on public.reseller_login_attempts(company_id, ip_address, attempted_at);

alter table public.reseller_login_attempts enable row level security;
-- Nessuna policy: tabella raggiungibile solo da service role (Edge Function).