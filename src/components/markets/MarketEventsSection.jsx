import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar, MapPin, AlertCircle, Clock, Users, Check, X, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';

function getEventUrgency(eventDate) {
  const date = new Date(eventDate);
  if (isPast(date) && !isToday(date)) return 'past';
  if (isToday(date)) return 'today';
  const days = differenceInDays(date, new Date());
  if (days <= 7) return 'soon';
  return 'upcoming';
}

const URGENCY_STYLE = {
  past:     { card: 'bg-slate-50 border-slate-200 opacity-60',     badge: 'bg-slate-200 text-slate-600',   label: 'Concluso' },
  today:    { card: 'bg-green-50 border-green-300 ring-2 ring-green-200', badge: 'bg-green-200 text-green-700', label: '🟢 Oggi!' },
  soon:     { card: 'bg-orange-50 border-orange-200',              badge: 'bg-orange-200 text-orange-700', label: '⚡ Imminente' },
  upcoming: { card: 'bg-white border-border',                      badge: null,                             label: null },
};

export default function MarketEventsSection({ marketId }) {
  const [expandedId, setExpandedId] = useState(null);
  const qc = useQueryClient();

  useEffect(() => {
    const unsub1 = base44.entities.ProducerEventRsvp.subscribe(() => {
      qc.invalidateQueries({ queryKey: ['market-rsvps', marketId] });
    });
    const unsub2 = base44.entities.StaffMessage.subscribe(() => {
      qc.invalidateQueries({ queryKey: ['market-staff-events', marketId] });
    });
    return () => { unsub1(); unsub2(); };
  }, [marketId, qc]);

  const { data: events = [] } = useQuery({
    queryKey: ['market-staff-events', marketId],
    queryFn: async () => {
      const all = await base44.entities.StaffMessage.filter({ is_published: true, market_id: marketId });
      return all
        .filter(m => m.type === 'event')
        .sort((a, b) => {
          // today first, then future soonest-first, then past
          const ua = getEventUrgency(a.event_date);
          const ub = getEventUrgency(b.event_date);
          const order = { today: 0, soon: 1, upcoming: 2, past: 3 };
          if (order[ua] !== order[ub]) return order[ua] - order[ub];
          return new Date(a.event_date) - new Date(b.event_date);
        });
    },
    enabled: !!marketId,
  });

  const { data: allRsvps = [] } = useQuery({
    queryKey: ['market-rsvps', marketId],
    queryFn: () => base44.entities.ProducerEventRsvp.filter({ market_id: marketId }),
    enabled: !!marketId,
    refetchInterval: 30000,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['all-companies-map'],
    queryFn: () => base44.entities.Company.filter({ is_registered: true }, '-created_date', 500),
  });

  const companyMap = Object.fromEntries(companies.map(c => [c.id, c]));

  if (events.length === 0) return (
    <div className="px-6 md:px-12 pt-12 pb-8 text-center">
      <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
      <p className="text-muted-foreground text-sm">Nessun evento o comunicazione per questo mercato</p>
    </div>
  );

  return (
    <div className="px-6 md:px-12 pt-6 pb-8">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-primary" />
        <h2 className="font-heading text-xl font-bold text-foreground">Comunicazioni & Eventi</h2>
        <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">{events.length}</span>
      </div>

      <div className="space-y-3">
        {events.map(event => {
          const urgency = getEventUrgency(event.event_date);
          const style = URGENCY_STYLE[urgency];
          const eventRsvps = allRsvps.filter(r => r.message_id === event.id);
          const accepted = eventRsvps.filter(r => r.status === 'accepted');
          const declined = eventRsvps.filter(r => r.status === 'declined');
          const pending = eventRsvps.filter(r => r.status === 'pending');
          const isExpanded = expandedId === event.id;
          const hasRsvpDetails = !event.is_mandatory && eventRsvps.length > 0;

          return (
            <div
              key={event.id}
              className={`rounded-2xl border-2 overflow-hidden transition-all ${style.card}`}
            >
              {/* Header */}
              <div
                className={`p-4 ${hasRsvpDetails ? 'cursor-pointer' : ''}`}
                onClick={() => hasRsvpDetails && setExpandedId(isExpanded ? null : event.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    {urgency === 'today' || urgency === 'soon'
                      ? <Zap className="w-5 h-5 text-orange-500" />
                      : event.is_mandatory
                        ? <AlertCircle className="w-5 h-5 text-amber-600" />
                        : <Calendar className="w-5 h-5 text-blue-500" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Title + badges */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-foreground text-sm">{event.title}</h3>
                      {style.badge && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${style.badge}`}>
                          {style.label}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        event.is_mandatory ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {event.is_mandatory ? '🔴 Obbligatorio' : '🔵 Facoltativo'}
                      </span>
                    </div>

                    {event.description && (
                      <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{event.description}</p>
                    )}

                    {/* Date / location */}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(event.event_date), 'EEEE d MMMM yyyy', { locale: it })}
                        {event.time_start && ` · ${event.time_start}${event.time_end ? '–' + event.time_end : ''}`}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </span>
                      )}
                    </div>

                    {/* Participation summary */}
                    {event.is_mandatory ? (
                      <div className="mt-2 flex items-center gap-1 text-xs text-amber-700 font-semibold">
                        <Users className="w-3.5 h-3.5" /> Tutte le aziende del mercato presenti
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1 text-xs font-semibold text-green-700">
                          <Check className="w-3.5 h-3.5" /> {accepted.length} partecipano
                        </span>
                        <span className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                          <X className="w-3.5 h-3.5" /> {declined.length} declinato
                        </span>
                        {pending.length > 0 && (
                          <span className="text-xs text-muted-foreground italic">{pending.length} in attesa</span>
                        )}
                        {hasRsvpDetails && (
                          <span className="ml-auto flex items-center gap-0.5 text-xs text-primary font-semibold">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            {isExpanded ? 'Chiudi' : 'Vedi aziende'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded: per-company RSVP */}
              {isExpanded && !event.is_mandatory && (
                <div className="border-t border-border/40 bg-white/70 px-4 py-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Stato aziende</p>
                  <div className="space-y-1.5">
                    {eventRsvps.map(rsvp => {
                      const company = companyMap[rsvp.company_id];
                      if (!company) return null;
                      return (
                        <div key={rsvp.id} className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {company.logo_url
                              ? <img src={company.logo_url} alt="" className="w-4 h-4 object-contain rounded" />
                              : <span className="text-[10px] font-bold text-primary">{company.name?.[0]}</span>}
                          </div>
                          <span className="text-sm text-foreground flex-1 truncate">{company.name}</span>
                          {rsvp.status === 'accepted' && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                              <Check className="w-3.5 h-3.5" /> Partecipa
                            </span>
                          )}
                          {rsvp.status === 'declined' && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <X className="w-3.5 h-3.5" /> Non partecipa
                            </span>
                          )}
                          {rsvp.status === 'pending' && (
                            <span className="text-xs text-muted-foreground italic">In attesa</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}