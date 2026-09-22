-- ---------------------------------------------------------------------------
-- AREA AMMINISTRAZIONE — aggregazioni, serie storiche, previsioni
--
-- Tutto gira nel database. Sommare l'archivio DDT nazionale nel browser
-- significherebbe scaricarlo tutto a ogni apertura della pagina.
--
-- Riscritto sui nomi di questo schema: delivery_notes / delivery_note_items
-- invece di ddt / ddt_righe, producer_needs invece di company_needs,
-- users invece di profiles.
--
-- NOTA SUL VALORE DELLA MERCE. delivery_note_items porta quantita', peso,
-- lotto e scadenza, ma non un prezzo di riga: un DDT non e' una fattura.
-- Il valore qui e' quindi una STIMA al prezzo di catalogo corrente del
-- prodotto collegato. Le righe senza product_id valgono zero, percio' ogni
-- funzione restituisce anche la copertura della stima: senza quella, un
-- numero basso non si distingue da un dato mancante.
-- ---------------------------------------------------------------------------

-- Chi puo' leggere i dati di rete: l'amministrazione e la direzione.
-- La direzione e' sola lettura per costruzione, e queste funzioni leggono.
create or replace function public.puo_leggere_rete()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.is_admin(), false) or coalesce(public.is_direzione(), false)
$$;

-- I mercati compresi in un ambito territoriale. Un solo posto in cui e'
-- scritta la regola, sei funzioni che la usano.
create or replace function public.mercati_in_ambito(
  p_livello text default 'italia',
  p_ambito  text default null
)
returns setof uuid language sql stable security definer set search_path = public as $$
  select t.id
    from public.v_markets_territorio t
   where p_ambito is null
      or case p_livello
           when 'regione'   then t.regione_istat   = p_ambito
           when 'provincia' then t.provincia_sigla = p_ambito
           when 'comune'    then t.comune_istat    = p_ambito
           when 'quartiere' then t.quartiere       = p_ambito
           when 'mercato'   then t.id::text        = p_ambito
           else true
         end
$$;

-- Le aziende presenti in un ambito: assegnate a un evento di quei mercati,
-- oppure collegate tramite l'array denormalizzato market_ids.
create or replace function public.aziende_in_ambito(
  p_livello text default 'italia',
  p_ambito  text default null
)
returns setof uuid language sql stable security definer set search_path = public as $$
  select distinct c.id
    from public.companies c
   where exists (
           select 1
             from public.company_market_assignments cma
             join public.market_events me on me.id = cma.market_event_id
            where cma.company_id = c.id
              and me.market_id in (select public.mercati_in_ambito(p_livello, p_ambito))
         )
      or exists (
           select 1
             from unnest(c.market_ids) as mid
            where mid::uuid in (select public.mercati_in_ambito(p_livello, p_ambito))
         )
$$;

-- ---------------------------------------------------------------------------
-- 1. Riepilogo nazionale
-- ---------------------------------------------------------------------------
create or replace function public.riepilogo_nazionale(
  p_dal date default null,
  p_al  date default null
)
returns table (
  mercati_attivi   bigint,
  aziende          bigint,
  produttori       bigint,
  clienti          bigint,
  ddt_emessi       bigint,
  ddt_consegnati   bigint,
  ddt_annullati    bigint,
  quantita_totale  numeric,
  valore_merce     numeric,
  ordini           bigint,
  regioni_coperte  bigint
)
language plpgsql stable security definer set search_path = public as $$
declare v_dal date := coalesce(p_dal, (current_date - interval '30 days')::date);
        v_al  date := coalesce(p_al, current_date);
begin
  if not public.puo_leggere_rete() then
    raise exception 'Accesso riservato all''amministrazione' using errcode = '42501';
  end if;

  return query
  with ddt as (
    select d.*, t.regione_istat
      from public.delivery_notes d
      join public.v_markets_territorio t on t.id = d.market_id
     where d.issue_date between v_dal and v_al
  )
  select
    (select count(*) from public.markets where attivo),
    (select count(*) from public.companies),
    (select count(*) from public.users where role = 'producer'),
    (select count(*) from public.users where role = 'client'),
    (select count(*) from ddt where status = 'issued'),
    (select count(*) from ddt where signed_at is not null),
    (select count(*) from ddt where status = 'cancelled'),
    (select coalesce(sum(i.quantity), 0)
       from public.delivery_note_items i
       join ddt on ddt.id = i.delivery_note_id),
    (select coalesce(sum(i.quantity * p.price), 0)
       from public.delivery_note_items i
       join ddt on ddt.id = i.delivery_note_id
       join public.products p on p.id = i.product_id),
    (select count(*) from public.orders
      where created_at::date between v_dal and v_al and status <> 'annullato'),
    (select count(distinct regione_istat) from ddt where regione_istat is not null);
end $$;

-- ---------------------------------------------------------------------------
-- 2. Drill-down territoriale: esplode un ambito nel livello sottostante
-- ---------------------------------------------------------------------------
create or replace function public.metriche_territorio(
  p_livello text default 'italia',
  p_ambito  text default null,
  p_dal     date default null,
  p_al      date default null
)
returns table (
  chiave          text,
  nome            text,
  mercati         bigint,
  aziende         bigint,
  ddt_emessi      bigint,
  ddt_consegnati  bigint,
  quantita_totale numeric,
  valore_merce    numeric,
  ordini          bigint,
  prodotti        bigint
)
language plpgsql stable security definer set search_path = public as $$
declare v_dal date := coalesce(p_dal, (current_date - interval '30 days')::date);
        v_al  date := coalesce(p_al, current_date);
begin
  if not public.puo_leggere_rete() then
    raise exception 'Accesso riservato all''amministrazione' using errcode = '42501';
  end if;

  return query
  with ambito as (
    select t.*
      from public.v_markets_territorio t
     where t.id in (select public.mercati_in_ambito(p_livello, p_ambito))
  ),
  raggruppato as (
    select
      case p_livello
        when 'italia'    then a.regione_istat
        when 'regione'   then a.provincia_sigla
        when 'provincia' then a.comune_istat
        when 'comune'    then a.quartiere
        else a.id::text
      end as chiave,
      case p_livello
        when 'italia'    then a.regione
        when 'regione'   then a.provincia
        when 'provincia' then a.comune
        when 'comune'    then a.quartiere
        else a.mercato
      end as nome,
      a.id as market_id
      from ambito a
  ),
  ddt as (
    select d.id, d.market_id, d.status, d.signed_at, d.company_id
      from public.delivery_notes d
     where d.issue_date between v_dal and v_al
  )
  select
    g.chiave,
    max(g.nome),
    count(distinct g.market_id),
    (select count(*) from public.companies c
      where exists (select 1 from unnest(c.market_ids) mid
                     where mid::uuid in (select market_id from raggruppato r2
                                          where r2.chiave = g.chiave))),
    count(distinct ddt.id) filter (where ddt.status = 'issued'),
    count(distinct ddt.id) filter (where ddt.signed_at is not null),
    coalesce(sum(i.quantity), 0),
    coalesce(sum(i.quantity * p.price), 0),
    (select count(*) from public.orders o
      where o.market_id in (select market_id from raggruppato r3 where r3.chiave = g.chiave)
        and o.created_at::date between v_dal and v_al
        and o.status <> 'annullato'),
    (select count(*) from public.products pr
      where pr.company_id in (
        select c.id from public.companies c
         where exists (select 1 from unnest(c.market_ids) mid
                        where mid::uuid in (select market_id from raggruppato r4
                                             where r4.chiave = g.chiave))))
  from raggruppato g
  left join ddt on ddt.market_id = g.market_id
  left join public.delivery_note_items i on i.delivery_note_id = ddt.id
  left join public.products p on p.id = i.product_id
  where g.chiave is not null
  group by g.chiave
  order by 3 desc, 2;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Registro DDT nazionale
-- ---------------------------------------------------------------------------
create or replace function public.ddt_nazionali(
  p_dal     date default null,
  p_al      date default null,
  p_regione text default null,
  p_stato   text default null,
  p_limite  integer default 100
)
returns table (
  id              uuid,
  numero_completo text,
  data_documento  date,
  mittente        text,
  destinatario    text,
  stato           text,
  causale         text,
  firmato         boolean,
  mercato         text,
  comune          text,
  provincia       text,
  regione         text,
  quantita        numeric,
  valore          numeric
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.puo_leggere_rete() then
    raise exception 'Accesso riservato all''amministrazione' using errcode = '42501';
  end if;

  return query
  select
    d.id,
    case when d.progressive_number is null then null
         else d.progressive_number || '/' || d.progressive_year end,
    d.issue_date,
    c.name,
    d.recipient_name,
    d.status,
    d.causale,
    d.signed_at is not null,
    t.mercato, t.comune, t.provincia, t.regione,
    coalesce((select sum(i.quantity) from public.delivery_note_items i
               where i.delivery_note_id = d.id), 0),
    coalesce((select sum(i.quantity * p.price) from public.delivery_note_items i
               join public.products p on p.id = i.product_id
              where i.delivery_note_id = d.id), 0)
  from public.delivery_notes d
  join public.companies c on c.id = d.company_id
  join public.v_markets_territorio t on t.id = d.market_id
  where (p_dal is null or d.issue_date >= p_dal)
    and (p_al  is null or d.issue_date <= p_al)
    and (p_regione is null or t.regione_istat = p_regione)
    and (p_stato   is null or d.status = p_stato)
  order by d.issue_date desc, d.progressive_number desc nulls last
  limit greatest(1, least(coalesce(p_limite, 100), 1000));
end $$;

-- ---------------------------------------------------------------------------
-- 4. Serie storica mensile
--
-- Le tre grandezze economiche restano SEPARATE di proposito: gli ordini sono
-- ricavo del produttore, la merce e' volume transitato, gli affitti sono
-- ricavo del mercato. Sommarle produrrebbe un numero che non significa nulla.
--
-- La serie e' continua: i mesi senza dati tornano a zero, non mancano.
-- Un buco in mezzo a una serie storica falsa qualunque modello previsionale.
-- ---------------------------------------------------------------------------
create or replace function public.serie_storica_fatturato(
  p_livello text default 'italia',
  p_ambito  text default null,
  p_mesi    integer default 24
)
returns table (
  mese                date,
  ordini_numero       bigint,
  ordini_valore       numeric,
  ddt_numero          bigint,
  merce_valore        numeric,
  merce_quantita      numeric,
  affitti_valore      numeric,
  aziende_attive      bigint,
  clienti_attivi      bigint,
  righe_con_prezzo    bigint,
  righe_totali        bigint
)
language plpgsql stable security definer set search_path = public as $$
declare v_mesi integer := greatest(1, least(coalesce(p_mesi, 24), 60));
begin
  if not public.puo_leggere_rete() then
    raise exception 'Accesso riservato all''amministrazione' using errcode = '42501';
  end if;

  return query
  with mercati as (
    select public.mercati_in_ambito(p_livello, p_ambito) as id
  ),
  mesi as (
    select generate_series(
      date_trunc('month', current_date) - ((v_mesi - 1) || ' months')::interval,
      date_trunc('month', current_date),
      '1 month'::interval
    )::date as mese
  ),
  ord as (
    select date_trunc('month', o.created_at)::date as mese,
           count(*) as numero, coalesce(sum(o.total_amount), 0) as valore,
           count(distinct o.user_id) as clienti
      from public.orders o
     where o.market_id in (select id from mercati)
       and o.status <> 'annullato'
     group by 1
  ),
  ddt as (
    select date_trunc('month', d.issue_date)::date as mese,
           count(distinct d.id) as numero,
           count(distinct d.company_id) as aziende,
           coalesce(sum(i.quantity), 0) as quantita,
           coalesce(sum(i.quantity * p.price), 0) as valore,
           count(i.id) filter (where p.price is not null) as con_prezzo,
           count(i.id) as totali
      from public.delivery_notes d
      left join public.delivery_note_items i on i.delivery_note_id = d.id
      left join public.products p on p.id = i.product_id
     where d.market_id in (select id from mercati)
       and d.status = 'issued'
     group by 1
  ),
  aff as (
    select make_date(rp.period_year, rp.period_month, 1) as mese,
           coalesce(sum(rp.amount), 0) as valore
      from public.rental_payments rp
     where rp.market_id in (select id from mercati)
       and rp.status = 'paid'
     group by 1
  )
  select
    m.mese,
    coalesce(ord.numero, 0), coalesce(ord.valore, 0),
    coalesce(ddt.numero, 0), coalesce(ddt.valore, 0), coalesce(ddt.quantita, 0),
    coalesce(aff.valore, 0),
    coalesce(ddt.aziende, 0), coalesce(ord.clienti, 0),
    coalesce(ddt.con_prezzo, 0), coalesce(ddt.totali, 0)
  from mesi m
  left join ord on ord.mese = m.mese
  left join ddt on ddt.mese = m.mese
  left join aff on aff.mese = m.mese
  order by m.mese;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Metriche operative
--
-- Non misurano il fatturato ma la salute della rete: quante aziende sono
-- registrate e non fanno nulla, quanti clienti tornano, quanto ci mette un
-- DDT a essere firmato. Sono i numeri che dicono dove intervenire.
-- ---------------------------------------------------------------------------
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
  ddt_firma_media_gg    numeric,
  ddt_non_firmati       bigint,
  recensione_media      numeric,
  bisogni_aperti        bigint,
  affitti_non_saldati   bigint
)
language plpgsql stable security definer set search_path = public as $$
declare v_dal date := coalesce(p_dal, (current_date - interval '90 days')::date);
        v_al  date := coalesce(p_al, current_date);
begin
  if not public.puo_leggere_rete() then
    raise exception 'Accesso riservato all''amministrazione' using errcode = '42501';
  end if;

  return query
  with mercati as (select public.mercati_in_ambito(p_livello, p_ambito) as id),
  aziende as (select public.aziende_in_ambito(p_livello, p_ambito) as id),
  ddt as (
    select d.* from public.delivery_notes d
     where d.market_id in (select id from mercati)
       and d.issue_date between v_dal and v_al
  ),
  ord as (
    select o.* from public.orders o
     where o.market_id in (select id from mercati)
       and o.created_at::date between v_dal and v_al
       and o.status <> 'annullato'
  )
  select
    (select count(*) from aziende),
    (select count(distinct company_id) from ddt where status = 'issued'),
    (select count(distinct p.company_id) from public.products p
      where p.company_id in (select id from aziende)),
    (select count(*) from aziende a
      where not exists (select 1 from ddt where ddt.company_id = a.id)
        and not exists (select 1 from public.products p where p.company_id = a.id)),
    (select count(*) from public.products p where p.company_id in (select id from aziende)),
    (select count(*) from public.products p where p.company_id in (select id from aziende) and p.available),
    (select count(distinct user_id) from ord),
    (select count(*) from (select user_id from ord group by user_id having count(*) > 1) x),
    (select count(*) from ord),
    (select round(avg(total_amount), 2) from ord),
    (select round(avg(extract(epoch from (signed_at - issued_at)) / 86400)::numeric, 1)
       from ddt where signed_at is not null and issued_at is not null),
    (select count(*) from ddt where status = 'issued' and signature_required and signed_at is null),
    (select round(avg(r.rating), 2) from public.reviews r
      where r.company_id in (select id from aziende)),
    (select count(*) from public.producer_needs n
      where n.market_id in (select id from mercati)
        and n.status in ('open','in_progress')),
    (select count(*) from public.rental_payments rp
      where rp.market_id in (select id from mercati)
        and rp.status in ('pending','overdue'));
end $$;

-- ---------------------------------------------------------------------------
-- 6. Composizione del valore
--
-- Tre classifiche distinte, non una sola: il totale di un mercato e quello
-- di una categoria non sono grandezze confrontabili e non vanno messe sulla
-- stessa scala. Il frontend le disegna separate per questo motivo.
-- ---------------------------------------------------------------------------
create or replace function public.composizione_fatturato(
  p_livello text default 'italia',
  p_ambito  text default null,
  p_dal     date default null,
  p_al      date default null,
  p_limite  integer default 8
)
returns table (
  tipo      text,
  etichetta text,
  valore    numeric,
  quantita  numeric,
  numero    bigint
)
language plpgsql stable security definer set search_path = public as $$
declare v_dal date := coalesce(p_dal, (current_date - interval '90 days')::date);
        v_al  date := coalesce(p_al, current_date);
        v_lim integer := greatest(1, least(coalesce(p_limite, 8), 50));
begin
  if not public.puo_leggere_rete() then
    raise exception 'Accesso riservato all''amministrazione' using errcode = '42501';
  end if;

  return query
  with mercati as (select public.mercati_in_ambito(p_livello, p_ambito) as id),
  righe as (
    select d.id as ddt_id, d.market_id, d.company_id,
           i.quantity, p.price, p.category
      from public.delivery_notes d
      join public.delivery_note_items i on i.delivery_note_id = d.id
      left join public.products p on p.id = i.product_id
     where d.market_id in (select id from mercati)
       and d.status = 'issued'
       and d.issue_date between v_dal and v_al
  )
  (select 'categoria'::text, coalesce(r.category, 'non classificato'),
          coalesce(sum(r.quantity * r.price), 0), coalesce(sum(r.quantity), 0), count(distinct r.ddt_id)
     from righe r group by 2 order by 3 desc limit v_lim)
  union all
  (select 'azienda'::text, c.name,
          coalesce(sum(r.quantity * r.price), 0), coalesce(sum(r.quantity), 0), count(distinct r.ddt_id)
     from righe r join public.companies c on c.id = r.company_id
    group by 2 order by 3 desc limit v_lim)
  union all
  (select 'mercato'::text, t.mercato,
          coalesce(sum(r.quantity * r.price), 0), coalesce(sum(r.quantity), 0), count(distinct r.ddt_id)
     from righe r join public.v_markets_territorio t on t.id = r.market_id
    group by 2 order by 3 desc limit v_lim);
end $$;

-- ---------------------------------------------------------------------------
-- Permessi: niente di tutto questo e' raggiungibile senza autenticazione.
-- Il controllo di ruolo e' comunque dentro ogni funzione: revocare qui e'
-- la seconda serratura, non l'unica.
-- ---------------------------------------------------------------------------
revoke all on function public.puo_leggere_rete() from public, anon;
grant execute on function public.puo_leggere_rete() to authenticated;
revoke all on function public.mercati_in_ambito(text,text) from public, anon;
grant execute on function public.mercati_in_ambito(text,text) to authenticated;
revoke all on function public.aziende_in_ambito(text,text) from public, anon;
grant execute on function public.aziende_in_ambito(text,text) to authenticated;
revoke all on function public.riepilogo_nazionale(date,date) from public, anon;
grant execute on function public.riepilogo_nazionale(date,date) to authenticated;
revoke all on function public.metriche_territorio(text,text,date,date) from public, anon;
grant execute on function public.metriche_territorio(text,text,date,date) to authenticated;
revoke all on function public.ddt_nazionali(date,date,text,text,integer) from public, anon;
grant execute on function public.ddt_nazionali(date,date,text,text,integer) to authenticated;
revoke all on function public.serie_storica_fatturato(text,text,integer) from public, anon;
grant execute on function public.serie_storica_fatturato(text,text,integer) to authenticated;
revoke all on function public.metriche_operative(text,text,date,date) from public, anon;
grant execute on function public.metriche_operative(text,text,date,date) to authenticated;
revoke all on function public.composizione_fatturato(text,text,date,date,integer) from public, anon;
grant execute on function public.composizione_fatturato(text,text,date,date,integer) to authenticated;
