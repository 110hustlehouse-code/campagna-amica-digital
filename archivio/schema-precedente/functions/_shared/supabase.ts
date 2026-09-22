import { createClient } from 'jsr:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ----------------------------------------------------------------
// Admin client — bypasses RLS (service role)
// ----------------------------------------------------------------
export const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

// ----------------------------------------------------------------
// Auth helpers
// ----------------------------------------------------------------

/** Verifica il JWT nella request e restituisce il profilo utente */
export async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const jwt = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(jwt);
  if (error || !user) return null;
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
  return profile ? { ...user, ...profile } : user;
}

/** Recupera l'email di un utente dall'UUID (tabella public.users) */
export async function getEmailByUserId(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;
  const { data } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .single();
  return data?.email ?? null;
}

// ----------------------------------------------------------------
// Notification helpers
// ----------------------------------------------------------------

export interface NotificationPayload {
  user_email: string;
  user_id?: string;
  title: string;
  message?: string;
  type?: 'generic' | 'order_update' | 'new_product';
  company_id?: string | null;
  product_id?: string | null;
  order_id?: string | null;
  message_id?: string | null;
}

export async function createNotification(notif: NotificationPayload) {
  const { error } = await supabase.from('notifications').insert({
    ...notif,
    type: notif.type ?? 'generic',
    read: false,
  });
  if (error) console.error('[createNotification]', error.message);
}

export async function bulkCreateNotifications(notifs: NotificationPayload[]) {
  if (!notifs.length) return;
  const { error } = await supabase.from('notifications').insert(
    notifs.map(n => ({ ...n, type: n.type ?? 'generic', read: false }))
  );
  if (error) console.error('[bulkCreateNotifications]', error.message);
}

// ----------------------------------------------------------------
// Webhook secret guard (C4)
// Call at the top of every notify/cron function that is triggered
// by pg_net (not by end-users). Returns true if the request carries
// the correct X-Webhook-Secret header.
// Set the env var WEBHOOK_SHARED_SECRET in Supabase Dashboard.
// ----------------------------------------------------------------
export function validateWebhookSecret(req: Request): boolean {
  const secret = Deno.env.get('WEBHOOK_SHARED_SECRET');
  if (!secret) {
    // If not configured, log a warning but fail closed (deny request)
    console.warn('[validateWebhookSecret] WEBHOOK_SHARED_SECRET not set — denying request');
    return false;
  }
  const incoming = req.headers.get('x-webhook-secret') ?? '';
  // Constant-time comparison to prevent timing attacks
  if (incoming.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < incoming.length; i++) {
    diff |= incoming.charCodeAt(i) ^ secret.charCodeAt(i);
  }
  return diff === 0;
}
