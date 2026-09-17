import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingBag, ChevronUp, ChevronDown, Minus, Plus, Trash2 } from 'lucide-react';

const UNIT_LABELS = { kg: 'kg', lt: 'lt', pz: 'pz', confezione: 'conf.' };

function formatQty(qty, unit) {
  if (unit === 'kg' || unit === 'lt') return qty % 1 === 0 ? `${qty}` : qty.toFixed(1);
  return `${qty}`;
}

export default function CartBar({ cart, onAdd, onRemove, onCheckout }) {
  const [open, setOpen] = useState(false);

  if (cart.length === 0) return null;

  const total = cart.reduce((s, i) => s + i.total, 0);

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-2">
      <div className="max-w-lg mx-auto rounded-2xl shadow-2xl border border-border/50 bg-card overflow-hidden">

        {/* Toggle bar */}
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-3.5 bg-primary text-white"
        >
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-4 h-4" />
            <span className="font-bold text-sm">Il tuo carrello</span>
            <span className="bg-white/25 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {cart.length} {cart.length === 1 ? 'prod.' : 'prod.'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-base">€{total.toFixed(2)}</span>
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </button>

        {/* Expanded cart */}
        {open && (
          <div className="bg-card">
            <div className="divide-y divide-border/40 max-h-56 overflow-y-auto">
              {cart.map(item => (
                <div key={item.product_id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">€{item.unit_price?.toFixed(2)}/{UNIT_LABELS[item.unit] || item.unit}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => onRemove(item)}
                      className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center"
                    >
                      {item.quantity <= (item.unit === 'kg' || item.unit === 'lt' ? 0.5 : 1)
                        ? <Trash2 className="w-3 h-3 text-destructive" />
                        : <Minus className="w-3 h-3" />
                      }
                    </button>
                    <span className="text-sm font-bold w-10 text-center">
                      {formatQty(item.quantity, item.unit)} <span className="text-[10px] text-muted-foreground font-normal">{UNIT_LABELS[item.unit] || item.unit}</span>
                    </span>
                    <button
                      onClick={() => onAdd(item)}
                      className="w-7 h-7 rounded-full bg-primary flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3 text-white" />
                    </button>
                    <span className="text-sm font-semibold text-primary w-14 text-right">€{item.total.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totale + checkout */}
            <div className="px-5 py-3 border-t border-border/50 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Totale ordine</p>
                <p className="text-lg font-bold text-primary">€{total.toFixed(2)}</p>
              </div>
              <Button onClick={onCheckout} className="bg-primary hover:bg-primary/90 rounded-xl gap-2">
                <ShoppingBag className="w-4 h-4" /> Procedi all'ordine
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}