import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMarkets } from '@/api/markets';
import { getAllAvailableProducts } from '@/api/products';
import { getRegisteredCompanies } from '@/api/companies';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ShoppingBasket, Search, MapPin, ArrowRight, Building2,
  Loader2, X, Plus, Check, Trash2, ListChecks
} from 'lucide-react';
import CategoryBadge from '../shared/CategoryBadge';

// ---- Lista Desideri (locale, persistita in localStorage) ----
function useListaDesideri() {
  const KEY = 'lista_desideri_v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
  const [items, setItems] = useState(load);

  const save = (next) => { setItems(next); localStorage.setItem(KEY, JSON.stringify(next)); };
  const add = (text) => save([...items, { id: Date.now(), text, done: false }]);
  const toggle = (id) => save(items.map(i => i.id === id ? { ...i, done: !i.done } : i));
  const remove = (id) => save(items.filter(i => i.id !== id));
  const clear = () => save([]);

  return { items, add, toggle, remove, clear };
}

function ListaDesideri() {
  const { items, add, toggle, remove, clear } = useListaDesideri();
  const [input, setInput] = useState('');

  const handleAdd = () => {
    const text = input.trim();
    if (!text) return;
    add(text);
    setInput('');
  };

  const done = items.filter(i => i.done).length;

  return (
    <div className="space-y-3">
      {/* Aggiungi voce */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Es. mele, formaggio pecorino, miele..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="rounded-xl pr-10"
          />
        </div>
        <Button onClick={handleAdd} disabled={!input.trim()} className="rounded-xl bg-primary hover:bg-primary/90 gap-1.5 px-4">
          <Plus className="w-4 h-4" /> Aggiungi
        </Button>
      </div>

      {/* Lista */}
      {items.length === 0 ? (
        <div className="text-center py-10 bg-muted/40 rounded-2xl border border-dashed border-border">
          <ListChecks className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="font-semibold text-foreground text-sm">Lista vuota</p>
          <p className="text-xs text-muted-foreground mt-1">Aggiungi i prodotti che vuoi acquistare</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Barra progresso */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{done} di {items.length} acquistati</span>
            {done > 0 && (
              <button onClick={clear} className="flex items-center gap-1 text-destructive hover:underline text-xs">
                <Trash2 className="w-3 h-3" /> Svuota lista
              </button>
            )}
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }}
            />
          </div>

          {items.map(item => (
            <div
              key={item.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                item.done ? 'bg-muted/40 border-border/30 opacity-60' : 'bg-card border-border shadow-sm'
              }`}
            >
              <button
                onClick={() => toggle(item.id)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  item.done ? 'bg-primary border-primary' : 'border-border hover:border-primary'
                }`}
              >
                {item.done && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
              <span className={`flex-1 text-sm ${item.done ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}`}>
                {item.text}
              </span>
              <button onClick={() => remove(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Cerca al mercato ----
function CercaAlMercato() {
  const [selectedMarketId, setSelectedMarketId] = useState('');
  const [marketSearch, setMarketSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searched, setSearched] = useState(false);

  const { data: markets = [] } = useQuery({
    queryKey: ['all-markets'],
    queryFn: getMarkets,
  });

  const { data: products = [], isFetching: loadingProducts } = useQuery({
    queryKey: ['spesa-search', selectedMarketId, searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || !selectedMarketId) return [];
      const allProducts = await getAllAvailableProducts();
      return allProducts.filter(p =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    },
    enabled: searched && !!selectedMarketId && !!searchQuery.trim(),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['all-companies'],
    queryFn: getRegisteredCompanies,
  });

  const selectedMarket = markets.find(m => m.id === selectedMarketId);

  const results = products.map(p => {
    const company = companies.find(c => c.id === p.company_id);
    return { product: p, company };
  }).filter(({ company }) =>
    company && (company.market_ids || []).includes(selectedMarketId)
  );

  const handleSearch = () => {
    if (!selectedMarketId || !searchQuery.trim()) return;
    setSearched(true);
  };

  return (
    <div className="space-y-4">
      {/* Selezione mercato */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Mercato</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <Input
            placeholder="Cerca un mercato per nome o città..."
            value={marketSearch}
            onChange={e => { setMarketSearch(e.target.value); }}
            onFocus={() => setMarketSearch(marketSearch)}
            className="pl-9 rounded-xl"
          />
          {marketSearch && (
            <button onClick={() => setMarketSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10">
              <X className="w-4 h-4" />
            </button>
          )}
          {/* Dropdown risultati */}
          {marketSearch.trim() && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden max-h-56 overflow-y-auto">
              {markets
                .filter(m =>
                  m.name?.toLowerCase().includes(marketSearch.toLowerCase()) ||
                  m.city?.toLowerCase().includes(marketSearch.toLowerCase())
                )
                .length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">Nessun mercato trovato</div>
              ) : (
                markets
                  .filter(m =>
                    m.name?.toLowerCase().includes(marketSearch.toLowerCase()) ||
                    m.city?.toLowerCase().includes(marketSearch.toLowerCase())
                  )
                  .map(m => (
                    <button
                      key={m.id}
                      onMouseDown={() => { setSelectedMarketId(m.id); setMarketSearch(''); setSearched(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left"
                    >
                      <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{m.name}</p>
                        {m.city && <p className="text-xs text-muted-foreground">{m.city}{m.region ? `, ${m.region}` : ''}</p>}
                      </div>
                    </button>
                  ))
              )}
            </div>
          )}
        </div>
        {/* Mercato selezionato */}
        {selectedMarketId && !marketSearch && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-xl w-fit">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-semibold text-primary">{markets.find(m => m.id === selectedMarketId)?.name}</span>
            <button onClick={() => { setSelectedMarketId(''); setSearched(false); }} className="text-primary/60 hover:text-primary ml-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Ricerca */}
      {selectedMarketId && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cosa cerchi?</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={`Cerca al ${selectedMarket?.name}...`}
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSearched(false); }}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="pl-9 rounded-xl"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearched(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button onClick={handleSearch} className="rounded-xl bg-primary hover:bg-primary/90 px-5" disabled={!searchQuery.trim()}>
              Cerca
            </Button>
          </div>
        </div>
      )}

      {!selectedMarketId && (
        <div className="text-center py-8 bg-muted/40 rounded-2xl border border-dashed border-border">
          <MapPin className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground">Seleziona un mercato</p>
          <p className="text-xs text-muted-foreground mt-1">Poi cerca il prodotto che ti serve</p>
        </div>
      )}

      {/* Risultati */}
      {searched && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {loadingProducts ? 'Ricerca...' : `${results.length} risultat${results.length === 1 ? 'o' : 'i'} · "${searchQuery}"`}
          </p>
          {loadingProducts ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 bg-muted/40 rounded-2xl border border-border/40">
              <ShoppingBasket className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">Nessun risultato</p>
              <p className="text-xs text-muted-foreground mt-1">Prova con un altro termine</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map(({ product, company }) => (
                <Link key={product.id} to={`/aziende/${product.company_id}`}>
                  <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all bg-card overflow-hidden cursor-pointer group">
                    <CardContent className="p-0">
                      <div className="flex items-center gap-3 p-3">
                        <div className="w-1 self-stretch bg-secondary rounded-full flex-shrink-0" />
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-border/50" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center flex-shrink-0">
                            <ShoppingBasket className="w-5 h-5 text-secondary" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3" />{company?.name}
                          </p>
                          {product.price && (
                            <p className="text-xs font-bold text-primary mt-0.5">€{product.price.toFixed(2)} / {product.unit}</p>
                          )}
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Componente principale con tab interni ----
const SUB_TABS = [
  { id: 'lista', label: 'Lista desideri', icon: ListChecks },
  { id: 'cerca', label: 'Cerca al mercato', icon: Search },
];

export default function ListaDellaSpesa() {
  const [subTab, setSubTab] = useState('lista');

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        {SUB_TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                subTab === t.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {subTab === 'lista' ? <ListaDesideri /> : <CercaAlMercato />}
    </div>
  );
}