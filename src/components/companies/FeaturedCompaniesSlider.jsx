import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ChevronLeft, ChevronRight, Star, ArrowRight } from 'lucide-react';
import CategoryBadge from '../shared/CategoryBadge';

export default function FeaturedCompaniesSlider({ companies }) {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 300, behavior: 'smooth' });
  };

  if (!companies?.length) return null;

  return (
    <div className="relative py-8 px-6 md:px-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Scopri i Produttori</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Le migliori aziende agricole certificate Coldiretti</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll(-1)}
            className="w-9 h-9 rounded-full border border-border bg-card shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll(1)}
            className="w-9 h-9 rounded-full border border-border bg-card shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable row */}
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto pb-3 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {companies.map((company) => (
          <Link
            key={company.id}
            to={`/aziende/${company.id}`}
            className="flex-shrink-0 w-72 md:w-80 group"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 h-64">
              {/* Full-bleed image */}
              {company.cover_image_url ? (
                <img
                  src={company.cover_image_url}
                  alt={company.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center">
                  <span className="text-7xl font-heading font-bold text-white/30">{company.name?.[0]}</span>
                </div>
              )}

              {/* Bottom fade gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Top badges */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-primary text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md">
                <Star className="w-2.5 h-2.5 fill-primary" />
                Certificato
              </div>
              {company.category && (
                <div className="absolute top-3 right-3">
                  <CategoryBadge category={company.category} />
                </div>
              )}

              {/* Bottom content over gradient */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                {company.logo_url && (
                  <div className="w-9 h-9 rounded-xl bg-white shadow-md overflow-hidden border-2 border-white mb-2">
                    <img src={company.logo_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <h3 className="font-heading text-base font-bold text-white truncate leading-tight">
                  {company.name}
                </h3>
                {company.city && (
                  <p className="text-xs text-white/70 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {company.city}{company.region && `, ${company.region}`}
                  </p>
                )}
                <span className="inline-flex items-center gap-1 text-xs text-secondary font-semibold mt-2 group-hover:gap-2 transition-all">
                  Scopri <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* CTA vedi tutte */}
      <div className="mt-4 text-center">
        <Link to="/aziende" className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline">
          Vedi tutte le aziende <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}