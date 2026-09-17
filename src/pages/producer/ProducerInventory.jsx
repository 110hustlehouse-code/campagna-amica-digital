import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyCompany } from '@/api/companies';
import { getProductsByCompany } from '@/api/products';
import { getStocks, createStock, updateStock, deleteStock } from '@/api/stocks';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Package, TrendingDown, AlertCircle, Plus, Trash2, Award, Leaf } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function ProducerInventory() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editStock, setEditStock] = useState(null);
  const [showHistory, setShowHistory] = useState(null);

  const { data: myCompany } = useQuery({
    queryKey: ['my-company', user?.email],
    queryFn: getMyCompany,
    enabled: !!user?.email,
    select: d => d[0],
  });

  const { data: products = [] } = useQuery({
    queryKey: ['my-products', myCompany?.id],
    queryFn: () => getProductsByCompany(myCompany.id),
    enabled: !!myCompany?.id,
  });

  const { data: stocks = [], isLoading } = useQuery({
    queryKey: ['product-stocks', myCompany?.id],
    queryFn: () => getStocks(myCompany.id),
    enabled: !!myCompany?.id,
  });

  const saveStockMutation = useMutation({
    mutationFn: async (data) => {
      const stockData = {
        company_id: myCompany.id,
        product_id: data.product_id,
        quantity: parseFloat(data.quantity) || 0,
        min_threshold: parseFloat(data.min_threshold) || 0,
        notes: data.notes || '',
      };

      if (data.id) {
        return updateStock(data.id, stockData);
      } else {
        return createStock(stockData);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['product-stocks']);
      setEditStock(null);
      toast({ title: 'Disponibilità salvata!' });
    },
  });

  const deleteStockMutation = useMutation({
    mutationFn: deleteStock,
    onSuccess: () => {
      qc.invalidateQueries(['product-stocks']);
      toast({ title: 'Eliminato' });
    },
  });

  const getProductName = (productId) => products.find(p => p.id === productId)?.name || 'Prodotto';
  const getProductUnit = (productId) => products.find(p => p.id === productId)?.unit || 'pz';

  const lowStockProducts = stocks.filter(s => s.quantity <= s.min_threshold);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-primary/20 px-5 pt-12 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-2">
              <Package className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary text-xs font-bold uppercase tracking-widest">Gestione Disponibilità</span>
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Disponibilità Prodotti</h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <Leaf className="w-3.5 h-3.5 text-primary" />
              {stocks.length} articoli tracciati
            </p>
          </div>
          <Button onClick={() => setEditStock({ product_id: '', quantity: '', min_threshold: '', notes: '' })} className="rounded-xl gap-1">
            <Plus className="w-4 h-4" /> Aggiungi
          </Button>
        </div>
      </div>

      <div className="px-5 pt-4 pb-24 space-y-3">
        {/* Alert scorte basse */}
        {lowStockProducts.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-900 text-sm">Articoli in esaurimento</p>
                <p className="text-xs text-amber-700 mt-1">
                  {lowStockProducts.map((s, i) => (
                    <span key={s.id}>
                      {getProductName(s.product_id)} ({s.quantity} {getProductUnit(s.product_id)})
                      {i < lowStockProducts.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : stocks.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-3">📦</p>
            <p className="font-semibold text-foreground">Nessuna disponibilità tracciata</p>
            <p className="text-sm text-muted-foreground mt-1 mb-5">Inizia ad aggiungere i tuoi articoli per tracciare le scorte</p>
            <Button onClick={() => setEditStock({ product_id: '', quantity: '', min_threshold: '', notes: '' })} className="rounded-xl gap-1">
              <Plus className="w-4 h-4" /> Aggiungi Articolo
            </Button>
          </div>
        ) : (
          stocks.map(stock => {
            const product = products.find(p => p.id === stock.product_id);
            const isLow = stock.quantity <= stock.min_threshold;
            return (
              <div
                key={stock.id}
                className={`bg-white rounded-2xl border-2 border-primary/20 shadow-sm overflow-hidden transition-all hover:shadow-md ${isLow ? 'border-amber-300 bg-amber-50/30' : ''}`}
              >
                <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/80 to-secondary" />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                        {product?.name || 'Prodotto'}
                        {isLow && <TrendingDown className="w-4 h-4 text-amber-600" />}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Categoria: {product?.category?.replace('_', ' ')} · Prezzo: €{product?.price}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setShowHistory(stock.id)}
                        className="px-2.5 py-1.5 text-xs text-primary font-medium hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        Storico
                      </button>
                      <button
                        onClick={() => setEditStock({ ...stock })}
                        className="px-2.5 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors"
                      >
                        Modifica
                      </button>
                      <button
                        onClick={() => deleteStockMutation.mutate(stock.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive/60" />
                      </button>
                    </div>
                  </div>

                  {/* Barra di disponibilità */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-foreground">
                        {stock.quantity} {product?.unit || 'pz'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Minimo: {stock.min_threshold} {product?.unit || 'pz'}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isLow ? 'bg-amber-500' : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min((stock.quantity / Math.max(stock.min_threshold, 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {stock.notes && (
                    <p className="text-xs text-muted-foreground italic border-t border-border/20 pt-2">
                      📝 {stock.notes}
                    </p>
                  )}

                  <p className="text-[10px] text-muted-foreground mt-2">
                    Ultimo aggiornamento: {format(new Date(stock.updated_date), 'd MMM HH:mm', { locale: it })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Dialog */}
      {editStock && (
        <Dialog open onOpenChange={() => setEditStock(null)}>
          <DialogContent className="max-w-md mx-4 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">
                {editStock.id ? 'Modifica disponibilità' : 'Aggiungi articolo'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {!editStock.id && (
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Seleziona prodotto *</label>
                  <select
                    value={editStock.product_id}
                    onChange={e => setEditStock(s => ({ ...s, product_id: e.target.value }))}
                    className="w-full h-9 px-3 rounded-lg border border-input bg-transparent text-sm"
                  >
                    <option value="">-- Scegli prodotto --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (€{p.price}/{p.unit})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  Quantità disponibile *
                </label>
                <Input
                  type="number"
                  placeholder="es. 50"
                  value={editStock.quantity}
                  onChange={e => setEditStock(s => ({ ...s, quantity: e.target.value }))}
                  step="0.1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  Quantità minima (alert)
                </label>
                <Input
                  type="number"
                  placeholder="es. 10"
                  value={editStock.min_threshold}
                  onChange={e => setEditStock(s => ({ ...s, min_threshold: e.target.value }))}
                  step="0.1"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Riceverai un avviso quando la disponibilità scenderà sotto questo valore
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  Note (es. localizzazione, stagionalità)
                </label>
                <Input
                  placeholder="es. Coltivazione biologica, disponibile da maggio"
                  value={editStock.notes || ''}
                  onChange={e => setEditStock(s => ({ ...s, notes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 mt-1">
              <Button variant="outline" onClick={() => setEditStock(null)}>Annulla</Button>
              <Button
                onClick={() => saveStockMutation.mutate(editStock)}
                disabled={saveStockMutation.isPending || !editStock.product_id || !editStock.quantity}
              >
                {saveStockMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* History Dialog */}
      {showHistory && (
        <Dialog open onOpenChange={() => setShowHistory(null)}>
          <DialogContent className="max-w-md mx-4 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg">Storico aggiornamenti</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <p className="text-sm text-muted-foreground">
                Ultimi aggiornamenti per {getProductName(stocks.find(s => s.id === showHistory)?.product_id)}
              </p>
              {/* Placeholder per storico - da implementare con entità separata */}
              <div className="text-xs text-muted-foreground text-center py-8">
                Lo storico dei movimenti verrà tracciato automaticamente
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}