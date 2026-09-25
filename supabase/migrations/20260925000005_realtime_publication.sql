-- ============================================================
-- Abilita il realtime (supabase_realtime) sulle tabelle che il
-- frontend sottoscrive via subscribeTable() ma che non erano mai
-- state aggiunte alla pubblicazione: le sottoscrizioni esistevano
-- nel codice ma non ricevevano mai eventi dal DB.
-- ============================================================
do $$
declare
  t text;
  tabelle text[] := array[
    'companies', 'markets', 'notifications', 'orders',
    'producer_event_rsvps', 'producer_needs', 'reviews',
    'staff_messages', 'stall_rentals'
  ];
begin
  foreach t in array tabelle loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;