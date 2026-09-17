import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getReviews } from '@/api/reviews';
import { isPreferito } from '@/api/favorites';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, ExternalLink, Award } from 'lucide-react';
import CategoryBadge from '../shared/CategoryBadge';
import RatingDisplay from '../shared/RatingDisplay';

export default function CompanyCard({ company }) {
  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', company.id],
    queryFn: () => getReviews(company.id),
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites', company.id],
    queryFn: () => isPreferito({ company_id: company.id }).then(f => (f ? [f] : [])),
  });

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  return (
    <Link to={`/aziende/${company.id}`}>
      <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-0 shadow-sm bg-card">
        <div className="aspect-[16/10] overflow-hidden bg-muted relative">
          {company.cover_image_url ? (
            <img
              src={company.cover_image_url}
              alt={company.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 blur-sm scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/30 flex items-center justify-center">
              <span className="text-5xl font-heading font-bold text-primary/30">{company.name?.[0]}</span>
            </div>
          )}
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm border border-primary/20 rounded-full px-2.5 py-1 flex items-center gap-1 shadow-sm">
            <Award className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Certificata</span>
          </div>
          {company.category && (
            <div className="absolute top-3 left-3">
              <CategoryBadge category={company.category} />
            </div>
          )}
          {/* Logo centrato sulla cover con sfondo sfocato */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl border-2 border-white/80 shadow-xl overflow-hidden bg-white flex items-center justify-center">
              {company.logo_url ? (
                <img src={company.logo_url} alt="logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-heading font-bold text-primary">{company.name?.[0]}</span>
              )}
            </div>
          </div>
        </div>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-heading text-lg font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {company.name}
              </h3>
              {company.city && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  {company.city}{company.region && `, ${company.region}`}
                </p>
              )}
            </div>
            {company.website && (
              <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
            )}
          </div>
          {company.description && (
           <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{company.description}</p>
          )}
          {reviews.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/40">
              <RatingDisplay rating={avgRating} count={reviews.length} favoriteCount={favorites.length} />
            </div>
          )}
          </CardContent>
          </Card>
          </Link>
          );
          }