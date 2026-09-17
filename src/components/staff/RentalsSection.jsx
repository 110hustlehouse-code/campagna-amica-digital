import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function RentalsSection({ rentals, companies }) {
  const getCompanyName = (companyId) => {
    return companies.find(c => c.id === companyId)?.name || 'Sconosciuta';
  };

  const getDaysUntilExpiry = (endDate) => {
    if (!endDate) return null;
    return differenceInDays(new Date(endDate), new Date());
  };

  const sortedRentals = [...rentals].sort((a, b) => {
    const daysA = getDaysUntilExpiry(a.rental_end_date) || 999;
    const daysB = getDaysUntilExpiry(b.rental_end_date) || 999;
    return daysA - daysB;
  });

  return (
    <div className="space-y-3">
      {sortedRentals.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">
          <p className="text-sm">Nessuna scadenza imminente</p>
        </Card>
      ) : (
        sortedRentals.map(rental => {
          const daysLeft = getDaysUntilExpiry(rental.rental_end_date);
          const isUrgent = daysLeft && daysLeft <= 7;

          return (
            <Card
              key={rental.id}
              className={`p-4 border-l-4 transition-all ${
                isUrgent
                  ? 'border-l-red-500 bg-red-50/30 hover:shadow-md'
                  : 'border-l-yellow-500 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Clock className={`w-5 h-5 ${isUrgent ? 'text-red-500' : 'text-yellow-500'}`} />
                  <div>
                    <h3 className="font-semibold text-foreground">
                      Banco {rental.stall_number}
                    </h3>
                    <p className="text-xs text-muted-foreground">{getCompanyName(rental.company_id)}</p>
                  </div>
                </div>
                {isUrgent && (
                  <Badge className="bg-red-100 text-red-800">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Urgente
                  </Badge>
                )}
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Canone mensile:</span>
                  <span className="font-semibold text-foreground">€ {rental.monthly_rent}</span>
                </div>
                {daysLeft !== null && (
                  <div className="flex items-center justify-between">
                    <span>Scadenza:</span>
                    <span className={isUrgent ? 'font-bold text-red-600' : 'font-semibold'}>
                      {format(new Date(rental.rental_end_date), 'd MMMM yyyy', { locale: it })}
                      {daysLeft >= 0 && <span className="text-xs ml-2">({daysLeft} gg)</span>}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <span>Stato:</span>
                  <Badge variant="outline" className="capitalize">
                    {rental.status === 'active' ? 'Attivo' : rental.status === 'suspended' ? 'Sospeso' : 'Terminato'}
                  </Badge>
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}