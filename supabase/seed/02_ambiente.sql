-- ---------------------------------------------------------------------------
-- Dati specifici dell'ambiente: mercato pilota e whitelist amministratori.
-- NON caricare in produzione senza rivedere email e mercati.
-- ---------------------------------------------------------------------------
insert into public.markets
  (name, address, city, region, latitude, longitude, schedule,
   comune_istat, quartiere_id, codice_mercato, attivo)
select
  'Mercato Campagna Amica Circo Massimo',
  'Via San Teodoro 74, Roma',
  'Roma', 'Lazio',
  41.8887, 12.4844,
  'Sabato e domenica, 9:00 - 18:00',
  '058091',
  (select id from public.quartieri where nome = 'Circo Massimo' and comune_istat = '058091'),
  'CA-RM-001',
  true
where not exists (select 1 from public.markets where codice_mercato = 'CA-RM-001');

-- ---------------------------------------------------------------------
-- AMMINISTRATORI
-- ---------------------------------------------------------------------
-- Sostituire con l'indirizzo Google effettivamente usato per accedere.
-- Il trigger sync_admin_from_whitelist allinea i profili gia' esistenti,
-- quindi funziona sia prima sia dopo il primo accesso.
insert into public.admin_whitelist (email, livello, note) values
  ('110hustlehouse@gmail.com','nazionale','Carlo Barboni — Campo Zero')
on conflict (email) do nothing;

-- ---------------------------------------------------------------------
-- VERIFICA
-- ---------------------------------------------------------------------
select 'regioni'   as tabella, count(*) from public.regioni
union all select 'province',  count(*) from public.province
union all select 'comuni',    count(*) from public.comuni
union all select 'quartieri', count(*) from public.quartieri
union all select 'mercati',   count(*) from public.markets
union all select 'admin',     count(*) from public.admin_whitelist;
