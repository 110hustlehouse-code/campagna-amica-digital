/**
 * notifyProducersNewCommunication
 * Invia notifiche ai produttori (e opzionalmente ai clienti) quando viene pubblicata
 * una comunicazione staff (chiusura, apertura straordinaria, evento).
 *
 * Per eventi facoltativi crea anche i record RSVP in stato "pending".
 *
 * Chiamata direttamente dal frontend: api.functions.invoke('notifyProducersNewCommunication', {message_id})
 */
import { corsHeaders, supabase, getEmailByUserId, bulkCreateNotifications, getUserFromRequest } from '../_shared/supabase.ts';

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
    const body = await req.json();

    // Support both direct invocation and automation trigger
    let message: Record<string, unknown> | null = null;
    if (body.message_id) {
      const { data } = await supabase
        .from('staff_messages')
        .select('*')
        .eq('id', body.message_id)
        .single();
      message = data;
    } else if (body.event?.data) {
      message = body.event.data;
    } else if (body.data) {
      message = body.data;
    }

    if (!message || !message.is_published) {
      return Response.json({ success: true, skipped: true }, { headers: corsHeaders });
    }

    const marketId = message.market_id as string | null;

    // ---- Get target companies (those in this market, if market_id set) ----
    let targetCompanyIds: string[] | null = null;
    if (marketId) {
      const { data: market } = await supabase
        .from('markets')
        .select('company_ids')
        .eq('id', marketId)
        .single();
      if ((market?.company_ids as string[])?.length) {
        targetCompanyIds = market.company_ids as string[];
      }
    }

    // ---- Get all producer users ----
    let { data: producerUsers } = await supabase
      .from('users')
      .select('id, email')
      .eq('role', 'producer');

    producerUsers = producerUsers ?? [];

    // Filter to producers of this market if applicable
    if (targetCompanyIds && targetCompanyIds.length > 0) {
      const { data: companies } = await supabase
        .from('companies')
        .select('owner_id')
        .in('id', targetCompanyIds);

      const marketOwnerIds = new Set((companies ?? []).map((c: { owner_id: string }) => c.owner_id).filter(Boolean));
      producerUsers = producerUsers.filter((u: { id: string }) => marketOwnerIds.has(u.id));
    }

    if (producerUsers.length === 0) {
      return Response.json({ success: true, notified: 0 }, { headers: corsHeaders });
    }

    // ---- Type config ----
    const typeConfig: Record<string, { title: string; emoji: string }> = {
      closure: { title: 'Avviso: Chiusura Mercato', emoji: '⚠️' },
      special_opening: { title: 'Apertura Straordinaria', emoji: '✨' },
      event: { title: 'Nuovo Evento', emoji: '📅' },
    };
    const config = typeConfig[message.type as string] ?? { title: 'Nuova Comunicazione', emoji: '📢' };

    // ---- Optional event: create RSVP records ----
    const isOptionalEvent = message.type === 'event' && !message.is_mandatory;
    if (isOptionalEvent && targetCompanyIds) {
      const { data: companies } = await supabase
        .from('companies')
        .select('id, owner_id, is_registered')
        .in('id', targetCompanyIds)
        .eq('is_registered', true);

      for (const company of (companies ?? [])) {
        const { data: existing } = await supabase
          .from('producer_event_rsvps')
          .select('id')
          .eq('message_id', message.id as string)
          .eq('company_id', company.id)
          .limit(1);

        if (!existing || existing.length === 0) {
          const producerEmail = await getEmailByUserId(company.owner_id) ?? '';
          await supabase.from('producer_event_rsvps').insert({
            message_id: message.id,
            company_id: company.id,
            user_id: company.owner_id || null,
            producer_email: producerEmail,
            market_id: marketId,
            status: 'pending',
          });
        }
      }
    }

    // ---- Notify producers ----
    await bulkCreateNotifications(
      producerUsers.map((u: { id: string; email: string }) => ({
        user_email: u.email,
        user_id: u.id,
        title: config.title,
        message: `${config.emoji} ${message.title as string}${message.description ? ' - ' + message.description : ''}`,
        type: 'generic' as const,
        message_id: message.id as string,
      }))
    );

    // ---- Notify clients who favorited this market ----
    if (marketId) {
      const { data: favorites } = await supabase
        .from('favorites')
        .select('user_id')
        .eq('market_id', marketId)
        .is('product_id', null)
        .is('company_id', null);

      let { data: clientUsers } = await supabase
        .from('users')
        .select('id, email')
        .eq('role', 'client');

      clientUsers = clientUsers ?? [];

      if ((favorites ?? []).length > 0) {
        const favUserIds = new Set((favorites ?? []).map((f: { user_id: string }) => f.user_id));
        clientUsers = clientUsers.filter((u: { id: string }) => favUserIds.has(u.id));
      }
      // If no favorites, notify ALL clients (market-wide announcement)

      if (clientUsers.length > 0) {
        const msgType = message.type as string;
        const clientNotifs = clientUsers.map((c: { id: string; email: string }) => {
          let title: string, msgText: string;
          const eventDate = message.event_date ? String(message.event_date) : '';
          const location = message.location ? String(message.location) : '';

          if (msgType === 'event') {
            title = `Nuovo evento: ${message.title}`;
            msgText = `📅 ${eventDate ? eventDate + ' · ' : ''}${location}${message.is_mandatory ? ' · Obbligatorio' : ' · Facoltativo'}`;
          } else if (msgType === 'closure') {
            title = `Chiusura: ${message.title}`;
            msgText = `⚠️ ${eventDate ? 'Il ' + eventDate : ''} ${location}`.trim();
          } else if (msgType === 'special_opening') {
            title = `Apertura straordinaria: ${message.title}`;
            msgText = `✨ ${eventDate ? 'Il ' + eventDate : ''} ${location}`.trim();
          } else {
            title = String(message.title);
            msgText = String(message.description ?? '');
          }
          return {
            user_email: c.email,
            user_id: c.id,
            title,
            message: msgText,
            type: 'generic' as const,
            message_id: message.id as string,
          };
        });
        await bulkCreateNotifications(clientNotifs);
      }
    }

    return Response.json({ success: true, notified: producerUsers.length }, { headers: corsHeaders });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
});
