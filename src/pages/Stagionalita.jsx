import React, { useState } from 'react';
import { Leaf, ChevronLeft, ChevronRight } from 'lucide-react';
import SeasonalGrid from '../components/shared/SeasonalGrid';

const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

// Tema del mese, dal calendario Campagna Amica 2026. Luglio, Agosto e
// Settembre non hanno un tema nel calendario originale (solo griglia
// giorni) — restano null di proposito, nessun contenuto inventato.
const MONTHLY_THEMES = [
  { theme: 'Radici', quote: 'Il futuro ha un cuore antico', author: 'Carlo Levi',
    text: 'Le radici affondano nella tradizione per far germogliare il futuro.' },
  { theme: 'Comunità', quote: "Nessuno può fischiettare una sinfonia: ci vuole un'intera orchestra", author: 'H. E. Luccock',
    text: "L'unione delle persone crea valore e sostegno reciproco." },
  { theme: 'Cura', quote: 'Ama la terra: non è un\'eredità dei padri, ma un prestito da restituire ai figli', author: 'Proverbio nativo americano',
    text: 'Prendersi cura della terra è l\'atto fondante di un\'agricoltura sostenibile.' },
  { theme: 'Gusto', quote: "Il sapore è l'anima del cibo", author: 'A. Escoffier',
    text: 'Il cibo è il racconto più vero della nostra terra e di come sappiamo vivere.' },
  { theme: 'Biodiversità', quote: 'Ogni volta che una specie si estingue, una parte di noi scompare con lei', author: 'E. O. Wilson',
    text: 'Proteggere la biodiversità significa proteggere la vita sulla Terra.' },
  { theme: 'Trasparenza', quote: 'La trasparenza è la linfa vitale della fiducia', author: 'Anonimo',
    text: 'La filiera corta garantisce verità: sai chi produce, dove e come.' },
  null, // Luglio
  null, // Agosto
  null, // Settembre
  { theme: 'Sostenibilità', quote: 'La cura della casa comune è inseparabile dalla giustizia sociale e dalla pace', author: 'Papa Francesco',
    text: 'Riduci gli sprechi, scegli prodotti locali e sostenibili.' },
  { theme: 'Paesaggio', quote: 'La Repubblica tutela il paesaggio e il patrimonio storico e artistico della Nazione', author: 'Costituzione Italiana',
    text: "Il paesaggio non è solo uno sfondo, ma il volto della nostra civiltà." },
  { theme: 'Futuro', quote: 'Il futuro appartiene a coloro che credono nella bellezza dei propri sogni', author: 'E. Roosevelt',
    text: "Ogni acquisto da Campagna Amica è un'azione che trasforma il futuro." },
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

      {/* Tema del mese, dal calendario Campagna Amica */}
      {MONTHLY_THEMES[selectedMonth] && (
        <div className="px-6 md:px-12 mb-6">
          <div className="bg-white rounded-2xl border border-primary/20 shadow-sm p-5">
            <span className="inline-block bg-secondary/20 text-primary font-heading font-bold text-sm px-3 py-1 rounded-full mb-3">
              {MONTHLY_THEMES[selectedMonth].theme}
            </span>
            <p className="font-heading text-lg text-foreground italic leading-snug mb-1">
              "{MONTHLY_THEMES[selectedMonth].quote}"
            </p>
            <p className="text-xs text-muted-foreground mb-3">— {MONTHLY_THEMES[selectedMonth].author}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {MONTHLY_THEMES[selectedMonth].text}
            </p>
          </div>
        </div>
      )}

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