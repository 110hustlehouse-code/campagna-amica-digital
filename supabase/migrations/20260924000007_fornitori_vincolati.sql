-- ============================================================
-- Fornitori vincolati a due sole tipologie: azienda del circuito
-- Campagna Amica, o buste fornite da Campagna Amica (taglia S/M/L).
-- Le vecchie categorie libere restano sui fornitori già creati
-- (colonna category non toccata), ma l'interfaccia da qui in avanti
-- usa solo questi due tipi.
-- ============================================================

alter table public.suppliers
  add column if not exists supplier_type text
    check (supplier_type in ('azienda_circuito', 'buste_campagna_amica')),
  add column if not exists supplier_company_id uuid references public.companies(id) on delete set null,
  add column if not exists bag_size text check (bag_size in ('S', 'M', 'L'));

comment on column public.suppliers.supplier_type is
  'Tipo di fornitore per i record creati dalla nuova interfaccia: azienda del circuito o buste Campagna Amica.';
comment on column public.suppliers.supplier_company_id is
  'Se supplier_type = azienda_circuito, riferimento reale all''azienda scelta (non solo una copia del nome).';
comment on column public.suppliers.bag_size is
  'Se supplier_type = buste_campagna_amica, la taglia scelta: S, M o L.';