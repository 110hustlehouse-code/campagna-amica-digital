import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMarkets } from '@/api/markets';
import { getRegisteredCompanies } from '@/api/companies';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Loader2, LocateFixed, Leaf, Newspaper, LayoutGrid, Map, ArrowRight } from 'lucide-react';
import MarketCard from '../components/markets/MarketCard';
import MarketsMap from '../components/markets/MarketsMap';
import Pagination from '../components/shared/Pagination';
import MarketNewsDrawer from '../components/markets/MarketNewsDrawer';
import PullToRefresh from '../components/shared/PullToRefresh';
import Marchi from '@/components/shared/Marchi';

const PAGE_SIZE = 12;

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Markets() {
  const [search, setSearch] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [page, setPage] = useState(1);
  const [newsOpen, setNewsOpen] = useState(false);
  const [nearestCity, setNearestCity] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'

  const { data: markets = [], isLoading, refetch } = useQuery({
    queryKey: ['markets'],
    queryFn: getMarkets,
    staleTime: 5 * 60 * 1000,
  });

  const { data: registeredCompanies = [] } = useQuery({
    queryKey: ['registered-companies'],
    queryFn: getRegisteredCompanies,
    staleTime: 5 * 60 * 1000,
  });

  const registeredIds = new Set(registeredCompanies.map(c => c.id));

  const handleLocate = () => {
    if (!navigator.geolocation) {
      alert('La geolocalizzazione non è supportata da questo browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng });
        setSearch('');
        setLocating(false);
        setPage(1);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=it`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
          if (city) setNearestCity(city);
        } catch (_) {}
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          alert('Permesso di geolocalizzazione negato. Abilita la posizione nelle impostazioni del browser.');
        } else {
          alert('Impossibile ottenere la posizione. Riprova.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const marketsWithDistance = useMemo(() => markets
    .map(m => ({
      ...m,
      distance: userLocation && m.latitude && m.longitude
        ? getDistance(userLocation.lat, userLocation.lng, m.latitude, m.longitude)
        : undefined
    }))
    .filter(m => !search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.city?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (a.distance !== undefined && b.distance !== undefined) return a.distance - b.distance;
      return 0;
    }), [markets, search, userLocation]);

  const totalPages = Math.ceil(marketsWithDistance.length / PAGE_SIZE);
  const paginated = marketsWithDistance.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (val) => { setSearch(val); setPage(1); };

  return (
    <div className="min-h-screen">
      {/* Hero banner */}
      <div className="relative bg-primary overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white translate-x-16 -translate-y-16" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-secondary -translate-x-8 translate-y-8" />
        </div>
        <div className="relative px-6 md:px-12 pt-10 pb-8">
          <div className="inline-flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1 mb-3 shadow">
            <Leaf className="w-3 h-3 text-primary" />
            <span className="text-primary font-bold text-[10px] tracking-widest uppercase">Campagna Amica Digital</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold text-white leading-tight flex items-center gap-3">
                <MapPin className="w-8 h-8 text-secondary flex-shrink-0" />
                Mercati
              </h1>
              <p className="text-white/70 text-sm mt-2">Campagna Amica Digital · Rete nazionale</p>
              {markets.length > 0 && (
                <span className="inline-block mt-3 bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {markets.length} mercati
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 mt-1">
              {/* Toggle lista / mappa */}
              <div className="flex bg-white/15 rounded-xl p-1 border border-white/20">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'list' ? 'bg-white text-primary shadow' : 'text-white/80 hover:text-white'}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Lista</span>
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'map' ? 'bg-white text-primary shadow' : 'text-white/80 hover:text-white'}`}
                >
                  <Map className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mappa</span>
                </button>
              </div>
              <Button
                variant="ghost"
                onClick={() => setNewsOpen(true)}
                className="text-white/80 hover:text-white hover:bg-white/20 rounded-xl border border-white/20 gap-2"
              >
                <Newspaper className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Notizie</span>
              </Button>
            </div>
          </div>

          {/* Search + locate inline nel banner */}
          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <input
                placeholder="Cerca per nome o città..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { setPage(1); setUserLocation(null); setNearestCity(''); } }}
                className="w-full pl-10 pr-12 py-2.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 text-sm outline-none focus:bg-white/25 transition-colors"
              />
              <button
                onClick={() => { setPage(1); setUserLocation(null); setNearestCity(''); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/35 transition-colors text-white"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <Button
              onClick={handleLocate}
              disabled={locating}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold rounded-xl gap-2"
            >
              {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
              <span>Usa posizione</span>
            </Button>
          </div>

          {userLocation && (
            <div className="flex items-center gap-2 mt-3 text-xs text-white/70">
              <MapPin className="w-3.5 h-3.5 text-secondary" />
              <span>Mercati ordinati per vicinanza{nearestCity && ` · ${nearestCity}`}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <PullToRefresh onRefresh={() => refetch()}>
      <div className="px-6 md:px-12 py-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : marketsWithDistance.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-primary/30" />
            </div>
            <p className="font-heading text-xl font-bold text-foreground">Nessun mercato trovato</p>
          </div>
        ) : viewMode === 'map' ? (
          <MarketsMap
            markets={marketsWithDistance}
            registeredIds={registeredIds}
            userLocation={userLocation}
          />
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">{marketsWithDistance.length} mercati trovati</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginated.map(m => (
                <MarketCard
                  key={m.id}
                  market={m}
                  distance={m.distance}
                  registeredCompanyCount={(m.company_ids || []).filter(id => registeredIds.has(id)).length}
                />
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
      </PullToRefresh>

      <MarketNewsDrawer
        open={newsOpen}
        onClose={() => setNewsOpen(false)}
        userLocation={userLocation}
        nearestCity={nearestCity}
      />

      {/* Footer */}
      <div className="flex flex-col items-center gap-3 py-8 mt-4 border-t border-border/50 bg-card">
        <div className="flex items-center gap-5">
          <Marchi altezza={40} className="opacity-80" />
        </div>
        <p className="text-xs text-muted-foreground">© Campagna Amica Digital · Campo Zero</p>
      </div>
    </div>
  );
}