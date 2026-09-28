-- Chat di gruppo staff-staff per mercato: un'unica bacheca cronologica
-- per tutto lo staff attivo di un mercato (es. "bisogno risolto").
create table public.staff_chat_messages (
  id          uuid        primary key default gen_random_uuid(),
  market_id   uuid        not null references public.markets(id) on delete cascade,
  author_id   uuid        references auth.users(id) on delete set null,
  author_name text        not null,
  message     text        not null,
  created_at  timestamptz not null default now()
);
create index idx_staff_chat_market_id on public.staff_chat_messages(market_id, created_at);

alter table public.staff_chat_messages enable row level security;

create policy "staff_chat: staff or admin read"
  on public.staff_chat_messages for select
  using (is_staff_for_market(market_id) or is_admin());

create policy "staff_chat: staff or admin insert"
  on public.staff_chat_messages for insert
  with check (is_staff_for_market(market_id) or is_admin());

create policy "staff_chat: author delete own message"
  on public.staff_chat_messages for delete
  using (author_id = auth.uid() or is_admin());

alter publication supabase_realtime add table public.staff_chat_messages;
