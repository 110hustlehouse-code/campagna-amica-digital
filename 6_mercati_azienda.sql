-- =====================================================================
-- SESTO FILE — associazione azienda / mercati
--
-- PROBLEMA
-- Quando un produttore salva il profilo indicando in quali mercati e'
-- presente, il codice aggiornava direttamente markets.company_ids. Le
-- policy lo vietano, ed e' corretto: un produttore non deve poter
-- modificare i dati di un mercato.
--
-- SOLUZIONE
-- Una funzione SECURITY DEFINER che aggiorna l'appartenenza in modo
-- controllato: verifica che chi chiama possieda davvero l'azienda, poi
-- sincronizza le DUE rappresentazioni della stessa relazione
-- (companies.market_ids e markets.company_ids) in una sola transazione.
--
-- Questo mette un argine al debito tecnico della relazione duplicata:
-- resta duplicata, ma esiste un unico punto che la tiene coerente.
-- La normalizzazione vera si fara' dopo il pilot.
-- =====================================================================

create or replace function public.sincronizza_mercati_azienda(
  p_company_id uuid,
  p_market_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := auth.jwt() ->> 'email';
begin
  -- Solo il proprietario dell'azienda, o un amministratore.
  if not exists (
    select 1 from public.companies
     where id = p_company_id
       and (lower(created_by) = lower(v_email) or public.is_admin())
  ) then
    raise exception 'Non autorizzato a modificare i mercati di questa azienda';
  end if;

  -- I mercati indicati devono esistere ed essere attivi.
  if exists (
    select 1 from unnest(p_market_ids) as m(id)
     where not exists (select 1 from public.markets k where k.id = m.id and k.attivo)
  ) then
    raise exception 'Uno dei mercati indicati non esiste o non e'' attivo';
  end if;

  -- Lato azienda.
  update public.companies
     set market_ids = (select coalesce(array_agg(id::text), '{}') from unnest(p_market_ids) as t(id))
   where id = p_company_id;

  -- Lato mercati: rimozione dove non e' piu' presente.
  update public.markets
     set company_ids = array_remove(company_ids, p_company_id::text)
   where company_ids @> array[p_company_id::text]
     and not (id = any(p_market_ids));

  -- Lato mercati: aggiunta dove manca.
  update public.markets
     set company_ids = array_append(coalesce(company_ids, '{}'), p_company_id::text)
   where id = any(p_market_ids)
     and not (company_ids @> array[p_company_id::text]);
end $$;

comment on function public.sincronizza_mercati_azienda is
  'Unico punto autorizzato a modificare l''appartenenza di un''azienda ai mercati.';

select 'funzione sincronizza_mercati_azienda creata' as esito;
