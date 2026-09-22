/**
 * notifyProducerOrderEdit
 * Triggered when a customer edits an existing order (items/total/date/notes change,
 * but NOT status changes — those are handled by notifyOrderUpdate).
 *
 * Call from DB webhook on UPDATE to public.orders.
 */
import { corsHeaders, supabase, getEmailByUserId, createNotification, validateWebhookSecret } from '../_shared/supabase.ts';

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
    const changedFields: string[] = body.changed_fields ?? [];

    // Only act on content edits (not status changes)
    const editFields = ['items', 'total_amount', 'pickup_date', 'notes'];
    const hasEditChange = changedFields.length === 0 // if no changed_fields, assume edit
      ? (JSON.stringify(order?.items) !== JSON.stringify(oldOrder?.items)
          || order?.total_amount !== oldOrder?.total_amount
          || order?.pickup_date !== oldOrder?.pickup_date
          || order?.notes !== oldOrder?.notes)
      : changedFields.some(f => editFields.includes(f));
    const hasStatusChange = changedFields.includes('status') || order?.status !== oldOrder?.status;

    if (!hasEditChange || hasStatusChange) {
      return Response.json({ ok: true, skipped: 'not an order content edit' }, { headers: corsHeaders });
    }

    if (!order) {
      return Response.json({ ok: true, skipped: 'no order data' }, { headers: corsHeaders });
    }

    // Look up company owner email
    const { data: company } = await supabase
      .from('companies')
      .select('owner_id')
      .eq('id', order.company_id)
      .single();

    if (!company?.owner_id) {
      return Response.json({ ok: true, skipped: 'company not found' }, { headers: corsHeaders });
    }

    const producerEmail = await getEmailByUserId(company.owner_id);
    if (!producerEmail) {
      return Response.json({ ok: true, skipped: 'producer email not found' }, { headers: corsHeaders });
    }

    // Look up customer email for display
    const customerEmail = await getEmailByUserId(order.user_id);
    const customerLabel = customerEmail || 'Un cliente';
    const marketName = order.market_name || 'il mercato';
    const total = order.total_amount != null ? Number(order.total_amount).toFixed(2) : '?';

    await createNotification({
      user_email: producerEmail,
      user_id: company.owner_id,
      title: 'Ordine modificato dal cliente',
      message: `${customerLabel} ha modificato il suo ordine a ${marketName}. Nuovo totale: €${total}.`,
      type: 'order_update',
      company_id: order.company_id || null,
      order_id: order.id || null,
    });

    return Response.json({ ok: true, notified: producerEmail }, { headers: corsHeaders });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
});
