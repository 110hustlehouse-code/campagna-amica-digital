/**
 * migrateImages — Phase 4.2 Storage Migration
 *
 * Scans companies, products, and markets tables for external image URLs
 * (e.g. Base44 CDN or any non-Supabase URL), downloads them, re-uploads
 * to Supabase Storage under the correct folder, and updates the DB record.
 *
 * Admin-only. POST /functions/v1/migrateImages
 *
 * Request body (optional):
 *   { dry_run?: boolean }   — if true, only reports what would be migrated
 *
 * Response:
 *   {
 *     migrated: number,
 *     skipped: number,
 *     errors: number,
 *     details: MigrationResult[]
 *   }
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET = 'public-assets';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

interface MigrationResult {
  table: string;
  id: string;
  field: string;
  original_url: string;
  new_url?: string;
  status: 'migrated' | 'skipped' | 'error';
  reason?: string;
}

/**
 * Returns true if the URL is already a Supabase Storage URL for this project.
 */
function isSupabaseUrl(url: string): boolean {
  if (!url) return true; // treat empty as already OK
  return url.includes(SUPABASE_URL) || url.includes('supabase.co/storage');
}

/**
 * Derives the MIME type from a URL or file name extension.
 */
function mimeFromUrl(url: string): string {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    pdf: 'application/pdf',
  };
  return map[ext ?? ''] ?? 'application/octet-stream';
}

/**
 * Downloads a remote URL and uploads it to Supabase Storage.
 * Returns the new public URL.
 */
async function migrateUrl(
  originalUrl: string,
  folder: string,
): Promise<string> {
  // Fetch the remote image
  const response = await fetch(originalUrl, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${originalUrl}`);
  }

  const contentType = response.headers.get('content-type') ?? mimeFromUrl(originalUrl);
  const ext = contentType.split('/').pop()?.split(';')[0] ?? 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const storagePath = `${folder}/${fileName}`;

  const arrayBuffer = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  return publicUrl;
}

/**
 * Migrates a single image field for a row.
 */
async function migrateField(
  table: string,
  id: string,
  field: string,
  url: string,
  folder: string,
  dryRun: boolean,
): Promise<MigrationResult> {
  if (!url || url.trim() === '') {
    return { table, id, field, original_url: url, status: 'skipped', reason: 'empty URL' };
  }

  if (isSupabaseUrl(url)) {
    return { table, id, field, original_url: url, status: 'skipped', reason: 'already Supabase Storage' };
  }

  if (dryRun) {
    return { table, id, field, original_url: url, status: 'migrated', reason: 'dry run — not actually migrated' };
  }

  try {
    const newUrl = await migrateUrl(url, folder);

    // Update the DB record with the new URL
    const { error: updateError } = await supabase
      .from(table)
      .update({ [field]: newUrl })
      .eq('id', id);

    if (updateError) throw updateError;

    return { table, id, field, original_url: url, new_url: newUrl, status: 'migrated' };
  } catch (err) {
    return {
      table, id, field, original_url: url, status: 'error',
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth check — admin only
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Non autenticato' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Solo gli admin possono eseguire la migrazione' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const dryRun = body.dry_run === true;

  const results: MigrationResult[] = [];

  // ── 1. Companies: logo_url and cover_image_url ──────────────────────────────
  const { data: companies } = await supabase
    .from('companies')
    .select('id, logo_url, cover_image_url');

  for (const company of companies ?? []) {
    if (company.logo_url) {
      results.push(await migrateField('companies', company.id, 'logo_url', company.logo_url, 'companies/logos', dryRun));
    }
    if (company.cover_image_url) {
      results.push(await migrateField('companies', company.id, 'cover_image_url', company.cover_image_url, 'companies/covers', dryRun));
    }
  }

  // ── 2. Products: image_url ───────────────────────────────────────────────────
  const { data: products } = await supabase
    .from('products')
    .select('id, image_url');

  for (const product of products ?? []) {
    if (product.image_url) {
      results.push(await migrateField('products', product.id, 'image_url', product.image_url, 'products', dryRun));
    }
  }

  // ── 3. Markets: image_url ────────────────────────────────────────────────────
  const { data: markets } = await supabase
    .from('markets')
    .select('id, image_url');

  for (const market of markets ?? []) {
    if (market.image_url) {
      results.push(await migrateField('markets', market.id, 'image_url', market.image_url, 'markets', dryRun));
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  const summary = results.reduce(
    (acc, r) => {
      acc[r.status]++;
      return acc;
    },
    { migrated: 0, skipped: 0, error: 0 },
  );

  return new Response(
    JSON.stringify({
      dry_run: dryRun,
      migrated: summary.migrated,
      skipped: summary.skipped,
      errors: summary.error,
      details: results,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
