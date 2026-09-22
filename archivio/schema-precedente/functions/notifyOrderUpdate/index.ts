/**
 * notifyOrderUpdate
 * Triggered when an order's status changes.
 * Notifies the customer (NOT the producer who changed the status).
 *
 * Call from DB webhook on UPDATE to public.orders,
 * or directly via api.functions.invoke('notifyOrderUpdate', { data, old_data }).
 */
import { corsHeaders, supabase, getEmailByUserId, createNotification, validateWebhookSecret } from '../_shared/supabase.ts';

const STATUS_LABELS: Record<string, string> = {
  in_attesa: 'In attesa',
  confermato: 'Confermato ✅',
  pronto: 'Pronto per il ritiro 🛍️',
  ritirato: 'Ritirato',
  annullato: 'Annullato ❌',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // C4 — only pg_net DB triggers may call this function
  if (!validateWebhookSecret(req)) {
    return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const order = body.data ?? body.record;
    const oldOrder = body.old_data ?? body.old_record;

    // Only act when status actually changed
    if (!order || !oldOrder || order.status === oldOrder.status) {
      return Response.json({ ok: true, skipped: 'no status change' }, { headers: corsHeaders });
    }

    // Look up customer email from user_id
    const customerEmail = await getEmailByUserId(order.user_id);
    if (!customerEmail) {
      return Response.json({ ok: true, skipped: 'customer email not found' }, { headers: corsHeaders });
    }

    // Look up company to check producer identity
    const { data: company } = await supabase
      .from('companies')
      .select('owner_id, name')
      .eq('id', order.company_id)
      .single();

    if (!company) {
      return Response.json({ ok: true, skipped: 'company not found' }, { headers: corsHeaders });
    }

    // Don't notify if customer IS the producer (self-modification)
    if (order.user_id === company.owner_id) {
      return Response.json({ ok: true, skipped: 'customer is the producer' }, { headers: corsHeaders });
    }

    const companyName = order.company_name || company.name || 'Il produttore';
    const marketName = order.market_name || 'il mercato';
    const statusLabel = STATUS_LABELS[order.status] || order.status;

    let message: string;
    if (order.status === 'pronto') {
      message = `Il tuo ordine presso ${companyName} è pronto per il ritiro a ${marketName}! 🎉`;
    } else if (order.status === 'annullato') {
      message = `Il tuo ordine presso ${companyName} è stato annullato.`;
    } else if (order.status === 'confermato') {
      message = `${companyName} ha confermato il tuo ordine a ${marketName}.`;
    } else {
      message = `Il tuo ordine presso ${companyName} è ora: ${statusLabel}.`;
    }

    await createNotification({
      user_email: customerEmail,
      user_id: order.user_id,
      title: `Ordine ${statusLabel}`,
      message,
      type: 'order_update',
      company_id: order.company_id || null,
      order_id: order.id || null,
    });

    return Response.json({ ok: true, notified: customerEmail }, { headers: corsHeaders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
