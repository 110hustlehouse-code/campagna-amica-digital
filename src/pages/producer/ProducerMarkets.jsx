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
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Calendar, MapPin, Award, Leaf, Check, X, Clock, Users, AlertCircle, Zap, ThumbsUp, ThumbsDown, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import ProducerSessionPanel from '@/components/producer/ProducerSessionPanel';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const STATUS_CONFIG = {
  pending: { label: 'In sospeso', color: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confermato', color: 'bg-green-100 text-green-700' },
  completed: { label: 'Completato', color: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Cancellato', color: 'bg-slate-100 text-slate-700' },
};

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
    select: d => d[0],
  });

  const { data: markets = [] } = useQuery({
    queryKey: ['all-markets'],
    queryFn: getMarkets,
  });

  const { data: marketEvents = [], isLoadingEvents } = useQuery({
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

  // Load my RSVP records from DB
  const { data: myRsvps = [], refetch: refetchRsvps } = useQuery({
    queryKey: ['my-rsvps', myCompany?.id],
    queryFn: () => getMyRsvps(myCompany.id),
    enabled: !!myCompany?.id,
  });

  // Map message_id -> status from DB
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
  const getProductName = (productId) => products.find(p => p.id === productId)?.name || 'Prodotto';

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

  const myAssignments = assignments.filter(a => {
    const event = marketEvents.find(e => e.id === a.market_event_id);
    return event && new Date(event.event_date) >= new Date();
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-primary/20 px-5 pt-12 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-2">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary text-xs font-bold uppercase tracking-widest">Gestione Mercati</span>
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground">I tuoi Mercati</h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <Leaf className="w-3.5 h-3.5 text-primary" />
              {myAssignments.length} mercati · {upcomingEvents.length} eventi in programma
            </p>
          </div>
          <Button onClick={() => setShowRegister(true)} className="rounded-xl gap-1">
            Iscriviti a evento
          </Button>
        </div>
      </div>

      <div className="px-5 pt-4 pb-24 space-y-4">
        {/* Comunicazioni interne staff - Collapsible */}
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
              {staffMessages.length === 0 ? (
                <div className="text-center py-6">
                  <Leaf className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nessun messaggio</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {staffMessages.map(msg => {
                    const rsvp = rsvpStatus[msg.id];
                    const isOptionalEvent = msg.type === 'event' && !msg.is_mandatory;
                    return (
                      <div
                        key={msg.id}
                        className={`rounded-xl border p-3 ${
                          msg.type === 'closure'
                            ? 'bg-red-50 border-red-200'
                            : msg.type === 'special_opening'
                            ? 'bg-green-50 border-green-200'
                            : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 flex-shrink-0">
                            {msg.type === 'closure' && <AlertCircle className="w-4 h-4 text-red-600" />}
                            {msg.type === 'special_opening' && <Zap className="w-4 h-4 text-green-600" />}
                            {msg.type === 'event' && <Calendar className="w-4 h-4 text-blue-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold text-sm text-foreground">{msg.title}</h3>
                              {msg.is_mandatory ? (
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-200 text-amber-700">
                                  Obbligatorio
                                </span>
                              ) : isOptionalEvent && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-200 text-blue-700">
                                  Facoltativo
                                </span>
                              )}
                            </div>
                            {msg.description && (
                              <p className="text-xs text-foreground/80 mb-1">{msg.description}</p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                              <MapPin className="w-3 h-3" />
                              {msg.location}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(msg.event_date), 'EEEE d MMMM', { locale: it })}
                              {msg.time_start && ` · ${msg.time_start}`}
                            </div>

                            {/* RSVP buttons for optional events */}
                            {isOptionalEvent && (
                              <div className="mt-2 pt-2 border-t border-blue-200">
                                {!rsvp ? (
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs text-muted-foreground flex-1">Partecipi?</p>
                                    <Button
                                      size="sm"
                                      onClick={() => rsvpMutation.mutate({ messageId: msg.id, status: 'accepted' })}
                                      disabled={rsvpMutation.isPending}
                                      className="gap-1 bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                                    >
                                      <ThumbsUp className="w-3 h-3" /> Sì
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => rsvpMutation.mutate({ messageId: msg.id, status: 'declined' })}
                                      disabled={rsvpMutation.isPending}
                                      className="gap-1 text-xs h-7 border-red-300 text-red-600 hover:bg-red-50"
                                    >
                                      <ThumbsDown className="w-3 h-3" /> No
                                    </Button>
                                  </div>
                                ) : rsvp === 'accepted' ? (
                                  <div className="flex items-center gap-1 text-green-700 text-xs font-semibold">
                                    <Check className="w-3 h-3" /> Confermato
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                                    <X className="w-3 h-3" /> Declinato
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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