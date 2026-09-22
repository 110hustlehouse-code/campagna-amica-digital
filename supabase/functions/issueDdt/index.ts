import { corsHeaders, getUserFromRequest, supabase } from '../_shared/supabase.ts';

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

    const { deliveryNoteId } = await req.json();
    if (!deliveryNoteId) {
      return new Response(JSON.stringify({ error: 'deliveryNoteId richiesto' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Carica DDT + items ────────────────────────────────────────────────────
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

    // Verifica ownership (company del produttore)
    const { data: company } = await supabase
      .from('companies')
      .select('id, owner_id')
      .eq('id', dn.company_id)
      .single();

    if (!company || company.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Non autorizzato' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (dn.status !== 'draft') {
      return new Response(JSON.stringify({ error: `DDT già in stato '${dn.status}'` }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: items, error: itemsErr } = await supabase
      .from('delivery_note_items')
      .select('*')
      .eq('delivery_note_id', deliveryNoteId)
      .order('position');

    if (itemsErr) throw itemsErr;
    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: 'Il DDT non ha righe prodotto' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Validazione campi obbligatori ────────────────────────────────────────
    const missingFields: string[] = [];
    if (!dn.recipient_name) missingFields.push('recipient_name');
    if (!dn.causale)        missingFields.push('causale');
    if (!dn.issue_date)     missingFields.push('issue_date');
    if (!dn.transport_date) missingFields.push('transport_date');
    if (missingFields.length > 0) {
      return new Response(JSON.stringify({ error: `Campi obbligatori mancanti: ${missingFields.join(', ')}` }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Progressive number via ddt_sequences (FOR UPDATE lock) ───────────────
    const issueYear = new Date(dn.issue_date).getFullYear();

    // 1) Assicura che la riga sequence esista
    await supabase.from('ddt_sequences').upsert(
      { company_id: dn.company_id, year: issueYear, last_number: 0 },
      { onConflict: 'company_id,year', ignoreDuplicates: true }
    );

    // 2) Incremento atomico via rpc (Postgres function con FOR UPDATE)
    const { data: seqData, error: seqErr } = await supabase.rpc('increment_ddt_sequence', {
      p_company_id: dn.company_id,
      p_year: issueYear,
    });
    if (seqErr) throw seqErr;
    const progressiveNumber = seqData as number;

    // ── Sync catalogo: match/create products ─────────────────────────────────
    const syncLogs: object[] = [];

    const enrichedItems: typeof items = [];

    for (const item of items) {
      let productId = item.product_id;

      if (!productId) {
        // Cerca per nome normalizzato
        const normalizedName = item.product_name.trim().toLowerCase();
        const { data: found } = await supabase
          .from('products')
          .select('id')
          .eq('company_id', dn.company_id)
          .ilike('name', normalizedName)
          .maybeSingle();

        if (found) {
          productId = found.id;
          syncLogs.push({
            delivery_note_id: deliveryNoteId,
            action: 'product_matched',
            product_id: productId,
            quantity_delta: item.quantity,
            payload: { source: 'name_match', product_name: item.product_name },
          });
        } else {
          // Crea prodotto
          const { data: created, error: createErr } = await supabase
            .from('products')
            .insert({
              company_id: dn.company_id,
              name: item.product_name,
              category: 'altro',
              unit: item.unit,
              price: 0,
              is_available: true,
            })
            .select('id')
            .single();
          if (createErr) throw createErr;
          productId = created.id;
          syncLogs.push({
            delivery_note_id: deliveryNoteId,
            action: 'product_created',
            product_id: productId,
            quantity_delta: item.quantity,
            payload: { product_name: item.product_name, unit: item.unit },
          });
        }

        // Backfill product_id sull'item
        await supabase
          .from('delivery_note_items')
          .update({ product_id: productId })
          .eq('id', item.id);
      }

      enrichedItems.push({ ...item, product_id: productId });
    }

    // ── Carry-over: prodotti già a banco da evento precedente ─────────────────
    // Trova stock esistenti per questo company_id che appartengono ad un evento
    // precedente (non il corrente) e non sono già carried_over
    const ddtProductIds = enrichedItems.map(i => i.product_id).filter(Boolean);

    const { data: existingStocks } = await supabase
      .from('product_stocks')
      .select('id, product_id, market_event_id')
      .eq('company_id', dn.company_id)   // company_id non è su product_stocks — join tramite product
      .neq('market_event_id', dn.market_event_id)
      .eq('is_carried_over', false)
      .not('quantity', 'is', null);

    // Degli stock di eventi precedenti, quelli il cui product_id NON è nel DDT → carry-over
    if (existingStocks && existingStocks.length > 0) {
      const carryOverIds = existingStocks
        .filter(s => !ddtProductIds.includes(s.product_id))
        .map(s => s.id);

      if (carryOverIds.length > 0) {
        await supabase
          .from('product_stocks')
          .update({
            is_carried_over: true,
            carried_over_from_event_id: null, // sarà valorizzato con il market_event_id precedente
          })
          .in('id', carryOverIds);
      }
    }

    // ── Sync stock: upsert product_stocks per questo event ───────────────────
    for (const item of enrichedItems) {
      if (!item.product_id) continue;

      const { data: existingStock } = await supabase
        .from('product_stocks')
        .select('id, quantity')
        .eq('product_id', item.product_id)
        .eq('market_event_id', dn.market_event_id)
        .maybeSingle();

      if (existingStock) {
        const newQty = (existingStock.quantity ?? 0) + item.quantity;
        await supabase
          .from('product_stocks')
          .update({ quantity: newQty, is_carried_over: false })
          .eq('id', existingStock.id);
      } else {
        await supabase
          .from('product_stocks')
          .insert({
            product_id: item.product_id,
            market_event_id: dn.market_event_id,
            quantity: item.quantity,
            unit: item.unit,
            is_carried_over: false,
          });
      }

      syncLogs.push({
        delivery_note_id: deliveryNoteId,
        action: 'stock_incremented',
        product_id: item.product_id,
        quantity_delta: item.quantity,
        payload: { market_event_id: dn.market_event_id, unit: item.unit },
      });
    }

    // ── Insert sync_log ───────────────────────────────────────────────────────
    if (syncLogs.length > 0) {
      await supabase.from('delivery_note_sync_log').insert(syncLogs);
    }

    // ── Promuovi a issued ─────────────────────────────────────────────────────
    const { data: updatedDn, error: updateErr } = await supabase
      .from('delivery_notes')
      .update({
        status: 'issued',
        issued_at: new Date().toISOString(),
        progressive_number: progressiveNumber,
        progressive_year: issueYear,
      })
      .eq('id', deliveryNoteId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    const syncSummary = {
      products_created: syncLogs.filter((l: any) => l.action === 'product_created').length,
      products_matched: syncLogs.filter((l: any) => l.action === 'product_matched').length,
      stocks_updated:   syncLogs.filter((l: any) => l.action === 'stock_incremented').length,
    };

    return new Response(
      JSON.stringify({ deliveryNote: updatedDn, syncSummary }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[issueDdt]', err);
    return new Response(
      JSON.stringify({ error: err?.message ?? 'Errore interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
