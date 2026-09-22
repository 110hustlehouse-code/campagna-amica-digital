-- ============================================================
-- FIX PRIVACY: i prezzi rivenditore non possono stare su products,
-- che ha lettura pubblica. RLS di Postgres è per riga, non per
-- colonna: se la riga è pubblica, lo sono tutte le sue colonne.
-- ============================================================

create table if not exists public.product_reseller_prices (
  id           uuid        primary key default gen_random_uuid(),
  product_id   uuid        not null references public.products(id) on delete cascade,
  pricelist_id smallint    not null check (pricelist_id in (1, 2)),
  price        numeric     not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (product_id, pricelist_id)
);
comment on table public.product_reseller_prices is
  'Prezzi riservati ai listini rivenditori. Nessuna policy pubblica: solo il produttore proprietario, admin, o la Edge Function di verifica password (service role).';

create index if not exists idx_reseller_prices_product on public.product_reseller_prices(product_id);

alter table public.product_reseller_prices enable row level security;

create policy "product_reseller_prices: owner or admin read"
  on public.product_reseller_prices for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and (public.owns_company(p.company_id) or public.is_admin())
    )
  );

create policy "product_reseller_prices: owner or admin insert"
  on public.product_reseller_prices for insert
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_id and (public.owns_company(p.company_id) or public.is_admin())
    )
  );

create policy "product_reseller_prices: owner or admin update"
  on public.product_reseller_prices for update
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and (public.owns_company(p.company_id) or public.is_admin())
    )
  );

create policy "product_reseller_prices: owner or admin delete"
  on public.product_reseller_prices for delete
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and (public.owns_company(p.company_id) or public.is_admin())
    )
  );

-- Migra eventuali valori già inseriti (nessuno finora, ma per sicurezza)
insert into public.product_reseller_prices (product_id, pricelist_id, price)
select id, 1, price_list1 from public.products where price_list1 is not null
union all
select id, 2, price_list2 from public.products where price_list2 is not null;

alter table public.products drop column if exists price_list1;
alter table public.products drop column if exists price_list2;