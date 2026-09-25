-- ============================================================
-- NEED RESPONSES
-- Storico delle risposte dello staff a un bisogno segnalato dal produttore
-- (producer_needs.notes tiene solo l'ultima risposta: qui la cronologia completa)
-- ============================================================
create table public.need_responses (
  id          uuid        primary key default gen_random_uuid(),
  need_id     uuid        not null references public.producer_needs(id) on delete cascade,
  author_id   uuid        references auth.users(id) on delete set null,
  author_name text,
  message     text        not null,
  created_at  timestamptz not null default now()
);
comment on table public.need_responses is 'Storico risposte staff ai bisogni segnalati dai produttori';

create index idx_need_responses_need_id on public.need_responses(need_id);

alter table public.need_responses enable row level security;

create policy "need_responses: owner or staff or admin read"
  on public.need_responses for select
  using (
    exists (
      select 1 from public.producer_needs n
      where n.id = need_responses.need_id
        and (owns_company(n.company_id) or is_staff_for_market(n.market_id) or is_admin())
    )
  );

create policy "need_responses: staff or admin insert"
  on public.need_responses for insert
  with check (
    exists (
      select 1 from public.producer_needs n
      where n.id = need_responses.need_id
        and (is_staff_for_market(n.market_id) or is_admin())
    )
  );
