import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();

  const order = body.data;
  const oldOrder = body.old_data;
  const changedFields = body.changed_fields || [];

  // Only act when items/quantities/notes/pickup_date changed (NOT status changes — those are handled by notifyOrderUpdate)
  const editFields = ['items', 'total_amount', 'pickup_date', 'notes'];
  const hasEditChange = changedFields.some(f => editFields.includes(f));
  const hasStatusChange = changedFields.includes('status');

  if (!hasEditChange || hasStatusChange) {
    return Response.json({ ok: true, skipped: 'not an order edit by customer' });
  }

  if (!order) {
    return Response.json({ ok: true, skipped: 'no order data' });
  }

  // Find the company owner to notify them
  const companies = await base44.asServiceRole.entities.Company.filter({ id: order.company_id });
  const company = companies[0];
  if (!company) {
    return Response.json({ ok: true, skipped: 'company not found' });
  }

  const producerEmail = company.created_by;
  if (!producerEmail) {
    return Response.json({ ok: true, skipped: 'no producer email' });
  }

  const customerName = order.created_by || 'Un cliente';
  const marketName = order.market_name || 'il mercato';
  const total = order.total_amount?.toFixed(2);

  await base44.asServiceRole.entities.Notification.create({
    user_email: producerEmail,
    title: `Ordine modificato dal cliente`,
    message: `${customerName} ha modificato il suo ordine a ${marketName}. Nuovo totale: €${total}.`,
    type: 'order_update',
    company_id: order.company_id || '',
    order_id: order.id || '',
    read: false,
  });

  return Response.json({ ok: true, notified: producerEmail });
});