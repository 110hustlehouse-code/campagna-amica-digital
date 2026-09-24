import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { AlertTriangle, Loader2, ShieldAlert, ShieldX, CheckCircle2 } from 'lucide-react';
import { getReportsEscalated, createWarning, createBlock, risolviSegnalazione, getEscalationsAperte, risolviEscalation } from '@/api/sanctions';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

export default function AdminSegnalazioniDDT() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [azione, setAzione] = useState(null); // { report, tipo: 'warning' | 'block' }
  const [reason, setReason] = useState('');
  const [blockedUntil, setBlockedUntil] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));

  const { data: segnalazioni = [], isLoading } = useQuery({
    queryKey: ['reports-escalated'],
    queryFn: getReportsEscalated,
  });

  const { data: escalations = [] } = useQuery({
    queryKey: ['escalations-aperte'],
    queryFn: getEscalationsAperte,
  });

  const risolviEscalationMutation = useMutation({
    mutationFn: risolviEscalation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['escalations-aperte'] });
      toast({ title: 'Escalation archiviata' });
    },
  });

  const provvedimentoMutation = useMutation({
    mutationFn: async () => {
      const { report, tipo } = azione;
      if (tipo === 'warning') {
        await createWarning(report.company_id, report.market_id, reason, report.id, user.id);
      } else {
        const oggi = format(new Date(), 'yyyy-MM-dd');
        await createBlock(report.company_id, report.market_id, reason, oggi, blockedUntil, report.id, user.id);
      }
      // report.id è null quando il provvedimento nasce da un'escalation
      // automatica (3 ammonizioni), non da una singola segnalazione DDT:
      // in quel caso non c'è nulla da risolvere in missing_ddt_reports.
      if (report.id) {
        await risolviSegnalazione(report.id);
      }
      qc.invalidateQueries({ queryKey: ['escalations-aperte'] });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports-escalated'] });
      setAzione(null);
      setReason('');
      toast({ title: 'Provvedimento emesso', description: 'Lo staff ne è stato informato.' });
    },
    onError: (e) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  const apri = (report, tipo) => {
    setAzione({ report, tipo });
    setReason('');
    setBlockedUntil(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Segnalazioni DDT</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Segnalazioni inoltrate dallo staff, in attesa di un provvedimento
        </p>
      </div>

      {escalations.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-amber-800">Escalation automatiche (3+ ammonizioni)</p>
          {escalations.map((e) => (
            <div key={e.id} className="border-2 border-amber-300 rounded-xl p-4 bg-amber-50/50">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold">{e.companies?.name || 'Azienda'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{e.markets?.name}</p>
                  <p className="text-xs text-amber-800 mt-1">{e.reason}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => apri({ company_id: e.company_id, market_id: e.market_id, companies: e.companies, id: null }, 'block')}
                        className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5">
                  <ShieldX className="w-3.5 h-3.5" /> Blocca banco
                </Button>
                <Button size="sm" variant="ghost" onClick={() => risolviEscalationMutation.mutate(e.id)} className="gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Archivia
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : segnalazioni.length === 0 ? (        <div className="text-center py-16 border rounded-2xl bg-muted/20">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-3" />
          <p className="font-medium">Nessuna segnalazione in attesa</p>
        </div>
      ) : (
        <div className="space-y-3">
          {segnalazioni.map((s) => (
            <div key={s.id} className="border rounded-xl p-4 bg-card">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold">{s.companies?.name || 'Azienda'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.markets?.name} · {format(new Date(s.data_evento), 'd MMMM', { locale: it })}
                  </p>
                  {s.staff_note && (
                    <p className="text-xs text-muted-foreground mt-1 italic">"{s.staff_note}"</p>
                  )}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 shrink-0">
                  {s.staff_action === 'request_suspension' ? 'Sospensione richiesta' : 'Segnalata'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => apri(s, 'warning')} className="gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" /> Emetti ammonizione
                </Button>
                <Button size="sm" variant="outline" onClick={() => apri(s, 'block')}
                        className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5">
                  <ShieldX className="w-3.5 h-3.5" /> Blocca banco
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!azione} onOpenChange={(open) => !open && setAzione(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{azione?.tipo === 'warning' ? 'Emetti ammonizione' : 'Blocca banco'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {azione?.report?.companies?.name}
            </p>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Motivo *</label>
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                        placeholder="Motivazione del provvedimento" />
            </div>
            {azione?.tipo === 'block' && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Bloccato fino al * (obbligatorio)
                </label>
                <Input type="date" value={blockedUntil} onChange={(e) => setBlockedUntil(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">
                  Il banco torna automaticamente disponibile a questa data. Nessun blocco a tempo indeterminato.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAzione(null)}>Annulla</Button>
            <Button
              onClick={() => provvedimentoMutation.mutate()}
              disabled={!reason.trim() || (azione?.tipo === 'block' && !blockedUntil) || provvedimentoMutation.isPending}
              variant={azione?.tipo === 'block' ? 'destructive' : 'default'}
            >
              {provvedimentoMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Conferma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}