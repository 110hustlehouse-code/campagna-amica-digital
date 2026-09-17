import React from 'react';

// Dati stagionali — solo prodotti coltivati sul territorio italiano
const PRODUCTS = [
  // FRUTTA — varietà italiane DOC/tipiche
  { name: 'Arance (Sicilia)', emoji: '🍊', category: 'frutta', months: [0, 1, 2, 11] },
  { name: 'Mandarini', emoji: '🍊', category: 'frutta', months: [0, 1, 11] },
  { name: 'Limoni (Amalfi/Sicilia)', emoji: '🍋', category: 'frutta', months: [0, 1, 2, 3, 11] },
  { name: 'Clementine (Calabria)', emoji: '🍊', category: 'frutta', months: [0, 1, 10, 11] },
  { name: 'Kiwi (Lazio/Piemonte)', emoji: '🥝', category: 'frutta', months: [0, 1, 2, 3, 11] },
  { name: 'Pere (Emilia)', emoji: '🍐', category: 'frutta', months: [0, 1, 7, 8, 9, 10, 11] },
  { name: 'Mele (Alto Adige)', emoji: '🍎', category: 'frutta', months: [0, 1, 2, 8, 9, 10, 11] },
  { name: 'Fragole (Campania/Basilicata)', emoji: '🍓', category: 'frutta', months: [3, 4, 5] },
  { name: 'Ciliegie (Puglia/Campania)', emoji: '🍒', category: 'frutta', months: [4, 5, 6] },
  { name: 'Albicocche (Campania/Sicilia)', emoji: '🍑', category: 'frutta', months: [5, 6] },
  { name: 'Pesche (Emilia/Campania)', emoji: '🍑', category: 'frutta', months: [6, 7, 8] },
  { name: 'Nettarine', emoji: '🍑', category: 'frutta', months: [6, 7, 8] },
  { name: 'Melone (Emilia/Sicilia)', emoji: '🍈', category: 'frutta', months: [6, 7, 8] },
  { name: 'Anguria (Puglia/Emilia)', emoji: '🍉', category: 'frutta', months: [6, 7, 8] },
  { name: 'Fichi (Puglia/Calabria)', emoji: '🍈', category: 'frutta', months: [7, 8, 9] },
  { name: 'Uva da tavola (Puglia)', emoji: '🍇', category: 'frutta', months: [8, 9, 10] },
  { name: 'Melograno (Sud Italia)', emoji: '🍎', category: 'frutta', months: [9, 10, 11] },
  { name: 'Castagne (Campania/Piemonte)', emoji: '🌰', category: 'frutta', months: [9, 10] },
  { name: 'Prugne (Emilia/Campania)', emoji: '🍑', category: 'frutta', months: [7, 8, 9] },
  { name: 'Susine', emoji: '🍑', category: 'frutta', months: [6, 7, 8] },
  { name: 'Noci (Campania)', emoji: '🌰', category: 'frutta', months: [9, 10, 11] },
  { name: 'Nocciole (Piemonte/Lazio)', emoji: '🌰', category: 'frutta', months: [8, 9, 10] },
  { name: 'Mandorle (Sicilia/Puglia)', emoji: '🌰', category: 'frutta', months: [7, 8, 9] },
  { name: 'Bergamotto (Calabria)', emoji: '🍋', category: 'frutta', months: [0, 1, 2, 11] },

  // VERDURA — ortaggi tipici italiani
  { name: 'Spinaci', emoji: '🥬', category: 'verdura', months: [0, 1, 2, 3, 9, 10, 11] },
  { name: 'Cavolo nero (Toscana)', emoji: '🥬', category: 'verdura', months: [0, 1, 2, 10, 11] },
  { name: 'Verza', emoji: '🥬', category: 'verdura', months: [0, 1, 2, 10, 11] },
  { name: 'Finocchi (Puglia/Sicilia)', emoji: '🌿', category: 'verdura', months: [0, 1, 2, 11] },
  { name: 'Porri', emoji: '🌿', category: 'verdura', months: [0, 1, 2, 9, 10, 11] },
  { name: 'Carciofi (Sardegna/Lazio)', emoji: '🌿', category: 'verdura', months: [1, 2, 3, 4, 9, 10, 11] },
  { name: 'Asparagi (Bassano/Veneto)', emoji: '🌿', category: 'verdura', months: [2, 3, 4, 5] },
  { name: 'Piselli', emoji: '🫛', category: 'verdura', months: [3, 4, 5] },
  { name: 'Fave', emoji: '🫛', category: 'verdura', months: [3, 4, 5] },
  { name: 'Ravanelli', emoji: '🌱', category: 'verdura', months: [3, 4, 5, 9, 10] },
  { name: 'Zucchine', emoji: '🥒', category: 'verdura', months: [4, 5, 6, 7, 8, 9] },
  { name: 'Pomodori (Campania/Sicilia)', emoji: '🍅', category: 'verdura', months: [5, 6, 7, 8, 9] },
  { name: 'Pomodorini di Pachino', emoji: '🍅', category: 'verdura', months: [5, 6, 7, 8, 9] },
  { name: 'Peperoni (Basilicata/Puglia)', emoji: '🫑', category: 'verdura', months: [6, 7, 8, 9] },
  { name: 'Peperoncino (Calabria)', emoji: '🌶️', category: 'verdura', months: [7, 8, 9] },
  { name: 'Melanzane (Sud Italia)', emoji: '🍆', category: 'verdura', months: [6, 7, 8, 9] },
  { name: 'Cetrioli', emoji: '🥒', category: 'verdura', months: [5, 6, 7, 8] },
  { name: 'Fagiolini', emoji: '🫛', category: 'verdura', months: [5, 6, 7, 8] },
  { name: 'Fagioli Borlotti', emoji: '🫘', category: 'verdura', months: [7, 8, 9] },
  { name: 'Funghi porcini', emoji: '🍄', category: 'verdura', months: [8, 9, 10] },
  { name: 'Funghi ovoli', emoji: '🍄', category: 'verdura', months: [8, 9, 10] },
  { name: 'Zucca (Mantovana)', emoji: '🎃', category: 'verdura', months: [9, 10, 11] },
  { name: 'Broccoli (Puglia/Calabria)', emoji: '🥦', category: 'verdura', months: [9, 10, 11, 0, 1, 2] },
  { name: 'Cavolfiore', emoji: '🥦', category: 'verdura', months: [9, 10, 11, 0, 1, 2] },
  { name: 'Radicchio (Treviso)', emoji: '🥬', category: 'verdura', months: [9, 10, 11, 0, 1, 2] },
  { name: 'Barbabietole', emoji: '🌱', category: 'verdura', months: [8, 9, 10, 11] },
  { name: 'Patate (Avezzano/Bologna)', emoji: '🥔', category: 'verdura', months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { name: 'Cipolle (Tropea)', emoji: '🧅', category: 'verdura', months: [5, 6, 7, 8, 9, 10] },
  { name: 'Cipolla bianca', emoji: '🧅', category: 'verdura', months: [0, 1, 2, 3, 4, 11] },
  { name: 'Aglio (Voghiera/Nubia)', emoji: '🧄', category: 'verdura', months: [4, 5, 6, 7] },
  { name: 'Lattuga', emoji: '🥗', category: 'verdura', months: [3, 4, 5, 6, 7, 8, 9] },
  { name: 'Rucola (Sud Italia)', emoji: '🥗', category: 'verdura', months: [3, 4, 5, 6, 7, 8, 9] },
  { name: 'Cime di rapa (Puglia)', emoji: '🥬', category: 'verdura', months: [0, 1, 2, 3, 10, 11] },
  { name: 'Cicoria', emoji: '🥬', category: 'verdura', months: [0, 1, 2, 3, 10, 11] },
  { name: 'Puntarelle (Roma)', emoji: '🥬', category: 'verdura', months: [0, 1, 2, 10, 11] },
  { name: 'Topinambur', emoji: '🌱', category: 'verdura', months: [10, 11, 0, 1, 2] },

  // ERBE AROMATICHE — tipiche della tradizione italiana
  { name: 'Basilico (Liguria/Sicilia)', emoji: '🌿', category: 'erbe', months: [4, 5, 6, 7, 8, 9] },
  { name: 'Prezzemolo', emoji: '🌿', category: 'erbe', months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { name: 'Rosmarino', emoji: '🌿', category: 'erbe', months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { name: 'Salvia', emoji: '🌿', category: 'erbe', months: [3, 4, 5, 6, 7, 8, 9, 10] },
  { name: 'Menta', emoji: '🌿', category: 'erbe', months: [4, 5, 6, 7, 8, 9] },
  { name: 'Origano (Sicilia/Calabria)', emoji: '🌿', category: 'erbe', months: [5, 6, 7, 8] },
  { name: 'Timo', emoji: '🌿', category: 'erbe', months: [4, 5, 6, 7, 8, 9] },
  { name: 'Maggiorana', emoji: '🌿', category: 'erbe', months: [4, 5, 6, 7, 8, 9] },
  { name: 'Erba cipollina', emoji: '🌿', category: 'erbe', months: [3, 4, 5, 6, 7, 8, 9] },
  { name: 'Finocchietto selvatico (Sicilia)', emoji: '🌿', category: 'erbe', months: [3, 4, 5, 6, 7, 8] },
];

const CATEGORY_CONFIG = {
  frutta: { label: '🍎 Frutta', color: 'bg-orange-50 border-orange-200 text-orange-800', badge: 'bg-orange-100 text-orange-700' },
  verdura: { label: '🥦 Verdura', color: 'bg-green-50 border-green-200 text-green-800', badge: 'bg-green-100 text-green-700' },
  erbe: { label: '🌿 Erbe aromatiche', color: 'bg-emerald-50 border-emerald-200 text-emerald-800', badge: 'bg-emerald-100 text-emerald-700' },
};

export default function SeasonalGrid({ month }) {
  const seasonal = PRODUCTS.filter(p => p.months.includes(month));
  const byCategory = ['frutta', 'verdura', 'erbe'].map(cat => ({
    cat,
    items: seasonal.filter(p => p.category === cat),
  })).filter(g => g.items.length > 0);

  if (seasonal.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nessun prodotto trovato per questo mese.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contatore */}
      <div className="flex items-center gap-2">
        <span className="text-2xl font-heading font-bold text-primary">{seasonal.length}</span>
        <span className="text-muted-foreground text-sm">prodotti di stagione disponibili</span>
      </div>

      {byCategory.map(({ cat, items }) => {
        const cfg = CATEGORY_CONFIG[cat];
        return (
          <div key={cat}>
            <h3 className="font-heading font-bold text-foreground mb-3 text-base">{cfg.label}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {items.map(product => (
                <div
                  key={product.name}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border ${cfg.color} transition-transform hover:scale-105`}
                >
                  <span className="text-3xl">{product.emoji}</span>
                  <span className="text-xs font-semibold text-center leading-tight">{product.name}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}