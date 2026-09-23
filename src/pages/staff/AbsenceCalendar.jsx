import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyProfile } from '@/api/auth';
import { getMyStaffMember } from '@/api/staff';
import { getAbsencesByMarket, updateAbsence } from '@/api/absences';
import { getCompaniesByMarket } from '@/api/companies';
import { useAuth } from '@/lib/AuthContext';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { AlertTriangle, CheckCircle, Building2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export default function AbsenceCalendar() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showHistory, setShowHistory] = useState(false);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMyProfile });

  const { data: staffProfile } = useQuery({
    queryKey: ['staffProfile', me?.email],
    queryFn: async () => {
      const list = await getMyStaffMember();
      return list[0] || null;
    },
    enabled: !!me?.email,
  });

  const staffMarketId = staffProfile?.market_id;

  const { data: companies = [] } = useQuery({
    queryKey: ['dash-companies', staffMarketId],
    queryFn: async () => {
      const all = await getCompaniesByMarket(staffMarketId);
      return all.filter(c => c.market_ids?.includes(staffMarketId));
    },
    enabled: !!staffMarketId,
  });

  const { data: absences = [], isLoading } = useQuery({
    queryKey: ['absences', staffMarketId],
    queryFn: () => getAbsencesByMarket(staffMarketId),
    enabled: !!staffMarketId,
  });

  const resolveMutation = useMutation({
    mutationFn: (id) => updateAbsence(id, { status: 'resolved' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['absences', staffMarketId] });
      toast({ title: 'Assenza segnata come gestita' });
    },
  });

  // Group absences by company_id
  const grouped = absences.reduce((acc, a) => {
    const cid = a.company_id;
    if (!acc[cid]) acc[cid] = [];
    acc[cid].push(a);
    return acc;
  }, {});

  const getCompany = (id) => companies.find(c => c.id === id);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-r from-primary via-primary/95 to-secondary px-6 pt-12 pb-8 shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <Link to="/staff" className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white" />
          </Link>
          <div className="inline-flex items-center gap-1.5 bg-secondary rounded-full px-4 py-1.5 shadow-md">
            <span className="text-primary font-bold text-xs tracking-widest uppercase">📅 Calendario Assenze</span>
          </div>
        </div>
        <h1 className="font-heading text-3xl font-bold text-white drop-shadow-lg">Assenze Produttori</h1>
        <p className="text-white/80 text-sm mt-1">Assenze segnalate dai produttori del tuo mercato</p>
      </div>

      <div className="px-6 py-6 space-y-4">
        {/* Toolbar */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowHistory(h => !h)}
            className={`text-sm font-medium px-4 py-2 rounded-xl border transition-colors ${
              showHistory
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-primary border-primary/30 hover:bg-primary/5'
            }`}
          >
            {showHistory ? '← Torna alle attive' : '📋 Cronologia assenze'}
          </button>
        </div>

        {showHistory ? (
          <HistoryView absences={absences} companies={companies} />
        ) : (
          <>
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && absences.length === 0 && (
          <div className="text-center py-16">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="font-semibold text-foreground">Nessuna assenza segnalata</p>
            <p className="text-sm text-muted-foreground mt-1">Tutti i produttori sono presenti</p>
          </div>
        )}

        {Object.entries(grouped).map(([companyId, compAbsences]) => {
          const company = getCompany(companyId);
          const hasOpen = compAbsences.some(a => a.status === 'reported');
          return (
            <div key={companyId} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              {/* Company header */}
              <div className={`px-4 py-3 flex items-center gap-3 ${hasOpen ? 'bg-red-50 border-b border-red-100' : 'bg-muted/30 border-b border-border'}`}>
                <div className="relative w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-primary" />
                  {hasOpen && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-foreground truncate">{company?.name || 'Azienda'}</p>
                  <p className="text-xs text-muted-foreground">{compAbsences.length} assenza{compAbsences.length !== 1 ? 'e' : ''} segnalata{compAbsences.length !== 1 ? 'e' : ''}</p>
                </div>
                {hasOpen && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">Nuova</span>
                )}
              </div>

              {/* Absences list */}
              <div className="divide-y divide-border/40">
                {compAbsences.map(abs => (
                  <div key={abs.id} className="px-4 py-3 flex items-start gap-3">
                      <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${abs.status === 'reported' ? 'bg-red-100' : 'bg-green-100'}`}>
                      {abs.status === 'reported'
                        ? <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                        : <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {abs.created_at ? format(new Date(abs.created_at), 'EEEE d MMMM yyyy · HH:mm', { locale: it }) : '—'}
                      </p>
                      {abs.reason && (
                        <p className="text-sm text-foreground mt-1 italic">"{abs.reason}"</p>                      )}
                      {abs.status === 'resolved' && (
                        <span className="text-xs text-green-600 font-semibold">Gestita</span>
                      )}
                    </div>
                    {abs.status === 'reported' && (                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveMutation.mutate(abs.id)}
                        disabled={resolveMutation.isPending}
                        className="text-xs h-7 border-green-300 text-green-700 hover:bg-green-50 flex-shrink-0"
                      >
                        Gestita
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
          </>
        )}
      </div>
    </div>
  );
}

function HistoryView({ absences, companies }) {
  const getCompany = (id) => companies.find(c => c.id === id);

  const grouped = absences.reduce((acc, a) => {
    const cid = a.company_id;
    if (!acc[cid]) acc[cid] = [];
    acc[cid].push(a);
    return acc;
  }, {});

  if (absences.length === 0) {
    return (
      <div className="text-center py-16">
        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
        <p className="font-semibold text-foreground">Nessuna assenza in archivio</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([companyId, compAbsences]) => {
        const company = getCompany(companyId);
        const open = compAbsences.filter(a => a.status === 'reported').length;        const resolved = compAbsences.filter(a => a.status === 'resolved').length;
        const lastDate = compAbsences[0]?.created_at;

        return (
          <div key={companyId} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-3 bg-muted/20 border-b border-border">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground truncate">{company?.name || 'Azienda'}</p>
                <p className="text-xs text-muted-foreground">
                  Ultima: {lastDate ? format(new Date(lastDate), 'd MMM yyyy', { locale: it }) : '—'}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-foreground">{compAbsences.length}</p>
                <p className="text-[10px] text-muted-foreground">totali</p>
              </div>
            </div>
            <div className="px-4 py-3 flex gap-6">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="text-sm text-foreground font-medium">{open}</span>
                <span className="text-xs text-muted-foreground">aperte</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span className="text-sm text-foreground font-medium">{resolved}</span>
                <span className="text-xs text-muted-foreground">gestite</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}