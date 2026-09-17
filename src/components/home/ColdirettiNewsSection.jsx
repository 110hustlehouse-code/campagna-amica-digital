import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getNews } from '@/api/news';
import { Newspaper, ExternalLink, Loader2 } from 'lucide-react';

const SOURCE_CONFIG = {
  'Coldiretti': { color: 'bg-primary text-white' },
  'Campagna Amica': { color: 'bg-secondary text-secondary-foreground' },
};

export default function ColdirettiNewsSection() {
  const { data: news = [], isLoading } = useQuery({
    queryKey: ['news-cache'],
    queryFn: () => getNews(6),
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="px-6 md:px-12 py-10 border-t border-border/50">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Newspaper className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
              Notizie <span className="text-primary">Coldiretti</span>
            </h2>
          </div>
          <p className="text-muted-foreground text-sm">Aggiornamenti da coldiretti.it e campagnamica.it</p>
        </div>
        </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm">Caricamento notizie...</span>
        </div>
      ) : news.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Nessuna notizia disponibile al momento.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {news.map((item, i) => {
            const cfg = SOURCE_CONFIG[item.source] || SOURCE_CONFIG['Coldiretti'];
            return (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col rounded-2xl border border-border/40 bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300 overflow-hidden"
              >
                <div className="p-5 flex flex-col flex-1 gap-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${cfg.color}`}>
                      {item.source}
                    </span>
                    {item.date && (
                      <span className="text-xs text-muted-foreground">{item.date}</span>
                    )}
                  </div>
                  <h3 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors text-sm leading-snug line-clamp-3">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1">{item.description}</p>
                  )}
                  <div className="flex items-center gap-1 text-primary text-xs font-semibold mt-auto">
                    Leggi l'articolo <ExternalLink className="w-3 h-3" />
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}