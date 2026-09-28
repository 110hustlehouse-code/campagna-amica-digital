import PageHeader from '@/components/layout/PageHeader';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyCompany } from '@/api/companies';
import { getMarkets } from '@/api/markets';
import { getAssignmentsByCompany, getMyRsvps, getRemindersByCompany } from '@/api/events';
import { getProductsByCompany } from '@/api/products';
import { getPublishedMessagesAll } from '@/api/staff';
import { getNeedsByCompany, getResponsesByNeeds, ETICHETTE_STATO, ETICHETTE_CATEGORIA } from '@/api/needs';
import { invokeFunction } from '@/api/functions';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Calendar, MapPin, Leaf, Check, X, Clock, AlertCircle, Zap, ThumbsUp, ThumbsDown, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import ProducerSessionPanel from '@/components/producer/ProducerSessionPanel';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function ProducerMarkets() {
  const { user } = useAuth();
  const [openNeedIds, setOpenNeedIds] = useState({});
  const qc = useQueryClient();
  const { toast } = useToast();
  const [expandedMessages, setExpandedMessages] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState(false);
  const [detailMsg, setDetailMsg] = useState(null);

  const { data: myCompany } = useQuery({
    queryKey: ['my-company', user?.email],
    queryFn: getMyCompany,
    enabled: !!user?.email,
  });

  const { data: markets = [] } = useQuery({
    queryKey: ['all-markets'],
    queryFn: getMarkets,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['my-products', myCompany?.id],
    queryFn: () => getProductsByCompany(myCompany.id),
    enabled: !!myCompany?.id,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['my-assignments', myCompany?.id],
    queryFn: () => getAssignmentsByCompany(myCompany.id),
    enabled: !!myCompany?.id,
  });

  const { data: staffMessages = [] } = useQuery({
    queryKey: ['staff-messages-published'],
    queryFn: () => getPublishedMessagesAll(200),
  });

  const { data: myRsvps = [], refetch: refetchRsvps } = useQuery({
    queryKey: ['my-rsvps', myCompany?.id],
    queryFn: () => getMyRsvps(myCompany.id),
    enabled: !!myCompany?.id,
  });

  const { data: myNeeds = [] } = useQuery({
    queryKey: ['my-needs', myCompany?.id],
    queryFn: () => getNeedsByCompany(myCompany.id),
    enabled: !!myCompany?.id,
  });

  const needIds = myNeeds.map(n => n.id);
  const { data: needResponses = [] } = useQuery({
    queryKey: ['need-responses', needIds],
    queryFn: () => getResponsesByNeeds(needIds),
    enabled: needIds.length > 0,
  });
  const responsesByNeed = needResponses.reduce((acc, r) => {
    (acc[r.need_id] ||= []).push(r);
    return acc;
  }, {});
  const toggleNeed = (id) => setOpenNeedIds(prev => ({ ...prev, [id]: !prev[id] }));

  const rsvpStatus = Object.fromEntries(myRsvps.map(r => [r.message_id, r.status]));

  const { data: myReminders = [] } = useQuery({
    queryKey: ['event-reminders', myCompany?.id],
    queryFn: () => getRemindersByCompany(myCompany.id),
    enabled: !!myCompany?.id,
  });
  const remindersFor = (eventId) => myReminders.filter(r => r.event_id === eventId);
  const subscribedMarketIds = myCompany?.market_ids || [];



  const getMarketName = (marketId) => markets.find(m => m.id === marketId)?.name || 'Mercato';

  const rsvpMutation = useMutation({
    mutationFn: async ({ messageId, status }) => {
      await invokeFunction('rsvpProducerEvent', {
        message_id: messageId,
        company_id: myCompany.id,
        status,
      });
    },
    onSuccess: (_, variables) => {
      refetchRsvps();
      toast({ title: variables.status === 'accepted' ? '✅ Partecipazione confermata!' : '❌ Hai declinato l\'evento' });
    },
    onError: (err) => {
      toast({ title: 'Errore', description: err.message, variant: 'destructive' });
    },
  });

  // Gli eventi che il produttore vede davvero sono le comunicazioni staff di tipo "event"
  // (creati da /staff/crea-evento): market_events + assignments è un sistema a parte,
  // usato solo per l'iscrizione con selezione prodotti dal dialog qui sotto.
  const eventMessages = staffMessages
    .filter(msg => msg.type === 'event')
    .sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

  // Sollecito ancora "attivo" solo se il produttore non ha ancora risposto —
  // stessa logica della Home, così i due pallini restano sempre coerenti.
  const eventHasPendingReminder = (eventId) => {
    if (remindersFor(eventId).length === 0) return false;
    const status = rsvpStatus[eventId];
    return status !== 'accepted' && status !== 'declined';
  };
  const hasPendingEventReminder = eventMessages.some(msg => eventHasPendingReminder(msg.id));

  const [eventTab, setEventTab] = useState('upcoming'); // 'upcoming' | 'past'
  const upcomingEventMessages = eventMessages
    .filter(msg => new Date(msg.event_date) >= new Date())
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
  const pastEventMessages = eventMessages
    .filter(msg => new Date(msg.event_date) < new Date())
    .sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
  const visibleEventMessages = eventTab === 'upcoming' ? upcomingEventMessages : pastEventMessages;

  const otherMessages = staffMessages.filter(msg => msg.type !== 'event');

  const [commsTab, setCommsTab] = useState('current'); // 'current' | 'past'
  const currentOtherMessages = otherMessages.filter(m => new Date(m.event_date) >= new Date());
  const pastOtherMessages = otherMessages.filter(m => new Date(m.event_date) < new Date());
  const currentNeeds = myNeeds.filter(n => n.status === 'open' || n.status === 'in_progress');
  const pastNeeds = myNeeds.filter(n => n.status === 'resolved' || n.status === 'closed');
  const visibleOtherMessages = commsTab === 'current' ? currentOtherMessages : pastOtherMessages;
  const visibleNeeds = commsTab === 'current' ? currentNeeds : pastNeeds;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        badge={(
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Gestione Mercati
          </span>
        )}
        title="I tuoi Mercati"
        titleClassName="text-3xl"
        subtitle={(
          <span className="inline-flex items-center gap-1.5">
            <Leaf className="w-3.5 h-3.5" />
            {subscribedMarketIds.length} mercati · {eventMessages.length} eventi in programma
          </span>
        )}
        className="px-5"
      />

      <div className="px-5 pt-5 pb-24 space-y-5">

        {/* I Tuoi Eventi — sezione propria, non mescolata alle altre comunicazioni.
            A tendina come "Comunicazioni interne staff" qui sotto, e divisa
            in Futuri/Passati per la stessa intuibilità della sezione
            equivalente lato staff (Crea/In programma/Storico). */}
        <div className="rounded-2xl border-2 border-border bg-white shadow-sm overflow-hidden">
          <button
            onClick={() => setExpandedEvents(!expandedEvents)}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-muted/30 transition-colors"
          >
            <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> I Tuoi Eventi
              {hasPendingEventReminder && (
                <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
              )}
            </h2>
            <ChevronDown className={cn('w-5 h-5 text-muted-foreground transition-transform', expandedEvents && 'rotate-180')} />
          </button>
          {expandedEvents && (
          <div className="px-4 pb-4 border-t border-border pt-3">

          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setEventTab('upcoming')}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-bold transition-colors',
                eventTab === 'upcoming' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70'
              )}
            >
              Futuri ({upcomingEventMessages.length})
            </button>
            <button
              onClick={() => setEventTab('past')}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-bold transition-colors',
                eventTab === 'past' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70'
              )}
            >
              Passati ({pastEventMessages.length})
            </button>
          </div>

          {visibleEventMessages.length === 0 ? (
            <div className="text-center py-10 rounded-2xl border-2 border-dashed border-border bg-muted/20">
              <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {eventTab === 'upcoming' ? 'Nessun evento in programma' : 'Nessun evento passato'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleEventMessages.map(msg => {
                const rsvp = rsvpStatus[msg.id];
                const isOptionalEvent = !msg.is_mandatory;
                return (
                  <div
                    key={msg.id}
                    onClick={() => setDetailMsg(msg)}
                    className="rounded-2xl border-2 border-border bg-white shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className={cn(
                      'px-4 py-3 flex items-center gap-2',
                      msg.is_mandatory ? 'bg-secondary/15' : 'bg-primary/5'
                    )}>
                      <div className={cn(
                        'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
                        msg.is_mandatory ? 'bg-secondary/30' : 'bg-primary/15'
                      )}>
                        <Calendar className={cn('w-4 h-4', msg.is_mandatory ? 'text-secondary-foreground' : 'text-primary')} />
                      </div>
                      <h3 className="font-heading font-bold text-sm text-foreground flex-1 min-w-0 truncate flex items-center gap-1.5">
                        {msg.title}
                        {eventHasPendingReminder(msg.id) && (
                          <span className="w-2 h-2 rounded-full bg-destructive flex-shrink-0" />
                        )}
                      </h3>
                      {msg.is_mandatory ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 shrink-0">
                          Obbligatorio
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
                          Facoltativo
                        </span>
                      )}
                    </div>

                    <div className="p-4 pt-3">
                      {msg.description && (
                        <p className="text-sm text-foreground/80 mb-2">{msg.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {msg.location}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        {format(new Date(msg.event_date), 'EEEE d MMMM', { locale: it })}
                        {msg.time_start && ` · ${msg.time_start}`}
                      </div>

                      {isOptionalEvent && (
                        <div className="mt-3 pt-3 border-t border-border/60">
                          {(!rsvp || rsvp === 'pending') ? (
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-muted-foreground flex-1 font-medium">Partecipi?</p>
                              <Button
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); rsvpMutation.mutate({ messageId: msg.id, status: 'accepted' }); }}
                                disabled={rsvpMutation.isPending}
                                className="gap-1 bg-primary hover:bg-primary/90 text-white text-xs h-8"
                              >
                                <ThumbsUp className="w-3.5 h-3.5" /> Sì
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => { e.stopPropagation(); rsvpMutation.mutate({ messageId: msg.id, status: 'declined' }); }}
                                disabled={rsvpMutation.isPending}
                                className="gap-1 text-xs h-8 border-destructive/30 text-destructive hover:bg-destructive/5"
                              >
                                <ThumbsDown className="w-3.5 h-3.5" /> No
                              </Button>
                            </div>
                          ) : rsvp === 'accepted' ? (
                            <div className="flex items-center gap-1.5 text-primary text-xs font-bold">
                              <Check className="w-3.5 h-3.5" /> Partecipazione confermata
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
                              <X className="w-3.5 h-3.5" /> Hai declinato
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
          )}
        </div>

        {/* Comunicazioni interne staff (chiusure, aperture straordinarie) */}
        <div className="rounded-2xl border-2 border-border bg-white shadow-sm overflow-hidden">
          <button
            onClick={() => setExpandedMessages(!expandedMessages)}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-muted/30 transition-colors"
          >
            <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide">Comunicazioni interne staff</h2>
            <ChevronDown className={cn('w-5 h-5 text-muted-foreground transition-transform', expandedMessages && 'rotate-180')} />
          </button>
          {expandedMessages && (
            <div className="px-4 pb-4 border-t border-border">
              <div className="flex gap-2 mt-3 mb-1">
                <button
                  onClick={() => setCommsTab('current')}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-bold transition-colors',
                    commsTab === 'current' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  )}
                >
                  Attuali ({currentOtherMessages.length + currentNeeds.length})
                </button>
                <button
                  onClick={() => setCommsTab('past')}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-bold transition-colors',
                    commsTab === 'past' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  )}
                >
                  Passate ({pastOtherMessages.length + pastNeeds.length})
                </button>
              </div>
              {visibleOtherMessages.length === 0 && visibleNeeds.length === 0 ? (
                <div className="text-center py-6">
                  <Leaf className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {commsTab === 'current' ? 'Nessun messaggio attuale' : 'Nessun messaggio passato'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pt-3">
                  {visibleOtherMessages.map(msg => (
                    <div
                      key={msg.id}
                      className={cn(
                        'rounded-xl border p-3',
                        msg.type === 'closure'
                          ? 'bg-destructive/5 border-destructive/20'
                          : 'bg-primary/5 border-primary/20'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 flex-shrink-0">
                          {msg.type === 'closure' && <AlertCircle className="w-4 h-4 text-destructive" />}
                          {msg.type === 'special_opening' && <Zap className="w-4 h-4 text-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-foreground mb-1">{msg.title}</h3>
                          {msg.description && (
                            <p className="text-xs text-foreground/80 mb-1">{msg.description}</p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <MapPin className="w-3 h-3" />
                            {msg.location}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(msg.event_date), 'EEEE d MMMM', { locale: it })}
                            {msg.time_start && ` · ${msg.time_start}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {visibleNeeds.length > 0 && (
                    <div className={visibleOtherMessages.length > 0 ? 'pt-2 mt-2 border-t border-border' : ''}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        I tuoi bisogni segnalati
                      </p>
                      <div className="space-y-3">
                        {visibleNeeds.map(need => {
                          const styleByStatus = {
                            open: 'bg-amber-50 border-amber-200',
                            in_progress: 'bg-blue-50 border-blue-200',
                            resolved: 'bg-green-50 border-green-200',
                            closed: 'bg-muted border-border',
                          };
                          const iconByStatus = {
                            open: <AlertCircle className="w-4 h-4 text-amber-600" />,
                            in_progress: <Clock className="w-4 h-4 text-blue-600" />,
                            resolved: <Check className="w-4 h-4 text-green-600" />,
                            closed: <Check className="w-4 h-4 text-muted-foreground" />,
                          };
                          return (
                            <div key={need.id} className={cn('rounded-xl border p-3', styleByStatus[need.status])}>
                              <div className="flex items-start gap-2">
                                <div className="mt-0.5 flex-shrink-0">{iconByStatus[need.status]}</div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <h3 className="font-semibold text-sm text-foreground">{need.title}</h3>
                                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground shrink-0">
                                      {ETICHETTE_STATO[need.status] || need.status}
                                    </span>
                                  </div>
                                  {need.description && (
                                    <p className="text-xs text-foreground/80 mb-1">{need.description}</p>
                                  )}
                                  <p className="text-[11px] text-muted-foreground mb-1">
                                    {ETICHETTE_CATEGORIA[need.category] || need.category}
                                    {' · '}
                                    {format(new Date(need.created_at), 'd MMMM', { locale: it })}
                                  </p>
                                  {(() => {
                                    const thread = responsesByNeed[need.id] || [];
                                    const hasThread = thread.length > 0;
                                    const isOpen = !!openNeedIds[need.id];
                                    if (!hasThread && !need.notes) return null;
                                    return (
                                      <div className="mt-2">
                                        <button
                                          type="button"
                                          onClick={() => toggleNeed(need.id)}
                                          className="w-full flex items-center justify-between rounded-lg bg-white/70 border border-border px-2.5 py-1.5 text-left"
                                        >
                                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                                            Risposte staff{hasThread ? ` (${thread.length})` : ''}
                                          </span>
                                          <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                                        </button>
                                        {isOpen && (
                                          <div className="mt-1.5 space-y-1.5">
                                            {hasThread ? thread.map(r => (
                                              <div key={r.id} className="rounded-lg bg-white/70 border border-border px-2.5 py-1.5">
                                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                                  <span className="text-[10px] font-semibold text-muted-foreground">{r.author_name || 'Staff'}</span>
                                                  <span className="text-[10px] text-muted-foreground">
                                                    {format(new Date(r.created_at), 'd MMM HH:mm', { locale: it })}
                                                  </span>
                                                </div>
                                                <p className="text-xs text-foreground/90">{r.message}</p>
                                              </div>
                                            )) : (
                                              <div className="rounded-lg bg-white/70 border border-border px-2.5 py-1.5">
                                                <p className="text-xs text-foreground/90">{need.notes}</p>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sessione comunicazione con staff */}
        {subscribedMarketIds.length > 0 && (
          <div>
            <h2 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">Comunicazione con Staff</h2>
            <ProducerSessionPanel myCompany={myCompany} marketId={subscribedMarketIds[0]} />
          </div>
        )}

        {/* Aperture e orari dei mercati iscritti */}
        {subscribedMarketIds.length > 0 && (
          <div>
            <h2 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">Aperture e orari dei tuoi mercati</h2>
            <div className="space-y-2">
              {subscribedMarketIds.map(marketId => {
                const market = markets.find(m => m.id === marketId);
                return (
                  <div key={marketId} className="bg-white rounded-xl border border-border/50 shadow-sm p-4">
                    <p className="font-semibold text-sm text-foreground">{market?.name}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {market?.city}
                    </p>
                    {market?.schedule && (
                      <p className="text-xs text-foreground mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primary" />
                        <span className="font-medium">{market.schedule}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Registrazione Dialog */}

      {/* Dettaglio evento — sollecito ricevuto (futuri) e presenza dichiarata (passati) */}
      {detailMsg && (
        <Dialog open onOpenChange={() => setDetailMsg(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg">{detailMsg.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {detailMsg.description && (
                <p className="text-sm text-foreground/80">{detailMsg.description}</p>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" /> {detailMsg.location}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                {format(new Date(detailMsg.event_date), 'EEEE d MMMM yyyy', { locale: it })}
                {detailMsg.time_start && ` · ${detailMsg.time_start}`}
              </div>

              <div className="pt-3 border-t border-border space-y-2">
                {(() => {
                  const reminders = remindersFor(detailMsg.id);
                  return (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className={cn('w-4 h-4', reminders.length > 0 ? 'text-amber-600' : 'text-muted-foreground')} />
                      {reminders.length === 0 ? (
                        <span className="text-muted-foreground">Nessun sollecito ricevuto</span>
                      ) : (
                        <span className="text-foreground">
                          Sollecitato {reminders.length > 1 ? `${reminders.length} volte` : 'una volta'}
                          {' · ultima il '}
                          {format(new Date(reminders[0].sent_at), 'd MMM yyyy, HH:mm', { locale: it })}
                        </span>
                      )}
                    </div>
                  );
                })()}

                {new Date(detailMsg.event_date) < new Date() && detailMsg.is_mandatory === false && (() => {
                  const rsvp = rsvpStatus[detailMsg.id];
                  if (rsvp === 'accepted') {
                    return (
                      <div className="flex items-center gap-2 text-sm text-primary font-semibold">
                        <Check className="w-4 h-4" /> Presenza dichiarata
                      </div>
                    );
                  }
                  if (rsvp === 'declined') {
                    return (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground font-semibold">
                        <X className="w-4 h-4" /> Assenza dichiarata
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center gap-2 text-sm text-amber-700 font-semibold">
                      <AlertCircle className="w-4 h-4" /> Nessuna risposta data
                    </div>
                  );
                })()}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailMsg(null)}>Chiudi</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
