/**
 * notifyFavoriteProduct
 * Notifica il produttore quando un cliente aggiunge la sua azienda/prodotto ai preferiti.
 * Triggered from DB webhook on INSERT to public.favorites.
 */
import { corsHeaders, supabase, getEmailByUserId, createNotification, validateWebhookSecret } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // C4 — only pg_net DB triggers may call this function
  if (!validateWebhookSecret(req)) {
    return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
  }

  try {
    // Support both direct call and DB webhook payload
    const body = await req.json();
    const { company_id, is_company_favorite, product_id } = body.data
      ? { company_id: body.data.company_id, is_company_favorite: !body.data.product_id, product_id: body.data.product_id }
      : body;

    if (!company_id) {
      return Response.json({ error: 'Missing company_id' }, { status: 400, headers: corsHeaders });
    }

    // Get company owner email (prefer owner_id → public.users over company.email contact field)
    const { data: company } = await supabase
      .from('companies')
      .select('owner_id, email, name')
      .eq('id', company_id)
      .single();

    if (!company) {
      return Response.json({ error: 'Company not found' }, { status: 404, headers: corsHeaders });
    }

    const producerEmail = (company.owner_id ? await getEmailByUserId(company.owner_id) : null)
      ?? company.email;

    if (!producerEmail) {
      return Response.json({ error: 'Company has no email' }, { status: 400, headers: corsHeaders });
    }

    const title = is_company_favorite
      ? "L'azienda è stata aggiunta ai preferiti!"
      : (product_id ? 'Un prodotto è stato aggiunto ai preferiti!' : 'Un cliente ti segue!');

    const message = is_company_favorite
      ? 'La tua azienda è stata aggiunta ai preferiti da un cliente! Questo aumenta la tua visibilità.'
      : (product_id ? 'Il tuo prodotto è stato aggiunto ai preferiti.' : 'Un nuovo cliente sta seguendo la tua azienda.');

    await createNotification({
      user_email: producerEmail,
      user_id: company.owner_id ?? undefined,
      title,
      message,
      type: 'new_product',
      company_id,
      product_id: product_id || null,
    });

    return Response.json({ success: true }, { headers: corsHeaders });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
});
