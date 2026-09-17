import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMarkets } from '@/api/markets';
import { createOrder } from '@/api/orders';
import { invokeLLM } from '@/api/ai';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Minus, Plus, ShoppingBag, Loader2, MapPin, Clock, ChevronRight, ChevronLeft, Info, Navigation } from 'lucide-react';
import { toast } from 'sonner';

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

const UNIT_STEPS = { kg: 0.5, lt: 0.5, pz: 1, confezione: 1 };
const UNIT_LABELS = { kg: 'kg', lt: 'lt', pz: 'pz', confezione: 'conf.' };

function formatQty(qty, unit) {
  if (unit === 'kg' || unit === 'lt') return qty % 1 === 0 ? `${qty}` : qty.toFixed(1);
  return `${qty}`;
}

export default function OrderModal({ open, onClose, company, products }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [cart, setCart] = useState([]);
  const [pickupDate, setPickupDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [aiLabels, setAiLabels] = useState({});

  const { data: markets = [] } = useQuery({
    queryKey: ['markets'],
    queryFn: getMarkets,
    enabled: open,
  });

  useEffect(() => {
    if (open && !userCoords) {
      navigator.geolocation?.getCurrentPosition(
        pos => setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => {}
      );
    }
  }, [open]);

  useEffect(() => {
    if (!open || !products?.length || Object.keys(aiLabels).length > 0) return;
    invokeLLM({
      prompt: `Sei un esperto di prodotti alimentari italiani venduti al mercato contadino.
Per ciascun prodotto, restituisci l'etichetta dell'unità di misura più appropriata per il cliente (es: "kg", "etto", "lt", "pz", "mazzo", "conf.", "bottiglia", "barattolo", "vaschetta").
Considera nome, categoria e unità del produttore.
Restituisci SOLO un JSON con chiave = product_id, valore = etichetta breve.
Prodotti: ${JSON.stringify(products.map(p => ({ id: p.id, name: p.name, unit: p.unit, category: p.category })))}`,
      response_json_schema: { type: 'object', properties: {}, additionalProperties: { type: 'string' } }
    }).then(res => { if (res && typeof res === 'object') setAiLabels(res); });
  }, [open, products]);

  const sortedMarkets = [...markets].map(m => ({
    ...m,
    distance: (userCoords && m.latitude && m.longitude)
      ? haversine(userCoords.lat, userCoords.lon, m.latitude, m.longitude)
      : null,
  })).sort((a, b) => {
    if (a.distance === null && b.distance === null) return 0;
    if (a.distance === null) return 1;
    if (b.distance === null) return -1;
    return a.distance - b.distance;
  });

  const getInCart = (pid) => cart.find(i => i.product_id === pid);
  const cartTotal = cart.reduce((sum, i) => sum + i.total, 0);

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

  const createOrder = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      handleClose();
      toast.success('Ordine inviato con successo!');
    },
  });

  const handleClose = () => {
    setCart([]); setNotes(''); setPickupDate(''); setSelectedMarket(null); setStep(0);
    onClose();
  };

  const submit = () => {
    createOrder.mutate({
      company_id: company.id, company_name: company.name,
      market_id: selectedMarket.id, market_name: selectedMarket.name,
      items: cart, total_amount: cartTotal, status: 'in_attesa', pickup_date: pickupDate, notes,
    });
  };

  const steps = ['Prodotti', 'Ritiro', 'Riepilogo'];
  const canNext = step === 0 ? cart.length > 0 : step === 1 ? !!selectedMarket : !!pickupDate;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg w-full p-0 gap-0" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/50 flex-shrink-0">
          <DialogTitle className="font-heading text-lg flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Ordina da {company?.name}
          </DialogTitle>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-3">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
                <div className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === step ? 'bg-primary text-white' : i < step ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs font-semibold hidden sm:block ${i === step ? 'text-primary' : 'text-muted-foreground'}`}>{s}</span>
                </div>
                {i < steps.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-primary/40' : 'bg-border'}`} />}
              </div>
            ))}
          </div>
        </DialogHeader>

        {/* Body scrollabile */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px' }}>

          {/* STEP 0: Prodotti */}
          {step === 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {products.map(product => {
                const inCart = getInCart(product.id);
                const unitLabel = aiLabels[product.id] || UNIT_LABELS[product.unit] || product.unit || 'pz';
                return (
                  <div key={product.id} style={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', overflow: 'hidden' }}>
                    {/* Immagine semplice, nessun overlay */}
                    <div style={{ aspectRatio: '1', background: 'hsl(var(--muted))', position: 'relative' }}>
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ShoppingBag style={{ width: 32, height: 32, opacity: 0.3 }} />
                        </div>
                      )}
                      {inCart && (
                        <div style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: '50%', background: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>✓</span>
                        </div>
                      )}
                    </div>

                    {/* Info e controlli — completamente fuori dall'immagine */}
                    <div style={{ padding: '10px' }}>
                      <p style={{ fontWeight: 600, fontSize: 12, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</p>
                      <p style={{ color: 'hsl(var(--primary))', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                        €{product.price?.toFixed(2)}<span style={{ fontSize: 10, fontWeight: 400, color: 'hsl(var(--muted-foreground))' }}>/{unitLabel}</span>
                      </p>

                      {inCart ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            onClick={() => removeFromCart(product)}
                            style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid hsl(var(--border))', background: 'hsl(var(--muted))', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                          >
                            <Minus style={{ width: 14, height: 14 }} />
                          </button>
                          <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{formatQty(inCart.quantity, product.unit)}</div>
                            <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>{unitLabel}</div>
                          </div>
                          <button
                            onClick={() => addToCart(product)}
                            style={{ width: 32, height: 32, borderRadius: '50%', background: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, border: 'none' }}
                          >
                            <Plus style={{ width: 14, height: 14, color: 'white' }} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product)}
                          style={{ width: '100%', padding: '6px 0', borderRadius: 8, background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                        >
                          <Plus style={{ width: 13, height: 13 }} /> Aggiungi
                        </button>
                      )}

                      {inCart && (
                        <p style={{ textAlign: 'center', fontSize: 11, color: 'hsl(var(--primary))', fontWeight: 600, marginTop: 4 }}>€{inCart.total.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* STEP 1: Mercato */}
          {step === 1 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Info style={{ width: 14, height: 14, color: 'hsl(var(--primary))', flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>Scegli dove ritirare il tuo ordine.</p>
                {userCoords && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', gap: 3 }}><Navigation style={{ width: 11, height: 11 }} /> per distanza</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sortedMarkets.map(market => (
                  <button
                    key={market.id}
                    onClick={() => setSelectedMarket(market)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                      border: `1px solid ${selectedMarket?.id === market.id ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
                      background: selectedMarket?.id === market.id ? 'hsl(var(--primary) / 0.05)' : 'hsl(var(--muted) / 0.3)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{market.name}</p>
                        <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <MapPin style={{ width: 10, height: 10, flexShrink: 0 }} />{market.city}{market.region ? `, ${market.region}` : ''}
                        </p>
                        {market.schedule && (
                          <p style={{ fontSize: 11, color: 'hsl(var(--primary))', marginTop: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Clock style={{ width: 10, height: 10, flexShrink: 0 }} />{market.schedule}
                          </p>
                        )}
                      </div>
                      {market.distance !== null && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.1)', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>
                          {formatDist(market.distance)}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Riepilogo */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {selectedMarket && (
                <div style={{ background: 'hsl(var(--primary) / 0.05)', border: '1px solid hsl(var(--primary) / 0.2)', borderRadius: 12, padding: '10px 14px', display: 'flex', gap: 10 }}>
                  <MapPin style={{ width: 14, height: 14, color: 'hsl(var(--primary))', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 12, color: 'hsl(var(--primary))' }}>{selectedMarket.name}</p>
                    <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{selectedMarket.city}</p>
                    {selectedMarket.schedule && (
                      <p style={{ fontSize: 11, color: 'hsl(var(--primary) / 0.7)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock style={{ width: 10, height: 10 }} />{selectedMarket.schedule}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div>
                {cart.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid hsl(var(--border) / 0.4)', fontSize: 13 }}>
                    <span>{formatQty(item.quantity, item.unit)} {UNIT_LABELS[item.unit] || item.unit || 'pz'} · {item.product_name}</span>
                    <span style={{ fontWeight: 600 }}>€{item.total.toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 700, fontSize: 15 }}>
                  <span>Totale</span>
                  <span style={{ color: 'hsl(var(--primary))' }}>€{cartTotal.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Data di ritiro</label>
                <Input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                {selectedMarket?.schedule && (
                  <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 4 }}>Orari mercato: {selectedMarket.schedule}</p>
                )}
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Note</label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Note aggiuntive..." className="resize-none" rows={2} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid hsl(var(--border) / 0.5)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Indietro
            </Button>
          ) : (
            <Button variant="outline" onClick={handleClose}>Annulla</Button>
          )}

          {step === 0 && cart.length > 0 && (
            <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.1)', padding: '4px 12px', borderRadius: 20 }}>
              {cart.length} prod. · €{cartTotal.toFixed(2)}
            </span>
          )}

          {step < 2 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canNext} className="bg-primary hover:bg-primary/90 gap-1">
              Avanti <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={!canNext || createOrder.isPending} className="bg-primary hover:bg-primary/90">
              {createOrder.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
              &nbsp;Invia · €{cartTotal.toFixed(2)}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}