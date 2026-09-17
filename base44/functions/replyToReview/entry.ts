import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { review_id, reply_text } = body;

    if (!review_id || !reply_text) {
      return Response.json({ error: 'Missing review_id or reply_text' }, { status: 400 });
    }

    // Fetch the review
    const reviews = await base44.asServiceRole.entities.Review.filter({ id: review_id });
    if (reviews.length === 0) {
      return Response.json({ error: 'Review not found' }, { status: 404 });
    }

    const review = reviews[0];

    // Fetch the company to verify ownership and get creator info
    const companies = await base44.asServiceRole.entities.Company.filter({ id: review.company_id });
    if (companies.length === 0 || companies[0].created_by !== user.email) {
      return Response.json({ error: 'Unauthorized: Not the company owner' }, { status: 403 });
    }

    const company = companies[0];

    // Update the review with the reply
    await base44.asServiceRole.entities.Review.update(review_id, {
      reply: reply_text,
      reply_date: new Date().toISOString()
    });

    // Find the customer who wrote the review by fetching all orders and checking
    // This is a simple approach - in production you might store user_email in Review
    // For now we'll send to all users who have orders from this company
    const orders = await base44.asServiceRole.entities.Order.filter({ company_id: review.company_id });
    
    // Send notification to review author (if we can identify them)
    // Since we don't have user_email in Review, we notify all recent customers
    if (orders.length > 0) {
      const customerEmails = [...new Set(orders.map(o => o.created_by))];
      
      for (const email of customerEmails) {
        await base44.asServiceRole.entities.Notification.create({
          user_email: email,
          title: `${company.name} ha risposto alla tua recensione`,
          message: `"${reply_text}"`,
          type: 'review_reply',
          company_id: review.company_id,
          read: false
        });
      }
    }

    return Response.json({ success: true, message: 'Reply sent and notification created' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});