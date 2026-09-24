-- ============================================================
-- FASE 2 DDT — orario ricorrente mercati + motore disponibilità
-- ============================================================

-- ------------------------------------------------------------
-- 1. Orario standard del mercato: impostato una volta dallo
--    staff, resta valido finché non lo cambiano. Non genera righe
--    in market_events — quelle restano solo per eventi speciali.
--    recurring_days: 1=lunedì ... 7=domenica (ISO 8601, coerente
--    con extract(isodow from data) di Postgres).
-- ------------------------------------------------------------
alter table public.markets
  add column if not exists recurring_days       smallint[] not null default '{}',
  add column if not exists recurring_time_start  time,
  add column if not exists recurring_time_end    time;

comment on column public.markets.recurring_days is
  'Giorni della settimana in cui il mercato è aperto: 1=lunedì...7=domenica (ISO 8601)';

alter table public.markets add constraint markets_recurring_days_valid
  check (recurring_days <@ array[1,2,3,4,5,6,7]::smallint[]);

-- ------------------------------------------------------------
-- 2. Un DDT per un giorno di mercato normale non ha un evento a
--    cui agganciarsi (gli eventi restano solo per quelli speciali).
--    La data resta comunque sempre obbligatoria su issue_date e
--    transport_date: non si perde nessuna informazione temporale.
-- ------------------------------------------------------------
alter table public.delivery_notes alter column market_event_id drop not null;

-- ------------------------------------------------------------
-- 3. Il mercato è aperto in quella data? O per orario ricorrente,
--    o perché c'è un evento speciale quel giorno.
-- ------------------------------------------------------------
create or replace function public.is_market_open_on(p_market_id uuid, p_data date)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.markets m
      where m.id = p_market_id
        and extract(isodow from p_data)::smallint = any(m.recurring_days)
    )
    or exists (
      select 1 from public.market_events me
      where me.market_id = p_market_id and me.event_date = p_data
    );
$$;

-- ------------------------------------------------------------
-- 4. Orario di apertura effettivo per quella data: quello
--    dell'evento speciale se c'è, altrimenti quello ricorrente
--    del mercato.
-- ------------------------------------------------------------
create or replace function public.orario_apertura_mercato(p_market_id uuid, p_data date)
returns time
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select me.time_start::time from public.market_events me
     where me.market_id = p_market_id and me.event_date = p_data and me.time_start is not null
     limit 1),
    (select m.recurring_time_start from public.markets m where m.id = p_market_id)
  );
$$;

-- ------------------------------------------------------------
-- 5. Stato di un'azienda in un mercato in una data.
--
-- Stati possibili:
--   'nessun_mercato'    — il mercato non è aperto quel giorno
--   'non_ancora_aperto' — è aperto oggi, ma l'orario non è ancora iniziato
--   'disponibile'       — DDT issued per quella data/mercato
--   'assente'           — assenza dichiarata per quella data
--   'in_attesa_ddt'     — mercato aperto, orario iniziato, niente DDT né assenza
--
-- Il blocco amministrativo (Fase 4, stall_sanctions) non esiste
-- ancora: la funzione verrà sostituita con create or replace quando
-- costruiamo quella fase, senza rompere chi la chiama oggi.
-- ------------------------------------------------------------
create or replace function public.stato_disponibilita_azienda(
  p_company_id uuid, p_market_id uuid, p_data date default current_date
)
returns text
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_orario_apertura time;
  v_ora_attuale     time := (now() at time zone 'Europe/Rome')::time;
  v_oggi            date := (now() at time zone 'Europe/Rome')::date;
begin
  if not public.is_market_open_on(p_market_id, p_data) then
    return 'nessun_mercato';
  end if;

  -- Il vincolo si applica solo quando la data è oggi: sui giorni
  -- futuri il mercato risulta semplicemente aperto, senza gate.
  if p_data = v_oggi then
    v_orario_apertura := public.orario_apertura_mercato(p_market_id, p_data);
    if v_orario_apertura is not null and v_ora_attuale < v_orario_apertura then
      return 'non_ancora_aperto';
    end if;
  elsif p_data > v_oggi then
    return 'nessun_mercato';  -- non aperto ancora, niente da valutare
  end if;

  if exists (
    select 1 from public.delivery_notes dn
    where dn.company_id = p_company_id
      and dn.market_id = p_market_id
      and dn.transport_date = p_data
      and dn.status = 'issued'
  ) then
    return 'disponibile';
  end if;

  if exists (
    select 1 from public.absences a
    where a.company_id = p_company_id
      and a.market_id = p_market_id
      and a.absence_date = p_data
  ) then
    return 'assente';
  end if;

  return 'in_attesa_ddt';
end;
$$;

comment on function public.stato_disponibilita_azienda(uuid, uuid, date) is
  'Stato di disponibilità di un''azienda in un mercato per una data. Verrà esteso in Fase 4 per includere i blocchi amministrativi (stall_sanctions).';