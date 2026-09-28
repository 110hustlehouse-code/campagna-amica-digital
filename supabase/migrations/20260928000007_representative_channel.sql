-- Il rappresentante produttori NON deve vedere la chat interna staff-staff:
-- revoca l'accesso concesso nella migrazione precedente.
drop policy if exists "staff_chat: staff, admin or representative read" on public.staff_chat_messages;
create policy "staff_chat: staff or admin read"
  on public.staff_chat_messages for select
  using (is_staff_for_market(market_id) or is_admin());

drop policy if exists "staff_chat: staff, admin or representative insert" on public.staff_chat_messages;
create policy "staff_chat: staff or admin insert"
  on public.staff_chat_messages for insert
  with check (is_staff_for_market(market_id) or is_admin());

-- Canale dedicato: rappresentante produttori <-> coordinatore/responsabile mercato.
create table public.representative_chat_messages (
  id          uuid        primary key default gen_random_uuid(),
  market_id   uuid        not null references public.markets(id) on delete cascade,
  author_id   uuid        references auth.users(id) on delete set null,
  author_name text        not null,
  message     text        not null,
  created_at  timestamptz not null default now()
);

create index idx_representative_chat_market_id on public.representative_chat_messages(market_id, created_at);
alter table public.representative_chat_messages enable row level security;

create policy "representative_chat: manager, admin or representative read"
  on public.representative_chat_messages for select
  using (is_market_manager_for_market(market_id) or is_admin() or is_market_representative(market_id));

create policy "representative_chat: manager, admin or representative insert"
  on public.representative_chat_messages for insert
  with check (is_market_manager_for_market(market_id) or is_admin() or is_market_representative(market_id));

create policy "representative_chat: author delete own message"
  on public.representative_chat_messages for delete
  using (author_id = auth.uid() or is_admin());

alter publication supabase_realtime add table public.representative_chat_messages;
