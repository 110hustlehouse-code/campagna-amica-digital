import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, MapPin, Clock, Heart, ShoppingBag, Loader2, Minus, Plus, Calendar } from 'lucide-react';
import CategoryBadge from '../components/shared/CategoryBadge';
import MarketEventsSection from '../components/markets/MarketEventsSection';
import BackButton from '../components/shared/BackButton';
import { toast } from 'sonner';

export default function MarketDetail() {
  const marketId = window.location.pathname.split('/').pop();
  const queryClient = useQueryClient();
  const [orderDialog, setOrderDialog] = useState(false);
  const [orderCompany, setOrderCompany] = useState(null);
  const [cart, setCart] = useState([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [pickupDate, setPickupDate] = useState('');

  const { data: market, isLoading } = useQuery({
    queryKey: ['market', marketId],
    queryFn: async () => {
      const list = await base44.entities.Market.filter({ id: marketId });
      return list[0];
    },
  });

  const { data: allCompanies = [] } = useQuery({
    queryKey: ['all-companies'],
    queryFn: () => base44.entities.Company.filter({ is_registered: true }, '-created_date', 200),
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ['all-products'],
    queryFn: () => base44.entities.Product.list('-created_date', 500),
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => base44.entities.Favorite.list(),
  });

  const companies = allCompanies.filter(c => market?.company_ids?.includes(c.id));

  const toggleFav = useMutation({
    mutationFn: async (companyId) => {
      const existing = favorites.find(f => f.company_id === companyId && f.market_id === marketId);
      if (existing) {
        await base44.entities.Favorite.delete(existing.id);
      } else {
        await base44.entities.Favorite.create({ company_id: companyId, market_id: marketId });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const createOrder = useMutation({
    mutationFn: (orderData) => base44.entities.Order.create(orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setOrderDialog(false);
      setCart([]);
      setOrderNotes('');
      setPickupDate('');
      toast.success('Ordine inviato con successo!');
    },
  });

  const openOrder = (company) => {
    setOrderCompany(company);
    setCart([]);
    setOrderDialog(true);
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unit_price } : i);
      return [...prev, { product_id: product.id, product_name: product.name, quantity: 1, unit_price: product.price, total: product.price }];
    });
  };

  const updateQty = (productId, delta) => {
    setCart(prev => prev.map(i => {
      if (i.product_id !== productId) return i;
      const newQty = Math.max(0, i.quantity + delta);
      return { ...i, quantity: newQty, total: newQty * i.unit_price };
    }).filter(i => i.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.total, 0);

  const submitOrder = () => {
    createOrder.mutate({
      company_id: orderCompany.id,
      company_name: orderCompany.name,
      market_id: marketId,
      market_name: market.name,
      items: cart,
      total_amount: cartTotal,
      status: 'in_attesa',
      pickup_date: pickupDate,
      notes: orderNotes,
    });
  };

  const [activeTab, setActiveTab] = useState('aziende');

  // Fetch events count for badge
  const { data: eventsCount = 0 } = useQuery({
    queryKey: ['market-events-count', marketId],
    queryFn: async () => {
      const all = await base44.entities.StaffMessage.filter({ is_published: true, market_id: marketId });
      return all.filter(m => m.type === 'event').length;
    },
    enabled: !!marketId,
  });

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  if (!market) {
    return (
      <div className="p-12 text-center">
        <p className="text-muted-foreground">Mercato non trovato</p>
        <Link to="/mercati"><Button variant="outline" className="mt-4">Torna ai Mercati</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="relative h-56 md:h-72 bg-gradient-to-br from-secondary/30 to-primary/20">
        {market.image_url && <img src={market.image_url} alt={market.name} className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute top-4 left-4">
          <BackButton variant="ghost" className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30" />
        </div>
        <div className="absolute bottom-6 left-6 text-white">
          <h1 className="font-heading text-3xl md:text-4xl font-bold">{market.name}</h1>
          <div className="flex flex-wrap gap-4 mt-2 text-white/80">
            {market.address && <span className="flex items-center gap-1 text-sm"><MapPin className="w-4 h-4" /> {market.address}, {market.city}</span>}
            {market.schedule && <span className="flex items-center gap-1 text-sm"><Clock className="w-4 h-4" /> {market.schedule}</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card px-6 md:px-12">
        <button
          onClick={() => setActiveTab('aziende')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'aziende' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Aziende presenti ({companies.length})
        </button>
        <button
          onClick={() => setActiveTab('eventi')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'eventi' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <Calendar className="w-4 h-4" />
          Comunicazioni & Eventi
          {eventsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">{eventsCount}</span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'eventi' && <MarketEventsSection marketId={marketId} />}

      {activeTab === 'aziende' && (
      <div className="p-6 md:p-12">
        <h2 className="font-heading text-2xl font-bold text-foreground mb-6">
          Aziende presenti ({companies.length})
        </h2>
        {companies.length === 0 ? (
          <Card className="border-0 shadow-sm"><CardContent className="p-12 text-center"><p className="text-muted-foreground">Nessuna azienda in questo mercato</p></CardContent></Card>
        ) : (
          <div className="space-y-4">
            {companies.map(company => {
              const companyProducts = allProducts.filter(p => p.company_id === company.id);
              const isFav = favorites.some(f => f.company_id === company.id && f.market_id === marketId);
              return (
                <Card key={company.id} className="border-0 shadow-sm overflow-hidden bg-card">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {company.logo_url ? (
                            <img src={company.logo_url} alt="" className="w-10 h-10 object-contain rounded" />
                          ) : (
                            <span className="text-xl font-heading font-bold text-primary">{company.name?.[0]}</span>
                          )}
                        </div>
                        <div>
                          <Link to={`/aziende/${company.id}`} className="font-heading text-lg font-semibold text-foreground hover:text-primary transition-colors">
                            {company.name}
                          </Link>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {company.category && <CategoryBadge category={company.category} />}
                            <span className="text-xs text-muted-foreground">{companyProducts.length} prodotti</span>
                          </div>
                          {/* Orari dichiarati dal produttore per questo mercato */}
                          {(() => {
                            const s = (company.market_schedules || []).find(s => s.market_id === marketId);
                            if (!s || !s.days) return null;
                            return (
                              <p className="text-xs text-primary font-semibold mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {s.days}{s.time_start ? ` · ${s.time_start}${s.time_end ? `–${s.time_end}` : ''}` : ''}
                                {s.notes ? ` · ${s.notes}` : ''}
                              </p>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleFav.mutate(company.id)}
                          className={isFav ? 'text-destructive border-destructive/30' : ''}
                        >
                          <Heart className={`w-4 h-4 mr-1 ${isFav ? 'fill-current' : ''}`} />
                          {isFav ? 'Preferito' : 'Preferito'}
                        </Button>
                        <Button size="sm" onClick={() => openOrder(company)} className="bg-primary hover:bg-primary/90">
                          <ShoppingBag className="w-4 h-4 mr-1" /> Ordina
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* Order Dialog */}
      <Dialog open={orderDialog} onOpenChange={setOrderDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Ordina da {orderCompany?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Seleziona i prodotti e le quantità</p>
            {allProducts.filter(p => p.company_id === orderCompany?.id).map(product => {
              const inCart = cart.find(i => i.product_id === product.id);
              return (
                <div key={product.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-muted-foreground">€{product.price?.toFixed(2)}/{product.unit || 'pz'}</p>
                  </div>
                  {inCart ? (
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(product.id, -1)}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center font-semibold">{inCart.quantity}</span>
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(product.id, 1)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => addToCart(product)}>Aggiungi</Button>
                  )}
                </div>
              );
            })}

            {cart.length > 0 && (
              <>
                <div className="border-t pt-4">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Totale</span>
                    <span className="text-primary">€{cartTotal.toFixed(2)}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Data di ritiro</label>
                  <Input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Note</label>
                  <Textarea value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder="Note aggiuntive..." className="mt-1" />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderDialog(false)}>Annulla</Button>
            <Button onClick={submitOrder} disabled={cart.length === 0 || createOrder.isPending} className="bg-primary hover:bg-primary/90">
              {createOrder.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShoppingBag className="w-4 h-4 mr-2" />}
              Invia Ordine (€{cartTotal.toFixed(2)})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}