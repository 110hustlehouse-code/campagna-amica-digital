import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { AlertTriangle, Loader2, ChevronLeft, Send, Archive, ShieldAlert, ShieldQuestion } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMyStaffMember } from '@/api/staff';
import { getReportsByMarket, agisciSuSegnalazione, ETICHETTE_AZIONE } from '@/api/ddtReports';
import { createWarningStaff } from '@/api/sanctions';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

export default function StaffDdtReports() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [azione, setAzione] = useState(null); // { report, tipo }
  const [nota, setNota] = useState('');

  const { data: staff } = useQuery({ queryKey: ['my-staff'], queryFn: getMyStaffMember });
  const marketId = staff?.[0]?.market_id;

  const { data: segnalazioni = [], isLoading } = useQuery({
    queryKey: ['ddt-reports', marketId],
    queryFn: () => getReportsByMarket(marketId),
    enabled: !!marketId,
  });

  const agisciMutation = useMutation({
    mutationFn: async ({ id, tipo, nota, report }) => {
      if (tipo === 'warn') {
        await createWarningStaff(report.company_id, report.market_id, nota || 'DDT non emesso', id, user.id);
        await agisciSuSegnalazione(id, 'warn', nota || null, user.id);
      } else {
        await agisciSuSegnalazione(id, tipo, nota || null, user.id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ddt-reports'] });
      setAzione(null);
      setNota('');
      toast({ title: 'Fatto' });
    },
    onError: (e) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  const apriAzione = (report, tipo) => { setAzione({ report, tipo }); setNota(''); };
  const conferma = () => agisciMutation.mutate({ id: azione.report.id, tipo: azione.tipo, nota, report: azione.report });
  if (!marketId) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Nessun mercato associato al tuo profilo.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-5">
        <Link to="/staff" className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-600" /> Produttori senza DDT
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Segnalazioni da valutare per il tuo mercato
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : segnalazioni.length === 0 ? (
        <div className="text-center py-16 border rounded-2xl bg-muted/20">
          <ShieldAlert className="w-10 h-10 mx-auto text-emerald-500 mb-3" />
          <p className="font-medium">Nessuna segnalazione aperta</p>
          <p className="text-sm text-muted-foreground mt-1">
            Tutti i produttori assegnati oggi hanno fatto DDT o dichiarato assenza.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {segnalazioni.map((s) => (
            <div key={s.id} className="border rounded-xl p-4 bg-card">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold">{s.companies?.name || 'Azienda'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(s.data_evento), 'EEEE d MMMM', { locale: it })}
                    {' · rilevato alle '}
                    {format(new Date(s.detected_at), 'HH:mm')}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                  Da valutare
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => apriAzione(s, 'warn')}
                        className="gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50">
                  <ShieldQuestion className="w-3.5 h-3.5" /> Ammonisci
                </Button>
                <Button size="sm" variant="outline" onClick={() => apriAzione(s, 'escalate')} className="gap-1.5">
                  <Send className="w-3.5 h-3.5" /> Segnala ad amministrazione
                </Button>
                <Button size="sm" variant="outline" onClick={() => apriAzione(s, 'request_suspension')}
                        className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5">
                  <ShieldAlert className="w-3.5 h-3.5" /> Richiedi sospensione
                </Button>
                <Button size="sm" variant="ghost" onClick={() => apriAzione(s, 'dismiss')} className="gap-1.5">
                  <Archive className="w-3.5 h-3.5" /> Archivia
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!azione} onOpenChange={(open) => !open && setAzione(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{azione?.tipo === 'warn' ? 'Ammonisci azienda' : (azione && ETICHETTE_AZIONE[azione.tipo])}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {azione?.report?.companies?.name} — {azione && format(new Date(azione.report.data_evento), 'd MMMM', { locale: it })}
            </p>
            <Textarea
              rows={3}
              placeholder="Nota (facoltativa)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAzione(null)}>Annulla</Button>
            <Button onClick={conferma} disabled={agisciMutation.isPending}>
              {agisciMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Conferma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}