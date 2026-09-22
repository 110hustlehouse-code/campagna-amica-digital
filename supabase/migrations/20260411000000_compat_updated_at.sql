-- ---------------------------------------------------------------------------
-- RIPARAZIONE — funzioni trigger mancanti
--
-- Tre migration successive chiamano set_updated_at() e
-- update_updated_at_column(), che non sono definite da nessuna parte nel
-- repository: la funzione canonica e' public.handle_updated_at(), creata da
-- 20260412000002_triggers.sql.
--
-- Su un database gia' vivo l'errore non si vede, perche' quelle funzioni
-- furono con ogni probabilita' create a mano nell'editor SQL. Su un ambiente
-- nuovo — demo, prod, o una pipeline CI — la catena si ferma.
--
-- Timestamp anteriore a tutte le altre: queste funzioni devono esistere
-- prima di chi le usa. Sono autonome, non delegano, cosi' l'ordine di
-- creazione non conta.
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

comment on function public.set_updated_at() is
  'Alias storico di handle_updated_at(), referenziato da migration gia in catena.';
comment on function public.update_updated_at_column() is
  'Alias storico di handle_updated_at(), referenziato dallo schema DDT.';
