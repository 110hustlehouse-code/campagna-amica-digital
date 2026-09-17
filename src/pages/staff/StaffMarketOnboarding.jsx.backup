import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { MapPin, Search, Loader2, CheckCircle, Navigation } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function StaffMarketOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedMarketId, setSelectedMarketId] = useState('');
  const [userCoords, setUserCoords] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: markets = [], isLoading } = useQuery({
    queryKey: ['markets-active'],
    queryFn: () => base44.entities.Market.list('name', 500),
  });

  // Try GPS on mount
  useEffect(() => {
    if (navigator.geolocation) {
      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          setGpsLoading(false);
        },
        () => setGpsLoading(false),
        { timeout: 5000 }
      );
    }
  }, []);

  const marketsWithDistance = useMemo(() => {
    return markets.map((m) => {
      const dist =
        userCoords && m.latitude && m.longitude
          ? getDistanceKm(userCoords.lat, userCoords.lon, m.latitude, m.longitude)
          : null;
      return { ...m, dist };
    });
  }, [markets, userCoords]);

  const sorted = useMemo(() => {
    return [...marketsWithDistance].sort((a, b) => {
      if (a.dist !== null && b.dist !== null) return a.dist - b.dist;
      if (a.dist !== null) return -1;
      if (b.dist !== null) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [marketsWithDistance]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.city?.toLowerCase().includes(q) ||
        m.address?.toLowerCase().includes(q)
    );
  }, [sorted, search]);

  const nearestId = sorted[0]?.dist !== null ? sorted[0]?.id : null;

  const handleSave = async () => {
    if (!selectedMarketId) {
      toast({ title: 'Seleziona un mercato per continuare', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const me = await base44.auth.me();
      // Find or create StaffMember record
      let staff = await base44.entities.StaffMember.filter({ email: me.email }, '-updated_date', 1);
      if (staff.length > 0) {
        await base44.entities.StaffMember.update(staff[0].id, {
          market_id: selectedMarketId,
          market_confirmed: true,
          full_name: me.full_name,
        });
      } else {
        await base44.entities.StaffMember.create({
          email: me.email,
          full_name: me.full_name,
          market_id: selectedMarketId,
          market_confirmed: true,
          position: 'market_manager',
          is_active: true,
        });
      }
      navigate('/staff');
    } catch (err) {
      toast({ title: 'Errore', description: err.message, variant: 'destructive' });
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, #004d26 0%, #006633 50%, #00802b 100%)' }}>
      {/* Header */}
      <div className="px-6 pt-14 pb-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'rgba(245,197,24,0.3)' }}>
          <MapPin className="w-8 h-8" style={{ color: '#f5c518' }} />
        </div>
        <h1 className="font-heading text-3xl font-bold text-white">Seleziona il tuo mercato</h1>
        <p className="text-white/70 text-sm mt-2 max-w-xs mx-auto">
          Scegli il mercato Coldiretti di cui sei responsabile. Potrai cambiarlo dal profilo in seguito.
        </p>
        {gpsLoading && (
          <div className="flex items-center justify-center gap-2 mt-3 text-white/60 text-xs">
            <Navigation className="w-3 h-3 animate-pulse" />
            Rilevamento posizione GPS...
          </div>
        )}
        {userCoords && !gpsLoading && (
          <div className="flex items-center justify-center gap-2 mt-3 text-white/60 text-xs">
            <Navigation className="w-3 h-3 text-secondary" />
            <span style={{ color: '#f5c518' }}>Ordinati per distanza da te</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-6 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Cerca per nome, città o indirizzo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/40 outline-none"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.2)' }}
          />
        </div>
      </div>

      {/* Markets list */}
      <div className="flex-1 px-6 overflow-y-auto pb-32 space-y-2">
        {isLoading ? (
          <div className="flex justify-center pt-12">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-white/50 pt-12 text-sm">Nessun mercato trovato</div>
        ) : (
          filtered.map((market) => {
            const isSelected = selectedMarketId === market.id;
            const isNearest = market.id === nearestId && market.dist !== null;
            return (
              <button
                key={market.id}
                onClick={() => setSelectedMarketId(market.id)}
                className="w-full text-left rounded-2xl p-4 transition-all duration-150 active:scale-95"
                style={{
                  background: isSelected
                    ? 'rgba(245,197,24,0.25)'
                    : 'rgba(255,255,255,0.08)',
                  border: isSelected
                    ? '2px solid rgba(245,197,24,0.8)'
                    : '1.5px solid rgba(255,255,255,0.12)',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading font-bold text-white text-base">{market.name}</span>
                      {isNearest && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,197,24,0.4)', color: '#f5c518' }}>
                          📍 Più vicino
                        </span>
                      )}
                    </div>
                    {market.city && (
                      <p className="text-white/60 text-xs mt-0.5">{market.address ? `${market.address}, ` : ''}{market.city}</p>
                    )}
                    {market.dist !== null && (
                      <p className="text-xs mt-1" style={{ color: 'rgba(245,197,24,0.8)' }}>
                        {market.dist < 1 ? `${Math.round(market.dist * 1000)} m` : `${market.dist.toFixed(1)} km`} da te
                      </p>
                    )}
                  </div>
                  {isSelected && <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#f5c518' }} />}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4" style={{ background: 'linear-gradient(to top, #004d26 60%, transparent)' }}>
        <Button
          onClick={handleSave}
          disabled={!selectedMarketId || saving}
          className="w-full h-14 text-base font-bold rounded-2xl"
          style={{
            background: selectedMarketId ? '#f5c518' : 'rgba(255,255,255,0.2)',
            color: selectedMarketId ? '#004d26' : 'rgba(255,255,255,0.4)',
            border: 'none',
          }}
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Conferma mercato'}
        </Button>
      </div>
    </div>
  );
}