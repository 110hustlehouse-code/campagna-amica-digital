-- =====================================================================
-- QUINTO FILE — correzione policy staff_members
--
-- PROBLEMA
-- La policy di scrittura richiedeva is_staff_of_market(market_id): per
-- iscriversi come staff di un mercato bisognava gia' esserlo. Nessuno
-- poteva registrarsi come primo membro dello staff.
--
-- CORREZIONE
-- Un utente autenticato puo' creare o aggiornare SOLO il record che
-- porta la propria email. Chi e' gia' staff di un mercato puo' gestire
-- i colleghi di quel mercato. L'admin puo' tutto.
--
-- NOTA DI SICUREZZA
-- Cosi' un qualunque utente autenticato puo' auto-iscriversi come staff
-- di un mercato qualsiasi. Oggi l'unica barriera e' il codice di accesso
-- scritto nel frontend, che chiunque puo' leggere dal browser.
-- Prima di aprire l'app ai produttori veri serve un sistema di inviti:
-- il gestore del mercato invita per email, l'invito vale per quel
-- mercato e scade. Annotato tra le cose da chiudere prima del pilot.
-- =====================================================================

drop policy if exists staff_members_write on public.staff_members;

-- Iscrizione: la propria, oppure quella di un collega se si e' gia'
-- staff di quel mercato.
create policy staff_members_insert on public.staff_members
  for insert to authenticated
  with check (
    lower(email) = lower(auth.jwt() ->> 'email')
    or (select public.is_staff_of_market(market_id))
    or (select public.is_admin()));

-- Modifica: il proprio record, o quelli del proprio mercato.
create policy staff_members_update on public.staff_members
  for update to authenticated
  using (
    lower(email) = lower(auth.jwt() ->> 'email')
    or (select public.is_staff_of_market(market_id))
    or (select public.is_admin()))
  with check (
    lower(email) = lower(auth.jwt() ->> 'email')
    or (select public.is_staff_of_market(market_id))
    or (select public.is_admin()));

-- Rimozione: solo chi governa quel mercato, o l'admin.
create policy staff_members_delete on public.staff_members
  for delete to authenticated
  using (
    (select public.is_staff_of_market(market_id))
    or (select public.is_admin()));

select 'policy staff_members aggiornate' as esito;
