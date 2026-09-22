-- =====================================================================
-- OTTAVO FILE — area amministrazione
--
-- Una funzione unica che restituisce le metriche aggregate al livello
-- territoriale richiesto. La stessa funzione serve tutti i livelli:
-- Italia, regione, provincia, comune, quartiere, mercato.
--
-- Perche' una funzione e non query nel frontend: l'aggregazione tocca
-- sei tabelle e va fatta dove stanno i dati. Mandare tutto al browser
-- per sommarlo li' significherebbe scaricare l'intero archivio DDT
-- nazionale a ogni apertura della pagina.
-- =====================================================================

create or replace function public.metriche_territorio(
  p_livello text,                      -- 'italia'|'regione'|'provincia'|'comune'|'quartiere'
  p_ambito  text default null,         -- il territorio padre da esplodere
  p_dal     date default null,
  p_al      date default null
)
returns table (
  chiave           text,   -- identificativo per il livello successivo
  nome             text,
  mercati          bigint,
  aziende          bigint,
  ddt_emessi       bigint,
  ddt_consegnati   bigint,
  quantita_totale  numeric,
  valore_merce     numeric,
  ordini           bigint,
  prodotti         bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with periodo as (
    select coalesce(p_dal, date_trunc('month', current_date)::date) as dal,
           coalesce(p_al, current_date) as al
  ),
  -- Mercati filtrati per l'ambito richiesto, con il territorio risolto.
  base as (
    select t.*,
           case p_livello
             when 'italia'    then t.regione_istat
             when 'regione'   then t.provincia_sigla
             when 'provincia' then t.comune_istat
             when 'comune'    then coalesce(t.quartiere, '—')
             else t.id::text
           end as chiave,
           case p_livello
             when 'italia'    then t.regione
             when 'regione'   then t.provincia
             when 'provincia' then t.comune
             when 'comune'    then coalesce(t.quartiere, 'Senza quartiere')
             else t.name
           end as etichetta
      from public.v_markets_territorio t
     where t.attivo
       and (p_ambito is null or
            case p_livello
              when 'regione'   then t.regione_istat  = p_ambito
              when 'provincia' then t.provincia_sigla = p_ambito
              when 'comune'    then t.comune_istat   = p_ambito
              when 'quartiere' then coalesce(t.quartiere, '—') = p_ambito
              else true
            end)
  ),
  ddt_agg as (
    select d.market_id,
           count(*) filter (where d.stato in ('emesso','consegnato'))  as emessi,
           count(*) filter (where d.stato = 'consegnato')              as consegnati,
           coalesce(sum(t.quantita_totale), 0)                         as quantita,
           coalesce(sum(t.importo_totale), 0)                          as valore
      from public.ddt d
      join periodo p on d.data_documento between p.dal and p.al
      left join public.v_ddt_totali t on t.ddt_id = d.id
     where d.stato <> 'annullato'
     group by d.market_id
  ),
  ordini_agg as (
    select o.market_id, count(*) as n
      from public.orders o, periodo p
     where o.created_date::date between p.dal and p.al
       and o.status <> 'annullato'
     group by o.market_id
  ),
  aziende_agg as (
    select m.id as market_id,
           count(distinct c.id) as n_aziende,
           count(distinct pr.id) as n_prodotti
      from base m
      left join public.companies c
             on c.market_ids @> array[m.id::text] and c.is_registered
      left join public.products pr on pr.company_id = c.id
     group by m.id
  )
  select b.chiave,
         b.etichetta,
         count(distinct b.id)                        as mercati,
         coalesce(sum(a.n_aziende), 0)::bigint       as aziende,
         coalesce(sum(d.emessi), 0)::bigint          as ddt_emessi,
         coalesce(sum(d.consegnati), 0)::bigint      as ddt_consegnati,
         coalesce(sum(d.quantita), 0)                as quantita_totale,
         coalesce(sum(d.valore), 0)                  as valore_merce,
         coalesce(sum(o.n), 0)::bigint               as ordini,
         coalesce(sum(a.n_prodotti), 0)::bigint      as prodotti
    from base b
    left join ddt_agg    d on d.market_id = b.id
    left join ordini_agg o on o.market_id = b.id
    left join aziende_agg a on a.market_id = b.id
   group by b.chiave, b.etichetta
   order by ddt_emessi desc, mercati desc, b.etichetta;
$$;

comment on function public.metriche_territorio is
  'Metriche aggregate per livello territoriale. Usata dall''area amministrazione.';

-- ---------------------------------------------------------------------
-- Riepilogo nazionale in una riga: l'intestazione della dashboard.
-- ---------------------------------------------------------------------
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
language sql
stable
security definer
set search_path = public
as $$
  with periodo as (
    select coalesce(p_dal, date_trunc('month', current_date)::date) as dal,
           coalesce(p_al, current_date) as al
  )
  select
    (select count(*) from public.markets where attivo),
    (select count(*) from public.companies where is_registered),
    (select count(*) from public.profiles where role = 'producer'),
    (select count(*) from public.profiles where role = 'client'),
    (select count(*) from public.ddt d, periodo p
      where d.stato in ('emesso','consegnato') and d.data_documento between p.dal and p.al),
    (select count(*) from public.ddt d, periodo p
      where d.stato = 'consegnato' and d.data_documento between p.dal and p.al),
    (select count(*) from public.ddt d, periodo p
      where d.stato = 'annullato' and d.data_documento between p.dal and p.al),
    (select coalesce(sum(t.quantita_totale), 0) from public.ddt d
       join public.v_ddt_totali t on t.ddt_id = d.id, periodo p
      where d.stato <> 'annullato' and d.data_documento between p.dal and p.al),
    (select coalesce(sum(t.importo_totale), 0) from public.ddt d
       join public.v_ddt_totali t on t.ddt_id = d.id, periodo p
      where d.stato <> 'annullato' and d.data_documento between p.dal and p.al),
    (select count(*) from public.orders o, periodo p
      where o.status <> 'annullato' and o.created_date::date between p.dal and p.al),
    (select count(distinct t.regione) from public.v_markets_territorio t
      where t.attivo and t.regione is not null);
$$;

-- ---------------------------------------------------------------------
-- Elenco DDT a livello nazionale, con il territorio risolto.
-- ---------------------------------------------------------------------
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
  mercato         text,
  comune          text,
  provincia       text,
  regione         text,
  quantita        numeric,
  valore          numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select d.id, d.numero_completo, d.data_documento,
         d.mittente_ragione_sociale, d.destinatario_denominazione,
         d.stato, d.causale,
         t.name, t.comune, t.provincia, t.regione,
         coalesce(v.quantita_totale, 0), coalesce(v.importo_totale, 0)
    from public.ddt d
    left join public.v_markets_territorio t on t.id = d.market_id
    left join public.v_ddt_totali v on v.ddt_id = d.id
   where d.stato <> 'bozza'
     and (p_dal is null or d.data_documento >= p_dal)
     and (p_al  is null or d.data_documento <= p_al)
     and (p_regione is null or t.regione = p_regione)
     and (p_stato is null or d.stato = p_stato)
   order by d.data_documento desc, d.numero desc
   limit greatest(1, least(p_limite, 500));
$$;

-- Solo gli amministratori possono eseguirle.
revoke execute on function public.metriche_territorio(text, text, date, date) from public, anon;
revoke execute on function public.riepilogo_nazionale(date, date) from public, anon;
revoke execute on function public.ddt_nazionali(date, date, text, text, integer) from public, anon;
grant execute on function public.metriche_territorio(text, text, date, date) to authenticated;
grant execute on function public.riepilogo_nazionale(date, date) to authenticated;
grant execute on function public.ddt_nazionali(date, date, text, text, integer) to authenticated;

select 'funzioni amministrazione create' as esito;
