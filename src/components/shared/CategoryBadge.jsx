import React from 'react';
import { Badge } from '@/components/ui/badge';

const categoryLabels = {
  ortofrutticola: 'Ortofrutticola',
  lattiero_casearia: 'Lattiero-Casearia',
  vinicola: 'Vinicola',
  olearia: 'Olearia',
  cerealicola: 'Cerealicola',
  zootecnica: 'Zootecnica',
  apicoltura: 'Apicoltura',
  altro: 'Altro',
  frutta: 'Frutta',
  verdura: 'Verdura',
  formaggi: 'Formaggi',
  salumi: 'Salumi',
  olio: 'Olio',
  vino: 'Vino',
  miele: 'Miele',
  pane_pasta: 'Pane & Pasta',
  conserve: 'Conserve',
};

export default function CategoryBadge({ category }) {
  return (
    <Badge variant="secondary" className="bg-primary/10 text-primary border-0 font-medium">
      {categoryLabels[category] || category}
    </Badge>
  );
}