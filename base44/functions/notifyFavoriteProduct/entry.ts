import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { company_id, is_company_favorite, product_id } = await req.json();

    if (!company_id) {
      return Response.json({ error: 'Missing company_id' }, { status: 400 });
    }

    // Get company
    const companies = await base44.asServiceRole.entities.Company.filter({ id: company_id });
    const company = companies[0];

    if (!company?.email) {
      return Response.json({ error: 'Company has no email' }, { status: 400 });
    }

    // Determine notification type
    const type = is_company_favorite 
      ? 'L\'azienda è stata aggiunta ai preferiti!' 
      : (product_id ? 'Un prodotto è stato aggiunto ai preferiti!' : 'Un cliente ti segue!');

    const message = is_company_favorite
      ? `La tua azienda è stata aggiunta ai preferiti da un cliente! Questo aumenta la tua visibilità.`
      : (product_id ? `Il tuo prodotto è stato aggiunto ai preferiti.` : `Un nuovo cliente sta seguendo la tua azienda.`);

    // Create notification in database
    await base44.asServiceRole.entities.Notification.create({
      user_email: company.email,
      title: type,
      message,
      type: 'new_product',
      company_id,
      product_id: product_id || undefined,
      read: false,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});