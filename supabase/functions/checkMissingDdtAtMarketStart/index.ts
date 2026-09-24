/**
 * checkMissingDdtAtMarketStart
 * Cron: gira ogni 15-30 minuti. Per ogni mercato aperto OGGI (orario
 * ricorrente o evento speciale) e già iniziato: se un'azienda assegnata
 * non ha né DDT emesso né assenza dichiarata, crea (o mantiene) una
 * segnalazione persistente e notifica lo staff.
 */
import { corsHeaders, validateWebhookSecret, supabase, bulkCreateNotifications } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!validateWebhookSecret(req)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const now = new Date();
    const oggi = now.toISOString().split('T')[0];

    const { data: markets, error: marketsErr } = await supabase
      .from('markets')
      .select('id, recurring_days, recurring_time_start, recurring_time_end');
    if (marketsErr) throw marketsErr;

    const { data: eventiOggi } = await supabase
      .from('market_events')
      .select('id, market_id, time_start')
      .eq('event_date', oggi);

    const isodow = ((now.getUTCDay() + 6) % 7) + 1; // 1=lun...7=dom, coerente con extract(isodow)

    let segnalazioniCreate = 0;

    for (const market of markets ?? []) {
      const eventoSpeciale = (eventiOggi ?? []).find((e) => e.market_id === market.id);
      const aperto = (market.recurring_days ?? []).includes(isodow) || !!eventoSpeciale;
      if (!aperto) continue;

      const orarioApertura = eventoSpeciale?.time_start || market.recurring_time_start;
      if (!orarioApertura) continue; // nessun orario noto, non possiamo valutare

      const [oreStr, minStr] = String(orarioApertura).split(':');
      const aperturaMs = new Date(now);
      aperturaMs.setHours(Number(oreStr), Number(minStr), 0, 0);
      // Valutiamo solo 30+ minuti dopo l'apertura: prima è normale non avere ancora il DDT.
      if (now.getTime() - aperturaMs.getTime() < 30 * 60_000) continue;

      const { data: assignments } = await supabase
        .from('company_market_assignments')
        .select('company_id')
        .eq('market_id', market.id);

      for (const { company_id } of assignments ?? []) {
        const { count: ddtCount } = await supabase
          .from('delivery_notes')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', company_id).eq('market_id', market.id)
          .eq('transport_date', oggi).eq('status', 'issued');
        if ((ddtCount ?? 0) > 0) continue;

        const { count: absenceCount } = await supabase
          .from('absences')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', company_id).eq('market_id', market.id).eq('absence_date', oggi);
        if ((absenceCount ?? 0) > 0) continue;

        const { data: existing } = await supabase
          .from('missing_ddt_reports')
          .select('id')
          .eq('company_id', company_id).eq('market_id', market.id).eq('data_evento', oggi)
          .maybeSingle();
        if (existing) continue; // già segnalato oggi, non duplicare

        const { error: insertErr } = await supabase
          .from('missing_ddt_reports')
          .insert({ company_id, market_id: market.id, data_evento: oggi });
        if (insertErr) { console.error('[missing_ddt_reports insert]', insertErr.message); continue; }
        segnalazioniCreate++;

        const { data: company } = await supabase.from('companies').select('name').eq('id', company_id).single();
        const { data: staffMembers } = await supabase.from('staff_members').select('user_id').eq('market_id', market.id);

        const notifiche = [];
        for (const sm of staffMembers ?? []) {
          const { data: staffUser } = await supabase.from('users').select('email').eq('id', sm.user_id).single();
          if (staffUser?.email) {
            notifiche.push({
              user_email: staffUser.email, user_id: sm.user_id,
              title: `Produttore non arrivato: ${company?.name || company_id}`,
              message: `Nessun DDT emesso e nessuna assenza segnalata per ${company?.name || 'un produttore'} oggi.`,
              type: 'generic' as const,
            });
          }
        }
        if (notifiche.length > 0) await bulkCreateNotifications(notifiche);
      }
    }

    return new Response(JSON.stringify({ message: 'Check completato', segnalazioni_create: segnalazioniCreate }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[checkMissingDdtAtMarketStart]', err);
    return new Response(JSON.stringify({ error: err?.message ?? 'Errore interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});