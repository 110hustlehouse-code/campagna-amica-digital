import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invokeLLM } from '@/api/ai';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ExternalLink, RefreshCw, Newspaper, MapPin, Leaf } from 'lucide-react';
import PullToRefresh from '../components/shared/PullToRefresh';

const categoryColors = {
  'Economia':  'bg-blue-100 text-blue-700',
  'Politica':  'bg-red-100 text-red-700',
  'Ambiente':  'bg-primary/15 text-primary',
  'Prodotti':  'bg-secondary/60 text-secondary-foreground',
  'Territorio':'bg-amber-100 text-amber-700',
};

export default function News() {
  const [city, setCity] = useState('');
  const [inputCity, setInputCity] = useState('');

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
          );
          const data = await res.json();
          const detectedCity = data.address?.city || data.address?.town || data.address?.village || '';
          if (detectedCity) { setCity(detectedCity); setInputCity(detectedCity); }
        } catch (_) {}
      });
    }
  }, []);

  const { data: news, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['coldiretti-news', city],
    queryFn: async () => {
      const cityContext = city ? `Includi anche notizie specifiche per la città di ${city} e la sua provincia/regione.` : '';
      const result = await invokeLLM({
        prompt: `Vai su www.coldiretti.it e cerca le ultime notizie pubblicate. 
        Restituisci esattamente le 10 notizie più recenti trovate su coldiretti.it.
        ${cityContext}
        Per ogni notizia fornisci: titolo originale, breve descrizione (2-3 frasi), categoria (scegli tra: Economia, Ambiente, Prodotti, Politica, Territorio), data di pubblicazione nel formato "gg mese aaaa", e l'URL diretto alla notizia su coldiretti.it.
        IMPORTANTE: usa solo notizie reali trovate su www.coldiretti.it, non inventare.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            articles: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  category: { type: "string" },
                  date: { type: "string" },
                  url: { type: "string" }
                }
              }
            }
          }
        }
      });
      return result.articles || [];
    },
    staleTime: 1000 * 60 * 30,
    enabled: true,
  });

  return (
    <div className="min-h-screen">
      {/* Hero banner */}
      <div className="relative bg-primary overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white translate-x-20 -translate-y-20" />
          <div className="absolute bottom-0 left-0 w-52 h-52 rounded-full bg-secondary -translate-x-10 translate-y-10" />
        </div>
        <div className="relative px-6 md:px-12 pt-10 pb-8">
          <div className="inline-flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1 mb-3 shadow">
            <Leaf className="w-3 h-3 text-primary" />
            <span className="text-primary font-bold text-[10px] tracking-widest uppercase">Coldiretti · Campagna Amica</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold text-white leading-tight flex items-center gap-3">
                <Newspaper className="w-8 h-8 text-secondary flex-shrink-0" />
                Notizie
              </h1>
              <p className="text-white/70 text-sm mt-2">Ultime notizie da <span className="text-secondary font-semibold">coldiretti.it</span></p>
            </div>
            <Button
              variant="ghost"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-xl border border-white/20 gap-2 flex-shrink-0 mt-1"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Aggiorna</span>
            </Button>
          </div>

          {/* City filter inline nel banner */}
          <div className="flex items-center gap-2 mt-5 flex-wrap">
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2 flex-1 max-w-xs">
              <MapPin className="w-4 h-4 text-white/60 flex-shrink-0" />
              <input
                placeholder="La tua città..."
                value={inputCity}
                onChange={e => setInputCity(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && setCity(inputCity)}
                className="bg-transparent text-white placeholder-white/50 text-sm outline-none w-full"
              />
            </div>
            <Button
              onClick={() => setCity(inputCity)}
              disabled={isFetching}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold rounded-xl px-4"
            >
              {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cerca locali'}
            </Button>
            {city && (
              <span className="text-xs text-white/70 bg-white/15 px-2.5 py-1.5 rounded-full">
                📍 {city}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <PullToRefresh onRefresh={() => refetch()}>
      <div className="px-6 md:px-12 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-muted-foreground text-sm">Caricamento notizie in corso...</p>
          </div>
        ) : !news || news.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Newspaper className="w-8 h-8 text-primary/30" />
            </div>
            <p className="font-heading text-xl font-bold text-foreground">Nessuna notizia disponibile</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {news.map((article, i) => (
              <Card key={i} className="border border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 bg-card overflow-hidden group">
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    <div className="w-1.5 bg-primary rounded-l-xl flex-shrink-0" />
                    <div className="p-5 flex-1">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {article.category && (
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${categoryColors[article.category] || 'bg-muted text-muted-foreground'}`}>
                            {article.category}
                          </span>
                        )}
                        {article.date && (
                          <span className="text-xs text-muted-foreground">{article.date}</span>
                        )}
                      </div>
                      <h3 className="font-heading text-base font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                        {article.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-3">
                        {article.description}
                      </p>
                      {article.url && (
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary font-semibold mt-4 hover:underline"
                        >
                          Leggi su coldiretti.it <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      </PullToRefresh>

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