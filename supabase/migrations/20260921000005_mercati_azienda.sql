-- ---------------------------------------------------------------------------
-- Sincronizzazione dei mercati di un'azienda
--
-- L'operazione tocca due tabelle: companies.market_ids e markets.company_ids,
-- due array denormalizzati che devono restare in accordo. Un produttore puo'
-- scrivere sulla propria azienda ma non su markets, quindi dal frontend
-- l'aggiornamento riuscirebbe a meta' — e le due liste divergerebbero in
-- silenzio, che e' il modo peggiore di rompersi.
--
-- Qui l'operazione e' una sola transazione, con la proprieta' verificata
-- dentro la funzione. E' l'unico modo autorizzato di cambiare quella
-- relazione: il frontend non scrive mai direttamente su quegli array.
-- ---------------------------------------------------------------------------

create or replace function public.sincronizza_mercati_azienda(
  p_company_id uuid,
  p_market_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo il proprietario dell'azienda, o un amministratore.
  if not exists (
    select 1 from public.companies
     where id = p_company_id
       and (owner_id = auth.uid() or public.is_admin())
  ) then
    raise exception 'Non autorizzato a modificare i mercati di questa azienda'
      using errcode = '42501';
  end if;

  -- I mercati indicati devono esistere ed essere attivi. Meglio un errore
  -- esplicito che un riferimento a un mercato chiuso scoperto mesi dopo.
  if exists (
    select 1 from unnest(coalesce(p_market_ids, '{}')) as m(id)
     where not exists (select 1 from public.markets k where k.id = m.id and k.attivo)
  ) then
    raise exception 'Uno dei mercati indicati non esiste o non e'' attivo'
      using errcode = '23503';
  end if;

  update public.companies
     set market_ids = (
           select coalesce(array_agg(id::text), '{}')
             from unnest(coalesce(p_market_ids, '{}')) as t(id))
   where id = p_company_id;

  -- Lato mercati: prima si toglie dove non e' piu' presente...
  update public.markets
     set company_ids = array_remove(company_ids, p_company_id::text)
   where company_ids @> array[p_company_id::text]
     and not (id = any(coalesce(p_market_ids, '{}')));

  -- ...poi si aggiunge dove manca, senza duplicare.
  update public.markets
     set company_ids = company_ids || p_company_id::text
   where id = any(coalesce(p_market_ids, '{}'))
     and not (company_ids @> array[p_company_id::text]);
end $$;

revoke all on function public.sincronizza_mercati_azienda(uuid, uuid[]) from public, anon;
grant execute on function public.sincronizza_mercati_azienda(uuid, uuid[]) to authenticated;
