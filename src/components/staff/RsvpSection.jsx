import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOptionalMessages, getRsvpsByMarket } from '@/api/events';
import { getCompaniesByMarket } from '@/api/companies';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CheckCircle2, XCircle, Clock, Users, ChevronDown, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_META = {
  accepted: { label: 'Presente', icon: CheckCircle2, className: 'text-green-600' },
  declined: { label: 'Assente', icon: XCircle, className: 'text-slate-400' },
  pending:  { label: 'In attesa', icon: Clock, className: 'text-amber-500' },
};
const STATUS_ORDER = { accepted: 0, pending: 1, declined: 2 };

function CountBadge({ count, tone, Icon }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold', tone)}>
      <Icon className="w-3 h-3" /> {count}
    </span>
  );
}

function EventRsvpCard({ event, eventRsvps, companyMap }) {
  const [open, setOpen] = useState(false);
  const accepted = eventRsvps.filter(r => r.status === 'accepted');
  const declined = eventRsvps.filter(r => r.status === 'declined');
  const pending = eventRsvps.filter(r => r.status === 'pending');

  const sortedRsvps = [...eventRsvps].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50/70 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
          <Users className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{event.title}</p>
          {event.event_date && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3" />
              {format(new Date(event.event_date), 'd MMM yyyy', { locale: it })}
            </p>
          )}
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <CountBadge count={accepted.length} Icon={CheckCircle2} tone="bg-green-50 text-green-700" />
          <CountBadge count={declined.length} Icon={XCircle} tone="bg-slate-100 text-slate-500" />
          <CountBadge count={pending.length} Icon={Clock} tone="bg-amber-50 text-amber-600" />
        </div>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="border-t border-border/50 px-4 py-3 space-y-1">
          {sortedRsvps.length === 0 && (
            <p className="text-xs text-muted-foreground py-1">Nessuna risposta ricevuta.</p>
          )}
          {sortedRsvps.map(rsvp => {
            const meta = STATUS_META[rsvp.status] || STATUS_META.pending;
            const Icon = meta.icon;
            const company = companyMap[rsvp.company_id];
            return (
              <div key={rsvp.id} className="flex items-center gap-2 py-1">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {company?.logo_url
                    ? <img src={company.logo_url} alt="" className="w-4 h-4 object-contain rounded" />
                    : <span className="text-[9px] font-bold text-primary">{(company?.name || rsvp.producer_email)?.[0]}</span>}
                </div>
                <span className="text-xs text-foreground flex-1 truncate">{company?.name || rsvp.producer_email}</span>
                <span className={cn('flex items-center gap-1 text-[11px] font-semibold flex-shrink-0', meta.className)}>
                  <Icon className="w-3.5 h-3.5" /> {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RsvpSection({ marketId }) {
  const { data: events = [] } = useQuery({
    queryKey: ['rsvp-events', marketId],
    queryFn: () => getOptionalMessages(marketId),
    enabled: !!marketId,
  });

  const { data: rsvps = [] } = useQuery({
    queryKey: ['rsvp-list', marketId],
    queryFn: () => getRsvpsByMarket(marketId),
    enabled: !!marketId,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['rsvp-companies', marketId],
    queryFn: () => getCompaniesByMarket(marketId),
    enabled: !!marketId,
  });
  const companyMap = Object.fromEntries(companies.map(c => [c.id, c]));

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">Nessun evento facoltativo trovato.</p>;
  }

  const sortedEvents = [...events].sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

  return (
    <div className="space-y-3 mt-2">
      {sortedEvents.map(event => (
        <EventRsvpCard
          key={event.id}
          event={event}
          eventRsvps={rsvps.filter(r => r.message_id === event.id)}
          companyMap={companyMap}
        />
      ))}
    </div>
  );
}
