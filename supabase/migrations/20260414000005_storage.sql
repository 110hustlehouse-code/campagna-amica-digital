-- ============================================================
-- Phase 4.2 — Storage Migration
-- Creates public-assets bucket and RLS policies
-- ============================================================

-- 1. Create the public-assets bucket
-- (Supabase Storage buckets are managed via the storage schema)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-assets',
  'public-assets',
  true,  -- public = anyone can read without auth
  10485760,  -- 10 MB file size limit
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- 2. Storage RLS Policies
-- Note: storage.objects RLS must be enabled (it is by default in Supabase)

-- Policy: Public read access for all objects in public-assets
CREATE POLICY "Public read access on public-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-assets');

-- Policy: Authenticated users can upload files
CREATE POLICY "Authenticated users can upload to public-assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public-assets');

-- Policy: Users can update their own uploads (admin or same user path)
-- The path prefix convention: uploads/{userId}-{timestamp}-{random}.ext
CREATE POLICY "Authenticated users can update in public-assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'public-assets');

-- Policy: Admins can delete any file; users can delete files in their prefix
CREATE POLICY "Admin can delete from public-assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'public-assets'
  AND (
    -- Admin can delete anything
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
    -- Or the file name starts with the user's id (for future user-scoped uploads)
    OR (storage.foldername(name))[1] LIKE auth.uid()::text || '%'
  )
);
