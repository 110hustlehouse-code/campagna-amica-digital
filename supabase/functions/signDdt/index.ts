/**
 * signDdt
 * Conferma la ricezione di un DDT emesso da parte dello staff del mercato.
 * Imposta signed_by_recipient_user_id, signed_at, signature_method.
 * Rigenera il PDF con timbro di avvenuta ricezione e aggiorna pdf_url.
 * Notifica il produttore.
 *
 * Input: { deliveryNoteId: string }
 * Richiede JWT staff del mercato o admin.
 */
import { corsHeaders, getUserFromRequest, supabase, createNotification } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const user = await getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: 'Non autenticato' }, { status: 401, headers: corsHeaders });
    }

    const { deliveryNoteId } = await req.json();
    if (!deliveryNoteId) {
      return Response.json({ error: 'deliveryNoteId richiesto' }, { status: 400, headers: corsHeaders });
    }

    // ── Carica DDT ───────────────────────────────────────────────────────────
    const { data: dn, error: dnErr } = await supabase
      .from('delivery_notes')
      .select('*')
      .eq('id', deliveryNoteId)
      .single();

    if (dnErr || !dn) {
      return Response.json({ error: 'DDT non trovato' }, { status: 404, headers: corsHeaders });
    }

    if (dn.status !== 'issued') {
      return Response.json({ error: 'Solo i DDT emessi possono essere firmati' }, { status: 422, headers: corsHeaders });
    }

    if (dn.signed_at) {
      return Response.json({ error: 'DDT gia firmato' }, { status: 422, headers: corsHeaders });
    }

    // ── Verifica che il richiedente sia staff del mercato o admin ─────────────
    const isAdmin = user.role === 'admin';
    if (!isAdmin) {
      const { data: staffMember } = await supabase
        .from('staff_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('market_id', dn.market_id)
        .maybeSingle();

      if (!staffMember) {
        return Response.json({ error: 'Solo lo staff del mercato puo firmare il DDT' }, { status: 403, headers: corsHeaders });
      }
    }

    // ── Firma ────────────────────────────────────────────────────────────────
    const signedAt = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from('delivery_notes')
      .update({
        signed_by_recipient_user_id: user.id,
        signed_at:        signedAt,
        signature_method: 'digital_in_app',
      })
      .eq('id', deliveryNoteId);

    if (updateErr) {
      console.error('[signDdt] update error:', updateErr);
      return Response.json({ error: 'Errore durante la firma: ' + updateErr.message }, { status: 500, headers: corsHeaders });
    }

    // ── Rigenera PDF con timbro ───────────────────────────────────────────────
    // Chiama exportDdtPDF come service-role (auth header con service role key)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const pdfRes = await fetch(`${supabaseUrl}/functions/v1/exportDdtPDF`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        ...corsHeaders,
      },
      body: JSON.stringify({ deliveryNoteId, signedAt, signerName: user.email ?? user.id }),
    });

    let pdfUrl: string | null = null;
    if (pdfRes.ok) {
      const pdfData = await pdfRes.json();
      pdfUrl = pdfData.pdf_url ?? null;
    } else {
      // Non bloccare la firma se la rigenerazione PDF fallisce — logga e va avanti
      const errText = await pdfRes.text().catch(() => '');
      console.error('[signDdt] PDF regen failed:', pdfRes.status, errText);
    }

    // ── Notifica produttore ───────────────────────────────────────────────────
    const { data: company } = await supabase
      .from('companies')
      .select('name, owner_id')
      .eq('id', dn.company_id)
      .single();

    if (company?.owner_id) {
      const { data: ownerUser } = await supabase
        .from('users')
        .select('email')
        .eq('id', company.owner_id)
        .single();

      if (ownerUser?.email) {
        const ddtLabel = dn.progressive_number
          ? `DDT ${dn.progressive_year}-${String(dn.progressive_number).padStart(3, '0')}`
          : 'DDT';
        await createNotification({
          user_email: ownerUser.email,
          user_id:    company.owner_id,
          title:      `${ddtLabel} firmato`,
          message:    `Il tuo ${ddtLabel} e stato ricevuto e firmato dallo staff del mercato.`,
          type:       'generic',
          company_id: dn.company_id,
        });
      }
    }

    return Response.json({ success: true, signed_at: signedAt, pdf_url: pdfUrl }, { headers: corsHeaders });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[signDdt] error:', msg);
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
});
