-- ============================================================
-- FASE 3 DDT — segnalazioni persistenti (missing_ddt_reports)
-- ============================================================

create table if not exists public.missing_ddt_reports (
  id                uuid        primary key default gen_random_uuid(),
  company_id        uuid        not null references public.companies(id) on delete cascade,
  market_id         uuid        not null references public.markets(id) on delete cascade,
  data_evento       date        not null,
  detected_at       timestamptz not null default now(),
  status            text        not null default 'open'
                    check (status in ('open', 'escalated', 'dismissed', 'resolved')),
  staff_action      text        check (staff_action in ('escalate', 'request_suspension', 'dismiss')),
  staff_note        text,
  staff_user_id     uuid        references public.users(id),
  staff_action_at   timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (company_id, market_id, data_evento)
);
comment on table public.missing_ddt_reports is
  'Segnalazioni di DDT mancante rilevate dal cron. Un solo report per azienda/mercato/giorno.';

create index if not exists idx_missing_ddt_reports_market on public.missing_ddt_reports(market_id, status);
create index if not exists idx_missing_ddt_reports_company on public.missing_ddt_reports(company_id);

create trigger missing_ddt_reports_updated_at
  before update on public.missing_ddt_reports
  for each row execute function update_updated_at_column();

alter table public.missing_ddt_reports enable row level security;

create policy "missing_ddt_reports: staff or admin read"
  on public.missing_ddt_reports for select
  using (is_staff_for_market(market_id) or is_admin());

create policy "missing_ddt_reports: staff or admin update"
  on public.missing_ddt_reports for update
  using (is_staff_for_market(market_id) or is_admin())
  with check (is_staff_for_market(market_id) or is_admin());

-- L'inserimento (creazione della segnalazione) avviene solo dal cron,
-- via service role: nessuna policy di insert per utenti normali.