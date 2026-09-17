import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { need_id, message, company_id } = await req.json();

    if (!need_id || !company_id) {
      return Response.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Get the company to find the producer's email
    const company = await base44.entities.Company.list();
    const prod = company.find(c => c.id === company_id);
    
    if (!prod || !prod.created_by) {
      return Response.json({ error: 'Producer not found' }, { status: 404 });
    }

    // Get the need details
    const needs = await base44.entities.CompanyNeed.list();
    const need = needs.find(n => n.id === need_id);

    if (!need) {
      return Response.json({ error: 'Need not found' }, { status: 404 });
    }

    // Create notification for producer
    await base44.asServiceRole.entities.Notification.create({
      user_email: prod.created_by,
      title: '📱 Sessione aperta - ' + (need.title || 'Risposta ricevuta'),
      message: message,
      type: 'generic',
      company_id: company_id,
      read: false,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});