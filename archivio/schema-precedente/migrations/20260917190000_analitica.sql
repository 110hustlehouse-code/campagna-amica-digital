-- =====================================================================
-- NONO FILE — analitica e base per le previsioni
--
-- Tre funzioni che alimentano la sezione Andamento:
--   serie_storica_fatturato  — la serie mensile su cui si fa la previsione
--   metriche_operative       — cosa succede nella rete, oltre ai soldi
--   composizione_fatturato   — da dove arrivano i ricavi
--
-- IL FATTURATO, IN CHIARO
-- La rete genera valore in tre modi diversi, e tenerli separati e'
-- essenziale perche' significano cose diverse:
--   ordini     — quanto i clienti comprano tramite l'app
--   merce      — valore dichiarato nei DDT, cioe' quanto entra al banco
--   affitti    — quanto i mercati incassano dai produttori
-- Sommarli in un unico numero sarebbe fuorviante: l'affitto e' un ricavo
-- del mercato, l'ordine e' un ricavo del produttore, la merce e' una
-- misura di volume, non un incasso.
-- =====================================================================

create or replace function public.serie_storica_fatturato(
  p_livello text default 'italia',
  p_ambito  text default null,
  p_mesi    integer default 24
)
returns table (
  mese            date,
  ordini_numero   bigint,
  ordini_valore   numeric,
  ddt_numero      bigint,
  merce_valore    numeric,
  merce_quantita  numeric,
  affitti_valore  numeric,
  aziende_attive  bigint,
  clienti_attivi  bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with mesi as (
    select generate_series(
      date_trunc('month', current_date) - ((greatest(1, least(p_mesi, 60)) - 1) || ' months')::interval,
      date_trunc('month', current_date),
      '1 month'
    )::date as mese
  ),
  -- I mercati che rientrano nell'ambito richiesto.
  ambito as (
    select t.id
      from public.v_markets_territorio t
     where p_ambito is null
        or case p_livello
             when 'regione'   then t.regione_istat   = p_ambito
             when 'provincia' then t.provincia_sigla = p_ambito
             when 'comune'    then t.comune_istat    = p_ambito
             when 'quartiere' then coalesce(t.quartiere, '—') = p_ambito
             when 'mercato'   then t.id::text        = p_ambito
             else true
           end
  )
  select m.mese,
         coalesce(o.n, 0)::bigint,
         coalesce(o.valore, 0),
         coalesce(d.n, 0)::bigint,
         coalesce(d.valore, 0),
         coalesce(d.quantita, 0),
         coalesce(a.valore, 0),
         coalesce(d.aziende, 0)::bigint,
         coalesce(o.clienti, 0)::bigint
    from mesi m
    left join (
      select date_trunc('month', o.created_date)::date as mese,
             count(*) as n,
             sum(coalesce(o.total_amount, 0)) as valore,
             count(distinct o.created_by) as clienti
        from public.orders o
        join ambito x on x.id = o.market_id
       where o.status <> 'annullato'
       group by 1
    ) o on o.mese = m.mese
    left join (
      select date_trunc('month', d.data_documento)::date as mese,
             count(*) as n,
             sum(coalesce(v.importo_totale, 0)) as valore,
             sum(coalesce(v.quantita_totale, 0)) as quantita,
             count(distinct d.company_id) as aziende
        from public.ddt d
        join ambito x on x.id = d.market_id
        left join public.v_ddt_totali v on v.ddt_id = d.id
       where d.stato in ('emesso','consegnato')
       group by 1
    ) d on d.mese = m.mese
    left join (
      select make_date(r.period_year, r.period_month, 1) as mese,
             sum(r.amount) as valore
        from public.rental_payments r
        join ambito x on x.id = r.market_id
       where r.status = 'paid'
       group by 1
    ) a on a.mese = m.mese
   order by m.mese;
$$;

-- ---------------------------------------------------------------------
-- Metriche operative: la salute della rete, non solo il denaro.
-- ---------------------------------------------------------------------
create or replace function public.metriche_operative(
  p_livello text default 'italia',
  p_ambito  text default null,
  p_dal     date default null,
  p_al      date default null
)
returns table (
  aziende_totali        bigint,
  aziende_con_ddt       bigint,
  aziende_con_catalogo  bigint,
  aziende_dormienti     bigint,
  prodotti_totali       bigint,
  prodotti_disponibili  bigint,
  clienti_con_ordini    bigint,
  clienti_ricorrenti    bigint,
  ordini_totali         bigint,
  scontrino_medio       numeric,
  ddt_consegna_media_gg numeric,
  recensione_media      numeric,
  bisogni_aperti        bigint,
  affitti_non_saldati   bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with periodo as (
    select coalesce(p_dal, (current_date - interval '90 days')::date) as dal,
           coalesce(p_al, current_date) as al
  ),
  ambito as (
    select t.id
      from public.v_markets_territorio t
     where p_ambito is null
        or case p_livello
             when 'regione'   then t.regione_istat   = p_ambito
             when 'provincia' then t.provincia_sigla = p_ambito
             when 'comune'    then t.comune_istat    = p_ambito
             when 'quartiere' then coalesce(t.quartiere, '—') = p_ambito
             when 'mercato'   then t.id::text        = p_ambito
             else true
           end
  ),
  aziende as (
    select distinct c.id, c.created_by
      from public.companies c
      join ambito x on c.market_ids @> array[x.id::text]
     where c.is_registered
  )
  select
    (select count(*) from aziende),
    (select count(distinct d.company_id) from public.ddt d, periodo p
      where d.company_id in (select id from aziende)
        and d.stato in ('emesso','consegnato')
        and d.data_documento between p.dal and p.al),
    (select count(distinct pr.company_id) from public.products pr
      where pr.company_id in (select id from aziende)),
    -- Registrate ma senza catalogo ne' documenti: sono quelle da chiamare.
    (select count(*) from aziende a
      where not exists (select 1 from public.products pr where pr.company_id = a.id)
        and not exists (select 1 from public.ddt d where d.company_id = a.id)),
    (select count(*) from public.products pr where pr.company_id in (select id from aziende)),
    (select count(*) from public.products pr
      where pr.company_id in (select id from aziende) and pr.available),
    (select count(distinct o.created_by) from public.orders o, periodo p
      where o.market_id in (select id from ambito)
        and o.status <> 'annullato'
        and o.created_date::date between p.dal and p.al),
    -- Chi ha ordinato piu' di una volta: e' la metrica che dice se l'app e' usata
    -- davvero o solo provata.
    (select count(*) from (
       select o.created_by from public.orders o, periodo p
        where o.market_id in (select id from ambito)
          and o.status <> 'annullato'
          and o.created_date::date between p.dal and p.al
        group by o.created_by having count(*) > 1) r),
    (select count(*) from public.orders o, periodo p
      where o.market_id in (select id from ambito)
        and o.status <> 'annullato'
        and o.created_date::date between p.dal and p.al),
    (select round(coalesce(avg(o.total_amount), 0), 2) from public.orders o, periodo p
      where o.market_id in (select id from ambito)
        and o.status <> 'annullato' and o.total_amount > 0
        and o.created_date::date between p.dal and p.al),
    (select round(coalesce(avg(extract(epoch from (d.data_consegna - d.data_emissione)) / 86400), 0)::numeric, 1)
       from public.ddt d, periodo p
      where d.market_id in (select id from ambito)
        and d.stato = 'consegnato' and d.data_consegna is not null
        and d.data_documento between p.dal and p.al),
    (select round(coalesce(avg(rv.rating), 0), 2) from public.reviews rv
      where rv.company_id in (select id from aziende)),
    (select count(*) from public.company_needs n
      where n.market_id in (select id from ambito) and n.status in ('open','in_progress')),
    (select count(*) from public.rental_payments rp
      where rp.market_id in (select id from ambito) and rp.status in ('pending','overdue'));
$$;

-- ---------------------------------------------------------------------
-- Da dove arriva il valore: le prime categorie e le prime aziende.
-- ---------------------------------------------------------------------
create or replace function public.composizione_fatturato(
  p_livello text default 'italia',
  p_ambito  text default null,
  p_dal     date default null,
  p_al      date default null,
  p_limite  integer default 8
)
returns table (
  tipo      text,     -- 'categoria' | 'azienda' | 'mercato'
  etichetta text,
  valore    numeric,
  quantita  numeric,
  numero    bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with periodo as (
    select coalesce(p_dal, (current_date - interval '90 days')::date) as dal,
           coalesce(p_al, current_date) as al
  ),
  ambito as (
    select t.id, t.name
      from public.v_markets_territorio t
     where p_ambito is null
        or case p_livello
             when 'regione'   then t.regione_istat   = p_ambito
             when 'provincia' then t.provincia_sigla = p_ambito
             when 'comune'    then t.comune_istat    = p_ambito
             when 'quartiere' then coalesce(t.quartiere, '—') = p_ambito
             when 'mercato'   then t.id::text        = p_ambito
             else true
           end
  ),
  righe as (
    select d.company_id, d.mittente_ragione_sociale, d.market_id,
           r.descrizione, r.quantita, coalesce(r.importo, 0) as importo,
           pr.category
      from public.ddt d
      join ambito x on x.id = d.market_id
      join public.ddt_righe r on r.ddt_id = d.id
      left join public.products pr on pr.id = r.product_id,
           periodo p
     where d.stato in ('emesso','consegnato')
       and d.data_documento between p.dal and p.al
  )
  (select 'categoria'::text, coalesce(category, 'non classificato'),
          sum(importo), sum(quantita), count(*)::bigint
     from righe group by 1, 2 order by 3 desc
    limit greatest(1, least(p_limite, 50)))
  union all
  (select 'azienda'::text, mittente_ragione_sociale,
          sum(importo), sum(quantita), count(distinct company_id)::bigint
     from righe group by 1, 2 order by 3 desc
    limit greatest(1, least(p_limite, 50)))
  union all
  (select 'mercato'::text, a.name,
          sum(r.importo), sum(r.quantita), count(*)::bigint
     from righe r join ambito a on a.id = r.market_id
    group by 1, 2 order by 3 desc
    limit greatest(1, least(p_limite, 50)));
$$;

revoke execute on function public.serie_storica_fatturato(text, text, integer) from public, anon;
revoke execute on function public.metriche_operative(text, text, date, date) from public, anon;
revoke execute on function public.composizione_fatturato(text, text, date, date, integer) from public, anon;
grant execute on function public.serie_storica_fatturato(text, text, integer) to authenticated;
grant execute on function public.metriche_operative(text, text, date, date) to authenticated;
grant execute on function public.composizione_fatturato(text, text, date, date, integer) to authenticated;

select 'funzioni analitiche create' as esito;
