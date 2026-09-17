import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Loader2, MapPin, Leaf, ArrowRight, Star, ShoppingBasket, Building2, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import CategoryBadge from '../components/shared/CategoryBadge';
import ListaDellaSpesa from '../components/spesa/ListaDellaSpesa';
import { toast } from 'sonner';

const TABS = [
  { id: 'preferiti', label: 'I Miei Preferiti', icon: Heart },
  { id: 'spesa', label: 'Lista della spesa', icon: ShoppingBasket },
];

// Sezione mercato espandibile con le sue aziende preferite dentro
function MercatoSection({ market, aziendeFav, onRemoveMarket, onRemoveAzienda }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border border-border/50 rounded-2xl overflow-hidden shadow-sm bg-card">
      {/* Header mercato */}
      <div className="flex items-center gap-3 p-4 bg-primary/5 border-b border-border/30">
        {market.image_url ? (
          <img src={market.image_url} alt={market.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-border/50" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <Link to={`/mercati/${market.id}`}>
            <p className="font-heading font-bold text-foreground hover:text-primary transition-colors">{market.name}</p>
          </Link>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {market.city && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />{market.city}
              </span>
            )}
            {market.schedule && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />{market.schedule}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onRemoveMarket()}
            className="text-muted-foreground hover:text-destructive transition-colors p-1"
            title="Rimuovi dai preferiti"
          >
            <Heart className="w-4 h-4 fill-destructive text-destructive" />
          </button>
          <button
            onClick={() => setOpen(o => !o)}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Aziende preferite dentro questo mercato */}
      {open && (
        <div className="divide-y divide-border/20">
          {aziendeFav.length === 0 ? (
            <div className="px-4 py-5 text-center">
              <p className="text-sm text-muted-foreground">Nessuna azienda preferita in questo mercato</p>
              <Link to={`/mercati/${market.id}`}>
                <Button variant="outline" size="sm" className="mt-2 rounded-xl text-xs gap-1.5">
                  Scopri le aziende <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          ) : (
            aziendeFav.map(fav => (
              <div key={fav.id} className="flex items-center gap-3 px-4 py-3 group hover:bg-muted/30 transition-colors">
                <Link to={`/aziende/${fav.company_id}#preferiti`} className="flex items-center gap-3 flex-1 min-w-0">
                  {fav.company?.logo_url ? (
                    <img src={fav.company.logo_url} alt="logo" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-border/50" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-heading font-bold text-primary">{fav.company?.name?.[0] || '?'}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                      {fav.company?.name || 'Azienda'}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {fav.company?.category && <CategoryBadge category={fav.company.category} />}
                      {fav.company?.city && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />{fav.company.city}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                </Link>
                <button
                  onClick={() => onRemoveAzienda(fav.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1 flex-shrink-0"
                >
                  <Heart className="w-3.5 h-3.5 fill-destructive text-destructive" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function Favorites() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('preferiti');

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => base44.entities.Favorite.list(),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['all-companies'],
    queryFn: () => base44.entities.Company.list('-created_date', 500),
  });

  const { data: markets = [] } = useQuery({
    queryKey: ['markets'],
    queryFn: () => base44.entities.Market.list('-created_date', 200),
  });

  const removeFav = useMutation({
    mutationFn: (id) => base44.entities.Favorite.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] });
      const prev = queryClient.getQueryData(['favorites']);
      queryClient.setQueryData(['favorites'], old => old.filter(f => f.id !== id));
      return prev;
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['favorites'], context);
      toast.error('Errore nella rimozione');
    },
    onSuccess: () => {
      toast.success('Rimosso dai preferiti');
    },
  });

  // Mercati preferiti
  const favMarkets = favorites
    .filter(f => f.market_id && !f.product_id)
    .map(f => ({ ...f, market: markets.find(m => m.id === f.market_id) }))
    .filter(f => f.market);

  // Tutte le aziende preferite (senza prodotti)
  const favAziendeTutte = favorites
    .filter(f => f.company_id && !f.product_id)
    .map(f => ({ ...f, company: companies.find(c => c.id === f.company_id) }));

  // Per ogni mercato preferito, trova le aziende preferite che sono in quel mercato
  const getAziendeFavPerMercato = (marketId) => {
    const market = markets.find(m => m.id === marketId);
    const marketCompanyIds = market?.company_ids || [];
    return favAziendeTutte.filter(f => marketCompanyIds.includes(f.company_id));
  };

  // Aziende preferite che non appartengono ad alcun mercato preferito
  const favAziendeOrphane = favAziendeTutte.filter(f => {
    return !favMarkets.some(fm => {
      const market = markets.find(m => m.id === fm.market_id);
      return (market?.company_ids || []).includes(f.company_id);
    });
  });

  const totalFav = favMarkets.length + favAziendeTutte.length;

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
            <span className="text-primary font-bold text-[10px] tracking-widest uppercase">Campagna Amica · Coldiretti</span>
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-white leading-tight">
            I Miei Preferiti
          </h1>
          <p className="text-white/70 text-sm mt-2">Mercati, aziende e lista della spesa</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 md:px-12 pt-6">
        <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === t.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
                {t.id === 'preferiti' && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === t.id ? 'bg-primary/10 text-primary' : 'bg-border text-muted-foreground'}`}>
                    {totalFav}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 md:px-12 py-6">
        {tab === 'preferiti' ? (
          isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : totalFav === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Heart className="w-10 h-10 text-primary/30" />
              </div>
              <p className="font-heading text-xl font-bold text-foreground">Nessun preferito ancora</p>
              <p className="text-muted-foreground text-sm mt-2 mb-6">Salva mercati e aziende per trovarli facilmente</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Link to="/mercati">
                  <Button className="bg-primary hover:bg-primary/90 gap-2 rounded-xl">
                    Esplora Mercati <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/aziende">
                  <Button variant="outline" className="gap-2 rounded-xl">
                    Esplora Aziende <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mercati preferiti con aziende dentro */}
              {favMarkets.map(fav => (
                <MercatoSection
                  key={fav.id}
                  market={fav.market}
                  aziendeFav={getAziendeFavPerMercato(fav.market_id)}
                  onRemoveMarket={() => removeFav.mutate(fav.id)}
                  onRemoveAzienda={(id) => removeFav.mutate(id)}
                />
              ))}

              {/* Aziende preferite senza mercato associato */}
              {favAziendeOrphane.length > 0 && (
                <div className="border border-border/50 rounded-2xl overflow-hidden shadow-sm bg-card">
                  <div className="px-4 py-3 bg-muted/40 border-b border-border/30 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <p className="text-sm font-bold text-foreground">Altre aziende preferite</p>
                  </div>
                  <div className="divide-y divide-border/20">
                    {favAziendeOrphane
                      .map(fav => (
                        <div key={fav.id} className="flex items-center gap-3 px-4 py-3 group hover:bg-muted/30 transition-colors">
                          <Link to={`/aziende/${fav.company_id}#preferiti`} className="flex items-center gap-3 flex-1 min-w-0">
                            {fav.company?.logo_url ? (
                              <img src={fav.company.logo_url} alt="logo" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-border/50" />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-sm font-heading font-bold text-primary">{fav.company?.name?.[0] || '?'}</span>
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                                {fav.company?.name || 'Azienda'}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap">
                                {fav.company?.category && <CategoryBadge category={fav.company.category} />}
                                {fav.company?.city && (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <MapPin className="w-3 h-3" />{fav.company.city}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                          </Link>
                          <button
                            onClick={() => removeFav.mutate(fav.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1 flex-shrink-0"
                          >
                            <Heart className="w-3.5 h-3.5 fill-destructive text-destructive" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            </div>
          )
        ) : (
          <ListaDellaSpesa />
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center gap-3 py-8 mt-4 border-t border-border/50 bg-card">
        <div className="flex items-center gap-5">
          <img src="https://media.base44.com/images/public/69cd578540390a850769aa6d/570bdc5f1_cropped-coldiretti-vector-logo.png" alt="Coldiretti" className="h-10 w-auto opacity-80" />
          <div className="w-px h-8 bg-border" />
          <img src="https://media.base44.com/images/public/69cd578540390a850769aa6d/ce1586586_images.jpeg" alt="Campagna Amica" className="h-10 w-auto rounded-lg opacity-80" />
        </div>
        <p className="text-xs text-muted-foreground">© Coldiretti · Campagna Amica</p>
      </div>
    </div>
  );
}