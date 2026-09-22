-- ---------------------------------------------------------------------------
-- Controlli di fumo sull'area amministrazione.
--
-- Verifica due cose opposte, e servono entrambe:
--   1. con un admin, le sei funzioni rispondono
--   2. senza, rifiutano
--
-- Un test che provasse solo la prima passerebbe anche con il controllo di
-- ruolo rimosso per sbaglio — cioe' proprio nel caso che deve intercettare.
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"role":"service_role"}', false);

insert into auth.users (id, email)
values ('00000000-0000-0000-0000-0000000000a1', 'ci-admin@prova.local')
on conflict (id) do nothing;

insert into public.users (id, email, role, role_confirmed)
values ('00000000-0000-0000-0000-0000000000a1', 'ci-admin@prova.local', 'admin', true)
on conflict (id) do update set role = 'admin', role_confirmed = true;

-- 1. Da amministratore: rispondono tutte.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', false);

select 'riepilogo_nazionale'     as funzione, count(*) as righe from riepilogo_nazionale(null,null)
union all select 'metriche_territorio',     count(*) from metriche_territorio('italia',null,null,null)
union all select 'ddt_nazionali',           count(*) from ddt_nazionali(null,null,null,null,10)
union all select 'serie_storica_fatturato', count(*) from serie_storica_fatturato('italia',null,12)
union all select 'metriche_operative',      count(*) from metriche_operative('italia',null,null,null)
union all select 'composizione_fatturato',  count(*) from composizione_fatturato('italia',null,null,null,8);

-- 2. Senza identita': deve rifiutare. Se non solleva, il test fallisce.
select set_config('request.jwt.claims', '{}', false);

do $verifica$
begin
  begin
    perform * from public.riepilogo_nazionale(null, null);
    raise exception 'FALLITO: riepilogo_nazionale ha risposto a un chiamante senza ruolo';
  exception
    when insufficient_privilege then
      raise notice 'OK: l''accesso senza ruolo viene rifiutato';
  end;
end
$verifica$;
