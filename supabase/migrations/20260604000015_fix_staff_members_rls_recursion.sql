-- ============================================================
-- Fix — ricorsione RLS su staff_members (42P17)
-- 2026-06-04
-- La policy SELECT interrogava staff_members al suo interno,
-- causando infinite_recursion → HTTP 500 alla lettura.
-- Sostituita la sotto-query inline con is_staff_for_market()
-- (SECURITY DEFINER, bypassa RLS → niente ricorsione).
-- ============================================================
drop policy if exists "staff_members: staff or admin read" on public.staff_members;

create policy "staff_members: staff or admin read"
  on public.staff_members for select
  using (
    -- il membro vede il proprio record
    user_id = auth.uid()
    -- un membro dello staff vede gli altri dello stesso mercato
    or public.is_staff_for_market(staff_members.market_id)
    or public.is_admin()
  );
