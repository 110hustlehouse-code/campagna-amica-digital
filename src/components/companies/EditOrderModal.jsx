import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { getAvailableProducts } from '@/api/products';
import { updateOrder } from '@/api/orders';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Minus, Plus, ShoppingBag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EditOrderModal({ open, onClose, order }) {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState([]);
  const [pickupDate, setPickupDate] = useState('');
  const [notes, setNotes] = useState('');

  // Load products for this company
  const { data: products = [] } = useQuery({
    queryKey: ['products-for-edit', order?.company_id],
    queryFn: () => getAvailableProducts(order.company_id),
    enabled: !!order?.company_id && open,
  });

  // Initialize state from existing order
  useEffect(() => {
    if (order && open) {
      setCart(order.items?.map(i => ({ ...i })) || []);
      setPickupDate(order.pickup_date || '');
      setNotes(order.notes || '');
    }
  }, [order, open]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) return prev.map(i => i.product_id === product.id
        ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unit_price }
        : i);
      return [...prev, { product_id: product.id, product_name: product.name, quantity: 1, unit_price: product.price, total: product.price }];
    });
  };

  const updateQty = (productId, delta) => {
    setCart(prev => prev.map(i => {
      if (i.product_id !== productId) return i;
      const newQty = Math.max(0, i.quantity + delta);
      return { ...i, quantity: newQty, total: newQty * i.unit_price };
    }).filter(i => i.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.total, 0);

  const updateOrder = useMutation({
    mutationFn: (data) => updateOrder(order.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      onClose();
      toast.success('Ordine modificato con successo!');
    },
  });

  const submit = () => {
    updateOrder.mutate({
      items: cart,
      total_amount: cartTotal,
      pickup_date: pickupDate,
      notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Modifica ordine da {order?.company_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Modifica i prodotti del tuo ordine</p>
          {products.map(product => {
            const inCart = cart.find(i => i.product_id === product.id);
            return (
              <div key={product.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div className="min-w-0 mr-3">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">€{product.price?.toFixed(2)}/{product.unit || 'pz'}</p>
                </div>
                {inCart ? (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(product.id, -1)}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center font-semibold text-sm">{inCart.quantity}</span>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(product.id, 1)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="flex-shrink-0" onClick={() => addToCart(product)}>
                    Aggiungi
                  </Button>
                )}
              </div>
            );
          })}

          <div className="border-t pt-4 space-y-3">
            <div className="flex justify-between font-semibold text-lg">
              <span>Totale</span>
              <span className="text-primary">€{cartTotal.toFixed(2)}</span>
            </div>
            <div>
              <label className="text-sm font-medium">Data di ritiro</label>
              <Input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Note</label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Note aggiuntive..." className="mt-1 resize-none" rows={2} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={submit} disabled={cart.length === 0 || updateOrder.isPending} className="bg-primary hover:bg-primary/90">
            {updateOrder.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShoppingBag className="w-4 h-4 mr-2" />}
            Salva modifiche
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}