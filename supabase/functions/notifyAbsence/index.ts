/**
 * notifyAbsence
 * Notifica lo staff quando un produttore segnala un'assenza.
 * Invocata da trigger pg_net su INSERT in absences.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, supabase, bulkCreateNotifications } from '../_shared/supabase.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // C4 — webhook-only: valida X-Webhook-Secret (cerebrum 2026-04-18)
  const expected = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const got = req.headers.get('X-Webhook-Secret');
  if (!expected || got !== expected) {
    return Response.json({ error: 'unauthorized' }, { status: 401, headers: corsHeaders });
  }

  try {
    const { record } = await req.json();
    if (!record?.market_id || !record?.company_id) {
      return Response.json({ error: 'invalid payload' }, { status: 400, headers: corsHeaders });
    }

    // Carica staff del mercato
    const { data: staffMembers } = await supabase
      .from('staff_members')
      .select('email, user_id')
      .eq('market_id', record.market_id);

    // Carica info azienda
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', record.company_id)
      .single();

    const companyName = company?.name ?? 'Un produttore';
    const reasonSuffix = record.reason ? `: ${record.reason}` : '';

    await bulkCreateNotifications(
      (staffMembers ?? []).map((s: { email: string; user_id?: string }) => ({
        user_email: s.email,
        user_id: s.user_id,
        title: '⚠️ Assenza segnalata',
        message: `${companyName} ha segnalato un'assenza${reasonSuffix}.`,
        type: 'generic' as const,
        company_id: record.company_id,
      }))
    );

    return Response.json({ ok: true }, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
});
