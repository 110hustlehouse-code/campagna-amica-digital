-- La gerarchia amministrativa salta il livello "provincia": Italia -> Regione
-- -> Comune -> Quartiere -> Mercato. Per una regione (es. Roma capitale =
-- comune E provincia con lo stesso nome) il vecchio raggruppamento per
-- provincia produceva un breadcrumb con lo stesso nome due volte di fila
-- ("Roma" poi di nuovo "Roma"). Si raggruppa direttamente per comune.
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
        when 'regione'   then a.comune_istat
        when 'comune'    then a.quartiere
        else a.id::text
      end as chiave,
      case p_livello
        when 'italia'    then a.regione
        when 'regione'   then a.comune
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
