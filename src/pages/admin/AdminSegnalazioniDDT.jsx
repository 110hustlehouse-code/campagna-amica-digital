import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { AlertTriangle, Loader2, ShieldAlert, ShieldX, CheckCircle2, Euro, Download, History, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { getReportsEscalated, createWarning, createBlock, createMonetaryNotice, risolviSegnalazione, getEscalationsAperte, risolviEscalation, getAllSanctions } from '@/api/sanctions';
import { getReportsAmmoniteByCompanyMarket } from '@/api/ddtReports';
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

  const { data: cronologia = [] } = useQuery({
    queryKey: ['sanctions-history'],
    queryFn: getAllSanctions,
  });

  const [ricerca, setRicerca] = useState('');
  const [rigaAperta, setRigaAperta] = useState(null);

  const cronologiaFiltrata = useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    if (!q) return cronologia;
    return cronologia.filter((s) =>
      s.companies?.name?.toLowerCase().includes(q) ||
      s.markets?.name?.toLowerCase().includes(q));
  }, [cronologia, ricerca]);

  const { data: segnalazioniCorrelate = [] } = useQuery({
    queryKey: ['segnalazioni-correlate', rigaAperta?.company_id, rigaAperta?.market_id],
    queryFn: () => getReportsAmmoniteByCompanyMarket(rigaAperta.company_id, rigaAperta.market_id),
    enabled: !!rigaAperta,
  });

  const ETICHETTE_TIPO = { warning: 'Ammonizione', stall_block: 'Blocco banco', monetary_notice: 'Sanzione pecuniaria' };

  const esportaCronologia = () => {
    const intestazione = ['Azienda', 'Mercato', 'Tipo', 'Motivo', 'Bloccato dal', 'Bloccato fino al', 'Revocato', 'Emesso il'];
    const righe = cronologia.map((s) => [
      s.companies?.name, s.markets?.name, ETICHETTE_TIPO[s.type] || s.type, s.reason,
      s.blocked_from || '', s.blocked_until || '', s.lifted_at ? 'sì' : 'no',
      format(new Date(s.created_at), 'dd/MM/yyyy HH:mm'),
    ].map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'));
    const csv = [intestazione.join(';'), ...righe].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `cronologia-sanzioni-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const provvedimentoMutation = useMutation({
    mutationFn: async () => {
      const { report, tipo } = azione;
      if (tipo === 'warning') {
        await createWarning(report.company_id, report.market_id, reason, report.id, user.id);
      } else if (tipo === 'monetary') {
        await createMonetaryNotice(report.company_id, report.market_id, reason, report.id, user.id);
      } else {
        const oggi = format(new Date(), 'yyyy-MM-dd');
        await createBlock(report.company_id, report.market_id, reason, oggi, blockedUntil, report.id, user.id);
      }
      // report.id è null quando il provvedimento nasce da un'escalation
      // automatica (3 ammonizioni), non da una singola segnalazione DDT:
      // in quel caso si chiude l'escalation stessa, non missing_ddt_reports.
      if (report.id) {
        await risolviSegnalazione(report.id);
      } else if (report.escalationId) {
        await risolviEscalation(report.escalationId);
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
                <Button size="sm" variant="outline" onClick={() => apri({ company_id: e.company_id, market_id: e.market_id, companies: e.companies, id: null, escalationId: e.id }, 'monetary')}
                        className="gap-1.5 text-orange-700 border-orange-300 hover:bg-orange-50">
                  <Euro className="w-3.5 h-3.5" /> Avvisa sanzione pecuniaria
                </Button>
                <Button size="sm" variant="outline" onClick={() => apri({ company_id: e.company_id, market_id: e.market_id, companies: e.companies, id: null, escalationId: e.id }, 'block')}
                        className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5">
                  <ShieldX className="w-3.5 h-3.5" /> Blocca banco
                </Button>
                <Button size="sm" variant="ghost" onClick={() => risolviEscalationMutation.mutate(e.id)} className="gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Archivia
                </Button>
              </div>            </div>
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
                <Button size="sm" variant="outline" onClick={() => apri(s, 'monetary')}
                        className="gap-1.5 text-orange-700 border-orange-300 hover:bg-orange-50">
                  <Euro className="w-3.5 h-3.5" /> Avvisa sanzione pecuniaria
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
            <DialogTitle>
              {azione?.tipo === 'warning' ? 'Emetti ammonizione'
                : azione?.tipo === 'monetary' ? 'Avviso sanzione pecuniaria'
                : 'Blocca banco'}
            </DialogTitle>          </DialogHeader>
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

      <div className="pt-6">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <History className="w-4 h-4" /> Cronologia sanzioni
          </p>
          <Button size="sm" variant="outline" onClick={esportaCronologia} disabled={cronologia.length === 0} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Esporta CSV
          </Button>
        </div>

        {cronologia.length > 0 && (
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Cerca per azienda o mercato"
                   value={ricerca} onChange={(e) => setRicerca(e.target.value)} />
          </div>
        )}

        {cronologia.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-xl">Nessun provvedimento emesso finora.</p>
        ) : cronologiaFiltrata.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-xl">Nessun risultato per "{ricerca}".</p>
        ) : (
          <div className="border rounded-xl bg-card divide-y">
            {cronologiaFiltrata.map((s) => {
              const aperta = rigaAperta?.id === s.id;
              return (
                <div key={s.id}>
                  <button
                    onClick={() => setRigaAperta(aperta ? null : s)}
                    className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{s.companies?.name}</span>
                        <span className="text-xs text-muted-foreground">· {s.markets?.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{ETICHETTE_TIPO[s.type] || s.type}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.reason}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{format(new Date(s.created_at), 'd MMM yyyy', { locale: it })}</span>
                      {aperta ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>
                  {aperta && (
                    <div className="px-4 pb-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Segnalazioni dello staff collegate</p>
                      {segnalazioniCorrelate.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Nessuna ammonizione registrata per questa azienda su questo mercato.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {segnalazioniCorrelate.map((r) => (
                            <div key={r.id} className="text-xs border rounded-lg p-2 bg-muted/20">
                              <span className="font-medium">{format(new Date(r.data_evento), 'd MMM yyyy', { locale: it })}</span>
                              {r.staff_note && <span className="text-muted-foreground"> — {r.staff_note}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}