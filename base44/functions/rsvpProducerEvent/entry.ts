import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Called when a producer accepts or declines a voluntary event
// Saves RSVP to DB, notifies staff, notifies clients
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { message_id, company_id, status } = body; // status: 'accepted' | 'declined'

    if (!message_id || !company_id || !status) {
      return Response.json({ error: 'message_id, company_id and status required' }, { status: 400 });
    }

    // Get the StaffMessage event
    const messages = await base44.asServiceRole.entities.StaffMessage.filter({ id: message_id });
    const message = messages[0];
    if (!message) return Response.json({ error: 'Event not found' }, { status: 404 });

    // Get the company
    const companies = await base44.asServiceRole.entities.Company.filter({ id: company_id });
    const company = companies[0];
    if (!company) return Response.json({ error: 'Company not found' }, { status: 404 });

    // Upsert RSVP record: check if exists
    const existingRsvps = await base44.asServiceRole.entities.ProducerEventRsvp.filter({
      message_id,
      company_id,
    });

    if (existingRsvps.length > 0) {
      await base44.asServiceRole.entities.ProducerEventRsvp.update(existingRsvps[0].id, { status });
    } else {
      await base44.asServiceRole.entities.ProducerEventRsvp.create({
        message_id,
        company_id,
        producer_email: user.email,
        market_id: message.market_id || '',
        status,
      });
    }

    const allUsers = await base44.asServiceRole.entities.User.list();

    // 1. Notify STAFF about the RSVP response
    const staffUsers = allUsers.filter(u => u.role === 'admin' || u.role === 'staff');
    const statusLabel = status === 'accepted' ? 'ha accettato ✅' : 'ha declinato ❌';
    if (staffUsers.length > 0) {
      await base44.asServiceRole.entities.Notification.bulkCreate(
        staffUsers.map(s => ({
          user_email: s.email,
          title: `${company.name} ${statusLabel} l'evento`,
          message: `📅 ${message.title} · ${message.location}${message.event_date ? ' · ' + message.event_date : ''}`,
          type: 'generic',
          message_id,
          read: false,
        }))
      );
    }

    // 2. Notify only CLIENTS who have this market in their favorites
    const marketId = message.market_id;
    if (marketId) {
      const allFavorites = await base44.asServiceRole.entities.Favorite.list();
      const clientsWithFav = new Set(
        allFavorites
          .filter(f => f.market_id === marketId && !f.product_id && !f.company_id)
          .map(f => f.created_by)
          .filter(Boolean)
      );
      const clientsToNotify = allUsers.filter(u => u.role === 'user' && clientsWithFav.has(u.email));
      if (clientsToNotify.length > 0) {
        const clientTitle = status === 'accepted'
          ? `${company.name} parteciperà all'evento!`
          : `${company.name} non sarà presente all'evento`;
        const clientMsg = `📅 ${message.title}${message.event_date ? ' · ' + message.event_date : ''}${message.location ? ' · ' + message.location : ''}`;
        await base44.asServiceRole.entities.Notification.bulkCreate(
          clientsToNotify.map(c => ({
            user_email: c.email,
            title: clientTitle,
            message: clientMsg,
            type: 'generic',
            company_id,
            message_id,
            read: false,
          }))
        );
      }
    }

    return Response.json({ success: true, status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});