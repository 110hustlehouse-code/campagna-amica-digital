import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, isBefore, isAfter, startOfToday, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarPlus, Clock, CheckCircle, AlertCircle, ChevronRight, Edit2, Trash2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

const today = startOfToday();

function getEventStatus(event) {
  const date = new Date(event.event_date);
  if (isBefore(date, today)) return { label: 'Concluso', color: 'bg-gray-100 text-gray-500', icon: '⏹' };
  if (isBefore(date, addDays(today, 3))) return { label: 'Imminente', color: 'bg-red-100 text-red-600', icon: '🔥' };
  if (isBefore(date, addDays(today, 7))) return { label: 'Questa settimana', color: 'bg-amber-100 text-amber-700', icon: '⏰' };
  return { label: 'Programmato', color: 'bg-green-100 text-green-700', icon: '✅' };
}

export default function EventsSection({ marketId }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editingEvent, setEditingEvent] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const { data: markets = [] } = useQuery({
    queryKey: ['markets-list'],
    queryFn: () => base44.entities.Market.list('name', 500),
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['staff-events', marketId],
    queryFn: () => base44.entities.StaffMessage.filter({ type: 'event' }, '-event_date', 200),
    refetchInterval: 30000,
  });

  const filteredEvents = marketId
    ? events.filter(e => {
        const market = markets.find(m => m.id === marketId);
        return market && e.location === market.name;
      })
    : events;

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StaffMessage.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-events'] });
      setEditingEvent(null);
      toast({ title: '✅ Evento aggiornato' });
    },
    onError: (err) => toast({ title: 'Errore', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.StaffMessage.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-events'] });
      setExpanded(null);
      toast({ title: 'Evento eliminato' });
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>;
  }

  if (filteredEvents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CalendarPlus className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Nessun evento programmato</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredEvents.map((event) => {
        const status = getEventStatus(event);
        const isExpanded = expanded === event.id;
        const isPast = isBefore(new Date(event.event_date), today);

        return (
          <div
            key={event.id}
            className={`rounded-xl border-2 transition-all duration-150 overflow-hidden ${
              isPast
                ? 'border-border/30 bg-muted/30 opacity-70'
                : isExpanded
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-border/50 bg-white hover:border-primary/30 hover:shadow-sm'
            }`}
          >
            <button
              className="w-full text-left p-4"
              onClick={() => setExpanded(isExpanded ? null : event.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${status.color}`}>
                      {status.icon} {status.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      event.is_mandatory ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {event.is_mandatory ? '🔴 Obbligatorio' : '🔵 Facoltativo'}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-foreground truncate">{event.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(event.event_date), 'dd MMM yyyy', { locale: it })}
                      {event.time_start && ` · ${event.time_start}${event.time_end ? `–${event.time_end}` : ''}`}
                    </span>
                    {event.location && (
                      <span>📍 {event.location}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-primary/20 pt-3">
                {event.description && (
                  <p className="text-xs text-muted-foreground mb-3">{event.description}</p>
                )}
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={(e) => { e.stopPropagation(); setEditingEvent({ ...event }); }}
                  >
                    <Edit2 className="w-3 h-3" /> Modifica
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(event.id); }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-3 h-3" /> Elimina
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Edit Dialog */}
      {editingEvent && (
        <Dialog open onOpenChange={() => !updateMutation.isPending && setEditingEvent(null)}>
          <DialogContent className="max-w-md mx-4 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">Modifica Evento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Titolo *</label>
                <Input
                  value={editingEvent.title}
                  onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Descrizione</label>
                <textarea
                  value={editingEvent.description || ''}
                  onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg text-sm resize-none"
                  rows="2"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Data *</label>
                <input
                  type="date"
                  value={editingEvent.event_date}
                  onChange={e => setEditingEvent({ ...editingEvent, event_date: e.target.value })}
                  className="w-full px-3 py-2.5 border border-input rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Ora inizio</label>
                  <input
                    type="time"
                    value={editingEvent.time_start || ''}
                    onChange={e => setEditingEvent({ ...editingEvent, time_start: e.target.value })}
                    className="w-full px-3 py-2.5 border border-input rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Ora fine</label>
                  <input
                    type="time"
                    value={editingEvent.time_end || ''}
                    onChange={e => setEditingEvent({ ...editingEvent, time_end: e.target.value })}
                    className="w-full px-3 py-2.5 border border-input rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingEvent({ ...editingEvent, is_mandatory: true })}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold border-2 transition-all ${
                    editingEvent.is_mandatory ? 'border-red-500 bg-red-50 text-red-700' : 'border-border text-muted-foreground'
                  }`}
                >
                  🔴 Obbligatorio
                </button>
                <button
                  type="button"
                  onClick={() => setEditingEvent({ ...editingEvent, is_mandatory: false })}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold border-2 transition-all ${
                    !editingEvent.is_mandatory ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-border text-muted-foreground'
                  }`}
                >
                  🔵 Facoltativo
                </button>
              </div>
            </div>
            <DialogFooter className="gap-2 mt-2">
              <Button variant="outline" onClick={() => setEditingEvent(null)} disabled={updateMutation.isPending}>
                Annulla
              </Button>
              <Button
                onClick={() => updateMutation.mutate({ id: editingEvent.id, data: editingEvent })}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}