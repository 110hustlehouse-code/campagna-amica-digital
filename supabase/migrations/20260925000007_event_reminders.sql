-- Traccia i solleciti inviati dallo staff a un'azienda per un evento
-- specifico — serve a mostrare nella scheda evento (lato produttore) se
-- e quando è stato sollecitato, sia per eventi futuri che passati.
create table public.event_reminders (
  id          uuid        primary key default gen_random_uuid(),
  event_id    uuid        not null references public.staff_messages(id) on delete cascade,
  company_id  uuid        not null references public.companies(id) on delete cascade,
  sent_at     timestamptz not null default now()
);
create index idx_event_reminders_event_id on public.event_reminders(event_id);
create index idx_event_reminders_company_id on public.event_reminders(company_id);

alter table public.event_reminders enable row level security;

create policy "event_reminders: owner or staff or admin read" on public.event_reminders for select
  using (
    owns_company(company_id)
    or is_admin()
    or exists (
      select 1 from public.staff_messages m
      where m.id = event_reminders.event_id and is_staff_for_market(m.market_id)
    )
  );

create policy "event_reminders: staff or admin insert" on public.event_reminders for insert
  with check (
    is_admin()
    or exists (
      select 1 from public.staff_messages m
      where m.id = event_reminders.event_id and is_staff_for_market(m.market_id)
    )
  );