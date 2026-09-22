/**
 * rsvpProducerEvent
 * Il produttore accetta o declina un evento facoltativo.
 * Salva/aggiorna il record RSVP, notifica lo staff e i clienti che seguono quel mercato.
 *
 * Chiamata dal frontend: api.functions.invoke('rsvpProducerEvent', { message_id, company_id, status })
 * status: 'accepted' | 'declined'
 */
import { corsHeaders, supabase, getEmailByUserId, bulkCreateNotifications, getUserFromRequest } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const { message_id, company_id, status } = await req.json();
    if (!message_id || !company_id || !status) {
      return Response.json({ error: 'message_id, company_id and status required' }, { status: 400, headers: corsHeaders });
    }

    // Get the StaffMessage event
    const { data: message } = await supabase
      .from('staff_messages')
      .select('*')
      .eq('id', message_id)
      .single();

    if (!message) return Response.json({ error: 'Event not found' }, { status: 404, headers: corsHeaders });

    // Get the company
    const { data: company } = await supabase
      .from('companies')
      .select('name, owner_id')
      .eq('id', company_id)
      .single();

    if (!company) return Response.json({ error: 'Company not found' }, { status: 404, headers: corsHeaders });

    // C3 — IDOR guard: caller must own the company (or be admin)
    const isAdmin = (user as { role?: string }).role === 'admin';
    if (company.owner_id !== user.id && !isAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
    }

    const producerEmail = await getEmailByUserId(company.owner_id) ?? '';

    // Upsert RSVP record
    const { data: existingRsvps } = await supabase
      .from('producer_event_rsvps')
      .select('id')
      .eq('message_id', message_id)
      .eq('company_id', company_id)
      .limit(1);

    if (existingRsvps && existingRsvps.length > 0) {
      await supabase.from('producer_event_rsvps').update({ status }).eq('id', existingRsvps[0].id);
    } else {
      await supabase.from('producer_event_rsvps').insert({
        message_id,
        company_id,
        user_id: user.id,
        producer_email: producerEmail,
        market_id: message.market_id || null,
        status,
      });
    }

    const statusLabel = status === 'accepted' ? 'ha accettato ✅' : 'ha declinato ❌';
    const eventSummary = `📅 ${message.title}${message.location ? ' · ' + message.location : ''}${message.event_date ? ' · ' + message.event_date : ''}`;

    // ---- Notify STAFF (admin + staff roles) ----
    const { data: staffUsers } = await supabase
      .from('users')
      .select('id, email')
      .in('role', ['admin', 'staff']);

    if (staffUsers?.length) {
      await bulkCreateNotifications(
        staffUsers.map((s: { id: string; email: string }) => ({
          user_email: s.email,
          user_id: s.id,
          title: `${company.name} ${statusLabel} l'evento`,
          message: eventSummary,
          type: 'generic' as const,
          message_id,
        }))
      );
    }

    // ---- Notify CLIENTS who favorited this market ----
    const marketId = message.market_id as string | null;
    if (marketId) {
      const { data: favorites } = await supabase
        .from('favorites')
        .select('user_id')
        .eq('market_id', marketId)
        .is('product_id', null)
        .is('company_id', null);

      if (favorites?.length) {
        const favUserIds = (favorites as { user_id: string }[]).map(f => f.user_id);
        const { data: clientUsers } = await supabase
          .from('users')
          .select('id, email')
          .eq('role', 'client')
          .in('id', favUserIds);

        if (clientUsers?.length) {
          const clientTitle = status === 'accepted'
            ? `${company.name} parteciperà all'evento!`
            : `${company.name} non sarà presente all'evento`;

          await bulkCreateNotifications(
            (clientUsers as { id: string; email: string }[]).map(c => ({
              user_email: c.email,
              user_id: c.id,
              title: clientTitle,
              message: eventSummary,
              type: 'generic' as const,
              company_id,
              message_id,
            }))
          );
        }
      }
    }

    return Response.json({ success: true, status }, { headers: corsHeaders });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
});
