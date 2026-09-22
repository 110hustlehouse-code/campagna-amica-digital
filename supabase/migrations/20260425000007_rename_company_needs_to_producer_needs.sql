-- ============================================================
-- Rename company_needs → producer_needs
-- Naming canonico: una richiesta del produttore (non dell'azienda).
-- Decisione utente 2026-04-25.
-- ============================================================

-- 1. Rename tabella
alter table public.company_needs rename to producer_needs;
comment on table public.producer_needs is 'Bisogni/richieste dei produttori ai mercati';

-- 2. Rename indici
alter index if exists idx_company_needs_market_id rename to idx_producer_needs_market_id;
alter index if exists idx_company_needs_status    rename to idx_producer_needs_status;

-- 3. Drop & recreate RLS policies (ALTER POLICY non supporta rename naming)
drop policy if exists "company_needs: owner or staff or admin read"   on public.producer_needs;
drop policy if exists "company_needs: producer or staff insert"        on public.producer_needs;
drop policy if exists "company_needs: owner or staff insert"           on public.producer_needs;
drop policy if exists "company_needs: owner or staff update"           on public.producer_needs;
drop policy if exists "company_needs: admin delete"                    on public.producer_needs;

create policy "producer_needs: owner or staff or admin read"
  on public.producer_needs for select
  using (owns_company(company_id) or is_staff_for_market(market_id) or is_admin());

create policy "producer_needs: producer or staff insert"
  on public.producer_needs for insert
  with check (owns_company(company_id) or is_staff_for_market(market_id));

create policy "producer_needs: owner or staff update"
  on public.producer_needs for update
  using (owns_company(company_id) or is_staff_for_market(market_id))
  with check (owns_company(company_id) or is_staff_for_market(market_id));

create policy "producer_needs: admin delete"
  on public.producer_needs for delete
  using (is_admin());

-- 4. Trigger updated_at: drop+recreate (il trigger nominato includeva il vecchio nome)
drop trigger if exists set_updated_at on public.producer_needs;
create trigger set_updated_at
  before update on public.producer_needs
  for each row execute function public.set_updated_at();
