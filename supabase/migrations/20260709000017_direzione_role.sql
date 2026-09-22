-- ============================================================
-- Ruolo DIREZIONE — console di sola lettura per il management
-- (osservatorio cross-mercato: vede, non agisce)
-- Spec chiusa via grilling 2026-07-08/09, vedi .wolf/cerebrum.md
-- e .wolf/DIREZIONE_CONSOLE_PLAN.md.
-- ============================================================

-- 1. Estendi il check constraint su users.role
alter table public.users drop constraint users_role_check;
alter table public.users add constraint users_role_check
  check (role in ('admin','client','producer','staff','direzione'));

-- 2. Helper is_direzione() — stesso pattern security definer di is_admin()
create or replace function public.is_direzione()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'direzione' from public.users where id = auth.uid()),
    false
  );
$$;

-- 3. Policy SELECT additive per la direzione.
-- NB: markets, companies, products hanno già policy "public read" (using true) —
-- nessuna policy aggiuntiva necessaria lì, sarebbe ridondante.
-- Qui solo le tabelle con RLS realmente restrittiva.
create policy "direzione read orders"
  on public.orders for select
  using (public.is_direzione());

create policy "direzione read stall_rentals"
  on public.stall_rentals for select
  using (public.is_direzione());

create policy "direzione read rental_payments"
  on public.rental_payments for select
  using (public.is_direzione());

create policy "direzione read producer_needs"
  on public.producer_needs for select
  using (public.is_direzione());

create policy "direzione read absences"
  on public.absences for select
  using (public.is_direzione());

-- 4. Trigger role-lock C1 (prevent_self_role_change): nessuna modifica necessaria,
-- il bypass service_role (migration 010) copre già verify-access-code.
