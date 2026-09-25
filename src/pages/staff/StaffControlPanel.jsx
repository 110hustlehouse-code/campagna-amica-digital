import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  FileText, Leaf, Store, Download, FileSpreadsheet, Loader2,
  Plus, Building2, AlertTriangle, ChevronDown, ShieldQuestion, Send, ShieldAlert, Archive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { getMyStaffMember } from '@/api/staff';
import { getDdtByMarket, getDdt, numeroCompleto } from '@/api/ddt';
import { getReportsByMarket, agisciSuSegnalazione, creaSegnalazioneManuale, ETICHETTE_AZIONE } from '@/api/ddtReports';
import { createWarningStaff } from '@/api/sanctions';
import { getSegnalazioniStagionaliMercato, risolviSegnalazioneStagionale } from '@/api/segnalazioniStagionali';
import { getRentalsByMarket, getAllRentals } from '@/api/rentals';
import { getRegisteredCompanies } from '@/api/companies';
import { getMarkets } from '@/api/markets';
import { exportRowsToPdf, exportRowsToExcel } from '@/lib/reportExport';

import StallRentals from './StallRentals';

const TABS = [
  { id: 'ddt', label: 'DDT', icon: FileText },
  { id: 'stagionale', label: 'Fuori Stagione', icon: Leaf },
  { id: 'affitti', label: 'Affitti', icon: Store },
];

export default function StaffControlPanel() {
  const [tab, setTab] = useState('ddt');

  const { data: staff } = useQuery({ queryKey: ['my-staff'], queryFn: getMyStaffMember });
  const marketId = staff?.market_id;

  const { data: markets = [] } = useQuery({ queryKey: ['markets-list'], queryFn: getMarkets });
  const marketName = markets.find((m) => m.id === marketId)?.name || 'Mercato';

  const { data: companies = [] } = useQuery({ queryKey: ['companies-list'], queryFn: getRegisteredCompanies });

  // --- dati per export DDT ---
  const dal = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const { data: segnalazioniDdt = [] } = useQuery({
    queryKey: ['ddt-reports', marketId],
    queryFn: () => getReportsByMarket(marketId),
    enabled: !!marketId,
  });
  const { data: documentiDdt = [] } = useQuery({
    queryKey: ['ddt-mercato', marketId, dal],
    queryFn: () => getDdtByMarket(marketId, dal),
    enabled: !!marketId,
  });

  // --- dati per export stagionalità ---
  const { data: segnalazioniStagionali = [] } = useQuery({
    queryKey: ['seasonal-alerts', marketId],
    queryFn: () => getSegnalazioniStagionaliMercato(marketId),
    enabled: !!marketId,
  });

  // --- dati per export affitti ---
  const { data: rentals = [] } = useQuery({
    queryKey: ['stall-rentals', marketId],
    queryFn: () => (marketId ? getRentalsByMarket(marketId) : getAllRentals()),
    enabled: !!marketId,
  });

  const handleExportDdtPdf = () => {
    const righe = [
      ...segnalazioniDdt.map((s) => ({
        tipo: 'Segnalazione',
        azienda: s.companies?.name || 'Azienda',
        dettaglio: format(new Date(s.data_evento), 'd MMM yyyy', { locale: it }),
      })),
      ...documentiDdt.map((d) => ({
        tipo: 'DDT emesso',
        azienda: d.mittente_ragione_sociale,
        dettaglio: numeroCompleto(d)
          ? `N. ${numeroCompleto(d)} — ${format(new Date(d.issue_date), 'd MMM yyyy', { locale: it })}`
          : format(new Date(d.issue_date), 'd MMM yyyy', { locale: it }),
      })),
    ];
    exportRowsToPdf({
      title: 'Controllo DDT',
      marketName,
      columns: [
        { key: 'tipo', label: 'Tipo' },
        { key: 'azienda', label: 'Azienda' },
        { key: 'dettaglio', label: 'Dettaglio' },
      ],
      rows: righe,
      filenamePrefix: 'controllo-ddt',
    });
  };

  const handleExportDdtExcel = () => {
    const righe = [
      ...segnalazioniDdt.map((s) => ({
        tipo: 'Segnalazione',
        azienda: s.companies?.name || 'Azienda',
        data: s.data_evento,
        numero: '',
      })),
      ...documentiDdt.map((d) => ({
        tipo: 'DDT emesso',
        azienda: d.mittente_ragione_sociale,
        data: d.issue_date,
        numero: numeroCompleto(d) || '',
      })),
    ];
    exportRowsToExcel({
      sheetName: 'DDT',
      columns: [
        { key: 'tipo', label: 'Tipo' },
        { key: 'azienda', label: 'Azienda' },
        { key: 'data', label: 'Data' },
        { key: 'numero', label: 'Numero DDT' },
      ],
      rows: righe,
      filenamePrefix: 'controllo-ddt',
    });
  };

  const handleExportStagionalePdf = () => {
    exportRowsToPdf({
      title: 'Prodotti Fuori Stagione',
      marketName,
      columns: [
        { key: 'azienda', label: 'Azienda' },
        { key: 'prodotto', label: 'Prodotto' },
        { key: 'match', label: 'Voce fuori stagione' },
      ],
      rows: segnalazioniStagionali.map((a) => ({
        azienda: companies.find((c) => c.id === a.company_id)?.name || 'Azienda',
        prodotto: a.product_name,
        match: a.seasonal_match,
      })),
      filenamePrefix: 'fuori-stagione',
    });
  };

  const handleExportStagionaleExcel = () => {
    exportRowsToExcel({
      sheetName: 'Fuori Stagione',
      columns: [
        { key: 'azienda', label: 'Azienda' },
        { key: 'prodotto', label: 'Prodotto' },
        { key: 'match', label: 'Voce fuori stagione' },
        { key: 'data', label: 'Rilevato il' },
      ],
      rows: segnalazioniStagionali.map((a) => ({
        azienda: companies.find((c) => c.id === a.company_id)?.name || 'Azienda',
        prodotto: a.product_name,
        match: a.seasonal_match,
        data: a.created_at,
      })),
      filenamePrefix: 'fuori-stagione',
    });
  };

  const handleExportAffittiPdf = () => {
    exportRowsToPdf({
      title: 'Gestione Affitti',
      marketName,
      columns: [
        { key: 'azienda', label: 'Azienda' },
        { key: 'banco', label: 'Banco' },
        { key: 'canone', label: 'Canone' },
        { key: 'stato', label: 'Stato' },
      ],
      rows: rentals.map((r) => ({
        azienda: companies.find((c) => c.id === r.company_id)?.name || 'Azienda',
        banco: r.stall_number,
        canone: `€${Number(r.monthly_rent).toFixed(2)}/mese`,
        stato: r.status,
      })),
      filenamePrefix: 'affitti',
    });
  };

  const handleExportAffittiExcel = () => {
    exportRowsToExcel({
      sheetName: 'Affitti',
      columns: [
        { key: 'azienda', label: 'Azienda' },
        { key: 'banco', label: 'Banco' },
        { key: 'canone', label: 'Canone mensile' },
        { key: 'stato', label: 'Stato' },
        { key: 'inizio', label: 'Inizio' },
        { key: 'fine', label: 'Fine' },
      ],
      rows: rentals.map((r) => ({
        azienda: companies.find((c) => c.id === r.company_id)?.name || 'Azienda',
        banco: r.stall_number,
        canone: r.monthly_rent,
        stato: r.status,
        inizio: r.rental_start_date,
        fine: r.rental_end_date || '',
      })),
      filenamePrefix: 'affitti',
    });
  };

  const exportHandlers = {
    ddt: { pdf: handleExportDdtPdf, excel: handleExportDdtExcel },
    stagionale: { pdf: handleExportStagionalePdf, excel: handleExportStagionaleExcel },
    affitti: { pdf: handleExportAffittiPdf, excel: handleExportAffittiExcel },
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-gradient-to-r from-primary via-primary/95 to-secondary border-b-4 border-secondary px-6 pt-12 pb-6 shadow-lg">
        <div className="inline-flex items-center gap-1.5 bg-secondary rounded-full px-4 py-1.5 mb-3 shadow-md">
          <span className="text-primary font-bold text-xs tracking-widest uppercase">🎛️ Pannello di Controllo</span>
        </div>
        <h1 className="font-heading text-3xl font-bold text-white drop-shadow-lg mb-4">Controllo Mercato</h1>

        <div className="flex items-center gap-2 bg-white/15 rounded-2xl p-1.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-colors',
                  active ? 'bg-white text-primary shadow-sm' : 'text-white/80 hover:text-white'
                )}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 mt-4">
          <Button
            size="sm"
            variant="outline"
            onClick={exportHandlers[tab].pdf}
            className="bg-white/20 text-white border-white/40 hover:bg-white/30 gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={exportHandlers[tab].excel}
            className="bg-white/20 text-white border-white/40 hover:bg-white/30 gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </Button>
        </div>
      </div>

      <div>
        {tab === 'ddt' && (
          <DdtControlSection
            marketId={marketId}
            companies={companies}
            segnalazioni={segnalazioniDdt}
            documenti={documentiDdt}
          />
        )}
        {tab === 'stagionale' && <SeasonalControlSection marketId={marketId} companies={companies} />}
        {tab === 'affitti' && <StallRentals />}
      </div>
    </div>
  );
}

function DdtControlSection({ marketId, companies, segnalazioni, documenti }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [openCompanies, setOpenCompanies] = useState(new Set());
  const [azione, setAzione] = useState(null);
  const [nota, setNota] = useState('');
  const [nuovaSegnalazione, setNuovaSegnalazione] = useState(false);
  const [aziendaSelezionata, setAziendaSelezionata] = useState('');
  const [dettaglio, setDettaglio] = useState(null);

  const nuovaSegnalazioneMutation = useMutation({
    mutationFn: () => creaSegnalazioneManuale(aziendaSelezionata, marketId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ddt-reports'] });
      setNuovaSegnalazione(false);
      setAziendaSelezionata('');
      toast({ title: 'Segnalazione creata' });
    },
    onError: (e) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
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
  const apriDettaglio = async (id) => setDettaglio(await getDdt(id));

  const toggleCompany = (id) => {
    setOpenCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Raggruppa segnalazioni aperte + DDT emessi per azienda
  const gruppi = useMemo(() => {
    const map = {};
    segnalazioni.forEach((s) => {
      const cid = s.company_id;
      if (!map[cid]) {
        map[cid] = {
          companyId: cid,
          companyName: s.companies?.name || companies.find((c) => c.id === cid)?.name || 'Azienda',
          segnalazioni: [],
          documenti: [],
        };
      }
      map[cid].segnalazioni.push(s);
    });
    documenti.forEach((d) => {
      const cid = d.company_id;
      if (!cid) return;
      if (!map[cid]) {
        map[cid] = {
          companyId: cid,
          companyName: companies.find((c) => c.id === cid)?.name || d.mittente_ragione_sociale || 'Azienda',
          segnalazioni: [],
          documenti: [],
        };
      }
      map[cid].documenti.push(d);
    });
    return Object.values(map).sort((a, b) => a.companyName.localeCompare(b.companyName));
  }, [segnalazioni, documenti, companies]);

  if (!marketId) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Nessun mercato associato al tuo profilo.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5 gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold">Controllo DDT per Azienda</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Attuale + storico, raggruppati per azienda</p>
        </div>
        <Button size="sm" onClick={() => setNuovaSegnalazione(true)} className="gap-1.5 shrink-0">
          <Plus className="w-3.5 h-3.5" /> Segnala
        </Button>
      </div>

      {gruppi.length === 0 ? (
        <div className="text-center py-16 border rounded-2xl bg-muted/20">
          <p className="font-medium">Nessuna attività DDT questo mese</p>
        </div>
      ) : (
        <div className="space-y-3">
          {gruppi.map((g) => {
            const isOpen = openCompanies.has(g.companyId);
            const haSegnalazioniAperte = g.segnalazioni.length > 0;
            return (
              <div key={g.companyId} className="rounded-xl border-2 border-border/50 bg-white overflow-hidden shadow-sm">
                <button
                  onClick={() => toggleCompany(g.companyId)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-sm text-foreground">{g.companyName}</p>
                      <p className="text-xs text-muted-foreground">{g.documenti.length} DDT questo mese</p>
                    </div>
                    {haSegnalazioniAperte && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                        <AlertTriangle className="w-2.5 h-2.5" /> Senza DDT
                      </span>
                    )}
                  </div>
                  <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                </button>

                {isOpen && (
                  <div className="border-t border-border/40 px-4 py-4 space-y-4">
                    <div>
                      <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Attuale</p>
                      {g.segnalazioni.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Nessuna segnalazione aperta</p>
                      ) : (
                        <div className="space-y-2">
                          {g.segnalazioni.map((s) => (
                            <div key={s.id} className="border rounded-lg p-3 bg-amber-50/50">
                              <p className="text-xs text-muted-foreground mb-2">
                                {format(new Date(s.data_evento), 'EEEE d MMMM', { locale: it })}
                                {' · rilevato alle '}
                                {format(new Date(s.detected_at), 'HH:mm')}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm" variant="outline" onClick={() => apriAzione(s, 'warn')}
                                  className="gap-1.5 text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                                >
                                  <ShieldQuestion className="w-3 h-3" /> Ammonisci
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => apriAzione(s, 'escalate')} className="gap-1.5 text-xs">
                                  <Send className="w-3 h-3" /> Segnala
                                </Button>
                                <Button
                                  size="sm" variant="outline" onClick={() => apriAzione(s, 'request_suspension')}
                                  className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                                >
                                  <ShieldAlert className="w-3 h-3" /> Sospendi
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => apriAzione(s, 'dismiss')} className="gap-1.5 text-xs">
                                  <Archive className="w-3 h-3" /> Archivia
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-bold text-primary uppercase tracking-wide mb-2">Storico ({g.documenti.length})</p>
                      {g.documenti.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Nessun DDT emesso questo mese</p>
                      ) : (
                        <div className="space-y-1.5">
                          {g.documenti.map((d) => (
                            <button
                              key={d.id}
                              onClick={() => apriDettaglio(d.id)}
                              className="w-full text-left border rounded-lg p-2.5 bg-card hover:border-primary/40 transition-colors text-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold">{numeroCompleto(d) ? `DDT ${numeroCompleto(d)}` : 'Bozza'}</span>
                                <span className="text-muted-foreground">{format(new Date(d.issue_date), 'd MMM', { locale: it })}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={nuovaSegnalazione} onOpenChange={setNuovaSegnalazione}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Segnala produttore senza DDT</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Segnala un'azienda del tuo mercato che oggi non ha emesso DDT né dichiarato assenza.
            </p>
            <select
              value={aziendaSelezionata}
              onChange={(e) => setAziendaSelezionata(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
            >
              <option value="">Scegli azienda...</option>
              {companies.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNuovaSegnalazione(false)}>Annulla</Button>
            <Button onClick={() => nuovaSegnalazioneMutation.mutate()} disabled={!aziendaSelezionata || nuovaSegnalazioneMutation.isPending}>
              {nuovaSegnalazioneMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Segnala
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!azione} onOpenChange={(open) => !open && setAzione(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{azione?.tipo === 'warn' ? 'Ammonisci azienda' : (azione && ETICHETTE_AZIONE[azione.tipo])}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea rows={3} placeholder="Nota (facoltativa)" value={nota} onChange={(e) => setNota(e.target.value)} />
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

      <Dialog open={!!dettaglio} onOpenChange={() => setDettaglio(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {dettaglio && (
            <>
              <DialogHeader>
                <DialogTitle>{numeroCompleto(dettaglio) ? `DDT ${numeroCompleto(dettaglio)}` : 'Bozza'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Mittente</p>
                  <p className="font-medium">
                    {companies.find((c) => c.id === dettaglio.company_id)?.name || 'Azienda sconosciuta'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Merce</p>
                  <div className="border rounded-lg divide-y">
                    {(dettaglio.righe || []).map((r) => (
                      <div key={r.id} className="p-2.5 flex justify-between gap-3">
                        <span className="min-w-0 truncate">{r.product_name}</span>
                        <span className="text-muted-foreground shrink-0">{r.quantity} {r.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {dettaglio.annotazioni && <p className="text-xs">{dettaglio.annotazioni}</p>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SeasonalControlSection({ marketId, companies }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [nota, setNota] = useState('');
  const [azione, setAzione] = useState(null);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['seasonal-alerts', marketId],
    queryFn: () => getSegnalazioniStagionaliMercato(marketId),
    enabled: !!marketId,
  });

  const risolviMutation = useMutation({
    mutationFn: ({ id, nota }) => risolviSegnalazioneStagionale(id, nota || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seasonal-alerts'] });
      setAzione(null);
      setNota('');
      toast({ title: 'Segnalazione risolta' });
    },
    onError: (e) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  const byCompany = alerts.reduce((acc, alert) => {
    const key = alert.company_id || 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(alert);
    return acc;
  }, {});

  if (!marketId) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Nessun mercato associato al tuo profilo.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h2 className="font-heading text-xl font-bold mb-1">Prodotti Fuori Stagione</h2>
      <p className="text-sm text-muted-foreground mb-5">Rilevati automaticamente sui DDT emessi</p>

      {alerts.length === 0 ? (
        <div className="text-center py-16 border rounded-2xl bg-muted/20">
          <p className="font-medium">Nessuna segnalazione aperta</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byCompany).map(([companyId, companyAlerts]) => {
            const companyName = companies.find((c) => c.id === companyId)?.name || 'Azienda sconosciuta';
            return (
              <div key={companyId}>
                <p className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-2">{companyName}</p>
                <div className="space-y-2">
                  {companyAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start justify-between gap-3 p-3 rounded-xl bg-orange-50 border border-orange-100"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-orange-800 leading-tight">{alert.product_name}</p>
                        <p className="text-xs text-orange-700 mt-1 leading-relaxed">
                          "{alert.seasonal_match}" fuori stagione
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setAzione(alert)} className="shrink-0 text-xs">
                        Risolvi
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {azione && (
        <Dialog open onOpenChange={(open) => !open && setAzione(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Risolvi segnalazione</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {azione.product_name} — "{azione.seasonal_match}"
              </p>
              <Textarea
                rows={3}
                placeholder="Nota (facoltativa)"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAzione(null)}>
                Annulla
              </Button>
              <Button onClick={() => risolviMutation.mutate({ id: azione.id, nota })} disabled={risolviMutation.isPending}>
                {risolviMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                Conferma
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
