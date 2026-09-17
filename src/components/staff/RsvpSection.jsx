import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const statusConfig = {
  accepted: { label: 'Accettato', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
  declined: { label: 'Rifiutato', icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
  pending: { label: 'In attesa', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
};

export default function RsvpSection({ marketId }) {
  const { data: events = [] } = useQuery({
    queryKey: ['rsvp-events', marketId],
    queryFn: () => base44.entities.StaffMessage.filter({ market_id: marketId, is_mandatory: false }, '-event_date', 50),
    enabled: !!marketId,
  });

  const { data: rsvps = [] } = useQuery({
    queryKey: ['rsvp-list', marketId],
    queryFn: () => base44.entities.ProducerEventRsvp.filter({ market_id: marketId }, '-created_date', 200),
    enabled: !!marketId,
  });

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">Nessun evento facoltativo trovato.</p>;
  }

  return (
    <div className="space-y-4 mt-2">
      {events.map(event => {
        const eventRsvps = rsvps.filter(r => r.message_id === event.id);
        const accepted = eventRsvps.filter(r => r.status === 'accepted');
        const declined = eventRsvps.filter(r => r.status === 'declined');
        const pending = eventRsvps.filter(r => r.status === 'pending');

        return (
          <div key={event.id} className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm text-foreground">{event.title}</p>
                {event.event_date && (
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(event.event_date), 'd MMM yyyy', { locale: it })}
                  </p>
                )}
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <Badge className="bg-green-50 text-green-700 text-xs">{accepted.length} ✓</Badge>
                <Badge className="bg-red-50 text-red-600 text-xs">{declined.length} ✗</Badge>
                <Badge className="bg-amber-50 text-amber-600 text-xs">{pending.length} ⏳</Badge>
              </div>
            </div>

            {eventRsvps.length > 0 && (
              <div className="space-y-1.5">
                {eventRsvps.map(rsvp => {
                  const cfg = statusConfig[rsvp.status] || statusConfig.pending;
                  const Icon = cfg.icon;
                  return (
                    <div key={rsvp.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${cfg.bg}`}>
                      <Icon className={`w-3.5 h-3.5 ${cfg.color} flex-shrink-0`} />
                      <span className="text-xs text-foreground truncate">{rsvp.producer_email}</span>
                      <span className={`ml-auto text-[11px] font-medium ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {eventRsvps.length === 0 && (
              <p className="text-xs text-muted-foreground">Nessuna risposta ricevuta.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}