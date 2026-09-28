-- Rappresentante produttori: una persona (non un'azienda) designata dal
-- market_manager con accesso alla sola chat staff del proprio mercato.
create table public.market_representatives (
  id                uuid        primary key default gen_random_uuid(),
  market_id         uuid        not null references public.markets(id) on delete cascade,
  user_id           uuid        not null references auth.users(id) on delete cascade,
  full_name         text        not null,
  source_company_id uuid        references public.companies(id) on delete set null,
  added_by          uuid        references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  unique (market_id, user_id)
);

create index idx_market_representatives_market_id on public.market_representatives(market_id);
create index idx_market_representatives_user_id on public.market_representatives(user_id);

alter table public.market_representatives enable row level security;

create or replace function public.is_market_representative(p_market_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.market_representatives
    where user_id = auth.uid() and market_id = p_market_id
  );
$$;

create policy "market_representatives: manager/admin/self read"
  on public.market_representatives for select
  using (is_market_manager_for_market(market_id) or is_admin() or user_id = auth.uid());

create policy "market_representatives: manager/admin insert"
  on public.market_representatives for insert
  with check (is_market_manager_for_market(market_id) or is_admin());

create policy "market_representatives: manager/admin delete"
  on public.market_representatives for delete
  using (is_market_manager_for_market(market_id) or is_admin());

-- Estende l'accesso alla chat staff anche al rappresentante produttori.
drop policy if exists "staff_chat: staff or admin read" on public.staff_chat_messages;
create policy "staff_chat: staff, admin or representative read"
  on public.staff_chat_messages for select
  using (is_staff_for_market(market_id) or is_admin() or is_market_representative(market_id));

drop policy if exists "staff_chat: staff or admin insert" on public.staff_chat_messages;
create policy "staff_chat: staff, admin or representative insert"
  on public.staff_chat_messages for insert
  with check (is_staff_for_market(market_id) or is_admin() or is_market_representative(market_id));
