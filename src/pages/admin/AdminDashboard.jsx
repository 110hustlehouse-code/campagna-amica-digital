import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, startOfYear, subDays } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  ChevronRight, Home, Loader2, TrendingUp, Package, Building2, FileCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getRiepilogo, getTerritorio, livelloSuccessivo, ETICHETTA_LIVELLO,
} from '@/api/admin';

const PERIODI = [
  { id: 'mese',  label: 'Questo mese', dal: () => startOfMonth(new Date()) },
  { id: '30gg',  label: 'Ultimi 30 giorni', dal: () => subDays(new Date(), 30) },
  { id: 'anno',  label: "Quest'anno", dal: () => startOfYear(new Date()) },
];

function numero(n) {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 }).format(n ?? 0);
}
function euro(n) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
    .format(n ?? 0);
}

export default function AdminDashboard() {
  const [periodo, setPeriodo] = useState('mese');
  // Il percorso di navigazione: ogni voce è un livello già attraversato.
  const [percorso, setPercorso] = useState([{ livello: 'italia', chiave: null, nome: 'Italia' }]);

  const corrente = percorso[percorso.length - 1];
  const dal = format(PERIODI.find((p) => p.id === periodo).dal(), 'yyyy-MM-dd');
  const al = format(new Date(), 'yyyy-MM-dd');

  const { data: riepilogo } = useQuery({
    queryKey: ['admin-riepilogo', dal, al],
    queryFn: () => getRiepilogo({ dal, al }),
  });

  const { data: righe = [], isLoading } = useQuery({
    queryKey: ['admin-territorio', corrente.livello, corrente.chiave, dal, al],
    queryFn: () => getTerritorio(corrente.livello, corrente.chiave, { dal, al }),
  });

  const sotto = livelloSuccessivo(corrente.livello);

  const scendi = (riga) => {
    if (!sotto) return;
    setPercorso([...percorso, { livello: sotto, chiave: riga.chiave, nome: riga.nome }]);
  };

  const risali = (i) => setPercorso(percorso.slice(0, i + 1));

  const TESSERE = [
    { icona: Building2, valore: numero(riepilogo?.mercati_attivi), etichetta: 'mercati attivi' },
    { icona: Package,   valore: numero(riepilogo?.aziende), etichetta: 'aziende registrate' },
    { icona: FileCheck, valore: numero(riepilogo?.ddt_emessi), etichetta: 'DDT nel periodo' },
    { icona: TrendingUp, valore: `${numero(riepilogo?.quantita_totale)} kg`, etichetta: 'merce tracciata' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold">Panoramica nazionale</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {riepilogo?.regioni_coperte ?? 0} regioni · dal{' '}
            {format(new Date(dal), 'd MMMM', { locale: it })}
          </p>
        </div>
        <div className="flex gap-1">
          {PERIODI.map((p) => (
            <Button key={p.id} size="sm"
                    variant={periodo === p.id ? 'default' : 'outline'}
                    onClick={() => setPeriodo(p.id)}>
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {TESSERE.map((t) => (
          <div key={t.etichetta} className="border rounded-xl p-4 bg-card">
            <t.icona className="w-4 h-4 text-primary mb-2" />
            <p className="text-2xl font-bold">{t.valore}</p>
            <p className="text-xs text-muted-foreground">{t.etichetta}</p>
          </div>
        ))}
      </div>

      {riepilogo && riepilogo.ddt_annullati > 0 && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-3 text-sm text-amber-900">
          {riepilogo.ddt_annullati} documenti annullati nel periodo.
          Un numero alto può indicare errori ricorrenti in fase di emissione.
        </div>
      )}

      {/* ----------------------------------------------- drill-down */}
      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-1 flex-wrap text-sm">
          {percorso.map((p, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
              <button onClick={() => risali(i)}
                      className={i === percorso.length - 1
                        ? 'font-semibold'
                        : 'text-muted-foreground hover:text-foreground'}>
                {i === 0 ? <span className="flex items-center gap-1"><Home className="w-3.5 h-3.5" />Italia</span> : p.nome}
              </button>
            </React.Fragment>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">
            {ETICHETTA_LIVELLO[corrente.livello]}
          </span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : righe.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">
            Nessun dato per questo territorio nel periodo scelto.
          </p>
        ) : (
          <div className="divide-y">
            <div className="px-4 py-2 grid grid-cols-12 gap-2 text-xs text-muted-foreground bg-muted/30">
              <span className="col-span-5">{ETICHETTA_LIVELLO[corrente.livello]}</span>
              <span className="col-span-2 text-right">Mercati</span>
              <span className="col-span-2 text-right">Aziende</span>
              <span className="col-span-2 text-right">DDT</span>
              <span className="col-span-1 text-right">kg</span>
            </div>

            {righe.map((r) => (
              <button key={r.chiave}
                      onClick={() => scendi(r)}
                      disabled={!sotto}
                      className={`w-full px-4 py-3 grid grid-cols-12 gap-2 items-center text-sm text-left transition-colors ${
                        sotto ? 'hover:bg-muted/40 cursor-pointer' : 'cursor-default'
                      }`}>
                <span className="col-span-5 font-medium flex items-center gap-1.5 min-w-0">
                  <span className="truncate">{r.nome}</span>
                  {sotto && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                </span>
                <span className="col-span-2 text-right tabular-nums">{numero(r.mercati)}</span>
                <span className="col-span-2 text-right tabular-nums">{numero(r.aziende)}</span>
                <span className="col-span-2 text-right tabular-nums">
                  {numero(r.ddt_emessi)}
                  {r.ddt_emessi > 0 && (
                    <span className="text-xs text-muted-foreground"> / {numero(r.ddt_consegnati)}</span>
                  )}
                </span>
                <span className="col-span-1 text-right tabular-nums text-muted-foreground">
                  {numero(r.quantita_totale)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Nella colonna DDT il secondo numero è quello dei documenti già consegnati.
        {sotto ? ' Tocca una riga per scendere di livello.' : ' Questo è l\'ultimo livello.'}
      </p>
    </div>
  );
}
