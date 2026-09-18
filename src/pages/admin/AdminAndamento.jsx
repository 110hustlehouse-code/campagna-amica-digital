import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, startOfYear } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  ChevronRight, Home, Loader2, Sparkles, AlertTriangle, Download,
} from 'lucide-react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { getTerritorio, livelloSuccessivo, ETICHETTA_LIVELLO } from '@/api/admin';
import { getSerieStorica, getMetricheOperative, getComposizione } from '@/api/analitica';
import { prevedi } from '@/api/previsioni';
import { invokeLLM } from '@/api/ai';

/* ------------------------------------------------------------------ colori
   Una sola grandezza per grafico, quindi una sola tinta: il verde del
   marchio. Lo storico e' pieno, la previsione tratteggiata, la banda di
   incertezza e' la stessa tinta al 12%. Nessuna scala doppia: misure di
   ordine diverso stanno su grafici diversi, mai sullo stesso asse. */
const VERDE = '#1E8549';
const VERDE_CHIARO = '#8CC9A5';
const GRIGIO = '#94A3B8';

/* ------------------------------------------------------------------ misure
   Le tre grandezze non si sommano fra loro e non hanno la stessa scala:
   gli ordini sono ricavi del produttore, la merce e' volume transitato,
   gli affitti sono ricavi del mercato. Si guardano una alla volta. */
const MISURE = [
  {
    id: 'ordini_valore', label: 'Ordini clienti', unita: 'euro',
    nota: 'Valore degli ordini ricevuti dai produttori tramite l’app.',
  },
  {
    id: 'merce_valore', label: 'Merce tracciata', unita: 'euro',
    nota: 'Valore della merce movimentata con DDT digitale.',
  },
  {
    id: 'affitti_valore', label: 'Affitti banco', unita: 'euro',
    nota: 'Incassi del mercato per la concessione dei banchi.',
  },
  {
    id: 'clienti_attivi', label: 'Clienti attivi', unita: 'numero',
    nota: 'Clienti distinti che hanno ordinato nel mese.',
  },
];

const ORIZZONTI = [
  { id: 3, label: '3 mesi' },
  { id: 6, label: '6 mesi' },
  { id: 12, label: '12 mesi' },
];

const COLORE_AFFIDABILITA = {
  insufficiente: 'bg-muted text-muted-foreground',
  indicativa: 'bg-amber-100 text-amber-900',
  discreta: 'bg-sky-100 text-sky-900',
  buona: 'bg-emerald-100 text-emerald-900',
  solida: 'bg-emerald-100 text-emerald-900',
};

function euro(n) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(n ?? 0);
}
function numero(n, dec = 0) {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: dec }).format(n ?? 0);
}
function meseBreve(iso) {
  try { return format(parseISO(iso), 'LLL yy', { locale: it }); } catch { return iso; }
}
function formatta(v, unita) {
  return unita === 'euro' ? euro(v) : numero(v);
}

/* ------------------------------------------------------------- tooltip */
function Tip({ active, payload, label, unita }) {
  if (!active || !payload?.length) return null;
  const p = Object.fromEntries(payload.map((x) => [x.dataKey, x.value]));
  const previsto = p.atteso != null;
  const banda = Array.isArray(p.banda) ? p.banda : null;
  return (
    <div className="rounded-lg border bg-card shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold mb-1">{meseBreve(label)}</p>
      {p.reale != null && (
        <p className="tabular-nums">Reale: <strong>{formatta(p.reale, unita)}</strong></p>
      )}
      {previsto && (
        <>
          <p className="tabular-nums">Atteso: <strong>{formatta(p.atteso, unita)}</strong></p>
          {banda && banda[0] !== banda[1] && (
            <p className="tabular-nums text-muted-foreground">
              fra {formatta(banda[0], unita)} e {formatta(banda[1], unita)}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function AdminAndamento() {
  const [percorso, setPercorso] = useState([
    { livello: 'italia', chiave: null, nome: 'Italia' },
  ]);
  const [misuraId, setMisuraId] = useState('merce_valore');
  const [orizzonte, setOrizzonte] = useState(3);
  const [analisi, setAnalisi] = useState(null);
  const [analizzando, setAnalizzando] = useState(false);

  const corrente = percorso[percorso.length - 1];
  const misura = MISURE.find((m) => m.id === misuraId);
  const sotto = livelloSuccessivo(corrente.livello);

  const dal = format(startOfYear(new Date()), 'yyyy-MM-dd');
  const al = format(new Date(), 'yyyy-MM-dd');

  const { data: serie = [], isLoading: caricaSerie } = useQuery({
    queryKey: ['serie', corrente.livello, corrente.chiave],
    queryFn: () => getSerieStorica(corrente.livello, corrente.chiave, 24),
  });

  const { data: metriche } = useQuery({
    queryKey: ['metriche-op', corrente.livello, corrente.chiave, dal, al],
    queryFn: () => getMetricheOperative(corrente.livello, corrente.chiave, { dal, al }),
  });

  const { data: composizione = [] } = useQuery({
    queryKey: ['composizione', corrente.livello, corrente.chiave, dal, al],
    queryFn: () => getComposizione(corrente.livello, corrente.chiave, { dal, al }),
  });

  const { data: figli = [] } = useQuery({
    queryKey: ['figli', corrente.livello, corrente.chiave],
    queryFn: () => getTerritorio(corrente.livello, corrente.chiave, { dal, al }),
    enabled: Boolean(sotto),
  });

  /* ------------------------------------------------------ modello */
  const previsione = useMemo(
    () => prevedi(serie.map((r) => ({ mese: r.mese, valore: Number(r[misuraId]) || 0 })), orizzonte),
    [serie, misuraId, orizzonte],
  );

  /* Storico e previsione su un unico asse temporale. Il punto di giunzione
     porta entrambi i valori, cosi' la linea tratteggiata parte dall'ultimo
     dato reale invece di staccarsi nel vuoto. */
  const datiGrafico = useMemo(() => {
    const tutti = serie.map((r) => ({ mese: r.mese, reale: Number(r[misuraId]) || 0 }));
    // I mesi a zero prima del primo dato non sono un andamento: sono il
    // periodo in cui il mercato non usava ancora l'app. Non si disegnano.
    const primo = tutti.findIndex((r) => r.reale > 0);
    const reali = primo > 0 ? tutti.slice(primo) : tutti;
    if (!previsione.punti.length) return reali;

    const ultimo = [...reali].reverse().find((r) => r.reale > 0);
    const giunzione = ultimo
      ? { ...ultimo, atteso: ultimo.reale, banda: [ultimo.reale, ultimo.reale] }
      : null;

    const futuri = previsione.punti.map((p) => ({
      mese: p.mese, atteso: p.atteso, banda: [p.minimo, p.massimo],
    }));

    return reali
      .map((r) => (giunzione && r.mese === giunzione.mese ? giunzione : r))
      .concat(futuri);
  }, [serie, misuraId, previsione]);

  const haDati = serie.some((r) => Number(r[misuraId]) > 0);

  const totaleStorico = serie.reduce((s, r) => s + (Number(r[misuraId]) || 0), 0);
  const totalePrevisto = previsione.punti.reduce((s, p) => s + p.atteso, 0);

  /* ------------------------------------------------------ navigazione */
  const scendi = (riga) => {
    if (!sotto) return;
    setPercorso([...percorso, { livello: sotto, chiave: riga.chiave, nome: riga.nome }]);
    setAnalisi(null);
  };
  const risali = (i) => { setPercorso(percorso.slice(0, i + 1)); setAnalisi(null); };

  /* ------------------------------------------------------ esportazione */
  const esporta = () => {
    const righe = [
      ['mese', 'tipo', misura.label],
      ...serie.map((r) => [r.mese, 'reale', Number(r[misuraId]) || 0]),
      ...previsione.punti.map((p) => [p.mese, 'previsto', p.atteso]),
    ];
    const csv = righe.map((r) => r.join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `andamento_${corrente.nome}_${misuraId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ------------------------------------------------------ AI
     Al modello vanno solo i totali mensili e le metriche aggregate.
     Mai un documento, mai un nome di cliente, mai un ordine singolo. */
  const chiediIdee = async () => {
    setAnalizzando(true);
    setAnalisi(null);
    try {
      const storico = serie
        .filter((r) => Number(r[misuraId]) > 0)
        .map((r) => `${meseBreve(r.mese)}: ${Math.round(Number(r[misuraId]))}`)
        .join(' · ') || 'nessun mese con dati';

      const attesi = previsione.punti.length
        ? previsione.punti.map((p) => `${meseBreve(p.mese)} ~${Math.round(p.atteso)}`).join(' · ')
        : 'previsione non disponibile';

      const top = composizione.slice(0, 6)
        .map((c) => `${c.tipo} ${c.etichetta}: ${Math.round(c.valore)}`)
        .join(' · ') || 'nessuna';

      const res = await invokeLLM({
        prompt: `Sei il consulente della rete dei mercati Campagna Amica.

TERRITORIO: ${corrente.nome} (livello ${corrente.livello})
MISURA: ${misura.label} (${misura.unita === 'euro' ? 'euro' : 'conteggio'})
STORICO MENSILE: ${storico}
PREVISIONE ${orizzonte} MESI: ${attesi}
AFFIDABILITA' DEL MODELLO: ${previsione.affidabilita} (${previsione.mesiUsati} mesi di dati reali)
COMPOSIZIONE (prime voci del periodo): ${top}
OPERATIVO: ${metriche ? [
  `${metriche.aziende_totali} aziende di cui ${metriche.aziende_dormienti} senza attivita'`,
  `${metriche.clienti_con_ordini} clienti con ordini, ${metriche.clienti_ricorrenti} ricorrenti`,
  `scontrino medio ${Math.round(metriche.scontrino_medio || 0)}`,
  `${metriche.bisogni_aperti} richieste produttori aperte`,
  `${metriche.affitti_non_saldati} affitti non saldati`,
].join(' · ') : 'non disponibile'}

Scrivi in italiano, per un dirigente, tre blocchi brevissimi con questi titoli esatti:

AMMINISTRAZIONE
DIVULGAZIONE
MARKETING

Sotto ogni titolo due righe al massimo, ciascuna con una azione concreta e verificabile, basata SOLO sui numeri qui sopra. Se i dati sono troppo pochi per una raccomandazione, dillo invece di inventarla. Niente premesse, niente elenchi puntati, niente chiusura.`,
      });
      setAnalisi(res.text ?? 'Nessun suggerimento disponibile.');
    } catch (e) {
      setAnalisi(`Suggerimenti non disponibili: ${e.message}`);
    } finally {
      setAnalizzando(false);
    }
  };

  const gruppiComp = useMemo(() => {
    const ordine = [
      { tipo: 'categoria', titolo: 'Per categoria di prodotto' },
      { tipo: 'azienda', titolo: 'Per azienda' },
      { tipo: 'mercato', titolo: 'Per mercato' },
    ];
    return ordine
      .map((g) => {
        const voci = composizione.filter((c) => c.tipo === g.tipo);
        return { ...g, voci, massimo: Math.max(1, ...voci.map((v) => Number(v.valore) || 0)) };
      })
      .filter((g) => g.voci.length > 0);
  }, [composizione]);

  const TESSERE = metriche ? [
    { v: numero(metriche.aziende_totali), l: 'aziende', sub: `${numero(metriche.aziende_dormienti)} senza attività` },
    { v: numero(metriche.clienti_con_ordini), l: 'clienti con ordini', sub: `${numero(metriche.clienti_ricorrenti)} ricorrenti` },
    { v: euro(metriche.scontrino_medio), l: 'scontrino medio', sub: `${numero(metriche.ordini_totali)} ordini` },
    { v: metriche.ddt_consegna_media_gg != null ? `${numero(metriche.ddt_consegna_media_gg, 1)} gg` : '—', l: 'consegna media DDT', sub: `${numero(metriche.bisogni_aperti)} richieste aperte` },
  ] : [];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold">Andamento e previsioni</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Serie storiche e proiezioni per territorio
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={chiediIdee} disabled={analizzando || !haDati}>
            {analizzando ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
            Idee operative
          </Button>
          <Button size="sm" variant="outline" onClick={esporta} disabled={!haDati}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------- territorio */}
      <div className="border rounded-xl bg-card px-4 py-3 flex items-center gap-1 flex-wrap text-sm">
        {percorso.map((p, i) => (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
            <button onClick={() => risali(i)}
                    className={i === percorso.length - 1 ? 'font-semibold' : 'text-muted-foreground hover:text-foreground'}>
              {i === 0
                ? <span className="flex items-center gap-1"><Home className="w-3.5 h-3.5" />Italia</span>
                : p.nome}
            </button>
          </React.Fragment>
        ))}
        {sotto && figli.length > 0 && (
          <select
            className="ml-auto text-xs border rounded-lg px-2 py-1 bg-background"
            value=""
            onChange={(e) => {
              const r = figli.find((f) => f.chiave === e.target.value);
              if (r) scendi(r);
            }}>
            <option value="">Scendi a {ETICHETTA_LIVELLO[corrente.livello]?.toLowerCase()}…</option>
            {figli.map((f) => (
              <option key={f.chiave} value={f.chiave}>{f.nome}</option>
            ))}
          </select>
        )}
      </div>

      {/* ------------------------------------------------- misura */}
      <div className="flex gap-1 flex-wrap">
        {MISURE.map((m) => (
          <Button key={m.id} size="sm"
                  variant={misuraId === m.id ? 'default' : 'outline'}
                  onClick={() => { setMisuraId(m.id); setAnalisi(null); }}>
            {m.label}
          </Button>
        ))}
      </div>

      {/* ------------------------------------------------- grafico */}
      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-sm">{misura.label} — {corrente.nome}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{misura.nota}</p>
          </div>
          <div className="flex gap-1">
            {ORIZZONTI.map((o) => (
              <button key={o.id} onClick={() => setOrizzonte(o.id)}
                      className={`px-2 py-1 rounded-md text-xs border transition-colors ${
                        orizzonte === o.id ? 'bg-primary/10 border-primary/30 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                      }`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {caricaSerie ? (
          <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : !haDati ? (
          <div className="px-4 py-14 text-center">
            <p className="text-sm text-muted-foreground">
              Nessun dato registrato per {corrente.nome} negli ultimi 24 mesi.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Le serie si popolano man mano che produttori, clienti e staff usano l’app.
            </p>
          </div>
        ) : (
          <>
            <div className="h-72 px-2 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={datiGrafico} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="mese" tickFormatter={meseBreve} tick={{ fontSize: 11, fill: GRIGIO }}
                         axisLine={false} tickLine={false} minTickGap={16} />
                  <YAxis tick={{ fontSize: 11, fill: GRIGIO }} axisLine={false} tickLine={false}
                         width={58}
                         tickFormatter={(v) => (misura.unita === 'euro'
                           ? new Intl.NumberFormat('it-IT', { notation: 'compact' }).format(v)
                           : numero(v))} />
                  <Tooltip content={<Tip unita={misura.unita} />} />

                  {/* Banda di incertezza come area a intervallo [min, max]:
                      una sola serie, non due sovrapposte, cosi' resta corretta
                      anche su fondo scuro. */}
                  <Area type="monotone" dataKey="banda" stroke="none"
                        fill={VERDE} fillOpacity={0.14} connectNulls
                        isAnimationActive={false} />

                  <Line type="monotone" dataKey="reale" stroke={VERDE} strokeWidth={2}
                        dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                        connectNulls={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="atteso" stroke={VERDE} strokeWidth={2}
                        strokeDasharray="5 4" dot={{ r: 3, fill: VERDE, strokeWidth: 0 }}
                        connectNulls isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="px-4 pb-3 pt-1 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 rounded" style={{ background: VERDE }} /> dati reali
              </span>
              {previsione.punti.length > 0 && (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 rounded" style={{ backgroundImage: `repeating-linear-gradient(90deg, ${VERDE} 0 4px, transparent 4px 7px)` }} /> previsione
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-2.5 rounded-sm" style={{ background: VERDE_CHIARO, opacity: 0.45 }} /> intervallo probabile
                  </span>
                </>
              )}
            </div>
          </>
        )}

        {/* --------------------------------------------- affidabilità */}
        {haDati && (
          <div className="border-t px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${COLORE_AFFIDABILITA[previsione.affidabilita]}`}>
                previsione {previsione.affidabilita}
              </span>
              {previsione.variazioneAttesa != null && (
                <span className="text-xs text-muted-foreground">
                  attesa{' '}
                  <strong className={previsione.variazioneAttesa >= 0 ? 'text-emerald-700' : 'text-amber-700'}>
                    {previsione.variazioneAttesa > 0 ? '+' : ''}{previsione.variazioneAttesa}%
                  </strong>{' '}
                  sul periodo precedente
                </span>
              )}
              {previsione.stagionalita && (
                <span className="text-xs text-muted-foreground">· stagionalità applicata</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{previsione.spiegazione}</p>
            {previsione.punti.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Totale storico {formatta(totaleStorico, misura.unita)} · atteso nei prossimi{' '}
                {orizzonte} mesi {formatta(totalePrevisto, misura.unita)}.
              </p>
            )}
            {previsione.affidabilita === 'insufficiente' && (
              <p className="text-xs flex items-start gap-1.5 text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                Servono almeno tre mesi di dati reali prima di poter proiettare. Finché non ci sono,
                questa sezione mostra solo lo storico: un numero inventato è peggio di nessun numero.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------- metriche */}
      {TESSERE.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {TESSERE.map((t) => (
            <div key={t.l} className="border rounded-xl p-4 bg-card">
              <p className="text-2xl font-bold tabular-nums">{t.v}</p>
              <p className="text-xs text-muted-foreground">{t.l}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">{t.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------------- composizione */}
      {gruppiComp.length > 0 && (
        <div className="border rounded-xl bg-card overflow-hidden">
          <div className="px-4 py-3 border-b">
            <p className="font-semibold text-sm">Da dove arriva il valore</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Periodo dal {format(parseISO(dal), 'd MMMM', { locale: it })} a oggi.
              Ogni classifica ha la propria scala: i totali di categoria, azienda
              e mercato non sono confrontabili fra loro.
            </p>
          </div>
          <div className="divide-y">
            {gruppiComp.map((g) => (
              <div key={g.tipo} className="p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {g.titolo}
                </p>
                {g.voci.map((c) => (
                  <div key={c.etichetta} className="flex items-center gap-3 text-sm">
                    <span className="w-44 shrink-0 truncate" title={c.etichetta}>{c.etichetta}</span>
                    <span className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
                      <span className="block h-full rounded-sm"
                            style={{
                              width: `${Math.max(2, (Number(c.valore) / g.massimo) * 100)}%`,
                              background: VERDE,
                            }} />
                    </span>
                    <span className="w-24 text-right tabular-nums text-xs">{euro(c.valore)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------- AI */}
      {analisi && (
        <div className="border rounded-xl p-4 bg-primary/5 border-primary/20">
          <p className="text-xs font-medium text-primary mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Idee su amministrazione, divulgazione e marketing
          </p>
          <p className="text-sm whitespace-pre-wrap">{analisi}</p>
          <p className="text-xs text-muted-foreground mt-3">
            Suggerimenti generati dai soli dati aggregati mostrati in questa pagina.
            Nessun documento, ordine o nominativo viene inviato al modello.
          </p>
        </div>
      )}
    </div>
  );
}
