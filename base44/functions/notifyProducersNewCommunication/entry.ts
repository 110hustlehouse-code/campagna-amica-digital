import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support both direct invocation (from CreateEvent page) and automation trigger
    let message;
    if (body.message_id) {
      const messages = await base44.asServiceRole.entities.StaffMessage.filter({ id: body.message_id });
      message = messages[0];
    } else if (body.event?.data) {
      message = body.event.data;
    }

    if (!message || !message.is_published) {
      return Response.json({ success: true, skipped: true });
    }

    const marketId = message.market_id;

    // Get all registered companies in this market (if market_id is set)
    let targetCompanyIds = null;
    if (marketId) {
      const market = await base44.asServiceRole.entities.Market.filter({ id: marketId });
      if (market[0]?.company_ids?.length) {
        targetCompanyIds = market[0].company_ids;
      }
    }

    // Get all producer users
    const allUsers = await base44.asServiceRole.entities.User.list();
    let producerUsers = allUsers.filter(u => u.role === 'producer');

    // If we have a specific market, filter to only producers of that market
    if (targetCompanyIds && targetCompanyIds.length > 0) {
      const companies = await base44.asServiceRole.entities.Company.list();
      const marketProducerEmails = new Set(
        companies
          .filter(c => targetCompanyIds.includes(c.id))
          .map(c => c.created_by)
          .filter(Boolean)
      );
      if (marketProducerEmails.size > 0) {
        producerUsers = producerUsers.filter(u => marketProducerEmails.has(u.email));
      }
    }

    if (producerUsers.length === 0) {
      return Response.json({ success: true, notified: 0 });
    }

    const typeConfig = {
      closure: { title: 'Avviso: Chiusura Mercato', emoji: '⚠️' },
      special_opening: { title: 'Apertura Straordinaria', emoji: '✨' },
      event: { title: 'Nuovo Evento', emoji: '📅' },
    };

    const config = typeConfig[message.type] || { title: 'Nuova Comunicazione', emoji: '📢' };
    const isOptionalEvent = message.type === 'event' && !message.is_mandatory;

    // For optional events: also create RSVP records in "pending" state for each company
    if (isOptionalEvent && targetCompanyIds) {
      const companies = await base44.asServiceRole.entities.Company.list();
      const marketCompanies = companies.filter(c => targetCompanyIds.includes(c.id) && c.is_registered);
      for (const company of marketCompanies) {
        const existing = await base44.asServiceRole.entities.ProducerEventRsvp.filter({
          message_id: message.id,
          company_id: company.id,
        });
        if (existing.length === 0) {
          const producerUser = producerUsers.find(u => u.email === company.created_by);
          await base44.asServiceRole.entities.ProducerEventRsvp.create({
            message_id: message.id,
            company_id: company.id,
            producer_email: company.created_by || '',
            market_id: marketId,
            status: 'pending',
          });
        }
      }
    }

    const notifications = producerUsers.map(user => ({
      user_email: user.email,
      title: config.title,
      message: `${config.emoji} ${message.title}${message.description ? ' - ' + message.description : ''}`,
      type: 'generic',
      message_id: message.id,
      read: false,
    }));

    await base44.asServiceRole.entities.Notification.bulkCreate(notifications);

    // Notify clients about this market event
    // First try to notify only those with market in favorites
    // If no one has favorites, notify all users
    if (marketId) {
      const allFavorites = await base44.asServiceRole.entities.Favorite.list();
      const clientsWithMarketFav = new Set(
        allFavorites
          .filter(f => f.market_id === marketId && !f.product_id && !f.company_id)
          .map(f => f.created_by)
          .filter(Boolean)
      );
      
      // If no one has this market favorited, notify ALL regular users
      // Otherwise only notify those who favorited it
      let clientsToNotify = allUsers.filter(u => u.role === 'user');
      if (clientsWithMarketFav.size > 0) {
        clientsToNotify = clientsToNotify.filter(u => clientsWithMarketFav.has(u.email));
      }
      
      if (clientsToNotify.length > 0) {
        const clientNotifications = clientsToNotify.map(c => {
          let title, messageText;
          if (message.type === 'event') {
            title = `Nuovo evento: ${message.title}`;
            messageText = `📅 ${message.event_date ? message.event_date + ' · ' : ''}${message.location || ''}${message.is_mandatory ? ' · Obbligatorio' : ' · Facoltativo'}`;
          } else if (message.type === 'closure') {
            title = `Chiusura: ${message.title}`;
            messageText = `⚠️ ${message.event_date ? 'Il ' + message.event_date : ''} ${message.location || ''}`;
          } else if (message.type === 'special_opening') {
            title = `Apertura straordinaria: ${message.title}`;
            messageText = `✨ ${message.event_date ? 'Il ' + message.event_date : ''} ${message.location || ''}`;
          } else {
            title = message.title;
            messageText = message.description || '';
          }
          return {
            user_email: c.email,
            title,
            message: messageText,
            type: 'generic',
            message_id: message.id,
            read: false,
          };
        });
        await base44.asServiceRole.entities.Notification.bulkCreate(clientNotifications);
      }
    }

    return Response.json({ success: true, notified: notifications.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});