import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { FileText, Leaf, Store, Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { getMyStaffMember } from '@/api/staff';
import { getDdtByMarket, numeroCompleto } from '@/api/ddt';
import { getReportsByMarket } from '@/api/ddtReports';
import { getSegnalazioniStagionaliMercato, risolviSegnalazioneStagionale } from '@/api/segnalazioniStagionali';
import { getRentalsByMarket, getAllRentals } from '@/api/rentals';
import { getRegisteredCompanies } from '@/api/companies';
import { getMarkets } from '@/api/markets';
import { exportRowsToPdf, exportRowsToExcel } from '@/lib/reportExport';

import StaffDDT from './StaffDDT';
import StaffDdtReports from './StaffDdtReports';
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
          <div>
            <StaffDdtReports />
            <div className="border-t border-border/50 mt-2" />
            <StaffDDT />
          </div>
        )}
        {tab === 'stagionale' && <SeasonalControlSection marketId={marketId} companies={companies} />}
        {tab === 'affitti' && <StallRentals />}
      </div>
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
