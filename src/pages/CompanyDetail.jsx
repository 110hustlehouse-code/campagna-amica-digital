import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCompany } from '@/api/companies';
import { getProductsByCompany } from '@/api/products';
import { getMyFavorites, aggiungiPreferito, rimuoviPreferito } from '@/api/favorites';
import { getReviews } from '@/api/reviews';
import { getOrdersByCompany } from '@/api/orders';
import { getMarkets, getStatoDisponibilita, getBloccoAttivoFinoA } from '@/api/markets';import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Globe, Phone, Mail, MapPin, Heart, Loader2, ShoppingBag, Leaf, Award, Star, Lock, Clock, Store } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import CategoryBadge from '../components/shared/CategoryBadge';
import ProductCard from '../components/companies/ProductCard';
import CartBar from '../components/companies/CartBar';
import CheckoutModal from '../components/companies/CheckoutModal';
import ReviewModal from '../components/companies/ReviewModal';
import RatingDisplay from '../components/shared/RatingDisplay.jsx';
import BackButton from '../components/shared/BackButton';
import { toast } from 'sonner';
import Marchi from '@/components/shared/Marchi';

const UNIT_STEPS = { kg: 0.5, lt: 0.5, pz: 1, confezione: 1 };

export default function CompanyDetail() {
  const { user } = useAuth();
  const companyId = window.location.pathname.split('/').pop();
  const queryClient = useQueryClient();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [tab, setTab] = useState('tutti');
  const [cart, setCart] = useState([]);
  const productsSectionRef = useRef(null);

  useEffect(() => {
    if (window.location.hash === '#preferiti') {
      setTab('preferiti');
      setTimeout(() => {
        productsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
    }
  }, []);

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', companyId],
    queryFn: async () => {
      const list = [await getCompany(companyId)].filter(Boolean);
      return list[0];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', companyId],
    queryFn: () => getProductsByCompany(companyId),
    enabled: !!companyId,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: getMyFavorites,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', companyId],
    queryFn: () => getReviews(companyId),
    enabled: !!companyId,
  });

  const { data: myOrders = [] } = useQuery({
    queryKey: ['my-orders-company', companyId],
    queryFn: () => getOrdersByCompany(companyId),
    enabled: !!companyId,
  });

  const { data: markets = [] } = useQuery({
    queryKey: ['company-markets', companyId],
    queryFn: async () => {
      if (!company?.market_ids?.length) return [];
      const all = await getMarkets();
      return all.filter(m => company.market_ids.includes(m.id));
    },
    enabled: !!company,
  });

  // Disponibilità di oggi sul primo mercato dell'azienda. Con più mercati,
  // questo mostra solo il primo — raffinabile in seguito se serve
  // distinguere per mercato.
  const { data: statoOggi } = useQuery({
    queryKey: ['stato-disponibilita', companyId, markets[0]?.id],
    queryFn: () => getStatoDisponibilita(companyId, markets[0].id),
    enabled: !!companyId && markets.length > 0,
    refetchInterval: 5 * 60 * 1000, // ricontrolla ogni 5 minuti: lo stato cambia nel corso della giornata
  });

  const { data: bloccoFinoA } = useQuery({
    queryKey: ['blocco-attivo', companyId, markets[0]?.id],
    queryFn: () => getBloccoAttivoFinoA(companyId, markets[0].id),
    enabled: statoOggi === 'bloccato' && !!companyId && markets.length > 0,
  });

  const ETICHETTE_STATO_DISPONIBILITA = {
    disponibile: { testo: 'Al mercato oggi', colore: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    assente: { testo: 'Assente oggi', colore: 'bg-muted text-muted-foreground border-border' },
    in_attesa_ddt: { testo: 'In arrivo al mercato', colore: 'bg-amber-100 text-amber-700 border-amber-200' },
    non_ancora_aperto: { testo: 'Mercato non ancora aperto', colore: 'bg-blue-100 text-blue-700 border-blue-200' },
    bloccato: {
      testo: bloccoFinoA
        ? `Non disponibile fino al ${new Date(bloccoFinoA).toLocaleDateString('it-IT')}`
        : 'Banco momentaneamente sospeso',
      colore: 'bg-red-100 text-red-700 border-red-200',
    },
  };

  const hasInteracted = myOrders.some(o => o.status !== 'annullato');
  const hasAlreadyReviewed = reviews.some(r => r.created_by === user?.email);

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const isFav = favorites.some(f => f.company_id === companyId && !f.product_id);
  const favProductIds = new Set(
    favorites.filter(f => f.company_id === companyId && !!f.product_id).map(f => f.product_id)
  );

  const toggleFav = useMutation({
    mutationFn: async () => {
      if (isFav) {
        const fav = favorites.find(f => f.company_id === companyId && !f.product_id);
        await rimuoviPreferito(fav.id);
      } else {
        await aggiungiPreferito({ company_id: companyId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success(isFav ? 'Rimosso dai preferiti' : 'Aggiunto ai preferiti');
    },
  });

  const toggleProductFav = useMutation({
    mutationFn: async (product) => {
      const existing = favorites.find(f => f.product_id === product.id && f.company_id === companyId);
      if (existing) {
        await rimuoviPreferito(existing.id);
      } else {
        await aggiungiPreferito({ product_id: product.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  // Cart logic
  const addToCart = (product) => {
    const step = UNIT_STEPS[product.unit] || 1;
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => i.product_id === product.id
          ? { ...i, quantity: +(i.quantity + step).toFixed(2), total: +((i.quantity + step) * i.unit_price).toFixed(2) }
          : i);
      }
      return [...prev, { product_id: product.id, product_name: product.name, unit: product.unit, quantity: step, unit_price: product.price, total: +(step * product.price).toFixed(2) }];
    });
  };

  const removeFromCart = (product) => {
    const step = UNIT_STEPS[product.unit] || 1;
    setCart(prev => prev.map(i => {
      if (i.product_id !== product.id) return i;
      const newQty = +(Math.max(0, i.quantity - step)).toFixed(2);
      return { ...i, quantity: newQty, total: +(newQty * i.unit_price).toFixed(2) };
    }).filter(i => i.quantity > 0));
  };

  // CartBar uses cart items directly (has product_id)
  const addFromCart = (cartItem) => {
    const product = products.find(p => p.id === cartItem.product_id);
    if (product) addToCart(product);
  };
  const removeFromCartBar = (cartItem) => {
    const product = products.find(p => p.id === cartItem.product_id);
    if (product) removeFromCart(product);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-12 text-center">
        <p className="text-muted-foreground">Azienda non trovata</p>
        <Link to="/aziende"><Button variant="outline" className="mt-4">Torna alle Aziende</Button></Link>
      </div>
    );
  }

  const favProductsList = products.filter(p => favProductIds.has(p.id));
  const displayedProducts = tab === 'preferiti' ? favProductsList : products;

  return (
    <div className="min-h-screen bg-background pb-36">

      {/* Cover istituzionale */}
      <div className="relative h-64 md:h-80 bg-gradient-to-br from-primary/30 to-secondary/20">
        {company.cover_image_url && (
          <img src={company.cover_image_url} alt={company.name} className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5">
          <Leaf className="w-3 h-3 text-secondary" />
          <span className="text-white text-[9px] font-bold tracking-widest uppercase">Campagna Amica Digital</span>
        </div>

        <div className="absolute top-4 left-4">
          <BackButton variant="ghost" className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 rounded-xl" />
        </div>

        <div className="absolute bottom-5 left-6 right-6">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {company.category && <CategoryBadge category={company.category} />}
            {statoOggi && ETICHETTE_STATO_DISPONIBILITA[statoOggi] && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${ETICHETTE_STATO_DISPONIBILITA[statoOggi].colore}`}>
                {ETICHETTE_STATO_DISPONIBILITA[statoOggi].testo}
              </span>
            )}
          </div>
          <h1 className="font-heading text-2xl md:text-4xl font-bold text-white drop-shadow-lg leading-tight">
            {company.name}
          </h1>
          <div className="mt-2">
            <RatingDisplay rating={avgRating} count={reviews.length} favoriteCount={favorites.filter(f => f.company_id === companyId && !f.product_id).length} />
          </div>
          {company.city && (
            <p className="text-white/80 text-sm mt-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> {company.city}{company.region && `, ${company.region}`}
            </p>
          )}
        </div>
      </div>

      <div className="px-6 md:px-12 -mt-2 relative z-10">

        {/* Card info azienda */}
        <Card className="border-0 shadow-xl bg-card rounded-2xl overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/80 to-secondary" />
          <CardContent className="p-5 md:p-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 w-fit">
                <Award className="w-3.5 h-3.5 text-primary" />
                <span className="text-primary text-xs font-bold">Azienda del circuito</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant={isFav ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleFav.mutate()}
                  className={`rounded-xl w-fit ${isFav ? 'bg-destructive hover:bg-destructive/90 text-white' : ''}`}
                >
                  <Heart className={`w-4 h-4 mr-1.5 ${isFav ? 'fill-current' : ''}`} />
                  {isFav ? 'Salvata' : 'Salva'}
                </Button>
                {hasAlreadyReviewed ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-xl px-3 py-1.5">
                    <Star className="w-3.5 h-3.5 fill-secondary text-secondary" />
                    Recensione inviata
                  </span>
                ) : hasInteracted ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReviewOpen(true)}
                    className="rounded-xl w-fit"
                  >
                    <Star className="w-4 h-4 mr-1.5" />
                    Fai una recensione
                  </Button>
                ) : (
                  <span
                    title="Devi aver completato almeno un ordine con questa azienda per lasciare una recensione"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground border border-border/50 rounded-xl px-3 py-1.5 cursor-not-allowed opacity-60"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Recensisci (solo clienti)
                  </span>
                )}
                {cart.length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => setCheckoutOpen(true)}
                    className="rounded-xl bg-primary hover:bg-primary/90"
                  >
                    <ShoppingBag className="w-4 h-4 mr-1.5" />
                    Il mio carrello · €{cart.reduce((s, i) => s + i.total, 0).toFixed(2)}
                  </Button>
                )}
              </div>
            </div>

            {company.description && (
              <p className="text-muted-foreground mt-4 leading-relaxed text-sm">{company.description}</p>
            )}

            {(company.website || company.phone || company.email) && (
              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border/50">
                {company.website && (
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
                    <Globe className="w-3.5 h-3.5" /> Sito Web
                  </a>
                )}
                {company.phone && (
                  <a href={`tel:${company.phone}`} className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
                    <Phone className="w-3.5 h-3.5" /> {company.phone}
                  </a>
                )}
                {company.email && (
                  <a href={`mailto:${company.email}`} className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
                    <Mail className="w-3.5 h-3.5" /> {company.email}
                  </a>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dove trovi questa azienda */}
        {markets.length > 0 && (
          <Card className="border-0 shadow-md bg-card rounded-2xl overflow-hidden mt-5">
            <CardContent className="p-5">
              <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2 mb-3">
                <Store className="w-4 h-4 text-primary" /> Dove trovi questa azienda
              </h2>
              <div className="space-y-3">
                {markets.map(market => {
                  const s = (company.market_schedules || []).find(s => s.market_id === market.id);
                  return (
                    <Link key={market.id} to={`/mercati/${market.id}`} className="flex items-start gap-3 p-3 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all group">
                      <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{market.name}</p>
                        <p className="text-xs text-muted-foreground">{market.address || market.city}{market.city && market.address ? `, ${market.city}` : ''}</p>
                        {s?.days ? (
                          <p className="text-xs text-primary font-semibold mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {s.days}{s.time_start ? ` · ${s.time_start}${s.time_end ? `–${s.time_end}` : ''}` : ''}
                            {s.notes ? ` · ${s.notes}` : ''}
                          </p>
                        ) : market.schedule ? (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {market.schedule}
                          </p>
                        ) : null}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sezione prodotti con tab */}
        <div ref={productsSectionRef} className="mt-8 pb-4 scroll-mt-4">
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1 mb-5 w-fit">
            <button
              onClick={() => setTab('tutti')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab === 'tutti' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Tutti · {products.length}
            </button>
            <button
              onClick={() => setTab('preferiti')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab === 'preferiti' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Heart className={`w-3.5 h-3.5 ${tab === 'preferiti' ? 'text-destructive fill-current' : ''}`} />
              Preferiti · {favProductsList.length}
            </button>
          </div>

          {displayedProducts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                {tab === 'preferiti' ? <Heart className="w-8 h-8 text-primary/30" /> : <ShoppingBag className="w-8 h-8 text-primary/30" />}
              </div>
              <p className="font-heading text-lg font-bold text-foreground">
                {tab === 'preferiti' ? 'Nessun prodotto preferito' : 'Nessun prodotto nel catalogo'}
              </p>
              {tab === 'preferiti' && (
                <p className="text-sm text-muted-foreground mt-1">Tocca il ❤ su un prodotto per salvarlo qui</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {displayedProducts.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  isFav={favProductIds.has(p.id)}
                  onToggleFav={() => toggleProductFav.mutate(p)}
                  cartQty={cart.find(i => i.product_id === p.id)?.quantity || 0}
                  onAddToCart={() => addToCart(p)}
                  onRemoveFromCart={() => removeFromCart(p)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer istituzionale */}
      <div className="flex flex-col items-center gap-3 py-6 border-t border-border/50 bg-card mt-4">
        <div className="flex items-center gap-4">
          <Marchi altezza={32} className="opacity-75" />
        </div>
        <p className="text-[10px] text-muted-foreground">© Campagna Amica Digital · Campo Zero</p>
      </div>

      {/* CartBar sticky */}
      <CartBar
        cart={cart}
        onAdd={addFromCart}
        onRemove={removeFromCartBar}
        onCheckout={() => setCheckoutOpen(true)}
      />

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        company={company}
        cart={cart}
        onSuccess={() => setCart([])}
      />

      <ReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        company={company}
      />
    </div>
  );
}