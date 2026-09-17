import React from 'react';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const CATEGORY_LABELS = {
  bags: '🛍️ Buste',
  materials: '📦 Materiali',
  urgent: '🔴 Urgente',
  maintenance: '🔧 Manutenzione',
  other: '❓ Altro',
};

const PRIORITY_COLORS = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

const STATUS_ICONS = {
  open: <AlertCircle className="w-4 h-4 text-red-500" />,
  in_progress: <Clock className="w-4 h-4 text-yellow-500" />,
  resolved: <CheckCircle className="w-4 h-4 text-green-500" />,
  closed: <CheckCircle className="w-4 h-4 text-gray-400" />,
};

export default function NeedsSection({ needs, companies }) {
  const getCompanyName = (companyId) => {
    return companies.find(c => c.id === companyId)?.name || 'Sconosciuta';
  };

  return (
    <div className="space-y-3">
      {needs.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">
          <p className="text-sm">Nessun bisogno urgente al momento</p>
        </Card>
      ) : (
        needs.map(need => (
          <Card
            key={need.id}
            className="p-4 border-l-4 border-l-red-500 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {STATUS_ICONS[need.status]}
                <div>
                  <h3 className="font-semibold text-foreground">{need.title}</h3>
                  <p className="text-xs text-muted-foreground">{getCompanyName(need.company_id)}</p>
                </div>
              </div>
              <Badge className={PRIORITY_COLORS[need.priority]}>
                {need.priority === 'high' ? 'Urgente' : need.priority === 'medium' ? 'Medio' : 'Basso'}
              </Badge>
            </div>

            {need.description && (
              <p className="text-sm text-muted-foreground mb-3">{need.description}</p>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="bg-muted rounded px-2 py-1">{CATEGORY_LABELS[need.category]}</span>
              {need.due_date && (
                <span className="flex items-center gap-1">
                  📅 {format(new Date(need.due_date), 'd MMM', { locale: it })}
                </span>
              )}
              <span className="bg-muted rounded px-2 py-1 ml-auto capitalize">{need.status}</span>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}