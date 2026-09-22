import { corsHeaders, getUserFromRequest, supabase } from '../_shared/supabase.ts';

const CANCEL_WINDOW_HOURS = 2;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const user = await getUserFromRequest(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Non autenticato' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { deliveryNoteId, reason } = await req.json();
    if (!deliveryNoteId || !reason?.trim()) {
      return new Response(JSON.stringify({ error: 'deliveryNoteId e reason sono obbligatori' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Carica DDT ────────────────────────────────────────────────────────────
    const { data: dn, error: dnErr } = await supabase
      .from('delivery_notes')
      .select('*')
      .eq('id', deliveryNoteId)
      .single();

    if (dnErr || !dn) {
      return new Response(JSON.stringify({ error: 'DDT non trovato' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verifica ownership
    const { data: company } = await supabase
      .from('companies')
      .select('id, owner_id')
      .eq('id', dn.company_id)
      .single();

    const isAdmin = user.role === 'admin';
    if (!company || (company.owner_id !== user.id && !isAdmin)) {
      return new Response(JSON.stringify({ error: 'Non autorizzato' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (dn.status !== 'issued') {
      return new Response(JSON.stringify({ error: `DDT non annullabile: stato '${dn.status}'` }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Verifica finestra 2h (solo per non-admin) ─────────────────────────────
    if (!isAdmin) {
      const issuedAt = new Date(dn.issued_at).getTime();
      const windowMs = CANCEL_WINDOW_HOURS * 60 * 60 * 1000;
      if (Date.now() - issuedAt > windowMs) {
        return new Response(
          JSON.stringify({ error: 'Annullamento non più consentito (finestra 2h scaduta). Contatta l\'amministratore.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ── Carica items ──────────────────────────────────────────────────────────
    const { data: items, error: itemsErr } = await supabase
      .from('delivery_note_items')
      .select('*')
      .eq('delivery_note_id', deliveryNoteId);

    if (itemsErr) throw itemsErr;

    // ── Reverse stock ─────────────────────────────────────────────────────────
    const syncLogs: object[] = [];

    for (const item of (items ?? [])) {
      if (!item.product_id) continue;

      const { data: stock } = await supabase
        .from('product_stocks')
        .select('id, quantity')
        .eq('product_id', item.product_id)
        .eq('market_event_id', dn.market_event_id)
        .maybeSingle();

      if (!stock) continue;

      const newQty = (stock.quantity ?? 0) - item.quantity;
      if (newQty < 0) {
        return new Response(
          JSON.stringify({ error: `Stock già consumato per "${item.product_name}" — annullamento non possibile.` }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase
        .from('product_stocks')
        .update({ quantity: newQty })
        .eq('id', stock.id);

      syncLogs.push({
        delivery_note_id: deliveryNoteId,
        action: 'stock_reverted',
        product_id: item.product_id,
        quantity_delta: -item.quantity,
        payload: { market_event_id: dn.market_event_id, new_quantity: newQty },
      });
    }

    if (syncLogs.length > 0) {
      await supabase.from('delivery_note_sync_log').insert(syncLogs);
    }

    // ── Promuovi a cancelled ──────────────────────────────────────────────────
    const { data: updatedDn, error: updateErr } = await supabase
      .from('delivery_notes')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason.trim(),
      })
      .eq('id', deliveryNoteId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return new Response(
      JSON.stringify({ deliveryNote: updatedDn, stocksReverted: syncLogs.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[cancelDdt]', err);
    return new Response(
      JSON.stringify({ error: err?.message ?? 'Errore interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
