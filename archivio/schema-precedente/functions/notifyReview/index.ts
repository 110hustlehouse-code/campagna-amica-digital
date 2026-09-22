/**
 * notifyReview
 * Triggered when a new review is created.
 * Notifies the producer of the company being reviewed.
 *
 * Call from DB webhook on INSERT to public.reviews.
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

    // Support DB webhook (body.record) and direct invocation (body.data or body itself)
    const review = body.record ?? body.data ?? body;

    if (!review?.company_id) {
      return Response.json({ success: true, skipped: 'no company_id' }, { headers: corsHeaders });
    }

    // Get company owner
    const { data: company } = await supabase
      .from('companies')
      .select('owner_id')
      .eq('id', review.company_id)
      .single();

    if (!company?.owner_id) {
      return Response.json({ success: true, skipped: 'company or owner not found' }, { headers: corsHeaders });
    }

    const producerEmail = await getEmailByUserId(company.owner_id);
    if (!producerEmail) {
      return Response.json({ success: true, skipped: 'producer email not found' }, { headers: corsHeaders });
    }

    const ratingStr = review.rating ? `${review.rating}★` : '';
    const msgPreview = review.message ? ` - ${review.message.substring(0, 50)}${review.message.length > 50 ? '...' : ''}` : '';

    await createNotification({
      user_email: producerEmail,
      user_id: company.owner_id,
      title: 'Nuova recensione ricevuta',
      message: `Hai ricevuto una nuova recensione: ${ratingStr}${msgPreview}`,
      type: 'new_product',
      company_id: review.company_id,
    });

    return Response.json({ success: true }, { headers: corsHeaders });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
});
