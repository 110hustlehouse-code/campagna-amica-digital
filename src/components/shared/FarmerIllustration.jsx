import React from 'react';

/**
 * Illustrazione originale in stile flat-design, ispirata all'energia
 * illustrata del calendario Campagna Amica ma disegnata da zero — nessun
 * personaggio, posa o dettaglio copiato dal materiale originale.
 * Usa i colori del design system (primary/secondary) invece di valori fissi.
 */
export default function FarmerIllustration({ className = 'w-40 h-40' }) {
  return (
    <svg viewBox="0 0 200 200" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Ombra a terra */}
      <ellipse cx="100" cy="184" rx="52" ry="8" fill="currentColor" className="text-primary-foreground/10" />

      {/* Cesto */}
      <path d="M62 150 L70 178 Q100 186 130 178 L138 150 Z" fill="#A9662E" />
      <path d="M62 150 L138 150 L134 158 L66 158 Z" fill="#8A4F22" />
      <path d="M75 150 Q100 138 125 150" stroke="#8A4F22" strokeWidth="4" fill="none" />
      {/* Prodotti nel cesto */}
      <circle cx="82" cy="144" r="9" fill="#E0552B" />
      <circle cx="100" cy="140" r="10" className="fill-secondary" />
      <circle cx="118" cy="145" r="8" className="fill-primary" />
      <path d="M96 132 l3 -7 l3 7 z" fill="#4E7A3D" />

      {/* Gambe */}
      <rect x="84" y="110" width="14" height="42" rx="6" className="fill-primary" opacity="0.85" />
      <rect x="102" y="110" width="14" height="42" rx="6" className="fill-primary" opacity="0.85" />

      {/* Corpo / camicia */}
      <path d="M68 78 Q100 62 132 78 L128 128 Q100 140 72 128 Z" className="fill-secondary" />
      <path d="M68 78 Q100 62 132 78 L129 92 Q100 76 71 92 Z" fill="#8A4F22" opacity="0.15" />

      {/* Braccio che regge il cesto */}
      <path d="M72 92 Q58 108 66 132" stroke="#F0C39E" strokeWidth="12" strokeLinecap="round" fill="none" />
      <path d="M128 92 Q142 108 134 132" stroke="#F0C39E" strokeWidth="12" strokeLinecap="round" fill="none" />

      {/* Testa */}
      <circle cx="100" cy="56" r="26" fill="#F0C39E" />

      {/* Cappello di paglia */}
      <ellipse cx="100" cy="40" rx="34" ry="10" fill="#D9A441" />
      <path d="M76 40 Q100 18 124 40 Q100 30 76 40 Z" fill="#E8B655" />

      {/* Viso: sorriso semplice, nessun dettaglio distintivo */}
      <circle cx="91" cy="58" r="2.5" fill="#4A2E1E" />
      <circle cx="109" cy="58" r="2.5" fill="#4A2E1E" />
      <path d="M90 68 Q100 74 110 68" stroke="#4A2E1E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="82" cy="64" r="5" fill="#E0552B" opacity="0.35" />
      <circle cx="118" cy="64" r="5" fill="#E0552B" opacity="0.35" />
    </svg>
  );
}
