-- Evita escalation duplicate: crea una nuova riga solo se non ce n'è
-- già una aperta per la stessa azienda+mercato.
create or replace function public.check_escalation_after_warning()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_count int;
  v_esiste_aperta boolean;
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

  if v_count < 3 then
    return new;
  end if;

  select exists (
    select 1 from public.company_market_escalations
     where company_id = new.company_id and market_id = new.market_id and status = 'open'
  ) into v_esiste_aperta;

  if v_esiste_aperta then
    return new; -- già segnalata, non duplicare
  end if;

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

  return new;
end;
$$;