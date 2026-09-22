-- ============================================================
-- Seed iniziale: 3 mercati Campagna Amica di Roma
-- Bug-019: l'autocomplete in ProducerCompany.jsx non suggeriva nulla
-- perché public.markets era vuota. Aggiungiamo i 3 mercati richiesti
-- dall'utente come baseline pilot Lazio.
-- ============================================================

-- INSERT idempotente: se un mercato con stesso nome+città esiste già lo skippa.
-- (Non c'è UNIQUE constraint su markets.name, quindi facciamo il check manuale.)

insert into public.markets (name, address, city, region, schedule)
select * from (values
  ('Mercato Tiburtina',     'Via Tiburtina (presso Stazione Tiburtina)', 'Roma', 'Lazio', 'Sabato 9:00-14:00'),
  ('Mercato Circo Massimo', 'Via di San Teodoro, 74',                     'Roma', 'Lazio', 'Sabato e Domenica 9:00-18:00'),
  ('Mercato EUR',           'Piazzale Konrad Adenauer (EUR)',             'Roma', 'Lazio', 'Domenica 9:00-14:00')
) as v(name, address, city, region, schedule)
where not exists (
  select 1 from public.markets m
  where m.name = v.name and m.city = v.city
);

-- Log di verifica
do $$
declare
  cnt int;
begin
  select count(*) into cnt from public.markets where city = 'Roma';
  raise notice 'Mercati Roma totali dopo seed: %', cnt;
end $$;
