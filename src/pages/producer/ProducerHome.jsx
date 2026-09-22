import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscribeTable } from '@/api/client';
import { getMyCompany } from '@/api/companies';
import { getProductsByCompany } from '@/api/products';
import { getOrdersByCompany } from '@/api/orders';
import { getMyNotifications, segnaLetta } from '@/api/notifications';
import { getReviews } from '@/api/reviews';
import { isPreferito } from '@/api/favorites';
import { getAllMarketEvents, getAssignmentsByCompany } from '@/api/events';
import { getMarkets } from '@/api/markets';
import { createNeed } from '@/api/needs';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Package, ShoppingBag, Plus, Sparkles, Clock, ChevronRight,
  Leaf, ArrowRight, Bell, Calendar, MapPin, Star, TrendingUp, AlertTriangle, X
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { format, isToday, isFuture } from 'date-fns';
import { it } from 'date-fns/locale';
import UserMenu from '@/components/layout/UserMenu';
import NotificationDrawer from '@/components/shared/NotificationDrawer';
import ReviewsList from '@/components/producer/ReviewsList';

const statusColors = {
  confermato: 'bg-emerald-100 text-emerald-700',
  pronto: 'bg-blue-100 text-blue-700',
  in_attesa: 'bg-amber-100 text-amber-700',
};

const statusLabels = {
  confermato: 'Confermato',
  pronto: 'Pronto',
  in_attesa: 'In attesa',
};

export default function ProducerHome() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [notifOpen, setNotifOpen] = useState(false);
  const [absenceDialog, setAbsenceDialog] = useState(false);
  const [absenceMarketId, setAbsenceMarketId] = useState('');
  const [absenceNote, setAbsenceNote] = useState('');

  const { data: myCompany } = useQuery({
    queryKey: ['my-company', user?.email],
    queryFn: getMyCompany,
    enabled: !!user?.email,
    select: (data) => data[0],
  });

  const { data: products = [] } = useQuery({
    queryKey: ['my-products', myCompany?.id],
    queryFn: () => getProductsByCompany(myCompany.id),
    enabled: !!myCompany?.id,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['my-orders', myCompany?.id],
    queryFn: () => getOrdersByCompany(myCompany.id),
    enabled: !!myCompany?.id,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['producer-notifications', user?.email],
    queryFn: () => getMyNotifications(),
    enabled: !!user?.email,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['my-reviews', myCompany?.id],
    queryFn: () => getReviews(myCompany.id),
    enabled: !!myCompany?.id,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['my-favorites', myCompany?.id],
    queryFn: () => isPreferito({ company_id: myCompany.id }).then(f => (f ? [f] : [])),
    enabled: !!myCompany?.id,
  });

  const { data: marketEvents = [] } = useQuery({
    queryKey: ['market-events'],
    queryFn: getAllMarketEvents,
  });

  const { data: markets = [] } = useQuery({
    queryKey: ['all-markets'],
    queryFn: getMarkets,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['my-assignments', myCompany?.id],
    queryFn: () => getAssignmentsByCompany(myCompany.id),
    enabled: !!myCompany?.id,
  });

  const unread = notifications.filter(n => !n.read).length;
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  useEffect(() => {
    const unsub = subscribeTable('notifications', () => {
      qc.invalidateQueries({ queryKey: ['producer-notifications', user?.email] });
    });
    return unsub;
  }, [qc, user?.email]);

  const absenceMutation = useMutation({
    mutationFn: createNeed,
    onSuccess: () => {
      setAbsenceDialog(false);
      setAbsenceNote('');
      setAbsenceMarketId('');
      qc.invalidateQueries({ queryKey: ['company-needs'] });
    },
  });

  const handleSendAbsence = () => {
    if (!absenceMarketId) return;
    absenceMutation.mutate({
      company_id: myCompany.id,
      market_id: absenceMarketId,
      category: 'other',
      title: `⚠️ Assenza segnalata da ${myCompany.name}`,
      description: absenceNote || 'Il produttore ha segnalato un’assenza.',
      priority: 'high',
      status: 'open',
    });
  };

  const activeProducts = products.filter(p => p.available !== false);
  const todayOrders = orders.filter(o =>
    o.pickup_date && (isToday(new Date(o.pickup_date)) || isFuture(new Date(o.pickup_date))) && o.status !== 'annullato'
  );

  const upcomingAssignments = assignments
    .filter(a => {
      const event = marketEvents.find(e => e.id === a.market_event_id);
      return event && new Date(event.event_date) >= new Date();
    })
    .sort((a, b) => {
      const eventA = marketEvents.find(e => e.id === a.market_event_id);
      const eventB = marketEvents.find(e => e.id === b.market_event_id);
      return new Date(eventA?.event_date) - new Date(eventB?.event_date);
    })
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <div className="relative overflow-hidden h-60 md:h-80">
        <img
          src={myCompany?.cover_image_url || "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200&q=80"}
          alt="azienda"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />

        {/* Top bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl overflow-hidden border-2 border-white/50 shadow-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              {myCompany?.logo_url
                ? <img src={myCompany.logo_url} alt="logo" className="w-full h-full object-cover" />
                : <Leaf className="w-5 h-5 text-white" />
              }
            </div>
            <div>
              <p className="text-white/60 text-[10px] font-semibold uppercase tracking-widest">Hub Produttore</p>
              <p className="text-white font-bold text-sm leading-tight">{myCompany?.name || user?.full_name || 'La mia azienda'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNotifOpen(true)}
              className="relative w-9 h-9 bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            <UserMenu />
          </div>
        </div>

        {/* Bottom badge */}
        <div className="absolute bottom-5 left-5">
          <div className="inline-flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1.5 shadow-lg">
            <Leaf className="w-3 h-3 text-primary" />
            <span className="text-primary font-bold text-[10px] tracking-widest uppercase">Campagna Amica Digital</span>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="mx-5 -mt-5 relative z-10">
        <div className="bg-card rounded-2xl shadow-lg border border-border/30 grid grid-cols-3 divide-x divide-border/30 overflow-hidden">
          <div className="p-4 flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center mb-0.5">
              <Package className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground font-heading leading-none">{activeProducts.length}</p>
            <p className="text-[11px] text-muted-foreground font-medium">Prodotti</p>
          </div>
          <div className="p-4 flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center mb-0.5">
              <ShoppingBag className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-foreground font-heading leading-none">{todayOrders.length}</p>
            <p className="text-[11px] text-muted-foreground font-medium">Ordini</p>
          </div>
          <div className="p-4 flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-xl bg-yellow-100 flex items-center justify-center mb-0.5">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-foreground font-heading leading-none">
              {reviews.length > 0 ? avgRating.toFixed(1) : '—'}
            </p>
            <p className="text-[11px] text-muted-foreground font-medium">Recensioni</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pt-6 pb-28 space-y-7">

        {/* Setup nudge */}
        {!myCompany && (
          <Card className="border border-secondary/40 bg-gradient-to-br from-secondary/15 to-secondary/5 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-sm text-foreground">Completa il profilo</p>
                <p className="text-xs text-muted-foreground mt-0.5">Aggiungi le info della tua azienda per essere visibile</p>
              </div>
              <Link to="/produttore/azienda">
                <Button size="sm" className="rounded-xl gap-1 flex-shrink-0">
                  Vai <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Azioni rapide */}
        <div>
          <h2 className="font-heading text-lg font-bold text-foreground mb-3">Azioni rapide</h2>
          <div className="grid grid-cols-3 gap-3">
            <Link to="/produttore/prodotti?new=1" className="block">
              <div className="bg-card rounded-2xl border border-border/40 p-4 flex flex-col gap-2 hover:shadow-md hover:border-primary/30 transition-all h-full">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <p className="font-semibold text-sm text-foreground leading-tight">Nuovo prodotto</p>
                <p className="text-[11px] text-muted-foreground">Manuale</p>
              </div>
            </Link>
            <Link to="/produttore/listino-ai" className="block">
              <div className="bg-gradient-to-br from-primary/8 to-secondary/10 rounded-2xl border border-primary/20 p-4 flex flex-col gap-2 hover:shadow-md transition-all h-full">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <p className="font-semibold text-sm text-primary leading-tight">Listino AI</p>
                <p className="text-[11px] text-muted-foreground">Importa file</p>
              </div>
            </Link>
            <Link to="/produttore/mercati" className="block">
              <div className="bg-card rounded-2xl border border-border/40 p-4 flex flex-col gap-2 hover:shadow-md hover:border-primary/30 transition-all h-full">
                <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-secondary-foreground opacity-70" />
                </div>
                <p className="font-semibold text-sm text-foreground leading-tight">Mercati</p>
                <p className="text-[11px] text-muted-foreground">I tuoi eventi</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Prossimi mercati */}
        {upcomingAssignments.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> Prossimi mercati
              </h2>
              <Link to="/produttore/mercati" className="text-xs text-primary font-semibold flex items-center gap-0.5 hover:underline">
                Gestisci <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {upcomingAssignments.map(assignment => {
                const event = marketEvents.find(e => e.id === assignment.market_event_id);
                const market = markets.find(m => m.id === event?.market_id);
                return (
                  <div key={assignment.id} className="bg-card rounded-2xl border border-border/40 p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{market?.name || 'Mercato'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {event?.event_date ? format(new Date(event.event_date), 'd MMM yyyy', { locale: it }) : 'Data n.d.'}
                          {event?.time_start && ` · ${event.time_start}`}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 flex-shrink-0">
                      Iscritto
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Segnala un'assenza */}
        {myCompany && (myCompany.market_ids || []).length > 0 && (
          <div>
            <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-orange-500" /> Segnala un'assenza
            </h2>
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-orange-800">Non potrai essere presente al mercato?</p>
                <p className="text-xs text-orange-600 mt-0.5">Lo staff verrà notificato immediatamente</p>
              </div>
              <Button
                onClick={() => setAbsenceDialog(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl gap-1.5 flex-shrink-0 text-sm"
              >
                <AlertTriangle className="w-4 h-4" />
                Segnala
              </Button>
            </div>
          </div>
        )}

        {/* Prossimi ritiri */}
        {todayOrders.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Prossimi ritiri
              </h2>
              <Link to="/produttore/ordini" className="text-xs text-primary font-semibold flex items-center gap-0.5 hover:underline">
                Tutti <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {todayOrders.slice(0, 3).map(order => (
                <div key={order.id} className="bg-card rounded-2xl border border-border/40 p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <ShoppingBag className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{order.market_name || 'Mercato'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {order.pickup_date ? format(new Date(order.pickup_date), 'EEEE d MMM', { locale: it }) : 'Data n.d.'}
                        {' · '}
                        <span className="font-semibold text-foreground">€{order.total_amount?.toFixed(2)}</span>
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${statusColors[order.status] || 'bg-muted text-muted-foreground'}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recensioni */}
        {reviews.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> Recensioni
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-yellow-100 text-yellow-700 font-bold px-2.5 py-1 rounded-full">
                  {avgRating.toFixed(1)} / 5 · {reviews.length} rec.
                </span>
              </div>
            </div>
            <ReviewsList companyId={myCompany?.id} />
          </div>
        )}

      </div>

      {/* Absence Dialog */}
      <Dialog open={absenceDialog} onOpenChange={setAbsenceDialog}>
        <DialogContent className="max-w-md mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="w-5 h-5" /> Segnala un'assenza
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Seleziona mercato *</label>
              <div className="space-y-2">
                {(myCompany?.market_ids || []).map(mid => {
                  const m = markets.find(mk => mk.id === mid);
                  return (
                    <button
                      key={mid}
                      onClick={() => setAbsenceMarketId(mid)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                        absenceMarketId === mid
                          ? 'border-orange-400 bg-orange-50 text-orange-800'
                          : 'border-border bg-white text-foreground hover:border-orange-300'
                      }`}
                    >
                      {m?.name || mid}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Note / motivazione (facoltativo)</label>
              <Textarea
                placeholder="Es. Malattia, problema di trasporto, imprevisto..."
                value={absenceNote}
                onChange={e => setAbsenceNote(e.target.value)}
                className="min-h-20 rounded-xl"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAbsenceDialog(false)} className="flex-1">Annulla</Button>
              <Button
                onClick={handleSendAbsence}
                disabled={!absenceMarketId || absenceMutation.isPending}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white gap-2"
              >
                {absenceMutation.isPending ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                Invia segnalazione
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <NotificationDrawer
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        isProducer={true}
        notifications={notifications}
        onRead={(id) => {
          segnaLetta(id);
          qc.invalidateQueries({ queryKey: ['producer-notifications', user?.email] });
        }}
        onReadAll={() => {
          notifications.filter(n => !n.read).forEach(n => segnaLetta(n.id));
          qc.invalidateQueries({ queryKey: ['producer-notifications', user?.email] });
        }}
      />
    </div>
  );
}