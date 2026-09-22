-- ============================================================
-- Fix bug: bucket "public-assets" creato dalla Dashboard Supabase senza RLS policies.
-- Sintomo: upload da frontend (api.integrations.Core.UploadFile) fallisce con
--   "new row violates row-level security policy".
--
-- Causa: la Dashboard Supabase, quando crea un bucket con flag "Public", abilita
-- solo la lettura pubblica. Le policies INSERT/UPDATE/DELETE su storage.objects
-- NON vengono create — vanno aggiunte esplicitamente via SQL. Le policies "giuste"
-- sono in migration 005 ma se quella migration non è stata applicata (o il bucket
-- è stato ricreato a mano dopo una delete) le policies restano assenti.
--
-- Questa migration è IDEMPOTENTE: DROP IF EXISTS prima di ogni CREATE POLICY.
-- Sicura da rieseguire.
-- ============================================================

-- 1. Public read access on public-assets
DROP POLICY IF EXISTS "Public read access on public-assets" ON storage.objects;
CREATE POLICY "Public read access on public-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-assets');

-- 2. Authenticated users can upload to public-assets
DROP POLICY IF EXISTS "Authenticated users can upload to public-assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload to public-assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public-assets');

-- 3. Authenticated users can update in public-assets
DROP POLICY IF EXISTS "Authenticated users can update in public-assets" ON storage.objects;
CREATE POLICY "Authenticated users can update in public-assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'public-assets');

-- 4. Admin can delete any file; users can delete files in their own prefix
DROP POLICY IF EXISTS "Admin can delete from public-assets" ON storage.objects;
CREATE POLICY "Admin can delete from public-assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'public-assets'
  AND (
    -- Admin può eliminare qualunque file
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
    -- Oppure il file è in una cartella che inizia con il proprio user id
    OR (storage.foldername(name))[1] LIKE auth.uid()::text || '%'
  )
);
