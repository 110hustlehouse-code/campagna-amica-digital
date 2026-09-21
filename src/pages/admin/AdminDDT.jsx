import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, subDays, startOfYear } from 'date-fns';
import { it } from 'date-fns/locale';
import { Loader2, Search, FileText, Download, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { getDdtNazionali, getTerritorio } from '@/api/admin';
import { invokeLLM } from '@/api/ai';

const PERIODI = [
  { id: 'mese', label: 'Mese', dal: () => startOfMonth(new Date()) },
  { id: '30gg', label: '30 giorni', dal: () => subDays(new Date(), 30) },
  { id: 'anno', label: 'Anno', dal: () => startOfYear(new Date()) },
];

const ETICHETTE_ADMIN = { draft: 'Bozza', issued: 'Emesso', cancelled: 'Annullato' };

const COLORI = {
  emesso:     'bg-amber-50 text-amber-800 border-amber-200',
  cancelled: 'bg-red-50 text-red-800 border-red-200',
  annullato:  'bg-red-50 text-red-700 border-red-200',
};

export default function AdminDDT() {
  const [periodo, setPeriodo] = useState('mese');
  const [regione, setRegione] = useState('tutte');
  const [stato, setStato] = useState('tutti');
  const [ricerca, setRicerca] = useState('');
  const [analisi, setAnalisi] = useState(null);
  const [analizzando, setAnalizzando] = useState(false);

  const dal = format(PERIODI.find((p) => p.id === periodo).dal(), 'yyyy-MM-dd');
  const al = format(new Date(), 'yyyy-MM-dd');

  const { data: regioni = [] } = useQuery({
    queryKey: ['admin-regioni', dal],
    queryFn: () => getTerritorio('italia', null, { dal, al }),
  });

  const { data: documenti = [], isLoading } = useQuery({
    queryKey: ['admin-ddt', dal, al, regione, stato],
    queryFn: () => getDdtNazionali({
      dal, al,
      regione: regione === 'tutte' ? undefined : regione,
      stato: stato === 'tutti' ? undefined : stato,
      limite: 300,
    }),
  });

  const visibili = useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    if (!q) return documenti;
    return documenti.filter((d) =>
      d.mittente?.toLowerCase().includes(q) ||
      d.mercato?.toLowerCase().includes(q) ||
      d.numero_completo?.toLowerCase().includes(q));
  }, [documenti, ricerca]);

  const totali = useMemo(() => ({
    documenti: visibili.length,
    quantita: visibili.reduce((s, d) => s + Number(d.quantita || 0), 0),
    valore: visibili.reduce((s, d) => s + Number(d.valore || 0), 0),
    aziende: new Set(visibili.map((d) => d.mittente)).size,
  }), [visibili]);

  /** Esporta in CSV quello che si sta guardando. */
  const esporta = () => {
    const intestazione = ['Numero', 'Data', 'Mittente', 'Mercato', 'Comune', 'Provincia', 'Regione', 'Stato', 'Quantita', 'Valore'];
    const righe = visibili.map((d) => [
      d.numero_completo, d.data_documento, d.mittente, d.mercato,
      d.comune, d.provincia, d.regione, d.stato, d.firmato ? 'si' : 'no', d.quantita, d.valore,
    ].map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'));
    const csv = '﻿' + [intestazione.join(';'), ...righe].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ddt-${dal}-${al}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Lettura assistita dei dati aggregati.
   * Al modello vanno solo i totali per regione, mai i documenti:
   * non serve, e i dati delle singole aziende restano dove sono.
   */
  const analizza = async () => {
    setAnalizzando(true);
    setAnalisi(null);
    try {
      const sintesi = regioni.map((r) =>
        `${r.nome}: ${r.mercati} mercati, ${r.aziende} aziende, ${r.ddt_emessi} DDT (${r.ddt_consegnati} firmati), ${Math.round(r.quantita_totale)} kg`
      ).join('\n');

      const res = await invokeLLM({
        prompt: `Sei l'analista della rete nazionale dei mercati Campagna Amica.
Questi sono i dati dei documenti di trasporto del periodo ${dal} — ${al}, per regione:

${sintesi}

Scrivi al massimo 5 frasi in italiano, per un dirigente. Indica:
- dove la rete funziona e dove no
- eventuali anomalie (documenti emessi ma non firmati, regioni con mercati ma senza DDT)
- una cosa concreta da verificare

Niente elenchi puntati, niente premesse. Solo l'analisi.`,
      });
      setAnalisi(res.text ?? 'Nessuna analisi disponibile.');
    } catch (e) {
      setAnalisi(`Analisi non disponibile: ${e.message}`);
    } finally {
      setAnalizzando(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold">Registro DDT</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tutti i documenti della rete nazionale
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={analizza} disabled={analizzando || regioni.length === 0}>
            {analizzando ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
            Analizza
          </Button>
          <Button size="sm" variant="outline" onClick={esporta} disabled={visibili.length === 0}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

      {analisi && (
        <div className="border rounded-xl p-4 bg-primary/5 border-primary/20">
          <p className="text-xs font-medium text-primary mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Lettura dei dati
          </p>
          <p className="text-sm whitespace-pre-wrap">{analisi}</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { v: totali.documenti, l: 'documenti' },
          { v: totali.aziende, l: 'aziende' },
          { v: `${Math.round(totali.quantita)} kg`, l: 'merce' },
          { v: new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totali.valore), l: 'valore stimato' },
        ].map((t) => (
          <div key={t.l} className="border rounded-xl p-3 bg-card">
            <p className="text-xl font-bold">{t.v}</p>
            <p className="text-xs text-muted-foreground">{t.l}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <div className="flex gap-1">
          {PERIODI.map((p) => (
            <Button key={p.id} size="sm" variant={periodo === p.id ? 'default' : 'outline'}
                    onClick={() => setPeriodo(p.id)}>{p.label}</Button>
          ))}
        </div>

        <Select value={regione} onValueChange={setRegione}>
          <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tutte">Tutte le regioni</SelectItem>
            {regioni.map((r) => <SelectItem key={r.chiave} value={r.nome}>{r.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={stato} onValueChange={setStato}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti gli stati</SelectItem>
            <SelectItem value="emesso">Emessi</SelectItem>
            <SelectItem value="cancelled">Annullati</SelectItem>
            <SelectItem value="annullato">Annullati</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 h-9" placeholder="Azienda, mercato o numero"
                 value={ricerca} onChange={(e) => setRicerca(e.target.value)} />
        </div>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : visibili.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">Nessun documento</p>
            <p className="text-sm text-muted-foreground mt-1">
              Nessun DDT corrisponde ai filtri scelti.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {visibili.map((d) => (
              <div key={d.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{d.numero_completo}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${COLORI[d.stato] ?? ''}`}>
                      {ETICHETTE_ADMIN[d.stato] ?? d.stato}
                    </span>
                  </div>
                  <p className="truncate mt-0.5">{d.mittente}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {d.mercato}{d.regione ? ` · ${d.regione}` : ''} ·{' '}
                    {format(new Date(d.data_documento), 'd MMM', { locale: it })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="tabular-nums">{Number(d.quantita).toFixed(0)} kg</p>
                  {Number(d.valore) > 0 && (
                    <p className="text-xs text-muted-foreground tabular-nums">
                      € {Number(d.valore).toFixed(0)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {visibili.length >= 300 && (
        <p className="text-xs text-muted-foreground">
          Mostrati i primi 300 documenti. Restringi il periodo o la regione per vederne altri.
        </p>
      )}
    </div>
  );
}
