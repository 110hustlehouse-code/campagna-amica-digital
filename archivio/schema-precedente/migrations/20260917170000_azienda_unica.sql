-- =====================================================================
-- SETTIMO FILE — un produttore, una azienda
--
-- PROBLEMA
-- Salvando il profilo due volte si creavano due aziende per lo stesso
-- produttore. Il codice leggeva l'azienda con una query che pretende un
-- solo risultato: con due righe andava in errore e tutte le pagine del
-- produttore smettevano di funzionare.
--
-- CORREZIONE
-- 1. Unisce i duplicati tenendo la riga piu' completa
-- 2. Impedisce che il caso si ripresenti, con un vincolo nel database
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. RIASSEGNAZIONE: tutto cio' che pende dai duplicati passa alla
--    riga da tenere, che e' la piu' recente fra quelle registrate.
-- ---------------------------------------------------------------------

create temporary table da_unire as
with ordinate as (
  select id, lower(created_by) as email,
         row_number() over (
           partition by lower(created_by)
           order by is_registered desc, updated_date desc
         ) as pos
    from public.companies
   where created_by is not null
)
select o.id as duplicato,
       (select id from ordinate k where k.email = o.email and k.pos = 1) as da_tenere
  from ordinate o
 where o.pos > 1;

update public.products p    set company_id = u.da_tenere from da_unire u where p.company_id = u.duplicato;
update public.orders p      set company_id = u.da_tenere from da_unire u where p.company_id = u.duplicato;
update public.reviews p     set company_id = u.da_tenere from da_unire u where p.company_id = u.duplicato;
update public.suppliers p   set company_id = u.da_tenere from da_unire u where p.company_id = u.duplicato;
update public.product_stocks p set company_id = u.da_tenere from da_unire u where p.company_id = u.duplicato;
update public.company_needs p  set company_id = u.da_tenere from da_unire u where p.company_id = u.duplicato;
update public.stall_rentals p  set company_id = u.da_tenere from da_unire u where p.company_id = u.duplicato;
update public.supplier_payments p set company_id = u.da_tenere from da_unire u where p.company_id = u.duplicato;
update public.ddt p         set company_id = u.da_tenere from da_unire u where p.company_id = u.duplicato;

-- Riferimenti che potrebbero duplicarsi: si rimuovono invece di spostarli.
delete from public.producer_event_rsvps r using da_unire u where r.company_id = u.duplicato;
delete from public.company_market_assignments a using da_unire u where a.company_id = u.duplicato;
delete from public.favorites f using da_unire u where f.company_id = u.duplicato;

-- I mercati non devono piu' puntare ai duplicati.
update public.markets m
   set company_ids = array_remove(m.company_ids, u.duplicato::text)
  from da_unire u
 where m.company_ids @> array[u.duplicato::text];

delete from public.companies c using da_unire u where c.id = u.duplicato;

-- ---------------------------------------------------------------------
-- 2. IL CASO NON SI RIPETE
-- ---------------------------------------------------------------------

create unique index if not exists companies_un_produttore_una_azienda
  on public.companies (lower(created_by))
  where created_by is not null;

comment on index public.companies_un_produttore_una_azienda is
  'Un produttore ha una sola azienda. Impedisce i duplicati da doppio salvataggio.';

select 'duplicati rimossi: ' || (select count(*) from da_unire) as esito;
select id, name, created_by from public.companies order by name;
