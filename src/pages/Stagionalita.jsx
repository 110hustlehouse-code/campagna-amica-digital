import React, { useState } from 'react';
import { Leaf, ChevronLeft, ChevronRight } from 'lucide-react';
import SeasonalGrid from '../components/shared/SeasonalGrid';

const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

export default function Stagionalita() {
  const currentMonth = new Date().getMonth(); // 0-indexed
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const prev = () => setSelectedMonth(m => (m - 1 + 12) % 12);
  const next = () => setSelectedMonth(m => (m + 1) % 12);

  return (
    <div className="min-h-screen pb-24">
      {/* Hero */}
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
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-white leading-tight">
            🌿 Stagionalità
          </h1>
          <p className="text-white/70 text-sm mt-2 max-w-lg">
            Scopri frutta e verdura di stagione mese per mese. Mangiare di stagione significa prodotti più freschi, saporiti e sostenibili.
          </p>
        </div>
      </div>

      {/* Selettore mese */}
      <div className="px-6 md:px-12 py-6">
        <div className="flex items-center justify-between bg-card rounded-2xl border border-border shadow-sm p-4">
          <button onClick={prev} className="w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
            <ChevronLeft className="w-5 h-5 text-primary" />
          </button>

          <div className="text-center">
            <p className="font-heading text-2xl font-bold text-foreground">{MONTHS[selectedMonth]}</p>
            {selectedMonth === currentMonth && (
              <span className="inline-block mt-1 bg-primary text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Mese corrente
              </span>
            )}
          </div>

          <button onClick={next} className="w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
            <ChevronRight className="w-5 h-5 text-primary" />
          </button>
        </div>

        {/* Selettore rapido tutti i mesi */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mt-4 scrollbar-hide">
          {MONTHS.map((m, i) => (
            <button
              key={i}
              onClick={() => setSelectedMonth(i)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                selectedMonth === i
                  ? 'bg-primary text-white shadow'
                  : i === currentMonth
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
              }`}
            >
              {m.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Griglia prodotti */}
      <div className="px-6 md:px-12">
        <SeasonalGrid month={selectedMonth} />
      </div>

      {/* Footer info */}
      <div className="mx-6 md:mx-12 mt-8 p-4 bg-primary/5 border border-primary/15 rounded-2xl">
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          🌱 <strong className="text-primary">Perché scegliere prodotti di stagione?</strong><br />
          Più nutrienti, più saporiti, meno costosi e rispettosi dell'ambiente. I mercati Coldiretti ti garantiscono prodotti freschi e locali tutto l'anno.
        </p>
      </div>
    </div>
  );
}