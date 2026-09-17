import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusConfig = {
  in_attesa: { label: 'In Attesa', className: 'bg-accent/20 text-accent-foreground' },
  confermato: { label: 'Confermato', className: 'bg-primary/15 text-primary' },
  pronto: { label: 'Pronto', className: 'bg-chart-3/15 text-chart-3' },
  ritirato: { label: 'Ritirato', className: 'bg-muted text-muted-foreground' },
  annullato: { label: 'Annullato', className: 'bg-destructive/15 text-destructive' },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.in_attesa;
  return (
    <Badge variant="secondary" className={cn("border-0 font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}