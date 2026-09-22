-- ---------------------------------------------------------------------------
-- Utenti e dati minimi per il collaudo dei quattro ruoli.
--
-- Gli account vanno creati PRIMA dalla dashboard Supabase
-- (Authentication -> Users -> Add user), con "Auto Confirm User" attivo:
--   cliente@prova.it      produttore@prova.it
--   staff@prova.it        admin@prova.it
-- tutti con la stessa password, che il diagnostico si aspetta.
--
-- Questo script assegna i ruoli e crea il minimo perche' ogni area sia
-- navigabile: un'azienda col catalogo per il produttore, l'iscrizione al
-- mercato per lo staff.
--
-- Il ruolo non si puo' cambiare da soli: lo impedisce il trigger
-- prevent_self_role_change. La prima riga assume l'identita' di servizio,
-- che e' l'unica autorizzata — la stessa che usa verify-access-code.
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"role":"service_role"}', false);

update public.users set role = 'client',    role_confirmed = true, full_name = 'Cliente Prova'    where email = 'cliente@prova.it';
update public.users set role = 'producer',  role_confirmed = true, full_name = 'Produttore Prova' where email = 'produttore@prova.it';
update public.users set role = 'staff',     role_confirmed = true, full_name = 'Staff Prova'      where email = 'staff@prova.it';
update public.users set role = 'admin',     role_confirmed = true, full_name = 'Admin Prova'      where email = 'admin@prova.it';

-- Azienda del produttore, agganciata al primo mercato.
insert into public.companies (owner_id, name, description, category, city, region, market_ids, is_registered)
select u.id, 'Azienda Prova', 'Azienda di collaudo', 'ortofrutticola', 'Roma', 'Lazio',
       array[(select id::text from public.markets order by name limit 1)], true
  from public.users u
 where u.email = 'produttore@prova.it'
   and not exists (select 1 from public.companies c where c.owner_id = u.id);

-- Due prodotti, cosi' il catalogo non e' vuoto.
insert into public.products (company_id, name, description, price, unit, category, available)
select c.id, p.nome, p.descr, p.prezzo, 'kg', p.cat, true
  from public.companies c,
       (values ('Pomodori','Pomodori di stagione',3.20,'verdura'),
               ('Zucchine','Zucchine fresche',2.50,'verdura')) as p(nome,descr,prezzo,cat)
 where c.name = 'Azienda Prova'
   and not exists (select 1 from public.products x where x.company_id = c.id and x.name = p.nome);

-- Lo staff iscritto al primo mercato: senza, l'onboarding lo blocca.
insert into public.staff_members (user_id, market_id, email, full_name, position, is_active, market_confirmed)
select u.id, (select id from public.markets order by name limit 1),
       u.email, 'Staff Prova', 'market_manager', true, true
  from public.users u
 where u.email = 'staff@prova.it'
   and not exists (select 1 from public.staff_members s where lower(s.email) = lower(u.email));

-- Controllo finale.
select email, role, role_confirmed from public.users order by role;
