/**
 * verify-access-code
 * Validates a role access code (producer / staff / direzione) server-side and,
 * if valid, updates the caller's role using the service-role key (bypasses RLS
 * trigger that blocks self-role-change).
 *
 * The codes are stored in Supabase env vars:
 *   PRODUCER_ACCESS_CODE
 *   STAFF_ACCESS_CODE
 *   DIREZIONE_ACCESS_CODE
 *
 * Body: { code: string, role: 'producer' | 'staff' | 'direzione' }
 * Response: { ok: true } | { error: string }
 */
import { corsHeaders, supabase, getUserFromRequest } from '../_shared/supabase.ts';

// Sliding-window brute-force protection: max 5 failed attempts per user per 15 min.
const FAIL_WINDOW_MS   = 15 * 60 * 1000; // 15 minutes
const MAX_FAIL_ATTEMPTS = 5;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // 1. Authenticate caller
    const user = await getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    // 2. Parse body
    const { code, role } = await req.json();
    if (!code || !role) {
      return Response.json({ error: 'code and role required' }, { status: 400, headers: corsHeaders });
    }
    if (role !== 'producer' && role !== 'staff' && role !== 'direzione') {
      return Response.json({ error: 'Invalid role' }, { status: 400, headers: corsHeaders });
    }

    // 3. Brute-force check: count recent failed attempts
    const windowStart = new Date(Date.now() - FAIL_WINDOW_MS).toISOString();
    const { count: failCount } = await supabase
      .from('api_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('endpoint', `verify-access-code:fail`)
      .gte('called_at', windowStart);

    if ((failCount ?? 0) >= MAX_FAIL_ATTEMPTS) {
      return Response.json(
        { error: 'Too many failed attempts. Try again later.' },
        { status: 429, headers: corsHeaders }
      );
    }

    // 4. Validate code against env var (constant-time comparison)
    const envKey = role === 'producer'
      ? 'PRODUCER_ACCESS_CODE'
      : role === 'staff'
      ? 'STAFF_ACCESS_CODE'
      : 'DIREZIONE_ACCESS_CODE';
    const validCode = Deno.env.get(envKey) ?? '';

    const isValid = timingSafeEqual(code.trim(), validCode);

    if (!isValid) {
      // Record failure
      await supabase.from('api_rate_limits').insert({
        user_id:   user.id,
        endpoint:  'verify-access-code:fail',
      });
      return Response.json({ error: 'Codice non valido' }, { status: 403, headers: corsHeaders });
    }

    // 5. Code is valid — update role with service-role key (bypasses the DB trigger)
    const redirectPath = role === 'producer'
      ? '/produttore/onboarding'
      : role === 'staff'
      ? '/staff-onboarding'
      : '/direzione';

    const { error: updateError } = await supabase
      .from('users')
      .update({ role, role_confirmed: true })
      .eq('id', user.id);

    if (updateError) {
      console.error('[verify-access-code] update error', updateError.message);
      return Response.json({ error: 'Internal error updating role' }, { status: 500, headers: corsHeaders });
    }

    return Response.json({ ok: true, redirect: redirectPath }, { headers: corsHeaders });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[verify-access-code]', msg);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
});

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still run comparison to prevent length-based timing leak
    let dummy = 0;
    for (let i = 0; i < a.length; i++) dummy |= a.charCodeAt(i) ^ (b.charCodeAt(i % b.length) || 0);
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
