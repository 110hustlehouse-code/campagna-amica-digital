/**
 * notifyProducerNeedResponse
 * Crea una notifica per il produttore quando lo staff risponde a un bisogno.
 * Chiamata direttamente dal frontend: api.functions.invoke('notifyProducerNeedResponse', {...})
 */
import { corsHeaders, supabase, getEmailByUserId, createNotification, getUserFromRequest } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // C4 — requires authenticated staff or admin caller
  const caller = await getUserFromRequest(req);
  if (!caller) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }
  const callerRole = (caller as { role?: string }).role;
  if (callerRole !== 'staff' && callerRole !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
  }

  try {
    const { need_id, message, company_id } = await req.json();

    if (!need_id || !company_id) {
      return Response.json({ error: 'Missing parameters: need_id, company_id' }, { status: 400, headers: corsHeaders });
    }

    // Fetch company owner_id
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

    // Fetch the need title
    const { data: need } = await supabase
      .from('producer_needs')
      .select('title')
      .eq('id', need_id)
      .single();

    if (!need) {
      return Response.json({ error: 'Need not found' }, { status: 404, headers: corsHeaders });
    }

    await createNotification({
      user_email: producerEmail,
      user_id: company.owner_id,
      title: '📱 Sessione aperta - ' + (need.title || 'Risposta ricevuta'),
      message: message,
      type: 'generic',
      company_id: company_id,
    });

    return Response.json({ success: true }, { headers: corsHeaders });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
});
