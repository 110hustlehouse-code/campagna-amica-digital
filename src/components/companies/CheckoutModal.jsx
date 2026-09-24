import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMarkets, getProssimeDateMercato } from '@/api/markets';import { createOrder as apiCreateOrder } from '@/api/orders';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ShoppingBag, Loader2, MapPin, Clock, ChevronRight, ChevronLeft, Info, Navigation } from 'lucide-react';
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

const UNIT_LABELS = { kg: 'kg', lt: 'lt', pz: 'pz', confezione: 'conf.' };

function formatQty(qty, unit) {
  if (unit === 'kg' || unit === 'lt') return qty % 1 === 0 ? `${qty}` : qty.toFixed(1);
  return `${qty}`;
}

export default function CheckoutModal({ open, onClose, company, cart, onSuccess }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0); // 0: mercato, 1: riepilogo
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [pickupDate, setPickupDate] = useState('');

  const { data: prossimeDate = [] } = useQuery({
    queryKey: ['prossime-date', selectedMarket?.id],
    queryFn: () => getProssimeDateMercato(selectedMarket.id),
    enabled: !!selectedMarket?.id,
  });
  const [notes, setNotes] = useState('');
  const [userCoords, setUserCoords] = useState(null);

  const cartTotal = cart.reduce((s, i) => s + i.total, 0);

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

  const companyMarketIds = company?.market_ids || [];

  const sortedMarkets = [...markets]
    .filter(m => companyMarketIds.includes(m.id))
    .map(m => ({
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

  const createOrder = useMutation({
    mutationFn: apiCreateOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      handleClose();
      onSuccess();
      toast.success('Ordine inviato con successo!');
    },
  });

  const handleClose = () => {
    setStep(0); setSelectedMarket(null); setPickupDate(''); setNotes('');
    onClose();
  };

  const submit = () => {
    createOrder.mutate({
      company_id: company.id, company_name: company.name,
      market_id: selectedMarket.id, market_name: selectedMarket.name,
      items: cart, total_amount: cartTotal, status: 'in_attesa', pickup_date: pickupDate, notes,
    });
  };

  const steps = ['Punto ritiro', 'Riepilogo'];
  const canNext = step === 0 ? !!selectedMarket : !!pickupDate;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg w-full p-0 gap-0" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/50 flex-shrink-0">
          <DialogTitle className="font-heading text-lg flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Completa ordine · {company?.name}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-3">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
                <div className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === step ? 'bg-primary text-white' : i < step ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs font-semibold hidden sm:block ${i === step ? 'text-primary' : 'text-muted-foreground'}`}>{s}</span>
                </div>
                {i < steps.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-primary/40' : 'bg-border'}`} />}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px' }}>

          {/* Step 0: Mercato */}
          {step === 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                <Info className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                Scegli il punto di ritiro più comodo per te.
                {userCoords && <span className="ml-auto flex items-center gap-1"><Navigation className="w-3 h-3" /> per distanza</span>}
              </div>
              <div className="flex flex-col gap-2">
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
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm">{market.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 flex-shrink-0" />{market.city}{market.region ? `, ${market.region}` : ''}
                        </p>
                        {market.schedule && (
                          <p className="text-xs text-primary mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 flex-shrink-0" />{market.schedule}
                          </p>
                        )}
                      </div>
                      {market.distance !== null && (
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
                          {formatDist(market.distance)}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Riepilogo */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              {selectedMarket && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex gap-3">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-primary">{selectedMarket.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedMarket.city}</p>
                    {selectedMarket.schedule && (
                      <p className="text-xs text-primary/70 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />{selectedMarket.schedule}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div>
                {cart.map((item, i) => (
                  <div key={i} className="flex justify-between py-1.5 border-b border-border/30 last:border-0 text-sm">
                    <span>{formatQty(item.quantity, item.unit)} {UNIT_LABELS[item.unit] || item.unit} · {item.product_name}</span>
                    <span className="font-semibold">€{item.total.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 font-bold text-base">
                  <span>Totale</span>
                  <span className="text-primary">€{cartTotal.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Data di ritiro</label>
                {prossimeDate.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nessuna data di mercato disponibile al momento per questo punto di ritiro.
                  </p>
                ) : (
                  <select
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                  >
                    <option value="">Scegli una data...</option>
                    {prossimeDate.map((d) => (
                      <option key={d} value={d}>
                        {new Date(d).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </option>
                    ))}
                  </select>
                )}
                {selectedMarket?.schedule && (
                  <p className="text-xs text-muted-foreground mt-1">Orari mercato: {selectedMarket.schedule}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Note</label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Note aggiuntive..." className="resize-none" rows={2} />
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-border/50 flex-shrink-0 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Indietro
            </Button>
          ) : (
            <Button variant="outline" onClick={handleClose}>Annulla</Button>
          )}

          {step < 1 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canNext} className="bg-primary hover:bg-primary/90 gap-1">
              Avanti <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={!canNext || createOrder.isPending} className="bg-primary hover:bg-primary/90">
              {createOrder.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ShoppingBag className="w-4 h-4 mr-1" />}
              Invia ordine · €{cartTotal.toFixed(2)}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}