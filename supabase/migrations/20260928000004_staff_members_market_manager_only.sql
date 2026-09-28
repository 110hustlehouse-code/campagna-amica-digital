-- La gestione del team (aggiungi/modifica/elimina) è riservata al
-- responsabile mercato (position = 'market_manager'), non a tutto lo
-- staff del mercato come nella migration precedente.
create or replace function public.is_market_manager_for_market(p_market_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_members
    where user_id = auth.uid()
    and market_id = p_market_id
    and position = 'market_manager'
    and is_active = true
  );
$$;

drop policy if exists "staff_members: staff insert own market" on public.staff_members;
drop policy if exists "staff_members: staff update own market" on public.staff_members;
drop policy if exists "staff_members: staff delete own market" on public.staff_members;

create policy "staff_members: market_manager insert own market"
  on public.staff_members for insert
  with check (is_market_manager_for_market(market_id));

create policy "staff_members: market_manager update own market"
  on public.staff_members for update
  using (is_market_manager_for_market(market_id))
  with check (is_market_manager_for_market(market_id));

create policy "staff_members: market_manager delete own market"
  on public.staff_members for delete
  using (is_market_manager_for_market(market_id));
