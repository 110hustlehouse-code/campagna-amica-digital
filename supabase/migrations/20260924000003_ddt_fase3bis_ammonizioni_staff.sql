-- ============================================================
-- Ammonizioni dirette dello staff + escalation automatica
-- dopo 3 ammonizioni attive sullo STESSO mercato.
-- ============================================================

alter table public.missing_ddt_reports drop constraint if exists missing_ddt_reports_staff_action_check;
alter table public.missing_ddt_reports add constraint missing_ddt_reports_staff_action_check
  check (staff_action in ('escalate', 'request_suspension', 'dismiss', 'warn'));

-- Lo staff può ammonire le aziende del proprio mercato. Il blocco banco
-- resta invece riservato all'amministrazione (nessuna policy insert
-- per lo staff su type='stall_block').
create policy "stall_sanctions: staff insert warning"
  on public.stall_sanctions for insert
  with check (type = 'warning' and is_staff_for_market(market_id));

-- Traccia le escalation automatiche, per azienda+mercato: quando lo
-- staff ammonisce e supera la soglia, qui compare la riga che
-- l'amministrazione vede e valuta.
create table if not exists public.company_market_escalations (
  id           uuid        primary key default gen_random_uuid(),
  company_id   uuid        not null references public.companies(id) on delete cascade,
  market_id    uuid        not null references public.markets(id) on delete cascade,
  reason       text        not null,
  status       text        not null default 'open' check (status in ('open', 'resolved')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);
comment on table public.company_market_escalations is
  'Escalation automatiche verso l''amministrazione, generate dopo 3 ammonizioni attive di un''azienda sullo stesso mercato.';

alter table public.company_market_escalations enable row level security;

create policy "company_market_escalations: staff or admin read"
  on public.company_market_escalations for select
  using (is_staff_for_market(market_id) or is_admin());

create policy "company_market_escalations: admin update"
  on public.company_market_escalations for update
  using (is_admin()) with check (is_admin());

-- Nessuna policy insert: la riga nasce solo dal trigger sotto, con
-- security definer — mai da un insert diretto di staff o admin.

create or replace function public.check_escalation_after_warning()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if new.type <> 'warning' then
    return new;
  end if;

  select count(*) into v_count
    from public.stall_sanctions
   where company_id = new.company_id
     and market_id = new.market_id
     and type = 'warning'
     and lifted_at is null;

  if v_count >= 3 then
    insert into public.company_market_escalations (company_id, market_id, reason)
    values (new.company_id, new.market_id,
            'Escalation automatica: ' || v_count || ' ammonizioni attive sullo stesso mercato');

    insert into public.notifications (user_id, user_email, title, message, type, read)
    select u.id, u.email,
           'Azienda con 3+ ammonizioni',
           (select name from public.companies where id = new.company_id) ||
             ' ha raggiunto ' || v_count || ' ammonizioni attive su questo mercato — richiede una valutazione.',
           'generic', false
      from public.users u where u.role = 'admin';
  end if;

  return new;
end;
$$;

create trigger stall_sanctions_check_escalation
  after insert on public.stall_sanctions
  for each row execute function public.check_escalation_after_warning();