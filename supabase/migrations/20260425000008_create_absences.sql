-- ============================================================
-- ABSENCES
-- Segnalazioni di assenza dai mercati da parte dei produttori.
-- Decisione utente 2026-04-25: separato da producer_needs perché
-- semanticamente diverso (impatti operativi sul mercato vs richieste).
-- ============================================================
create table public.absences (
  id            uuid        primary key default gen_random_uuid(),
  company_id    uuid        not null references public.companies(id) on delete cascade,
  market_id     uuid        not null references public.markets(id) on delete cascade,
  absence_date  date,
  reason        text,
  status        text        not null default 'reported'
                check (status in ('reported','acknowledged','resolved')),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.absences is 'Assenze segnalate dai produttori ai mercati';

create index idx_absences_market_id on public.absences(market_id);
create index idx_absences_company_id on public.absences(company_id);
create index idx_absences_status on public.absences(status);

-- RLS
alter table public.absences enable row level security;

create policy "absences: owner or staff or admin read"
  on public.absences for select
  using (owns_company(company_id) or is_staff_for_market(market_id) or is_admin());

create policy "absences: producer insert own"
  on public.absences for insert
  with check (owns_company(company_id));

create policy "absences: staff or admin update"
  on public.absences for update
  using (is_staff_for_market(market_id) or is_admin())
  with check (is_staff_for_market(market_id) or is_admin());

create policy "absences: admin delete"
  on public.absences for delete
  using (is_admin());

-- Trigger updated_at
create trigger set_updated_at
  before update on public.absences
  for each row execute function public.set_updated_at();
