/**
 * replyToReview
 * Il produttore risponde a una recensione. Aggiorna il campo reply su reviews
 * e notifica il cliente autore della recensione.
 *
 * Chiamata dal frontend: api.functions.invoke('replyToReview', { review_id, reply_text })
 */
import { corsHeaders, supabase, getEmailByUserId, createNotification, getUserFromRequest } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const { review_id, reply_text } = await req.json();
    if (!review_id || !reply_text) {
      return Response.json({ error: 'Missing review_id or reply_text' }, { status: 400, headers: corsHeaders });
    }

    // Fetch the review
    const { data: review } = await supabase
      .from('reviews')
      .select('company_id, user_id')
      .eq('id', review_id)
      .single();

    if (!review) {
      return Response.json({ error: 'Review not found' }, { status: 404, headers: corsHeaders });
    }

    // Verify the requester is the company owner
    const { data: company } = await supabase
      .from('companies')
      .select('owner_id, name')
      .eq('id', review.company_id)
      .single();

    if (!company || company.owner_id !== user.id) {
      return Response.json({ error: 'Unauthorized: Not the company owner' }, { status: 403, headers: corsHeaders });
    }

    // Update review with reply
    await supabase.from('reviews').update({
      reply: reply_text,
      reply_date: new Date().toISOString(),
    }).eq('id', review_id);

    // Notify the review author
    const reviewerEmail = await getEmailByUserId(review.user_id);
    if (reviewerEmail) {
      await createNotification({
        user_email: reviewerEmail,
        user_id: review.user_id,
        title: `${company.name} ha risposto alla tua recensione`,
        message: `"${reply_text}"`,
        type: 'generic',
        company_id: review.company_id,
      });
    }

    return Response.json({ success: true, message: 'Reply saved and notification sent' }, { headers: corsHeaders });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
});
