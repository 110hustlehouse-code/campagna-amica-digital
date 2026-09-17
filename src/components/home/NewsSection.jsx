import React, { useState, useEffect } from 'react';
import { getNews } from '@/api/news';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NewsSection() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    // Le notizie si leggono dalla cache, non si cercano a ogni visita.
    // La cache viene aggiornata dalla funzione programmata
    // refreshColdirettiNews: cercarle qui significherebbe una chiamata
    // AI per ogni apertura della home, con costi e attese inutili per
    // contenuti che cambiano due volte al giorno.
    let attivo = true;
    getNews(12)
      .then((righe) => { if (attivo) setNews(righe); })
      .catch(() => { /* senza notizie la sezione resta nascosta */ })
      .finally(() => { if (attivo) setLoading(false); });
    return () => { attivo = false; };
  }, []);

  const campagnamicaNews = news.filter(n => n.source?.toLowerCase().includes('campagna'));
  const coldirettiNews = news.filter(n => n.source?.toLowerCase().includes('coldiretti'));

  const displayNews = activeTab === 'campagnamica' ? campagnamicaNews : activeTab === 'coldiretti' ? coldirettiNews : news;

  if (!loading && news.length === 0) return null;

  return (
    <div className="w-full bg-gradient-to-br from-secondary/5 to-primary/5 border-t border-border/20">
      <div className="px-6 md:px-12 py-10">
        <div className="flex items-center gap-2 mb-6">
          <Newspaper className="w-6 h-6 text-primary" />
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
            Ultime Notizie
          </h2>
        </div>

        <div className="flex gap-2 mb-6 border-b border-border/20">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tutte
          </button>
          <button
            onClick={() => setActiveTab('campagnamica')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'campagnamica'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            CampagnaAmica
          </button>
          <button
            onClick={() => setActiveTab('coldiretti')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'coldiretti'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Coldiretti
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-3 border-slate-200 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayNews.slice(0, 6).map((article, idx) => (
              <Card key={idx} className="border border-border/40 hover:shadow-md transition-shadow h-full flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-block px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                      {article.source || 'Agricoltura'}
                    </span>
                    {article.date && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(article.date).toLocaleDateString('it-IT')}
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-base mt-2 line-clamp-2">
                    {article.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground flex-1 line-clamp-3 mb-4">
                    {article.description}
                  </p>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:text-primary/80 text-sm font-medium"
                  >
                    Leggi di più
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}