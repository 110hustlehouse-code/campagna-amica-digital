import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invokeLLM } from '@/api/ai';
import { getPublishedMessagesAll } from '@/api/staff';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, RefreshCw, Newspaper, MapPin, Leaf, X, Calendar, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Marchi from '@/components/shared/Marchi';

const categoryColors = {
  'Economia':  'bg-blue-100 text-blue-700',
  'Politica':  'bg-red-100 text-red-700',
  'Ambiente':  'bg-primary/15 text-primary',
  'Prodotti':  'bg-secondary/60 text-secondary-foreground',
  'Territorio':'bg-amber-100 text-amber-700',
  'Mercati':   'bg-primary/15 text-primary',
};

const messageTypeColors = {
  'closure': 'bg-red-100 text-red-700',
  'special_opening': 'bg-green-100 text-green-700',
  'event': 'bg-primary/15 text-primary',
};

export default function MarketNewsDrawer({ open, onClose, userLocation, nearestCity }) {
  const [activeTab, setActiveTab] = useState('news');

  const { data: news, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['market-news', nearestCity],
    queryFn: async () => {
      const cityContext = nearestCity
        ? `Includi notizie sui mercati Campagna Amica vicini a ${nearestCity} e nella sua provincia/regione.`
        : '';
      const result = await invokeLLM({
        prompt: `Vai su www.coldiretti.it e cerca le ultime notizie sui MERCATI Campagna Amica di Coldiretti.
        Restituisci esattamente le 10 notizie più recenti che riguardano i mercati contadini, mercati Campagna Amica, fiere, eventi mercato, aperture di nuovi mercati, iniziative nei mercati.
        ${cityContext}
        Per ogni notizia fornisci: titolo originale, un riassunto tuo di 2-3 frasi, riscritto con parole diverse dall'originale (non copiare il testo della fonte), categoria (scegli tra: Mercati, Territorio, Economia, Ambiente, Prodotti), data di pubblicazione nel formato "gg mese aaaa", e l'URL diretto alla notizia su coldiretti.it.
        IMPORTANTE: usa solo notizie reali trovate su www.coldiretti.it strettamente legate ai mercati, non inventare.`,
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
    enabled: open && activeTab === 'news',
  });

  const { data: staffMessages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['staff-messages'],
    queryFn: () => getPublishedMessagesAll(20),
    staleTime: 1000 * 60 * 5,
    enabled: open && activeTab === 'events',
  });

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        {/* Header */}
        <div className="bg-primary px-5 pt-6 pb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Leaf className="w-3.5 h-3.5 text-secondary" />
              <span className="text-secondary font-bold text-[9px] tracking-widest uppercase">Campagna Amica Digital</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <SheetTitle className="text-white font-heading text-xl font-bold flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-secondary" />
            Notizie e Comunicazioni
          </SheetTitle>
          {nearestCity && (
            <div className="flex items-center gap-2 text-xs text-white/80 mt-2">
              <MapPin className="w-3.5 h-3.5 text-secondary flex-shrink-0" />
              <span>Per <strong className="text-white">{nearestCity}</strong></span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-4 border-b border-border/40 sticky top-0 bg-white/50 backdrop-blur-sm z-10">
          <button
            onClick={() => setActiveTab('news')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'news'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Newspaper className="w-4 h-4" />
            Notizie
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'events'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Comunicazioni
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          {activeTab === 'news' ? (
            // News Tab
            isLoading || isFetching ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-muted-foreground text-sm">Caricamento notizie...</p>
              </div>
            ) : !news || news.length === 0 ? (
              <div className="text-center py-20 px-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Newspaper className="w-6 h-6 text-primary/30" />
                </div>
                <p className="font-heading text-lg font-bold text-foreground">Nessuna notizia</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {news.map((article, i) => (
                  <div key={i} className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {article.category && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${categoryColors[article.category] || 'bg-muted text-muted-foreground'}`}>
                          {article.category}
                        </span>
                      )}
                      {article.date && (
                        <span className="text-xs text-muted-foreground">{article.date}</span>
                      )}
                    </div>
                    <h3 className="font-heading text-sm font-semibold text-foreground leading-snug">
                      {article.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-3">
                      {article.description}
                    </p>
                    {article.url && (
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary font-semibold mt-2.5 hover:underline"
                      >
                        Leggi su coldiretti.it <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            // Events/Communications Tab
            messagesLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-muted-foreground text-sm">Caricamento comunicazioni...</p>
              </div>
            ) : !staffMessages || staffMessages.length === 0 ? (
              <div className="text-center py-20 px-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-6 h-6 text-primary/30" />
                </div>
                <p className="font-heading text-lg font-bold text-foreground">Nessuna comunicazione</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {staffMessages.map((message) => (
                  <div key={message.id} className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${messageTypeColors[message.type] || 'bg-muted text-muted-foreground'}`}>
                        {message.type === 'closure' ? 'Chiusura' : message.type === 'special_opening' ? 'Apertura speciale' : 'Evento'}
                      </span>
                      {message.event_date && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.event_date).toLocaleDateString('it-IT')}
                        </span>
                      )}
                    </div>
                    <h3 className="font-heading text-sm font-semibold text-foreground leading-snug">
                      {message.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-3">
                      {message.description}
                    </p>
                    {message.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                        <MapPin className="w-3 h-3" />
                        {message.location}
                      </div>
                    )}
                    {message.time_start && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        {message.time_start}{message.time_end ? ` - ${message.time_end}` : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 py-3 flex flex-col items-center gap-1.5 bg-card">
          <div className="flex items-center gap-4">
            <Marchi altezza={28} className="opacity-75" />
          </div>
          <p className="text-[10px] text-muted-foreground">© Campagna Amica Digital · Campo Zero</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}