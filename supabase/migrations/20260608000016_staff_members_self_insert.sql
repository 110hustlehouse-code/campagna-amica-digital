-- ============================================================
-- Fix — permetti allo staff di creare il proprio record
-- durante l'onboarding (StaffMarketOnboarding.jsx)
-- 2026-06-08
-- La policy precedente ammetteva solo admin INSERT.
-- Aggiunta policy separata: un utente con ruolo staff può
-- inserire un record con la propria email.
-- ============================================================

-- Permetti allo staff di aggiornare il proprio record (onboarding + profilo)
drop policy if exists "staff_members: staff self update" on public.staff_members;
create policy "staff_members: staff self update"
  on public.staff_members for update
  using (
    user_id = auth.uid()
    or (email = (select email from public.users where id = auth.uid()))
  )
  with check (
    user_id = auth.uid()
    or (email = (select email from public.users where id = auth.uid()))
  );

-- Permetti allo staff di inserire il proprio record (primo onboarding)
-- Condizione: l'email inserita corrisponde all'email dell'utente autenticato
-- (non usiamo get_my_role() per evitare dipendenze da RLS su public.users)
drop policy if exists "staff_members: staff self insert" on public.staff_members;
create policy "staff_members: staff self insert"
  on public.staff_members for insert
  with check (
    auth.uid() is not null
    and email = (select email from auth.users where id = auth.uid())
  );
