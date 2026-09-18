-- =====================================================================
-- Campagna Amica Digital — Row Level Security
-- Campo Zero
--
-- Il frontend parla direttamente a Supabase con la chiave anon: queste
-- policy sono l'UNICA difesa dei dati. Se una policy e' sbagliata, il
-- dato e' pubblico, a prescindere da cosa fa l'interfaccia.
--
-- MODELLO
--   client   : vede il catalogo pubblico e solo i propri dati
--   producer : governa la propria azienda e nient'altro
--   staff    : governa il proprio mercato, non i dati commerciali dei
--              produttori (fornitori e pagamenti restano riservati)
--   admin    : legge tutto (whitelist server-side, mai auto-dichiarato)
--
-- NOTA SULLE PRESTAZIONI: ogni helper e' wrappato in (select ...) nelle
-- policy, cosi' Postgres lo valuta una volta per query invece che una
-- volta per riga.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. HELPER
-- ---------------------------------------------------------------------

-- current_role e' una parola chiave SQL: rinominata per evitare ambiguita'.
drop function if exists public.current_role();

create or replace function public.user_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.owns_company(p_company_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.companies
     where id = p_company_id
       and lower(created_by) = lower(auth.jwt() ->> 'email'))
$$;

create or replace function public.is_staff_of_market(p_market_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.staff_members
     where market_id = p_market_id
       and lower(email) = lower(auth.jwt() ->> 'email')
       and is_active)
$$;

-- Il produttore appartiene al mercato? (serve per comunicazioni ed eventi)
drop function if exists public.my_markets();

-- Restituisce un SET, non un array: cosi' si usa con IN (select ...),
-- che Postgres valuta una volta per query.
create or replace function public.my_markets()
returns setof uuid language sql stable security definer set search_path = public as $$
  select distinct m.id
    from public.companies c
    join public.markets m on m.id::text = any(c.market_ids)
   where lower(c.created_by) = lower(auth.jwt() ->> 'email')
$$;

-- ---------------------------------------------------------------------
-- 1. ABILITAZIONE RLS SU TUTTE LE TABELLE
-- ---------------------------------------------------------------------
-- Di default nega tutto: senza una policy esplicita, nessuno legge nulla.

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','admin_whitelist','regioni','province','comuni','quartieri',
    'markets','companies','products','product_stocks','orders','favorites',
    'reviews','staff_members','staff_messages','staff_message_reads',
    'market_events','producer_event_rsvps','company_market_assignments',
    'company_needs','stall_rentals','rental_payments','suppliers',
    'supplier_payments','notifications','news_cache',
    'ddt','ddt_righe','ddt_counters','tessere','tessera_utilizzi'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 2. IDENTITA'
-- ---------------------------------------------------------------------

-- profiles: ognuno il proprio. Le policy NON usano user_role() per
-- evitare ricorsione (user_role legge profiles); is_admin e' SECURITY
-- DEFINER e quindi non ricade sotto RLS.
create policy profiles_select_self on public.profiles
  for select using (id = (select auth.uid()) or (select public.is_admin()));

create policy profiles_update_self on public.profiles
  for update using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy profiles_admin_all on public.profiles
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- La whitelist admin non e' leggibile da nessuno tranne gli admin:
-- l'elenco di chi ha i poteri e' esso stesso un'informazione sensibile.
create policy whitelist_admin_only on public.admin_whitelist
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- 3. GEOGRAFIA — lettura per tutti gli autenticati, scrittura admin
-- ---------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['regioni','province','comuni','quartieri'] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      t || '_read_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using ((select public.is_admin())) with check ((select public.is_admin()))',
      t || '_write_admin', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 4. MERCATI E AZIENDE — catalogo pubblico
-- ---------------------------------------------------------------------

create policy markets_read on public.markets
  for select to authenticated using (true);

create policy markets_write_staff on public.markets
  for update to authenticated
  using ((select public.is_staff_of_market(id)) or (select public.is_admin()))
  with check ((select public.is_staff_of_market(id)) or (select public.is_admin()));

create policy markets_insert_admin on public.markets
  for insert to authenticated with check ((select public.is_admin()));

create policy markets_delete_admin on public.markets
  for delete to authenticated using ((select public.is_admin()));

create policy companies_read on public.companies
  for select to authenticated using (true);

-- Il produttore crea la propria azienda: created_by viene impostato dal
-- trigger, quindi il check confronta l'email del token.
create policy companies_insert_own on public.companies
  for insert to authenticated
  with check (lower(coalesce(created_by, auth.jwt() ->> 'email'))
              = lower(auth.jwt() ->> 'email'));

create policy companies_update_own on public.companies
  for update to authenticated
  using (lower(created_by) = lower(auth.jwt() ->> 'email') or (select public.is_admin()))
  with check (lower(created_by) = lower(auth.jwt() ->> 'email') or (select public.is_admin()));

create policy companies_delete_admin on public.companies
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- 5. PRODOTTI — catalogo pubblico, scrittura solo al proprietario
-- ---------------------------------------------------------------------

create policy products_read on public.products
  for select to authenticated using (true);

create policy products_write_own on public.products
  for all to authenticated
  using ((select public.owns_company(company_id)) or (select public.is_admin()))
  with check ((select public.owns_company(company_id)) or (select public.is_admin()));

-- Le scorte NON sono pubbliche: sono un dato gestionale del produttore.
create policy stocks_own on public.product_stocks
  for all to authenticated
  using ((select public.owns_company(company_id)) or (select public.is_admin()))
  with check ((select public.owns_company(company_id)) or (select public.is_admin()));

-- ---------------------------------------------------------------------
-- 6. ORDINI
-- ---------------------------------------------------------------------

create policy orders_select on public.orders
  for select to authenticated using (
    lower(created_by) = lower(auth.jwt() ->> 'email')     -- il cliente che lo ha fatto
    or (select public.owns_company(company_id))            -- il produttore che lo riceve
    or (select public.is_staff_of_market(market_id))       -- lo staff del mercato
    or (select public.is_admin()));

create policy orders_insert_client on public.orders
  for insert to authenticated
  with check (lower(coalesce(created_by, auth.jwt() ->> 'email'))
              = lower(auth.jwt() ->> 'email'));

create policy orders_update on public.orders
  for update to authenticated
  using (lower(created_by) = lower(auth.jwt() ->> 'email')
         or (select public.owns_company(company_id))
         or (select public.is_admin()))
  with check (lower(created_by) = lower(auth.jwt() ->> 'email')
         or (select public.owns_company(company_id))
         or (select public.is_admin()));

create policy orders_delete on public.orders
  for delete to authenticated
  using (lower(created_by) = lower(auth.jwt() ->> 'email') or (select public.is_admin()));

-- ---------------------------------------------------------------------
-- 7. PREFERITI E RECENSIONI
-- ---------------------------------------------------------------------

create policy favorites_own on public.favorites
  for all to authenticated
  using (lower(created_by) = lower(auth.jwt() ->> 'email'))
  with check (lower(coalesce(created_by, auth.jwt() ->> 'email'))
              = lower(auth.jwt() ->> 'email'));

create policy reviews_read on public.reviews
  for select to authenticated using (true);

create policy reviews_insert_own on public.reviews
  for insert to authenticated
  with check (lower(coalesce(created_by, auth.jwt() ->> 'email'))
              = lower(auth.jwt() ->> 'email'));

-- Autore e produttore possono aggiornare, ma il trigger sotto impedisce
-- al produttore di toccare voto e testo: puo' solo rispondere.
create policy reviews_update on public.reviews
  for update to authenticated
  using (lower(created_by) = lower(auth.jwt() ->> 'email')
         or (select public.owns_company(company_id))
         or (select public.is_admin()))
  with check (lower(created_by) = lower(auth.jwt() ->> 'email')
         or (select public.owns_company(company_id))
         or (select public.is_admin()));

create policy reviews_delete on public.reviews
  for delete to authenticated
  using (lower(created_by) = lower(auth.jwt() ->> 'email') or (select public.is_admin()));

create or replace function public.guard_review_reply_only()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Se chi scrive NON e' l'autore ma possiede l'azienda, puo' cambiare
  -- solo reply e reply_date.
  if lower(coalesce(old.created_by,'')) <> lower(coalesce(auth.jwt() ->> 'email',''))
     and public.owns_company(old.company_id) then
    if new.rating is distinct from old.rating
       or new.message is distinct from old.message then
      raise exception 'Il produttore puo'' solo rispondere: voto e testo non sono modificabili';
    end if;
  end if;
  return new;
end $$;

create trigger trg_review_reply_only
  before update on public.reviews
  for each row execute function public.guard_review_reply_only();

-- ---------------------------------------------------------------------
-- 8. STAFF, COMUNICAZIONI, EVENTI
-- ---------------------------------------------------------------------

create policy staff_members_select on public.staff_members
  for select to authenticated using (
    (select public.is_staff_of_market(market_id))
    or lower(email) = lower(auth.jwt() ->> 'email')
    or market_id in (select public.my_markets())   -- il produttore sa chi contattare
    or (select public.is_admin()));

create policy staff_members_write on public.staff_members
  for all to authenticated
  using ((select public.is_staff_of_market(market_id)) or (select public.is_admin()))
  with check ((select public.is_staff_of_market(market_id)) or (select public.is_admin()));

-- Le comunicazioni pubblicate sono visibili a chi frequenta quel mercato;
-- le bozze solo allo staff che le scrive.
create policy staff_messages_select on public.staff_messages
  for select to authenticated using (
    (is_published and (market_id is null or market_id in (select public.my_markets())))
    or (is_published and market_id is null)
    or (select public.is_staff_of_market(market_id))
    or (select public.is_admin()));

create policy staff_messages_write on public.staff_messages
  for all to authenticated
  using ((select public.is_staff_of_market(market_id)) or (select public.is_admin()))
  with check ((select public.is_staff_of_market(market_id)) or (select public.is_admin()));

create policy message_reads_own on public.staff_message_reads
  for all to authenticated
  using (lower(producer_email) = lower(auth.jwt() ->> 'email')
         or (select public.is_admin())
         or exists (select 1 from public.staff_messages m
                     where m.id = message_id
                       and public.is_staff_of_market(m.market_id)))
  with check (lower(producer_email) = lower(auth.jwt() ->> 'email')
         or (select public.is_admin()));

create policy market_events_select on public.market_events
  for select to authenticated using (true);

create policy market_events_write on public.market_events
  for all to authenticated
  using ((select public.is_staff_of_market(market_id)) or (select public.is_admin()))
  with check ((select public.is_staff_of_market(market_id)) or (select public.is_admin()));

create policy rsvp_select on public.producer_event_rsvps
  for select to authenticated using (
    (select public.owns_company(company_id))
    or (select public.is_staff_of_market(market_id))
    or (select public.is_admin()));

create policy rsvp_write on public.producer_event_rsvps
  for all to authenticated
  using ((select public.owns_company(company_id)) or (select public.is_admin()))
  with check ((select public.owns_company(company_id)) or (select public.is_admin()));

create policy assignments_select on public.company_market_assignments
  for select to authenticated using (
    (select public.owns_company(company_id))
    or (select public.is_admin())
    or exists (select 1 from public.market_events e
                where e.id = market_event_id
                  and public.is_staff_of_market(e.market_id)));

create policy assignments_write on public.company_market_assignments
  for all to authenticated
  using ((select public.is_admin())
         or exists (select 1 from public.market_events e
                     where e.id = market_event_id
                       and public.is_staff_of_market(e.market_id)))
  with check ((select public.is_admin())
         or exists (select 1 from public.market_events e
                     where e.id = market_event_id
                       and public.is_staff_of_market(e.market_id)));

-- ---------------------------------------------------------------------
-- 9. BISOGNI E AFFITTI — azienda + staff del mercato
-- ---------------------------------------------------------------------

create policy needs_select on public.company_needs
  for select to authenticated using (
    (select public.owns_company(company_id))
    or (select public.is_staff_of_market(market_id))
    or (select public.is_admin()));

create policy needs_write on public.company_needs
  for all to authenticated
  using ((select public.owns_company(company_id))
         or (select public.is_staff_of_market(market_id))
         or (select public.is_admin()))
  with check ((select public.owns_company(company_id))
         or (select public.is_staff_of_market(market_id))
         or (select public.is_admin()));

create policy rentals_select on public.stall_rentals
  for select to authenticated using (
    (select public.owns_company(company_id))
    or (select public.is_staff_of_market(market_id))
    or (select public.is_admin()));

create policy rentals_write on public.stall_rentals
  for all to authenticated
  using ((select public.is_staff_of_market(market_id)) or (select public.is_admin()))
  with check ((select public.is_staff_of_market(market_id)) or (select public.is_admin()));

create policy rental_payments_select on public.rental_payments
  for select to authenticated using (
    (select public.owns_company(company_id))
    or (select public.is_staff_of_market(market_id))
    or (select public.is_admin()));

create policy rental_payments_write on public.rental_payments
  for all to authenticated
  using ((select public.is_staff_of_market(market_id)) or (select public.is_admin()))
  with check ((select public.is_staff_of_market(market_id)) or (select public.is_admin()));

-- ---------------------------------------------------------------------
-- 10. FORNITORI — riservati al produttore
-- ---------------------------------------------------------------------
-- Lo staff NON vede fornitori e pagamenti: sono rapporti commerciali
-- privati dell'azienda. Esporli al gestore del mercato sarebbe un
-- problema di concorrenza, non solo di privacy.

create policy suppliers_own on public.suppliers
  for all to authenticated
  using ((select public.owns_company(company_id)) or (select public.is_admin()))
  with check ((select public.owns_company(company_id)) or (select public.is_admin()));

create policy supplier_payments_own on public.supplier_payments
  for all to authenticated
  using ((select public.owns_company(company_id)) or (select public.is_admin()))
  with check ((select public.owns_company(company_id)) or (select public.is_admin()));

-- ---------------------------------------------------------------------
-- 11. NOTIFICHE E NEWS
-- ---------------------------------------------------------------------

create policy notifications_own on public.notifications
  for select to authenticated
  using (lower(user_email) = lower(auth.jwt() ->> 'email') or (select public.is_admin()));

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (lower(user_email) = lower(auth.jwt() ->> 'email'))
  with check (lower(user_email) = lower(auth.jwt() ->> 'email'));

create policy notifications_delete_own on public.notifications
  for delete to authenticated
  using (lower(user_email) = lower(auth.jwt() ->> 'email') or (select public.is_admin()));

-- L'inserimento di notifiche avviene dalle Edge Functions con service_role,
-- che bypassa RLS: nessuna policy di insert per gli utenti.

create policy news_read on public.news_cache
  for select to authenticated using (true);

create policy news_write_admin on public.news_cache
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- 12. DDT — il cuore del controllo
-- ---------------------------------------------------------------------
-- Vede il DDT: il produttore che lo emette, lo staff del mercato che lo
-- riceve, l'amministrazione. Il cliente finale non c'entra nulla.

create policy ddt_select on public.ddt
  for select to authenticated using (
    (select public.owns_company(company_id))
    or (select public.is_staff_of_market(market_id))
    or (select public.is_admin()));

create policy ddt_insert_own on public.ddt
  for insert to authenticated
  with check ((select public.owns_company(company_id)));

-- L'update passa comunque dal trigger di immutabilita': la policy dice
-- CHI puo' toccare il documento, il trigger dice COSA puo' cambiare.
create policy ddt_update on public.ddt
  for update to authenticated
  using ((select public.owns_company(company_id))
         or (select public.is_staff_of_market(market_id)))
  with check ((select public.owns_company(company_id))
         or (select public.is_staff_of_market(market_id)));

-- Nessuna policy di DELETE: un DDT non si cancella mai, si annulla.

create policy ddt_righe_select on public.ddt_righe
  for select to authenticated using (
    exists (select 1 from public.ddt d where d.id = ddt_id
             and (public.owns_company(d.company_id)
                  or public.is_staff_of_market(d.market_id)
                  or public.is_admin())));

create policy ddt_righe_write on public.ddt_righe
  for all to authenticated
  using (exists (select 1 from public.ddt d
                  where d.id = ddt_id and public.owns_company(d.company_id)))
  with check (exists (select 1 from public.ddt d
                  where d.id = ddt_id and public.owns_company(d.company_id)));

-- I contatori non sono mai toccati direttamente: solo da next_ddt_number,
-- che e' SECURITY DEFINER. Nessuna policy = nessun accesso diretto.

-- ---------------------------------------------------------------------
-- 13. TESSERA CLIENTE
-- ---------------------------------------------------------------------

create policy tessere_select on public.tessere
  for select to authenticated using (
    lower(user_email) = lower(auth.jwt() ->> 'email')
    or (select public.is_staff_of_market(market_id))
    or (select public.is_admin()));

create policy tessere_insert on public.tessere
  for insert to authenticated
  with check (lower(user_email) = lower(auth.jwt() ->> 'email')
              or (select public.is_staff_of_market(market_id))
              or (select public.is_admin()));

create policy tessere_update_staff on public.tessere
  for update to authenticated
  using ((select public.is_staff_of_market(market_id)) or (select public.is_admin()))
  with check ((select public.is_staff_of_market(market_id)) or (select public.is_admin()));

create policy utilizzi_select on public.tessera_utilizzi
  for select to authenticated using (
    exists (select 1 from public.tessere t where t.id = tessera_id
             and lower(t.user_email) = lower(auth.jwt() ->> 'email'))
    or (select public.is_staff_of_market(market_id))
    or (select public.owns_company(company_id))
    or (select public.is_admin()));

create policy utilizzi_insert on public.tessera_utilizzi
  for insert to authenticated
  with check ((select public.is_staff_of_market(market_id))
              or (select public.owns_company(company_id))
              or (select public.is_admin()));

-- ---------------------------------------------------------------------
-- 14. SINCRONIZZAZIONE WHITELIST -> PROFILI
-- ---------------------------------------------------------------------
-- handle_new_user() assegna il ruolo admin solo al PRIMO accesso. Chi
-- viene messo in whitelist dopo essersi gia' registrato resterebbe
-- 'client' per sempre. Questo trigger allinea i profili esistenti a
-- ogni modifica della whitelist, nei due sensi.

create or replace function public.sync_admin_from_whitelist()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('INSERT','UPDATE') then
    if new.attivo then
      update public.profiles
         set role = 'admin', role_confirmed = true
       where lower(email) = lower(new.email) and role <> 'admin';
    else
      -- revoca: torna client, non resta admin per inerzia
      update public.profiles
         set role = 'client'
       where lower(email) = lower(new.email) and role = 'admin';
    end if;
  elsif tg_op = 'DELETE' then
    update public.profiles
       set role = 'client'
     where lower(email) = lower(old.email) and role = 'admin';
  end if;
  return coalesce(new, old);
end $$;

create trigger trg_sync_admin_whitelist
  after insert or update or delete on public.admin_whitelist
  for each row execute function public.sync_admin_from_whitelist();
