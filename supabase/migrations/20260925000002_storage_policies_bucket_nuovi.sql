-- ============================================================
-- Le policy storage esistevano solo per "public-assets". I bucket
-- prodotti/aziende/mercati/allegati, previsti dal tipo Bucket in
-- src/api/storage.ts e usati da più pagine (foto prodotto, foto
-- azienda, foto mercato, allegati Listino AI), non avevano mai avuto
-- le loro policy INSERT/UPDATE/DELETE create — solo la lettura
-- pubblica funzionava per bucket marcati "Public" dalla dashboard.
-- ============================================================

DO $$
DECLARE
  b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['prodotti', 'aziende', 'mercati', 'allegati']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public read access on %I" ON storage.objects', b);
    EXECUTE format(
      'CREATE POLICY "Public read access on %I" ON storage.objects FOR SELECT USING (bucket_id = %L)',
      b, b);

    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can upload to %I" ON storage.objects', b);
    EXECUTE format(
      'CREATE POLICY "Authenticated users can upload to %I" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L)',
      b, b);

    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can update in %I" ON storage.objects', b);
    EXECUTE format(
      'CREATE POLICY "Authenticated users can update in %I" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = %L)',
      b, b);

    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can delete from %I" ON storage.objects', b);
    EXECUTE format(
      'CREATE POLICY "Authenticated users can delete from %I" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %L)',
      b, b);
  END LOOP;
END $$;