-- ============================================================
-- Security fixes — 2026-04-20
-- Addresses: C1, C2, C5, H1, H4, H5, H7, M6, M7
-- ============================================================

-- ============================================================
-- C1 — Prevent self role change
-- A user can never UPDATE their own `role` column unless they
-- are already an admin. The Edge Function verify-access-code
-- uses the service-role key to perform the role change.
-- ============================================================
drop trigger if exists prevent_self_role_change on public.users;
drop function if exists public.prevent_self_role_change();

create function public.prevent_self_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Only check role change if this is an UPDATE operation
  if tg_op = 'UPDATE' then
    if new.role is distinct from old.role and not public.is_admin() then
      raise exception 'role change not allowed';
    end if;
    if new.role_confirmed is distinct from old.role_confirmed and not public.is_admin() then
      raise exception 'role_confirmed change not allowed';
    end if;
  end if;
  return new;
end $$;

create trigger prevent_self_role_change
  before update on public.users
  for each row execute function public.prevent_self_role_change();


-- ============================================================
-- C2 — Orders: freeze sensitive fields for non-admins
-- user_id, company_id, market_id, total_amount are immutable
-- unless the caller is admin.
-- ============================================================
create or replace function public.orders_update_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if new.user_id      is distinct from old.user_id      then raise exception 'orders.user_id immutable'; end if;
    if new.company_id   is distinct from old.company_id   then raise exception 'orders.company_id immutable'; end if;
    if new.market_id    is distinct from old.market_id    then raise exception 'orders.market_id immutable'; end if;
    if new.total_amount is distinct from old.total_amount then raise exception 'orders.total_amount immutable'; end if;
  end if;
  return new;
end $$;

drop trigger if exists orders_update_guard on public.orders;
create trigger orders_update_guard
  before update on public.orders
  for each row execute function public.orders_update_guard();


-- ============================================================
-- H5 — Reviews: fine-grained column guard
-- - Client (user_id = auth.uid()): can change rating, comment only
-- - Producer (owns_company): can change only reply, reply_date
-- - Admin: unrestricted
-- ============================================================
create or replace function public.reviews_update_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  caller_id uuid := auth.uid();
  is_owner  bool := (old.user_id = caller_id);
  is_prod   bool := public.owns_company(old.company_id);
begin
  if public.is_admin() then
    return new; -- admin unrestricted
  end if;

  -- Neither owner nor producer → block entirely
  if not is_owner and not is_prod then
    raise exception 'reviews update not allowed';
  end if;

  -- Fields that must never change regardless of caller
  if new.user_id     is distinct from old.user_id     then raise exception 'reviews.user_id immutable'; end if;
  if new.company_id  is distinct from old.company_id  then raise exception 'reviews.company_id immutable'; end if;
  if new.created_at  is distinct from old.created_at  then raise exception 'reviews.created_at immutable'; end if;

  if is_prod and not is_owner then
    -- Producer: only reply + reply_date allowed
    if new.rating    is distinct from old.rating    then raise exception 'reviews.rating immutable for producer'; end if;
    if new.comment   is distinct from old.comment   then raise exception 'reviews.comment immutable for producer'; end if;
  end if;

  if is_owner and not is_prod then
    -- Owner-client: cannot touch reply fields
    if new.reply      is distinct from old.reply      then raise exception 'reviews.reply immutable for client'; end if;
    if new.reply_date is distinct from old.reply_date then raise exception 'reviews.reply_date immutable for client'; end if;
  end if;

  return new;
end $$;

drop trigger if exists reviews_update_guard on public.reviews;
create trigger reviews_update_guard
  before update on public.reviews
  for each row execute function public.reviews_update_guard();


-- ============================================================
-- C5 — Storage: restrict UPDATE to own path OR admin/staff
-- ============================================================
drop policy if exists "Authenticated users can update in public-assets" on storage.objects;

create policy "Users can update only their own uploads"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'public-assets'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.users
        where id = auth.uid()
          and role in ('admin', 'staff')
      )
    )
  );

-- Also tighten INSERT: force first path segment = auth.uid()
drop policy if exists "Authenticated users can upload to public-assets" on storage.objects;

create policy "Authenticated users can upload to public-assets"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'public-assets'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.users
        where id = auth.uid()
          and role in ('admin', 'staff')
      )
    )
  );


-- ============================================================
-- H1 — Companies INSERT: owner_id must equal caller
-- ============================================================
drop policy if exists "companies: authenticated insert" on public.companies;

create policy "companies: authenticated insert"
  on public.companies for insert
  with check (
    auth.uid() is not null
    and (owner_id = auth.uid() or public.is_admin())
  );


-- ============================================================
-- H1 — Orders INSERT: user_id must equal caller
-- ============================================================
drop policy if exists "orders: authenticated insert" on public.orders;

create policy "orders: authenticated insert"
  on public.orders for insert
  with check (
    auth.uid() is not null
    and (user_id = auth.uid() or public.is_admin())
  );


-- ============================================================
-- H7 — staff_message_reads INSERT: user_id must equal caller
-- ============================================================
drop policy if exists "staff_message_reads: authenticated insert" on public.staff_message_reads;

create policy "staff_message_reads: authenticated insert"
  on public.staff_message_reads for insert
  with check (user_id = auth.uid());


-- ============================================================
-- M6 — producer_event_rsvps: add DELETE policy (was missing)
-- ============================================================
drop policy if exists "producer_event_rsvps: owner or admin delete" on public.producer_event_rsvps;

create policy "producer_event_rsvps: owner or admin delete"
  on public.producer_event_rsvps for delete
  using (public.owns_company(company_id) or public.is_admin());


-- ============================================================
-- M7 — company_needs INSERT: staff can only insert for
-- companies actually assigned to their market
-- ============================================================
drop policy if exists "company_needs: producer or staff insert" on public.company_needs;

create policy "company_needs: producer or staff insert"
  on public.company_needs for insert
  with check (
    public.owns_company(company_id)
    or public.is_admin()
    or (
      public.is_staff_for_market(market_id)
      and exists (
        select 1 from public.company_market_assignments cma
        join public.market_events me on me.id = cma.market_event_id
        where cma.company_id = company_id
          and me.market_id   = market_id
      )
    )
  );


-- ============================================================
-- H4 — Rate limiting table for Edge Functions (invoke-llm,
-- analyzeListino). Edge Functions insert a row per call and
-- count recent rows before proceeding.
-- ============================================================
create table if not exists public.api_rate_limits (
  user_id    uuid        not null references public.users(id) on delete cascade,
  endpoint   text        not null,
  called_at  timestamptz not null default now(),
  primary key (user_id, endpoint, called_at)
);

create index if not exists api_rate_limits_lookup
  on public.api_rate_limits (user_id, endpoint, called_at desc);

-- Auto-clean rows older than 24h to keep the table small
create or replace function public.purge_old_rate_limits()
returns void language sql security definer set search_path = public as $$
  delete from public.api_rate_limits where called_at < now() - interval '24 hours';
$$;

-- Schedule purge function to run every hour using pg_cron (if available)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('purge_old_rate_limits', '0 * * * *', 'select public.purge_old_rate_limits();');
  end if;
end $$;

-- RLS: users can only read their own rows (Edge Functions use service-role → bypass RLS)
alter table public.api_rate_limits enable row level security;

create policy "rate_limits: own rows only"
  on public.api_rate_limits for select
  using (user_id = auth.uid());