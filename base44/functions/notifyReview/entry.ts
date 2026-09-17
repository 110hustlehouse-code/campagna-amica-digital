import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Verifica che sia un evento di creazione review
    if (event.type !== 'create') {
      return Response.json({ success: true });
    }

    const review = data;
    if (!review.company_id) {
      return Response.json({ success: true });
    }

    // Recupera l'azienda per trovare l'email del produttore
    const company = await base44.asServiceRole.entities.Company.get(review.company_id);
    if (!company || !company.created_by) {
      return Response.json({ success: true });
    }

    // Crea una notifica per il produttore
    await base44.asServiceRole.entities.Notification.create({
      user_email: company.created_by,
      title: 'Nuova recensione ricevuta',
      message: `Hai ricevuto una nuova recensione: ${review.rating}★${review.message ? ' - ' + review.message.substring(0, 50) + '...' : ''}`,
      type: 'new_product',
      company_id: review.company_id,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});