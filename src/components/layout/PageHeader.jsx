import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';

/**
 * Header di brand condiviso per le pagine "di lavoro" (staff/produttore/admin).
 *
 * Modalita':
 *  - default: badge pill (+ back icon opzionale) sopra il titolo, sottotitolo,
 *    azioni a destra, children per contenuto extra (tab bar, filtri) sotto.
 *  - breadcrumb (backLabel): back testuale ("< Dashboard") sopra badge/titolo.
 *  - icona (icon): back icon + icona + titolo compatto, per chat/sotto-pagine.
 *
 * Le pagine vetrina (Home cliente, ProducerHome con cover foto) restano fuori
 * di proposito: non sono "schermate di lavoro" e hanno un loro hero dedicato.
 */
export default function PageHeader({
  back = false,
  onBack,
  backLabel,
  badge,
  title,
  titleClassName = 'text-4xl',
  subtitle,
  icon: Icon,
  actions,
  children,
  compact = false,
  border = true,
  flexShrink = false,
  className,
}) {
  return (
    <div
      className={cn(
        'bg-gradient-to-r from-primary via-primary/95 to-secondary shadow-lg px-6 pt-12',
        border && 'border-b-4 border-secondary',
        compact ? 'pb-6' : 'pb-8',
        flexShrink && 'flex-shrink-0',
        className
      )}
    >
      {back && backLabel && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-white/70 hover:text-white mb-4 text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> {backLabel}
        </button>
      )}

      {Icon ? (
        <div className="flex items-center gap-3">
          {back && !backLabel && (
            <BackButton
              onClick={onBack}
              variant="ghost"
              className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 shrink-0"
            />
          )}
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="w-6 h-6 text-white shrink-0" />
            <div className="min-w-0">
              <h1 className="font-heading text-2xl font-bold text-white drop-shadow-lg truncate leading-tight">
                {title}
              </h1>
              {subtitle && <p className="text-white/80 text-xs">{subtitle}</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {((back && !backLabel) || badge) && (
              <div className="flex items-center gap-3 mb-3">
                {back && !backLabel && (
                  <BackButton
                    onClick={onBack}
                    variant="ghost"
                    className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 shrink-0"
                  />
                )}
                {badge && (
                  <div className="inline-flex items-center gap-1.5 bg-secondary rounded-full px-4 py-1.5 shadow-md">
                    <span className="text-primary font-bold text-xs tracking-widest uppercase">{badge}</span>
                  </div>
                )}
              </div>
            )}
            <h1 className={cn('font-heading font-bold text-white drop-shadow-lg', titleClassName)}>{title}</h1>
            {subtitle && <p className="text-white/80 text-sm mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
