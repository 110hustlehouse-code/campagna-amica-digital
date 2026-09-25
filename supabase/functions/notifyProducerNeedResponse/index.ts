/**
 * notifyProducerNeedResponse
 * Crea una notifica per il produttore quando lo staff risponde a un bisogno.
 * Self-contained: nessun import da _shared (deploy da Dashboard).
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const jwt = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(jwt);
  if (error || !user) return null;
  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
  return profile ? { ...user, ...profile } : user;
}

async function getEmailByUserId(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;
  const { data } = await supabase.from('users').select('email').eq('id', userId).single();
  return data?.email ?? null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const caller = await getUserFromRequest(req);
  if (!caller) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }
  const callerRole = (caller as { role?: string }).role;
  if (callerRole !== 'staff' && callerRole !== 'admin') {
    return Response.json({ error: 'Forbidden', callerRole }, { status: 403, headers: corsHeaders });
  }

  try {
    const { need_id, message, company_id } = await req.json();

    if (!need_id || !company_id) {
      return Response.json({ error: 'Missing parameters: need_id, company_id' }, { status: 400, headers: corsHeaders });
    }

    const { data: company } = await supabase
      .from('companies')
      .select('owner_id')
      .eq('id', company_id)
      .single();

    if (!company?.owner_id) {
      return Response.json({ error: 'Producer not found' }, { status: 404, headers: corsHeaders });
    }

    const producerEmail = await getEmailByUserId(company.owner_id);
    if (!producerEmail) {
      return Response.json({ error: 'Producer email not found' }, { status: 404, headers: corsHeaders });
    }

    const { data: need } = await supabase
      .from('producer_needs')
      .select('title')
      .eq('id', need_id)
      .single();

    if (!need) {
      return Response.json({ error: 'Need not found' }, { status: 404, headers: corsHeaders });
    }

    const { error: insertError } = await supabase.from('notifications').insert({
      user_email: producerEmail,
      user_id: company.owner_id,
      title: '📱 Sessione aperta - ' + (need.title || 'Risposta ricevuta'),
      message: message,
      type: 'generic',
      company_id: company_id,
      read: false,
    });
    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500, headers: corsHeaders });
    }

    return Response.json({ success: true }, { headers: corsHeaders });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
});