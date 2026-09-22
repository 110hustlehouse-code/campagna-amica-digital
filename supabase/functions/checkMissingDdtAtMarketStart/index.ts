/**
 * checkMissingDdtAtMarketStart
 * Cron Edge Function: gira 30 minuti dopo l'orario di apertura di ogni market_event.
 * Per ogni company assegnata all'evento: se NESSUN DDT issued E NESSUNA absence registrata
 * → notifica lo staff del mercato.
 *
 * Schedulazione: eseguita via pg_cron o Supabase scheduled functions
 * (vedi migration 20260603000014_cron_missing_ddt.sql)
 */

import { corsHeaders, validateWebhookSecret, supabase, bulkCreateNotifications } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Accettata solo da pg_net con webhook secret (o invocazione manuale admin)
  if (!validateWebhookSecret(req)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const now = new Date();
    const WINDOW_MINUTES = 30;

    // Trova eventi che sono iniziati da circa WINDOW_MINUTES (±10 min di tolleranza)
    const windowStart = new Date(now.getTime() - (WINDOW_MINUTES + 10) * 60000).toISOString();
    const windowEnd   = new Date(now.getTime() - (WINDOW_MINUTES - 10) * 60000).toISOString();

    // market_events che hanno un time_start che ricade nella finestra
    // Usa event_date + time_start per costruire il datetime completo
    const { data: events, error: eventsErr } = await supabase
      .from('market_events')
      .select('id, market_id, event_date, time_start')
      .not('time_start', 'is', null);

    if (eventsErr) throw eventsErr;

    // Filtra lato JS gli eventi che matchano la finestra oraria
    const nowDay = now.toISOString().split('T')[0];
    const targetEvents = (events ?? []).filter(ev => {
      if (!ev.event_date || !ev.time_start) return false;
      if (ev.event_date !== nowDay) return false;
      // Ricostruisce datetime da event_date + time_start (formato HH:MM o HH:MM:SS)
      const eventDt = new Date(`${ev.event_date}T${ev.time_start}`);
      const startDt = new Date(eventDt.getTime() + WINDOW_MINUTES * 60000);
      const diff = Math.abs(now.getTime() - startDt.getTime());
      return diff < 10 * 60000; // ±10 minuti
    });

    if (targetEvents.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nessun evento nella finestra oraria', checked: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let notificationsCreated = 0;

    for (const event of targetEvents) {
      // Trova le company assegnate a questo evento
      const { data: assignments } = await supabase
        .from('company_market_assignments')
        .select('company_id')
        .eq('market_event_id', event.id);

      if (!assignments || assignments.length === 0) continue;

      const companyIds = assignments.map((a: any) => a.company_id);

      for (const companyId of companyIds) {
        // Controlla se esiste già un DDT issued per questo (company, event)
        const { count: ddtCount } = await supabase
          .from('delivery_notes')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('market_event_id', event.id)
          .eq('status', 'issued');

        if ((ddtCount ?? 0) > 0) continue; // DDT già emesso → OK

        // Controlla se esiste un'assenza segnalata per questo (company, market)
        const today = now.toISOString().split('T')[0];
        const { count: absenceCount } = await supabase
          .from('absences')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('market_id', event.market_id)
          .eq('absence_date', today);

        if ((absenceCount ?? 0) > 0) continue; // Assenza già notificata → skip

        // Ottieni nome azienda per il messaggio
        const { data: company } = await supabase
          .from('companies')
          .select('name')
          .eq('id', companyId)
          .single();

        // Trova staff del mercato per notificarli
        const { data: staffMembers } = await supabase
          .from('staff_members')
          .select('user_id')
          .eq('market_id', event.market_id);

        if (!staffMembers || staffMembers.length === 0) continue;

        // Ottieni email dello staff
        const staffNotifications = [];
        for (const sm of staffMembers) {
          const { data: staffUser } = await supabase
            .from('users')
            .select('email')
            .eq('id', sm.user_id)
            .single();
          if (staffUser?.email) {
            staffNotifications.push({
              user_email: staffUser.email,
              user_id: sm.user_id,
              title: `Produttore non arrivato: ${company?.name || companyId}`,
              message: `Nessun DDT emesso e nessuna assenza segnalata per ${company?.name || 'un produttore'} assegnato all'evento di oggi.`,
              type: 'generic' as const,
            });
          }
        }

        if (staffNotifications.length > 0) {
          await bulkCreateNotifications(staffNotifications);
          notificationsCreated += staffNotifications.length;
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Check completato',
        events_checked: targetEvents.length,
        notifications_created: notificationsCreated,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[checkMissingDdtAtMarketStart]', err);
    return new Response(
      JSON.stringify({ error: err?.message ?? 'Errore interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
