import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Minus, Plus, ShoppingBag } from 'lucide-react';
import CategoryBadge from '../shared/CategoryBadge';

const UNIT_STEPS = { kg: 0.5, lt: 0.5, pz: 1, confezione: 1 };
const UNIT_LABELS = { kg: 'kg', lt: 'lt', pz: 'pz', confezione: 'conf.' };

function formatQty(qty, unit) {
  if (unit === 'kg' || unit === 'lt') return qty % 1 === 0 ? `${qty}` : qty.toFixed(1);
  return `${qty}`;
}

export default function ProductCard({ product, isFav, onToggleFav, cartQty = 0, onAddToCart, onRemoveFromCart }) {
  const unitLabel = UNIT_LABELS[product.unit] || product.unit || 'pz';
  const inCart = cartQty > 0;

  return (
    <Card className="border border-border/40 shadow-sm hover:shadow-md transition-shadow bg-card overflow-hidden">
      {/* Immagine */}
      <div className="relative bg-muted" style={{ aspectRatio: '1' }}>
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/20 flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-primary/30" />
          </div>
        )}
        {/* Cuore preferiti */}
        {onToggleFav && (
          <button
            onClick={onToggleFav}
            className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow transition-all ${isFav ? 'bg-destructive text-white' : 'bg-white/80 text-muted-foreground hover:text-destructive'}`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
          </button>
        )}
        {/* Badge in carrello */}
        {inCart && (
          <div className="absolute top-2 left-2 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            ✓
          </div>
        )}
      </div>

      <CardContent className="p-3">
        {product.category && <CategoryBadge category={product.category} />}
        <h4 className="font-semibold text-sm text-foreground mt-1 truncate">{product.name}</h4>
        {product.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{product.description}</p>
        )}
        <p className="text-primary font-bold text-sm mt-1">
          €{product.price?.toFixed(2)}<span className="text-xs text-muted-foreground font-normal">/{unitLabel}</span>
        </p>

        {/* Controlli carrello */}
        {onAddToCart && (
          <div className="mt-2">
            {inCart ? (
              <div className="flex items-center justify-between gap-1">
                <button
                  onClick={onRemoveFromCart}
                  className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-bold flex-1 text-center">
                  {formatQty(cartQty, product.unit)} <span className="text-[10px] text-muted-foreground font-normal">{unitLabel}</span>
                </span>
                <button
                  onClick={onAddToCart}
                  className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={onAddToCart}
                className="w-full py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary hover:text-white transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Aggiungi
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}