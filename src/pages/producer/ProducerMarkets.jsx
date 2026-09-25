import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyCompany } from '@/api/companies';
import { getMarkets } from '@/api/markets';
import { getAllMarketEvents, getAssignmentsByCompany, getMyRsvps, assignStand } from '@/api/events';
import { getProductsByCompany } from '@/api/products';
import { getPublishedMessagesAll } from '@/api/staff';
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
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showRegister, setShowRegister] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [expandedMessages, setExpandedMessages] = useState(false);

  const { data: myCompany } = useQuery({
    queryKey: ['my-company', user?.email],
    queryFn: getMyCompany,
    enabled: !!user?.email,
  });

  const { data: markets = [] } = useQuery({
    queryKey: ['all-markets'],
    queryFn: getMarkets,
  });

  const { data: marketEvents = [] } = useQuery({
    queryKey: ['market-events'],
    queryFn: getAllMarketEvents,
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

  const rsvpStatus = Object.fromEntries(myRsvps.map(r => [r.message_id, r.status]));
  const subscribedMarketIds = myCompany?.market_ids || [];

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProducts.length) {
        throw new Error('Seleziona almeno un prodotto');
      }
      const data = {
        company_id: myCompany.id,
        market_event_id: selectedEvent.id,
        assigned_product_ids: selectedProducts,
        status: 'pending',
      };
      return assignStand(data);
    },
    onSuccess: () => {
      qc.invalidateQueries(['my-assignments']);
      setShowRegister(false);
      setSelectedEvent(null);
      setSelectedProducts([]);
      toast({ title: 'Iscrizione inviata!' });
    },
    onError: (err) => {
      toast({ title: 'Errore', description: err.message });
    },
  });

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

  const upcomingEvents = marketEvents
    .filter(e => new Date(e.event_date) >= new Date())
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

  // Gli eventi che il produttore vede davvero sono le comunicazioni staff di tipo "event"
  // (creati da /staff/crea-evento): market_events + assignments è un sistema a parte,
  // usato solo per l'iscrizione con selezione prodotti dal dialog qui sotto.
  const eventMessages = staffMessages
    .filter(msg => msg.type === 'event')
    .sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

  const otherMessages = staffMessages.filter(msg => msg.type !== 'event');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary/95 to-secondary border-b-4 border-secondary px-5 pt-12 pb-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-secondary rounded-full px-4 py-1.5 mb-3 shadow-md">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary text-xs font-bold uppercase tracking-widest">Gestione Mercati</span>
            </div>
            <h1 className="font-heading text-3xl font-bold text-white drop-shadow-lg">I tuoi Mercati</h1>
            <p className="text-sm text-white/90 mt-2 flex items-center gap-1.5 font-medium">
              <Leaf className="w-3.5 h-3.5" />
              {subscribedMarketIds.length} mercati · {eventMessages.length} eventi in programma
            </p>
          </div>
          <Button onClick={() => setShowRegister(true)} variant="secondary" className="rounded-xl gap-1 shrink-0 font-bold">
            Iscriviti a evento
          </Button>
        </div>
      </div>

      <div className="px-5 pt-5 pb-24 space-y-5">

        {/* I Tuoi Eventi — sezione propria, non mescolata alle altre comunicazioni */}
        <div>
          <h2 className="font-heading text-lg font-bold text-foreground mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" /> I Tuoi Eventi
          </h2>
          {eventMessages.length === 0 ? (
            <div className="text-center py-10 rounded-2xl border-2 border-dashed border-border bg-muted/20">
              <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nessun evento in programma</p>
            </div>
          ) : (
            <div className="space-y-3">
              {eventMessages.map(msg => {
                const rsvp = rsvpStatus[msg.id];
                const isOptionalEvent = !msg.is_mandatory;
                return (
                  <div
                    key={msg.id}
                    className="rounded-2xl border-2 border-border bg-white shadow-sm overflow-hidden"
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
                      <h3 className="font-heading font-bold text-sm text-foreground flex-1 min-w-0 truncate">{msg.title}</h3>
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
                                onClick={() => rsvpMutation.mutate({ messageId: msg.id, status: 'accepted' })}
                                disabled={rsvpMutation.isPending}
                                className="gap-1 bg-primary hover:bg-primary/90 text-white text-xs h-8"
                              >
                                <ThumbsUp className="w-3.5 h-3.5" /> Sì
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => rsvpMutation.mutate({ messageId: msg.id, status: 'declined' })}
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
              {otherMessages.length === 0 ? (
                <div className="text-center py-6">
                  <Leaf className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nessun messaggio</p>
                </div>
              ) : (
                <div className="space-y-3 pt-3">
                  {otherMessages.map(msg => (
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
      {showRegister && (
        <Dialog open onOpenChange={() => setShowRegister(false)}>
          <DialogContent className="max-w-md mx-4 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">Iscriviti a evento</DialogTitle>
            </DialogHeader>

            {!selectedEvent ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {upcomingEvents.filter(event => subscribedMarketIds.includes(event.market_id)).length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-xs text-muted-foreground">Nessun evento nei tuoi mercati</p>
                    <p className="text-xs text-muted-foreground mt-2">Aggiungi mercati nella sezione Azienda</p>
                  </div>
                ) : (
                  upcomingEvents
                    .filter(event => subscribedMarketIds.includes(event.market_id))
                    .map(event => {
                      const market = markets.find(m => m.id === event.market_id);
                      const isRegistered = assignments.some(a => a.market_event_id === event.id);
                      return (
                        <button
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          disabled={isRegistered}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                            isRegistered
                              ? 'border-primary/20 bg-primary/5 opacity-50 cursor-not-allowed'
                              : 'border-primary/20 hover:border-primary bg-white hover:bg-primary/5'
                          }`}
                        >
                          <p className="font-semibold text-sm text-foreground">{market?.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(event.event_date), 'd MMM HH:mm', { locale: it })}
                          </p>
                          {isRegistered && <p className="text-xs text-green-600 mt-1">✓ Iscritto</p>}
                        </button>
                      );
                    })
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-primary/10 rounded-lg p-3">
                  <p className="text-sm font-semibold text-foreground">
                    {getMarketName(selectedEvent.market_id)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(selectedEvent.event_date), 'EEEE d MMMM', { locale: it })}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-2 block">
                    Seleziona prodotti da esporre
                  </label>
                  <div className="space-y-2">
                    {products.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nessun prodotto disponibile</p>
                    ) : (
                      products.map(product => (
                        <label key={product.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedProducts([...selectedProducts, product.id]);
                              } else {
                                setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">{product.name}</p>
                            <p className="text-xs text-muted-foreground">€{product.price}/{product.unit}</p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedEvent) {
                    setSelectedEvent(null);
                  } else {
                    setShowRegister(false);
                  }
                }}
              >
                {selectedEvent ? 'Indietro' : 'Annulla'}
              </Button>
              {selectedEvent && (
                <Button
                  onClick={() => registerMutation.mutate()}
                  disabled={registerMutation.isPending || !selectedProducts.length}
                >
                  {registerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Iscriviti'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
