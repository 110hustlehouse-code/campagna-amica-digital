import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();

  const order = body.data;
  const oldOrder = body.old_data;

  // Only act when status actually changed
  if (!order || !oldOrder || order.status === oldOrder.status) {
    return Response.json({ ok: true, skipped: 'no status change' });
  }

  // The customer email is stored in created_by on the order (ONLY notify customer, not producer)
  const customerEmail = order.created_by;
  if (!customerEmail) {
    return Response.json({ ok: true, skipped: 'no customer email on order' });
  }

  // Get the company to check who the producer is
  const companies = await base44.asServiceRole.entities.Company.filter({ id: order.company_id });
  const company = companies[0];
  if (!company) {
    return Response.json({ ok: true, skipped: 'company not found' });
  }

  // Don't send notification to the producer (the one who modified the status)
  // Only notify the actual customer
  if (customerEmail === company.created_by) {
    return Response.json({ ok: true, skipped: 'customer is the producer, no self-notification' });
  }

  const STATUS_LABELS = {
    in_attesa: 'In attesa',
    confermato: 'Confermato ✅',
    pronto: 'Pronto per il ritiro 🛍️',
    ritirato: 'Ritirato',
    annullato: 'Annullato ❌',
  };

  const companyName = order.company_name || 'Il produttore';
  const marketName = order.market_name || 'il mercato';
  const statusLabel = STATUS_LABELS[order.status] || order.status;

  let message;
  if (order.status === 'pronto') {
    message = `Il tuo ordine presso ${companyName} è pronto per il ritiro a ${marketName}! 🎉`;
  } else if (order.status === 'annullato') {
    message = `Il tuo ordine presso ${companyName} è stato annullato.`;
  } else if (order.status === 'confermato') {
    message = `${companyName} ha confermato il tuo ordine a ${marketName}.`;
  } else {
    message = `Il tuo ordine presso ${companyName} è ora: ${statusLabel}.`;
  }

  await base44.asServiceRole.entities.Notification.create({
    user_email: customerEmail,
    title: `Ordine ${statusLabel}`,
    message,
    type: 'order_update',
    company_id: order.company_id || '',
    order_id: order.id || '',
    read: false,
  });

  return Response.json({ ok: true, notified: customerEmail });
});