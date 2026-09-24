import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyFavorites, aggiungiPreferito, rimuoviPreferito } from '@/api/favorites';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Clock, Building2, Heart } from 'lucide-react';
import { toast } from 'sonner';

export default function MarketCard({ market, distance, registeredCompanyCount }) {
  const prestoDisponibile = !market.recurring_days || market.recurring_days.length === 0;
  const queryClient = useQueryClient();

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: getMyFavorites,
  });

  const isFav = favorites.some(f => f.market_id === market.id && !f.company_id && !f.product_id);

  const toggleFav = useMutation({
    mutationFn: async () => {
      if (isFav) {
        const fav = favorites.find(f => f.market_id === market.id && !f.company_id && !f.product_id);
        await rimuoviPreferito(fav.id);
      } else {
        await aggiungiPreferito({ market_id: market.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success(isFav ? 'Rimosso dai preferiti' : 'Mercato salvato nei preferiti');
    },
  });

  const contenuto = (
    <Card className={`overflow-hidden border-0 shadow-sm transition-all duration-300 bg-card ${prestoDisponibile ? 'opacity-60 grayscale' : 'hover:shadow-xl'}`}>
      <div className="aspect-[16/9] overflow-hidden bg-muted relative">
        {market.image_url ? (
          <img src={market.image_url} alt={market.name} className={`w-full h-full object-cover transition-transform duration-500 ${!prestoDisponibile && 'group-hover:scale-105'}`} />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary/30 to-primary/20 flex items-center justify-center">
            <MapPin className="w-12 h-12 text-primary/30" />
          </div>
        )}
        {distance !== undefined && !prestoDisponibile && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-semibold text-primary">
            {distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`}
          </div>
        )}
        {prestoDisponibile && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <img
              src="https://otefhryrnajzfyaiwmja.supabase.co/storage/v1/object/public/Badges/Mercato_Presto_Disponibile.png"
                            alt="Mercato presto disponibile"
              className="w-28 h-auto drop-shadow-md"
            />
          </div>
        )}
      </div>
      <CardContent className="p-5">
        <h3 className="font-heading text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
          {market.name}
        </h3>
        <div className="space-y-2 mt-3">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            {market.address || market.city}
          </p>
          {market.opening_days && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-secondary flex-shrink-0" />
              {market.opening_days}
            </p>
          )}
          {market.opening_hours && (
            <p className="text-sm text-primary/80 font-medium">
              {market.opening_hours}
            </p>
          )}
          {market.schedule && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-secondary flex-shrink-0" />
              {market.schedule}
            </p>
          )}
          {registeredCompanyCount > 0 && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary/60 flex-shrink-0" />
              {registeredCompanyCount} {registeredCompanyCount === 1 ? 'azienda presente' : 'aziende presenti'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="relative group">
      {prestoDisponibile ? contenuto : <Link to={`/mercati/${market.id}`}>{contenuto}</Link>}

      {/* Cuore preferito */}
      <button
        onClick={(e) => { e.preventDefault(); toggleFav.mutate(); }}
        className={`absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all ${
          isFav ? 'bg-destructive text-white' : 'bg-white/90 text-muted-foreground hover:text-destructive'
        }`}
      >
        <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
      </button>
    </div>
  );
}