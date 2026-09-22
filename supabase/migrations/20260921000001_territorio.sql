-- ---------------------------------------------------------------------------
-- GERARCHIA TERRITORIALE
--
-- markets aveva solo city e region come testo libero: la limitazione che
-- Base44 si portava dietro. Con due mercati scritti "Roma" e "ROMA" il
-- raggruppamento per comune non esiste, e il drill-down nazionale nemmeno.
--
-- Qui la gerarchia diventa una lookup ISTAT normalizzata, piu' due colonne
-- denormalizzate su markets per non ripetere tre join a ogni query.
-- city e region restano dove sono: il frontend le usa, e non si rompe nulla.
-- ---------------------------------------------------------------------------

create table if not exists public.regioni (
  codice_istat  text primary key,
  nome          text not null unique,
  ripartizione  text not null
                check (ripartizione in ('Nord-ovest','Nord-est','Centro','Sud','Isole'))
);

create table if not exists public.province (
  sigla         text primary key,
  nome          text not null,
  codice_istat  text not null unique,
  regione_istat text not null references public.regioni(codice_istat)
);
create index if not exists province_regione_idx on public.province (regione_istat);

create table if not exists public.comuni (
  codice_istat    text primary key,
  nome            text not null,
  provincia_sigla text not null references public.province(sigla),
  cap_principale  text
);
create index if not exists comuni_provincia_idx on public.comuni (provincia_sigla);

-- Il quartiere e' il livello sotto il comune: a Roma un mercato e' "Circo
-- Massimo", non "Roma". Senza questo livello il pilot non e' rappresentabile.
create table if not exists public.quartieri (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  comune_istat text not null references public.comuni(codice_istat) on delete cascade,
  municipio    text,
  unique (comune_istat, nome)
);
create index if not exists quartieri_comune_idx on public.quartieri (comune_istat);

alter table public.markets
  add column if not exists comune_istat   text references public.comuni(codice_istat),
  add column if not exists quartiere_id   uuid references public.quartieri(id) on delete set null,
  add column if not exists codice_mercato text unique,
  add column if not exists attivo         boolean not null default true;

create index if not exists markets_comune_idx    on public.markets (comune_istat);
create index if not exists markets_quartiere_idx on public.markets (quartiere_id);

-- Vista piatta: un mercato con tutta la sua catena territoriale risolta.
-- Le funzioni di aggregazione partono da qui invece di ricostruire i join.
create or replace view public.v_markets_territorio as
select
  m.id,
  m.name                          as mercato,
  m.attivo,
  coalesce(q.nome, '—')           as quartiere,
  q.id                            as quartiere_id,
  q.municipio,
  c.codice_istat                  as comune_istat,
  coalesce(c.nome, m.city)        as comune,
  p.sigla                         as provincia_sigla,
  p.nome                          as provincia,
  r.codice_istat                  as regione_istat,
  coalesce(r.nome, m.region)      as regione,
  r.ripartizione,
  m.latitude,
  m.longitude
from public.markets m
left join public.quartieri q on q.id = m.quartiere_id
left join public.comuni    c on c.codice_istat = m.comune_istat
left join public.province  p on p.sigla = c.provincia_sigla
left join public.regioni   r on r.codice_istat = p.regione_istat;

-- ---------------------------------------------------------------------------
-- RLS: la geografia e' dato di riferimento. La leggono tutti gli
-- autenticati, la scrive solo l'amministrazione.
-- ---------------------------------------------------------------------------
alter table public.regioni enable row level security;
drop policy if exists regioni_read_all on public.regioni;
create policy regioni_read_all on public.regioni for select to authenticated using (true);
drop policy if exists regioni_write_admin on public.regioni;
create policy regioni_write_admin on public.regioni for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.province enable row level security;
drop policy if exists province_read_all on public.province;
create policy province_read_all on public.province for select to authenticated using (true);
drop policy if exists province_write_admin on public.province;
create policy province_write_admin on public.province for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.comuni enable row level security;
drop policy if exists comuni_read_all on public.comuni;
create policy comuni_read_all on public.comuni for select to authenticated using (true);
drop policy if exists comuni_write_admin on public.comuni;
create policy comuni_write_admin on public.comuni for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.quartieri enable row level security;
drop policy if exists quartieri_read_all on public.quartieri;
create policy quartieri_read_all on public.quartieri for select to authenticated using (true);
drop policy if exists quartieri_write_admin on public.quartieri;
create policy quartieri_write_admin on public.quartieri for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

comment on view public.v_markets_territorio is
  'Mercato con la catena territoriale risolta: quartiere, comune, provincia, regione. Base di tutte le aggregazioni dell area amministrazione.';
