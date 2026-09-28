import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { subscribeTable } from '@/api/client';
import { getPublishedMessages } from '@/api/staff';
import { getRsvpsByMarket } from '@/api/events';
import { getCompaniesByMarket } from '@/api/companies';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Calendar, MapPin, AlertCircle, Clock, Users, Check, X, ChevronDown,
  Zap, CalendarClock, Search, ChevronRight,
} from 'lucide-react';
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

function getEventUrgency(eventDate) {
  const date = new Date(eventDate);
  if (isPast(date) && !isToday(date)) return 'past';
  if (isToday(date)) return 'today';
  const days = differenceInDays(date, new Date());
  if (days <= 7) return 'soon';
  return 'upcoming';
}

function relativeDateLabel(eventDate) {
  const date = new Date(eventDate);
  if (isToday(date)) return 'Oggi';
  if (isTomorrow(date)) return 'Domani';
  if (!isPast(date)) {
    const days = differenceInDays(date, new Date());
    if (days <= 7) return `Tra ${days} giorni`;
  }
  return format(date, 'd MMMM', { locale: it });
}

const URGENCY_BAR = {
  past:     'bg-slate-300',
  today:    'bg-green-500',
  soon:     'bg-orange-400',
  upcoming: 'bg-primary/40',
};

function AvatarIcon({ urgency, isMandatory }) {
  if (urgency === 'today' || urgency === 'soon') {
    return (
      <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
        <Zap className="w-4.5 h-4.5 text-white" />
      </div>
    );
  }
  if (isMandatory) {
    return (
      <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
        <AlertCircle className="w-4.5 h-4.5 text-white" />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
      <Calendar className="w-4.5 h-4.5 text-white" />
    </div>
  );
}

function UrgencyBadge({ urgency }) {
  if (urgency === 'today') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
        <Zap className="w-3 h-3" /> Oggi
      </span>
    );
  }
  if (urgency === 'soon') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">
        <Zap className="w-3 h-3" /> Imminente
      </span>
    );
  }
  return null;
}

function MandatoryBadge({ isMandatory }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
      isMandatory ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
    )}>
      {isMandatory
        ? <><AlertCircle className="w-3 h-3" /> Obbligatorio</>
        : <><Calendar className="w-3 h-3" /> Facoltativo</>}
    </span>
  );
}

function EventCard({ event, urgency, eventRsvps, onOpen, faded = false, highlight = false }) {
  const accepted = eventRsvps.filter(r => r.status === 'accepted');
  const declined = eventRsvps.filter(r => r.status === 'declined');
  const pending = eventRsvps.filter(r => r.status === 'pending');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(event)}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(event); }}
      className={cn(
        'rounded-2xl border overflow-hidden flex transition-all cursor-pointer',
        highlight
          ? 'border-green-300 bg-gradient-to-br from-green-50 to-white shadow-md'
          : 'border-border bg-white shadow-sm hover:shadow-md hover:border-primary/30',
        faded && 'opacity-60'
      )}
    >
      <div className={cn('w-1.5 flex-shrink-0', URGENCY_BAR[urgency])} />
      <div className="flex-1 min-w-0 p-4">
        <div className="flex items-start gap-3">
          <AvatarIcon urgency={urgency} isMandatory={event.is_mandatory} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-foreground text-sm">{event.title}</h3>
              <UrgencyBadge urgency={urgency} />
              <MandatoryBadge isMandatory={event.is_mandatory} />
            </div>

            {event.description && (
              <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{event.description}</p>
            )}

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 font-semibold text-foreground/80">
                <CalendarClock className="w-3 h-3" />
                {relativeDateLabel(event.event_date)}
              </span>
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

            <div className="mt-2 flex items-center gap-3 flex-wrap">
              {event.is_mandatory ? (
                <span className="flex items-center gap-1 text-xs text-amber-700 font-semibold">
                  <Users className="w-3.5 h-3.5" /> Tutte le aziende del mercato presenti
                </span>
              ) : (
                <>
                  <span className="flex items-center gap-1 text-xs font-semibold text-green-700">
                    <Check className="w-3.5 h-3.5" /> {accepted.length} partecipano
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                    <X className="w-3.5 h-3.5" /> {declined.length} declinato
                  </span>
                  {pending.length > 0 && (
                    <span className="text-xs text-muted-foreground italic">{pending.length} in attesa</span>
                  )}
                </>
              )}
              <span className="ml-auto flex items-center gap-0.5 text-xs text-primary font-semibold">
                Vedi partecipazioni <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const STATUS_META = {
  accepted:     { label: 'Presente',       className: 'text-green-600',   icon: Check },
  declined:     { label: 'Non partecipa',  className: 'text-slate-400',   icon: X },
  pending:      { label: 'In attesa',      className: 'text-muted-foreground italic', icon: null },
  no_response:  { label: 'Non risposto',   className: 'text-muted-foreground italic', icon: null },
  mandatory:    { label: 'Presente',       className: 'text-amber-700',   icon: Check },
};

const STATUS_ORDER = { accepted: 0, pending: 1, no_response: 2, declined: 3, mandatory: 0 };

function ParticipationsDialog({ event, marketCompanies, eventRsvps, onClose }) {
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    if (!event) return [];
    const rsvpByCompany = Object.fromEntries(eventRsvps.map(r => [r.company_id, r]));
    return marketCompanies
      .map(c => ({
        company: c,
        status: event.is_mandatory ? 'mandatory' : (rsvpByCompany[c.id]?.status || 'no_response'),
      }))
      .sort((a, b) => {
        const diff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (diff !== 0) return diff;
        return (a.company.name || '').localeCompare(b.company.name || '');
      });
  }, [event, marketCompanies, eventRsvps]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => (r.company.name || '').toLowerCase().includes(q));
  }, [rows, search]);

  const acceptedCount = rows.filter(r => r.status === 'accepted' || r.status === 'mandatory').length;

  if (!event) return null;

  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{event.title}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 text-xs text-muted-foreground border-b border-border/50 pb-3 flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(event.event_date), 'd MMMM yyyy', { locale: it })}
          </span>
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {event.location}
            </span>
          )}
          <span className="ml-auto font-semibold text-foreground">
            {acceptedCount}/{rows.length} presenti
          </span>
        </div>

        <div className="relative flex-shrink-0">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca azienda..."
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1">
          {filteredRows.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Nessuna azienda trovata.</p>
          )}
          {filteredRows.map(({ company, status }) => {
            const meta = STATUS_META[status];
            const Icon = meta.icon;
            return (
              <div key={company.id} className="flex items-center gap-2 py-1.5 px-1 rounded-lg hover:bg-slate-50">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {company.logo_url
                    ? <img src={company.logo_url} alt="" className="w-4.5 h-4.5 object-contain rounded" />
                    : <span className="text-[10px] font-bold text-primary">{company.name?.[0]}</span>}
                </div>
                <span className="text-sm text-foreground flex-1 truncate">{company.name}</span>
                <span className={cn('flex items-center gap-1 text-xs font-semibold flex-shrink-0', meta.className)}>
                  {Icon && <Icon className="w-3.5 h-3.5" />} {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MarketEventsSection({ marketId }) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showPast, setShowPast] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    const unsub1 = subscribeTable('producer_event_rsvps', () => {
      qc.invalidateQueries({ queryKey: ['market-rsvps', marketId] });
    });
    const unsub2 = subscribeTable('staff_messages', () => {
      qc.invalidateQueries({ queryKey: ['market-staff-events', marketId] });
    });
    return () => { unsub1(); unsub2(); };
  }, [marketId, qc]);

  const { data: events = [] } = useQuery({
    queryKey: ['market-staff-events', marketId],
    queryFn: async () => {
      const all = await getPublishedMessages(marketId);
      return all.filter(m => m.type === 'event');
    },
    enabled: !!marketId,
  });

  const { data: allRsvps = [] } = useQuery({
    queryKey: ['market-rsvps', marketId],
    queryFn: () => getRsvpsByMarket(marketId),
    enabled: !!marketId,
    refetchInterval: 30000,
  });

  const { data: marketCompanies = [] } = useQuery({
    queryKey: ['market-companies-for-events', marketId],
    queryFn: () => getCompaniesByMarket(marketId),
    enabled: !!marketId,
  });

  if (events.length === 0) return (
    <div className="px-6 md:px-12 pt-12 pb-8 text-center">
      <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
      <p className="text-muted-foreground text-sm">Nessun evento o comunicazione per questo mercato</p>
    </div>
  );

  const withUrgency = events.map(e => ({ ...e, _urgency: getEventUrgency(e.event_date) }));
  const todayEvents = withUrgency.filter(e => e._urgency === 'today');
  const upcomingEvents = withUrgency
    .filter(e => e._urgency === 'soon' || e._urgency === 'upcoming')
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
  const pastEvents = withUrgency
    .filter(e => e._urgency === 'past')
    .sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

  const mandatoryCount = withUrgency.filter(e => e._urgency !== 'past' && e.is_mandatory).length;
  const activeCount = todayEvents.length + upcomingEvents.length;

  const renderCard = (event, { faded = false, highlight = false } = {}) => {
    const eventRsvps = allRsvps.filter(r => r.message_id === event.id);
    return (
      <EventCard
        key={event.id}
        event={event}
        urgency={event._urgency}
        eventRsvps={eventRsvps}
        onOpen={setSelectedEvent}
        faded={faded}
        highlight={highlight}
      />
    );
  };

  const selectedEventRsvps = selectedEvent ? allRsvps.filter(r => r.message_id === selectedEvent.id) : [];

  return (
    <div className="px-6 md:px-12 pt-6 pb-8">
      <div className="flex items-center gap-2 mb-1">
        <Calendar className="w-5 h-5 text-primary" />
        <h2 className="font-heading text-xl font-bold text-foreground">Comunicazioni & Eventi</h2>
        <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">{activeCount}</span>
      </div>
      {mandatoryCount > 0 && (
        <p className="text-xs text-amber-700 font-semibold mb-4 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" /> {mandatoryCount} obbligatori in programma
        </p>
      )}
      {mandatoryCount === 0 && <div className="mb-4" />}

      {todayEvents.length > 0 && (
        <div className="mb-4">
          <p className="text-[11px] font-bold text-green-700 uppercase tracking-wide mb-2">Oggi</p>
          <div className="space-y-3">{todayEvents.map(e => renderCard(e, { highlight: true }))}</div>
        </div>
      )}

      {upcomingEvents.length > 0 && (
        <div className="mb-4">
          {todayEvents.length > 0 && (
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Prossimi</p>
          )}
          <div className="space-y-3">{upcomingEvents.map(e => renderCard(e))}</div>
        </div>
      )}

      {todayEvents.length === 0 && upcomingEvents.length === 0 && pastEvents.length > 0 && (
        <p className="text-sm text-muted-foreground mb-4">Nessun evento in programma al momento.</p>
      )}

      {pastEvents.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowPast(v => !v)}
            className="w-full flex items-center justify-between rounded-xl bg-slate-50 border border-border/50 px-3 py-2 text-left hover:bg-slate-100 transition-colors"
          >
            <span className="text-xs font-semibold text-muted-foreground">
              Eventi passati ({pastEvents.length})
            </span>
            <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', showPast && 'rotate-180')} />
          </button>
          {showPast && (
            <div className="space-y-3 mt-3">{pastEvents.map(e => renderCard(e, { faded: true }))}</div>
          )}
        </div>
      )}

      <ParticipationsDialog
        event={selectedEvent}
        marketCompanies={marketCompanies}
        eventRsvps={selectedEventRsvps}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
