import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscribeTable } from '@/api/client';
import { getMyCompany } from '@/api/companies';
import { getOrdersByCompany, updateOrderStatus } from '@/api/orders';
import { getReviews } from '@/api/reviews';
import { invokeFunction } from '@/api/functions';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ShoppingBag, Calendar, ChevronDown, ChevronUp, Award, Leaf, TrendingUp, Package, ChevronLeft, ChevronRight, Star, Download } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';

const STATUSES = [
  { value: 'in_attesa', label: 'In attesa', color: 'bg-amber-100 text-amber-700' },
  { value: 'confermato', label: 'Confermato', color: 'bg-green-100 text-green-700' },
  { value: 'pronto', label: 'Pronto', color: 'bg-green-100 text-green-700' },
  { value: 'ritirato', label: 'Ritirato', color: 'bg-red-100 text-red-700' },
  { value: 'annullato', label: 'Annullato', color: 'bg-slate-100 text-slate-700' },
];

const STATUS_DOT = {
  in_attesa: 'bg-amber-400',
  confermato: 'bg-green-500',
  pronto: 'bg-green-500',
  ritirato: 'bg-red-500',
  annullato: 'bg-slate-900',
};

function OrderCard({ order, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const statusInfo = STATUSES.find(s => s.value === order.status);

  return (
    <div className="bg-white rounded-2xl border-2 border-primary/20 shadow-sm overflow-hidden">
       <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/80 to-secondary" />
       <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${STATUS_DOT[order.status] || 'bg-muted'}`} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">{order.market_name || 'Mercato'}</p>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {order.pickup_date && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(order.pickup_date), 'EEEE d MMM', { locale: it })}
                  </span>
                )}
                <span className="text-xs font-bold text-foreground">€{order.total_amount?.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <Select value={order.status} onValueChange={(v) => onStatusChange(order.id, v)}>
            <SelectTrigger className={`h-7 text-xs font-semibold px-2.5 rounded-full border-0 w-auto gap-1 ${statusInfo?.color || 'bg-muted text-muted-foreground'}`}>
              <SelectValue>{statusInfo?.label || order.status}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {(order.items?.length > 0 || order.notes) && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors ml-5"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Meno dettagli' : `${order.items?.length || 0} articoli`}
          </button>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border/30 pt-3 space-y-2">
          {order.items?.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-foreground">{item.product_name} <span className="text-muted-foreground">× {item.quantity}</span></span>
              <span className="font-semibold text-foreground">€{item.total?.toFixed(2)}</span>
            </div>
          ))}
          {order.notes && (
            <div className="mt-2 pt-2 border-t border-border/30">
              <p className="text-xs text-muted-foreground italic">📝 {order.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProducerOrders() {
   const { user } = useAuth();
   const qc = useQueryClient();
   const { toast } = useToast();
   const [filter, setFilter] = useState('all');
   const [reviewsOpen, setReviewsOpen] = useState(false);
   const [newOrdersCount, setNewOrdersCount] = useState(0);
   const [newReviewsCount, setNewReviewsCount] = useState(0);
   const filtersRef = React.useRef(null);

  const { data: myCompany } = useQuery({
    queryKey: ['my-company', user?.email],
    queryFn: getMyCompany,
    enabled: !!user?.email,
    select: d => d[0],
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders', myCompany?.id],
    queryFn: () => getOrdersByCompany(myCompany.id),
    enabled: !!myCompany?.id,
    refetchInterval: 30000,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['my-reviews', myCompany?.id],
    queryFn: () => getReviews(myCompany.id),
    enabled: !!myCompany?.id,
  });

  useEffect(() => {
    const unsubOrders = subscribeTable('orders', (event) => {
      if (event.type === 'create' && event.data?.company_id === myCompany?.id) {
        setNewOrdersCount(prev => prev + 1);
        toast({
          title: '🛒 Nuovo ordine!',
          description: `${event.data?.market_name} - €${event.data?.total_amount?.toFixed(2)}`,
        });
        qc.invalidateQueries({ queryKey: ['my-orders', myCompany?.id] });
      }
    });

    const unsubReviews = subscribeTable('reviews', (event) => {
      if (event.type === 'create' && event.data?.company_id === myCompany?.id) {
        setNewReviewsCount(prev => prev + 1);
        toast({
          title: '⭐ Nuova recensione!',
          description: `Voto: ${event.data?.rating}/5`,
        });
        qc.invalidateQueries({ queryKey: ['my-reviews', myCompany?.id] });
      }
    });

    return () => {
      unsubOrders();
      unsubReviews();
    };
  }, [qc, myCompany?.id, toast]);

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => updateOrderStatus(id, status),
    onSuccess: () => qc.invalidateQueries(['my-orders']),
  });

  const exportPDF = async () => {
    try {
      const response = await invokeFunction('exportOrdersPDF', {
        orders,
        companyName: myCompany?.name || 'La mia azienda'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ordini-${new Date().getTime()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Errore esportazione:', error);
    }
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
  const sorted = [...filtered].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const counts = STATUSES.reduce((acc, s) => { acc[s.value] = orders.filter(o => o.status === s.value).length; return acc; }, {});

  // Statistiche vendite
  const completeOrders = orders.filter(o => o.status === 'ritirato');
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const completedRevenue = completeOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const totalItems = orders.reduce((sum, o) => sum + (o.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0), 0);
  const completedItems = completeOrders.reduce((sum, o) => sum + (o.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-primary/20 px-5 pt-12 pb-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-2">
              <Award className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary text-xs font-bold uppercase tracking-widest">Centro Ordini Coldiretti</span>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-heading text-2xl font-bold text-foreground">Ordini ricevuti</h1>
                  {newOrdersCount > 0 && (
                    <span className="bg-destructive text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                      +{newOrdersCount}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                  <Leaf className="w-3.5 h-3.5 text-primary" />
                  {orders.length} ordini totali
                </p>
              </div>
              <button
                onClick={exportPDF}
                className="flex items-center gap-2 bg-white border border-border/50 rounded-xl px-3 py-2 hover:bg-muted transition-colors shadow-sm"
              >
                <Download className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">PDF</span>
              </button>
            </div>
          </div>
          <button
            onClick={() => {
              setReviewsOpen(true);
              setNewReviewsCount(0);
            }}
            className="relative flex items-center gap-2 bg-white border border-border/50 rounded-xl px-3 py-2 hover:bg-muted transition-colors shadow-sm"
          >
            <Star className="w-4 h-4 text-primary" />
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Recensioni</p>
              <p className="text-sm font-bold text-foreground">{reviews.length}</p>
            </div>
            {newReviewsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-destructive text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                {newReviewsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="px-5 pt-4 pb-24 space-y-4">
        {/* Statistiche */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">Revenue</span>
              </div>
              <p className="text-2xl font-bold text-foreground font-heading">€{totalRevenue.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground mt-1">{completeOrders.length} completati</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4 text-secondary" />
                </div>
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">Ordini</span>
              </div>
              <p className="text-2xl font-bold text-foreground font-heading">{orders.length}</p>
              <p className="text-xs text-muted-foreground mt-1">{filter === 'all' ? 'Totali' : STATUSES.find(s => s.value === filter)?.label}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Package className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">Articoli</span>
              </div>
              <p className="text-2xl font-bold text-foreground font-heading">{totalItems}</p>
              <p className="text-xs text-muted-foreground mt-1">{completedItems} consegnati</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Award className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">Completati</span>
              </div>
              <p className="text-2xl font-bold text-foreground font-heading">{completeOrders.length}</p>
              <p className="text-xs text-muted-foreground mt-1">€{completedRevenue.toFixed(0)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => filtersRef.current?.scrollBy({ left: -150, behavior: 'smooth' })}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 flex-1" ref={filtersRef}>
          <button
            onClick={() => setFilter('in_attesa')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${filter === 'in_attesa' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-muted-foreground border-border/50 hover:border-primary/30'}`}
          >
            In attesa{counts['in_attesa'] > 0 ? ` (${counts['in_attesa']})` : ''}
          </button>
          {STATUSES.filter(s => s.value !== 'in_attesa').map(s => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${filter === s.value ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-muted-foreground border-border/50 hover:border-primary/30'}`}
            >
              {s.label}{counts[s.value] > 0 ? ` (${counts[s.value]})` : ''}
            </button>
          ))}
          <button
            onClick={() => setFilter('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${filter === 'all' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-muted-foreground border-border/50 hover:border-primary/30'}`}
          >
            Tutti ({orders.length})
            </button>
            </div>
            <button
            onClick={() => filtersRef.current?.scrollBy({ left: 150, behavior: 'smooth' })}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
            <ChevronRight className="w-5 h-5" />
            </button>
            </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="font-semibold text-foreground">Nessun nuovo ordine</p>
            <p className="text-sm text-muted-foreground mt-1">
              {filter === 'all' 
                ? 'Non hai ancora ricevuto ordini' 
                : filter === 'in_attesa'
                ? 'Nessun ordine in attesa di conferma'
                : `Nessun ordine "${STATUSES.find(s => s.value === filter)?.label}"`
              }
            </p>
          </div>
        ) : (
          sorted.map(order => (
            <OrderCard key={order.id} order={order} onStatusChange={(id, status) => updateStatus.mutate({ id, status })} />
          ))
        )}
        </div>

        {/* Reviews Drawer */}
        {reviewsOpen && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setReviewsOpen(false)}>
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-primary/20 px-5 py-4 flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-foreground">Recensioni clienti</h2>
              <button onClick={() => setReviewsOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-5 space-y-3">
              {reviews.length === 0 ? (
                <div className="text-center py-10">
                  <Star className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nessuna recensione ricevuta</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 p-3 bg-primary/5 rounded-lg">
                    <p className="text-sm text-foreground">
                      <span className="font-bold">Voto medio: </span>
                      <span className="text-lg font-bold text-primary">
                        {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}/5
                      </span>
                    </p>
                  </div>
                  {reviews.map(review => (
                    <Card key={review.id} className="border border-border/30 shadow-none bg-white">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-bold text-primary">★ {review.rating}/5</p>
                          <span className="text-[10px] text-muted-foreground">{new Date(review.created_date).toLocaleDateString('it-IT')}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{review.message}</p>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
        )}
        </div>
        );
        }