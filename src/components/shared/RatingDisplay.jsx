import React from 'react';
import { Star } from 'lucide-react';

export default function RatingDisplay({ rating, count, favoriteCount = 0 }) {
  // Rating pubblico = media stelle + bonus dai preferiti (max +0.5 su 5)
  const favoriteBonus = Math.min(favoriteCount / 50, 0.5);
  const publicRating = Math.min(rating + favoriteBonus, 5);
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= Math.round(publicRating) ? 'fill-secondary text-secondary' : 'text-muted-foreground/30'}`}
          />
        ))}
      </div>
      <span className="text-sm font-semibold text-foreground">{publicRating.toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">({count})</span>
      {favoriteCount > 0 && <span className="text-xs text-destructive font-semibold">❤ {favoriteCount}</span>}
    </div>
  );
}