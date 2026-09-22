-- Migration: DDT (Documento di Trasporto) schema
-- P0 implementation: delivery_notes, delivery_note_items, delivery_note_sync_log,
--                    ddt_sequences, next_ddt_number helper, RLS,
--                    product_stocks extensions (is_carried_over, carried_over_from_event_id)

-- =============================================================================
-- 1. EXTEND product_stocks for carry-over tracking
-- =============================================================================

alter table public.product_stocks
  add column if not exists is_carried_over           boolean      not null default false,
  add column if not exists carried_over_from_event_id uuid         references public.market_events(id) on delete set null;

comment on column public.product_stocks.is_carried_over is
  'True quando questo stock è stato portato avanti da un evento precedente senza essere presente in un DDT';
comment on column public.product_stocks.carried_over_from_event_id is
  'Riferimento all''evento da cui è stato portato avanti (audit)';

-- =============================================================================
-- 2. SEQUENCE COUNTER (anti-race per progressive_number)
-- =============================================================================

create table if not exists public.ddt_sequences (
  company_id  uuid not null references public.companies(id)  on delete cascade,
  year        int  not null,
  last_number int  not null default 0,
  primary key (company_id, year)
);
comment on table public.ddt_sequences is
  'Contatore per progressive_number DDT — accessibile SOLO via service-role (nessuna RLS policy)';

alter table public.ddt_sequences enable row level security;
-- No policies: solo service-role (Edge Function issueDdt) può leggere/scrivere

-- =============================================================================
-- 3. TABLE: delivery_notes (testata DDT)
-- =============================================================================

create table if not exists public.delivery_notes (
  id                            uuid        primary key default gen_random_uuid(),
  company_id                    uuid        not null references public.companies(id)     on delete cascade,
  market_id                     uuid        not null references public.markets(id)       on delete restrict,
  market_event_id               uuid        not null references public.market_events(id) on delete restrict,

  -- numerazione (congelata all'emissione)
  progressive_number            int,
  progressive_year              int,

  -- date
  issue_date                    date        not null,
  transport_date                date        not null,
  issued_at                     timestamptz,
  cancelled_at                  timestamptz,

  -- destinatario (di norma il mercato, ma campo libero)
  recipient_name                text        not null,
  recipient_vat_or_cf           text,
  recipient_address             text,
  recipient_city                text,
  recipient_cap                 text,

  -- contenuto
  causale                       text        not null
                                check (causale in (
                                  'vendita','conto_vendita','conto_deposito','reso','omaggio',
                                  'campionatura','conto_lavorazione','conto_visione','trasferimento_interno'
                                )),
  trasporto_a_mezzo             text
                                check (trasporto_a_mezzo in ('mittente','vettore','destinatario')),
  vettore_descrizione           text,
  numero_colli                  int,
  peso_totale_kg                numeric(10,3),
  annotazioni                   text,

  -- firma (toggle off di default)
  signature_required            boolean     not null default false,
  signed_by_recipient_user_id   uuid        references public.users(id),
  signed_at                     timestamptz,
  signature_method              text        check (signature_method in ('digital_in_app','not_required')),

  -- workflow
  status                        text        not null default 'draft'
                                check (status in ('draft','issued','cancelled')),
  cancellation_reason           text,
  source                        text        not null default 'manual_form'
                                check (source in ('manual_form','ai_upload','reused_template')),
  template_of                   uuid        references public.delivery_notes(id) on delete set null,

  -- output
  pdf_url                       text,

  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),

  -- vincoli
  constraint ddt_progressive_unique
    unique (company_id, progressive_year, progressive_number),
  constraint ddt_issued_requires_number
    check (status != 'issued' or (progressive_number is not null and progressive_year is not null)),
  constraint ddt_cancelled_requires_reason
    check (status != 'cancelled' or cancellation_reason is not null)
);

create index if not exists idx_ddt_company       on public.delivery_notes(company_id, issue_date desc);
create index if not exists idx_ddt_market_event  on public.delivery_notes(market_event_id);
create index if not exists idx_ddt_market        on public.delivery_notes(market_id, issue_date desc);
create index if not exists idx_ddt_status        on public.delivery_notes(status);

-- updated_at trigger
create trigger ddt_updated_at
  before update on public.delivery_notes
  for each row execute function update_updated_at_column();

-- =============================================================================
-- 4. TABLE: delivery_note_items (righe DDT)
-- =============================================================================

create table if not exists public.delivery_note_items (
  id                uuid        primary key default gen_random_uuid(),
  delivery_note_id  uuid        not null references public.delivery_notes(id) on delete cascade,
  product_id        uuid        references public.products(id) on delete set null,
  product_name      text        not null,
  unit              text        not null,
  quantity          numeric(12,3) not null check (quantity > 0),
  lot               text,
  expiry_date       date,
  weight_kg         numeric(10,3),
  notes             text,
  position          int         not null default 0,
  created_at        timestamptz not null default now()
);

create index if not exists idx_ddt_items_ddt on public.delivery_note_items(delivery_note_id, position);

-- =============================================================================
-- 5. TABLE: delivery_note_sync_log (audit catalogo+stock)
-- =============================================================================

create table if not exists public.delivery_note_sync_log (
  id                uuid        primary key default gen_random_uuid(),
  delivery_note_id  uuid        not null references public.delivery_notes(id) on delete cascade,
  action            text        not null
                    check (action in (
                      'product_created','product_matched','stock_incremented','stock_reverted'
                    )),
  product_id        uuid        references public.products(id),
  quantity_delta    numeric(12,3),
  payload           jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists idx_sync_log_ddt on public.delivery_note_sync_log(delivery_note_id);

-- =============================================================================
-- 6. HELPER FUNCTION: next_ddt_number (suggestion, read-only)
-- =============================================================================

create or replace function public.next_ddt_number(p_company_id uuid, p_year int)
returns int
language sql stable security definer
set search_path = public
as $$
  select coalesce(max(progressive_number), 0) + 1
  from public.delivery_notes
  where company_id = p_company_id
    and progressive_year = p_year
    and status = 'issued';
$$;

comment on function public.next_ddt_number(uuid, int) is
  'Suggerisce il prossimo numero progressivo DDT — NON garantisce unicità in concorrenza. Il numero definitivo è assegnato dentro issueDdt via ddt_sequences FOR UPDATE.';

-- =============================================================================
-- 7. RLS POLICIES
-- =============================================================================

alter table public.delivery_notes         enable row level security;
alter table public.delivery_note_items    enable row level security;
alter table public.delivery_note_sync_log enable row level security;

-- delivery_notes: produttore proprietario (tutte le op), staff del mercato (select), admin (select)
drop policy if exists ddt_select   on public.delivery_notes;
drop policy if exists ddt_insert   on public.delivery_notes;
drop policy if exists ddt_update   on public.delivery_notes;
drop policy if exists ddt_delete   on public.delivery_notes;

create policy ddt_select on public.delivery_notes
  for select
  using (
    owns_company(company_id)
    or is_staff_for_market(market_id)
    or is_admin()
  );

create policy ddt_insert on public.delivery_notes
  for insert
  with check (owns_company(company_id));

-- Solo bozze editabili dal produttore; issued/cancelled mutabili solo da service-role (Edge Function)
create policy ddt_update on public.delivery_notes
  for update
  using (
    owns_company(company_id)
    and status = 'draft'
  )
  with check (
    owns_company(company_id)
  );

create policy ddt_delete on public.delivery_notes
  for delete
  using (
    owns_company(company_id)
    and status = 'draft'
  );

-- delivery_note_items: eredita dal parent
drop policy if exists ddt_items_select on public.delivery_note_items;
drop policy if exists ddt_items_insert on public.delivery_note_items;
drop policy if exists ddt_items_update on public.delivery_note_items;
drop policy if exists ddt_items_delete on public.delivery_note_items;

create policy ddt_items_select on public.delivery_note_items
  for select
  using (
    exists (
      select 1 from public.delivery_notes dn
      where dn.id = delivery_note_id
        and (owns_company(dn.company_id) or is_staff_for_market(dn.market_id) or is_admin())
    )
  );

create policy ddt_items_insert on public.delivery_note_items
  for insert
  with check (
    exists (
      select 1 from public.delivery_notes dn
      where dn.id = delivery_note_id
        and owns_company(dn.company_id)
        and dn.status = 'draft'
    )
  );

create policy ddt_items_update on public.delivery_note_items
  for update
  using (
    exists (
      select 1 from public.delivery_notes dn
      where dn.id = delivery_note_id
        and owns_company(dn.company_id)
        and dn.status = 'draft'
    )
  )
  with check (
    exists (
      select 1 from public.delivery_notes dn
      where dn.id = delivery_note_id
        and owns_company(dn.company_id)
        and dn.status = 'draft'
    )
  );

create policy ddt_items_delete on public.delivery_note_items
  for delete
  using (
    exists (
      select 1 from public.delivery_notes dn
      where dn.id = delivery_note_id
        and owns_company(dn.company_id)
        and dn.status = 'draft'
    )
  );

-- sync_log: solo lettura (scrittura solo da service-role)
drop policy if exists ddt_sync_log_select on public.delivery_note_sync_log;

create policy ddt_sync_log_select on public.delivery_note_sync_log
  for select
  using (
    exists (
      select 1 from public.delivery_notes dn
      where dn.id = delivery_note_id
        and (owns_company(dn.company_id) or is_staff_for_market(dn.market_id) or is_admin())
    )
  );
