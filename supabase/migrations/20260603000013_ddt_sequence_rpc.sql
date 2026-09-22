-- Migration: RPC helper per increment atomico del contatore DDT
-- Usato da Edge Function issueDdt via supabase.rpc('increment_ddt_sequence', ...)
-- Il FOR UPDATE serializza richieste concorrenti per lo stesso (company_id, year).

create or replace function public.increment_ddt_sequence(p_company_id uuid, p_year int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_number int;
begin
  -- Acquisisce row-lock per questo (company_id, year): le richieste concorrenti aspettano qui
  update public.ddt_sequences
     set last_number = last_number + 1
   where company_id = p_company_id
     and year       = p_year;

  -- Legge il valore appena incrementato
  select last_number
    into v_new_number
    from public.ddt_sequences
   where company_id = p_company_id
     and year       = p_year;

  return v_new_number;
end;
$$;

comment on function public.increment_ddt_sequence(uuid, int) is
  'Incrementa atomicamente il contatore DDT per (company_id, year) usando row-level lock. Usato da Edge Function issueDdt per assegnare progressive_number senza race condition.';
