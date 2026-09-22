-- ---------------------------------------------------------------------------
-- Colonne di profilo su users
--
-- public.users porta solo id, email, role e role_confirmed: abbastanza per
-- l'autorizzazione, non per l'interfaccia. Il frontend mostra il nome in 33
-- punti e il telefono in 18 — dalla scheda azienda al dettaglio ordine, dove
-- lo staff deve poter chiamare chi ha prenotato.
--
-- Senza queste colonne quei campi non hanno dove stare, e l'alternativa
-- sarebbe una tabella profili a parte: un join in piu' su ogni schermata
-- per tre campi di testo.
-- ---------------------------------------------------------------------------

alter table public.users
  add column if not exists full_name  text,
  add column if not exists phone      text,
  add column if not exists avatar_url text;

comment on column public.users.full_name is
  'Nome mostrato nell interfaccia. Non e usato per autorizzazione.';

-- Il trigger di creazione utente copia il nome dai metadati di registrazione,
-- se c e. Chi si iscrive con Google ce l ha; chi usa email e password no, e
-- lo compila dal profilo.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name',
                         new.raw_user_meta_data ->> 'name', '')), '')
  )
  on conflict (id) do update
    set email     = excluded.email,
        full_name = coalesce(public.users.full_name, excluded.full_name);
  return new;
end $$;

-- L utente puo aggiornare il proprio profilo, ma non il proprio ruolo:
-- quello resta governato dal trigger prevent_self_role_change.
drop policy if exists users_update_self_profile on public.users;
create policy users_update_self_profile on public.users for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
