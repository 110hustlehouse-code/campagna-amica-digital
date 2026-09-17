import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Loader2, MapPin, Calendar, Pencil, Trash2, Leaf, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/shared/StatusBadge';
import EditOrderModal from '../components/companies/EditOrderModal';
import PullToRefresh from '../components/shared/PullToRefresh';

export default function Orders() {
  const [editingOrder, setEditingOrder] = useState(null);
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 100),
  });

  const deleteOrder = useMutation({
    mutationFn: (id) => base44.entities.Order.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['orders'] });
      const prev = queryClient.getQueryData(['orders']);
      queryClient.setQueryData(['orders'], old => old.filter(o => o.id !== id));
      return prev;
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['orders'], context);
      toast.error('Errore nell\'eliminazione');
    },
    onSuccess: () => {
      toast.success('Ordine eliminato');
    },
  });

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
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-white leading-tight flex items-center gap-3">
             <ShoppingBag className="w-8 h-8 text-secondary flex-shrink-0" />
             I Miei Ordini Coldiretti
           </h1>
          <p className="text-white/70 text-sm mt-2">Storico e stato dei tuoi ordini</p>
          {orders.length > 0 && (
            <span className="inline-block mt-3 bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
              {orders.length} {orders.length === 1 ? 'ordine' : 'ordini'}
            </span>
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
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-10 h-10 text-primary/30" />
            </div>
            <p className="font-heading text-xl font-bold text-foreground">Nessun ordine ancora</p>
            <p className="text-muted-foreground text-sm mt-2 mb-6">Visita un mercato per effettuare il tuo primo ordine</p>
            <Link to="/mercati">
              <Button className="bg-primary hover:bg-primary/90 gap-2 rounded-xl">
                Trova un Mercato <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <Card key={order.id} className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 bg-card overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    <div className="w-1.5 bg-primary rounded-l-xl flex-shrink-0" />
                    <div className="flex-1">
                      <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50">
                        <div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-heading text-lg font-semibold text-foreground">{order.company_name}</h3>
                            <StatusBadge status={order.status} />
                          </div>
                          <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                            {order.market_name && (
                              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {order.market_name}</span>
                            )}
                            {order.pickup_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                Ritiro: {format(new Date(order.pickup_date), 'dd MMM yyyy', { locale: it })}
                              </span>
                            )}
                            <span className="text-xs">
                              {format(new Date(order.created_date), 'dd/MM/yyyy HH:mm')}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <p className="text-2xl font-bold text-primary">€{order.total_amount?.toFixed(2)}</p>
                          {order.status === 'in_attesa' && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="gap-1.5 text-xs rounded-xl" onClick={() => setEditingOrder(order)}>
                                <Pencil className="w-3 h-3" /> Modifica
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={() => { if (confirm('Eliminare questo ordine?')) deleteOrder.mutate(order.id); }}
                                disabled={deleteOrder.isPending}
                              >
                                <Trash2 className="w-3 h-3" /> Elimina
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {order.items?.length > 0 && (
                        <div className="p-5 bg-muted/30">
                          <div className="space-y-2">
                            {order.items.map((item, i) => (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <span className="text-foreground">{item.quantity}x {item.product_name}</span>
                                <span className="text-muted-foreground font-medium">€{item.total?.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          {order.notes && (
                            <p className="mt-3 pt-3 border-t border-border text-sm text-muted-foreground italic">
                              Note: {order.notes}
                            </p>
                          )}
                        </div>
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

      <EditOrderModal
        open={!!editingOrder}
        onClose={() => setEditingOrder(null)}
        order={editingOrder}
      />
    </div>
  );
}