-- ============================================================
-- FASE 4 DDT — sanzioni (stall_sanctions)
-- ============================================================

create table if not exists public.stall_sanctions (
  id              uuid        primary key default gen_random_uuid(),
  company_id      uuid        not null references public.companies(id) on delete cascade,
  market_id       uuid        not null references public.markets(id) on delete cascade,
  report_id       uuid        references public.missing_ddt_reports(id) on delete set null,
  type            text        not null check (type in ('warning', 'stall_block')),
  reason          text        not null,
  blocked_from    date,
  blocked_until   date,
  lifted_at       timestamptz,
  lifted_by       uuid        references public.users(id),
  lift_reason     text,
  issued_by       uuid        not null references public.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint stall_sanctions_block_requires_dates
    check (type != 'stall_block' or (blocked_from is not null and blocked_until is not null))
);
comment on table public.stall_sanctions is
  'Ammonizioni e blocchi banco emessi dall''amministrazione. Un blocco ha sempre una data di fine, impostata da chi lo emette.';

create index if not exists idx_stall_sanctions_company on public.stall_sanctions(company_id);
create index if not exists idx_stall_sanctions_market on public.stall_sanctions(market_id);

create trigger stall_sanctions_updated_at
  before update on public.stall_sanctions
  for each row execute function update_updated_at_column();

alter table public.stall_sanctions enable row level security;

-- Il produttore vede le proprie sanzioni (trasparenza, deciso con Carlo).
create policy "stall_sanctions: owner or staff or admin read"
  on public.stall_sanctions for select
  using (owns_company(company_id) or is_staff_for_market(market_id) or is_admin());

create policy "stall_sanctions: admin insert"
  on public.stall_sanctions for insert
  with check (is_admin());

create policy "stall_sanctions: admin update"
  on public.stall_sanctions for update
  using (is_admin())
  with check (is_admin());

-- ------------------------------------------------------------
-- Aggiorna stato_disponibilita_azienda: ora un blocco attivo
-- vince su tutto, come previsto dal disegno originale.
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
  -- Un blocco attivo vince sempre, a prescindere dal giorno di mercato.
  if exists (
    select 1 from public.stall_sanctions s
    where s.company_id = p_company_id
      and s.market_id = p_market_id
      and s.type = 'stall_block'
      and s.lifted_at is null
      and p_data >= s.blocked_from and p_data <= s.blocked_until
  ) then
    return 'bloccato';
  end if;

  if not public.is_market_open_on(p_market_id, p_data) then
    return 'nessun_mercato';
  end if;

  if p_data = v_oggi then
    v_orario_apertura := public.orario_apertura_mercato(p_market_id, p_data);
    if v_orario_apertura is not null and v_ora_attuale < v_orario_apertura then
      return 'non_ancora_aperto';
    end if;
  elsif p_data > v_oggi then
    return 'nessun_mercato';
  end if;

  if exists (
    select 1 from public.delivery_notes dn
    where dn.company_id = p_company_id and dn.market_id = p_market_id
      and dn.transport_date = p_data and dn.status = 'issued'
  ) then
    return 'disponibile';
  end if;

  if exists (
    select 1 from public.absences a
    where a.company_id = p_company_id and a.market_id = p_market_id and a.absence_date = p_data
  ) then
    return 'assente';
  end if;

  return 'in_attesa_ddt';
end;
$$;

-- ------------------------------------------------------------
-- Data di fine blocco per un'azienda, se bloccata ora — usata dal
-- cliente per sapere quando tornerà disponibile (Fase 5).
-- ------------------------------------------------------------
create or replace function public.blocco_attivo_fino_a(p_company_id uuid, p_market_id uuid)
returns date
language sql stable security definer
set search_path = public
as $$
  select s.blocked_until from public.stall_sanctions s
  where s.company_id = p_company_id and s.market_id = p_market_id
    and s.type = 'stall_block' and s.lifted_at is null
    and current_date >= s.blocked_from and current_date <= s.blocked_until
  order by s.blocked_until desc limit 1;
$$;