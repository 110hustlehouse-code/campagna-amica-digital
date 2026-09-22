-- ============================================================
-- Fix bug-011: prevent_self_role_change blocca anche service-role
--
-- Migration 006 (C1) introdusse un trigger BEFORE UPDATE su
-- public.users che blocca le modifiche a `role` e `role_confirmed`
-- a meno che il chiamante non sia admin (is_admin() = true).
--
-- Problema: l'Edge Function `verify-access-code` usa il service-role
-- key per fare l'UPDATE (perché l'utente non è admin: vuole solo
-- impostare il proprio ruolo dopo aver inserito il codice corretto).
-- Quando si usa il service-role, auth.uid() restituisce NULL ->
-- is_admin() ritorna false -> trigger blocca con
-- "role change not allowed".
--
-- Fix: il trigger ora controlla esplicitamente auth.role() = 'service_role'
-- come prima cosa: se è una chiamata server-to-server con service-role
-- key, bypassa la verifica. Tutti gli altri casi (utente normale, anon)
-- restano governati dal check is_admin() esistente.
--
-- Security: nessuna regressione. Le chiamate service_role sono
-- comunque server-side, fatte da Edge Functions trusted (verify-access-code,
-- futuri job amministrativi). Il frontend usa solo la anon key,
-- per cui non può mai assumere il ruolo service_role.
-- ============================================================

create or replace function public.prevent_self_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Bypass: chiamate server-to-server con service-role key (Edge Functions trusted)
  if auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.role is distinct from old.role and not public.is_admin() then
      raise exception 'role change not allowed';
    end if;
    if new.role_confirmed is distinct from old.role_confirmed and not public.is_admin() then
      raise exception 'role_confirmed change not allowed';
    end if;
  end if;
  return new;
end $$;

-- Il trigger esistente referenzia gia questa funzione (CREATE OR REPLACE
-- mantiene la definizione del trigger). Nessun DROP/CREATE necessario.

comment on function public.prevent_self_role_change() is
  'Blocca modifiche a role/role_confirmed da utenti non-admin. Bypass per service_role (vedi migration 010).';
