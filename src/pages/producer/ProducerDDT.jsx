import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  FileText, Plus, Trash2, Send, CheckCircle2, XCircle, Loader2, Printer, Package,
  ArrowLeft, ChevronDown, ChevronUp, RotateCcw, Sparkles, Search, X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { getMyCompany } from '@/api/companies';
import { getMarkets } from '@/api/markets';
import { getProductsByCompany } from '@/api/products';
import {
  getDdtByCompany, getDdt, getUltimoDdt, creaBozzaDdt, emettiDdt, annullaDdt, firmaDdt, numeroCompleto,
  ETICHETTE_STATO, ETICHETTE_CAUSALE,
} from '@/api/ddt';

const COLORI_STATO = {
  bozza:      'bg-slate-100 text-slate-700 border-slate-200',
  emesso:     'bg-amber-50 text-amber-800 border-amber-200',
  consegnato: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  annullato:  'bg-red-50 text-red-700 border-red-200',
};

export default function ProducerDDT() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [nuovo, setNuovo] = useState(false);
  const [dettaglio, setDettaglio] = useState(null);
  const [annullamento, setAnnullamento] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [mostraAvanzate, setMostraAvanzate] = useState(false);
  const [righeAvanzateAperte, setRigheAvanzateAperte] = useState({});

  const [testata, setTestata] = useState({
    market_id: '', market_event_id: '', causale: 'trasferimento_interno', trasporto_a_mezzo: 'mittente',
    numero_colli: '', peso_kg: '', note: '',
  });
  const [ricercaProdotti, setRicercaProdotti] = useState('');
  // Mappa product_id -> { quantity, unit, lot, expiry_date }. Solo i
  // prodotti con una quantità inserita finiscono nel DDT: il produttore
  // scorre il proprio catalogo e tocca solo quello che porta oggi,
  // invece di aggiungere righe una per una da un menu.
  const [quantita, setQuantita] = useState({});

  const { data: azienda } = useQuery({ queryKey: ['my-company'], queryFn: getMyCompany });
  const { data: mercati = [] } = useQuery({ queryKey: ['markets'], queryFn: getMarkets });
  const { data: prodotti = [] } = useQuery({
    queryKey: ['my-products', azienda?.id],
    queryFn: () => getProductsByCompany(azienda.id),
    enabled: !!azienda?.id,
  });
  const { data: documenti = [], isLoading } = useQuery({
    queryKey: ['ddt', azienda?.id],
    queryFn: () => getDdtByCompany(azienda.id),
    enabled: !!azienda?.id,
  });

  const mieiMercati = mercati.filter((m) => (azienda?.market_ids || []).includes(m.id));

  const { data: ultimoDdt } = useQuery({
    queryKey: ['ultimo-ddt', azienda?.id, testata.market_id],
    queryFn: () => getUltimoDdt(azienda.id, testata.market_id),
    enabled: !!azienda?.id && !!testata.market_id && nuovo,
  });

  const impostaQuantita = (productId, campo, valore) => {
    setQuantita((q) => ({
      ...q,
      [productId]: { ...(q[productId] || { quantity: '', unit: 'kg', lot: '', expiry_date: '' }), [campo]: valore },
    }));
  };

  const ripetiUltimo = () => {
    if (!ultimoDdt) return;
    const nuove = {};
    for (const r of ultimoDdt.righe) {
      if (!r.product_id) continue;
      nuove[r.product_id] = {
        quantity: String(r.quantity ?? ''),
        unit: r.unit || 'kg',
        lot: r.lot || '',
        expiry_date: r.expiry_date || '',
      };
    }
    setQuantita(nuove);
    toast({ title: 'Quantità precompilate dall\'ultimo DDT', description: 'Controlla e correggi dove serve.' });
  };

  const apriNuovo = () => {
    setQuantita({});
    setMostraAvanzate(false);
    setRigheAvanzateAperte({});
    setNuovo(true);
  };

  const creaMutation = useMutation({
    mutationFn: async () => {
      const mercato = mercati.find((m) => m.id === testata.market_id);
      const valide = Object.entries(quantita).filter(([, v]) => Number(v.quantity) > 0);
      if (valide.length === 0) throw new Error('Indica la quantità di almeno un prodotto');

      const oggi = new Date().toISOString().slice(0, 10);

      return creaBozzaDdt(
        {
          company_id: azienda.id,
          market_id: testata.market_id,
          market_event_id: testata.market_event_id || null,
          issue_date: oggi,
          transport_date: oggi,
          recipient_name: mercato?.name || 'Mercato',
          recipient_address: mercato?.address || null,
          recipient_city: mercato?.city || null,
          causale: testata.causale,
          trasporto_a_mezzo: testata.trasporto_a_mezzo,
          numero_colli: testata.numero_colli ? Number(testata.numero_colli) : null,
          peso_totale_kg: testata.peso_kg ? Number(testata.peso_kg) : null,
          signature_required: true,
          annotazioni: testata.note || null,
        },
        valide.map(([productId, v]) => {
          const prodotto = prodotti.find((p) => p.id === productId);
          return {
            product_id: productId,
            product_name: prodotto?.name || '',
            quantity: Number(v.quantity),
            unit: v.unit,
            lot: v.lot?.trim() || null,
            expiry_date: v.expiry_date || null,
          };
        }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ddt'] });
      setNuovo(false);
      setQuantita({});
      setTestata((t) => ({ ...t, numero_colli: '', peso_kg: '', note: '' }));
      toast({ title: 'Bozza creata', description: 'Puoi modificarla finché non la emetti.' });
    },
    onError: (e) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  const emettiMutation = useMutation({
    mutationFn: emettiDdt,
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['ddt'] });
      toast({
        title: `DDT ${numeroCompleto(d)} emesso`,
        description: 'Il documento non è più modificabile.',
      });
    },
    onError: (e) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  const firmaMutation = useMutation({
    mutationFn: (id) => firmaDdt(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ddt'] });
      toast({ title: 'Ricevuta firmata' });
    },
    onError: (e) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  const annullaMutation = useMutation({
    mutationFn: ({ id, motivo }) => annullaDdt(id, motivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ddt'] });
      setAnnullamento(null);
      setMotivo('');
      toast({ title: 'DDT annullato' });
    },
    onError: (e) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  const apriDettaglio = async (id) => setDettaglio(await getDdt(id));

  const toggleRigaAvanzata = (id) => setRigheAvanzateAperte((p) => ({ ...p, [id]: !p[id] }));

  const numProdottiSelezionati = Object.values(quantita).filter((v) => Number(v.quantity) > 0).length;

  if (!azienda) {
    return (
      <div className="p-8 text-center">
        <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Completa prima il profilo della tua azienda.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/produttore/prodotti')}
            className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="min-w-0">
            <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary shrink-0" />
              Documenti di trasporto
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Accompagnano la merce dall'azienda al banco
            </p>
          </div>
        </div>
        <Button onClick={apriNuovo} className="shrink-0">
          <Plus className="w-4 h-4 mr-1" /> Nuovo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : documenti.length === 0 ? (
        <div className="text-center py-16 border rounded-2xl bg-muted/20">
          <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Nessun DDT ancora</p>
          <p className="text-sm text-muted-foreground mt-1">
            Il primo DDT si crea quando porti la merce al mercato.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documenti.map((d) => (
            <div key={d.id} className="border rounded-xl p-4 bg-card hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => apriDettaglio(d.id)} className="text-left flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">
                      {numeroCompleto(d) ? `DDT ${numeroCompleto(d)}` : 'Bozza'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${COLORI_STATO[d.status]}`}>
                      {ETICHETTE_STATO[d.status]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {d.recipient_name} · {format(new Date(d.issue_date), 'd MMMM yyyy', { locale: it })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ETICHETTE_CAUSALE[d.causale]}
                  </p>
                </button>

                <div className="flex flex-col gap-1.5 shrink-0">
                  {d.status === 'draft' && (
                    <Button size="sm" onClick={() => emettiMutation.mutate(d.id)}
                            disabled={emettiMutation.isPending}>
                      <Send className="w-3.5 h-3.5 mr-1" /> Emetti
                    </Button>
                  )}
                  {d.status === 'issued' && (
                    <Button size="sm" variant="outline" onClick={() => firmaMutation.mutate(d.id)}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Consegnato
                    </Button>
                  )}
                  {d.status === 'issued' && (
                    <Button size="sm" variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setAnnullamento(d)}>
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Annulla
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------------ nuovo documento */}
      <Dialog open={nuovo} onOpenChange={setNuovo}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuovo documento di trasporto</DialogTitle></DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Mercato</Label>
              <Select value={testata.market_id}
                      onValueChange={(v) => setTestata({ ...testata, market_id: v })}>
                <SelectTrigger><SelectValue placeholder="Scegli il mercato" /></SelectTrigger>
                <SelectContent>
                  {(mieiMercati.length ? mieiMercati : mercati).map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {ultimoDdt && (
              <button
                type="button"
                onClick={ripetiUltimo}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-primary/30 bg-primary/5 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Ripeti l'ultimo DDT per questo mercato
              </button>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Cosa porti oggi</Label>
                {numProdottiSelezionati > 0 && (
                  <span className="text-xs font-semibold text-primary">
                    {numProdottiSelezionati} {numProdottiSelezionati === 1 ? 'prodotto' : 'prodotti'} selezionati
                  </span>
                )}
              </div>

              {prodotti.length === 0 ? (
                <p className="text-sm text-muted-foreground bg-muted/30 rounded-xl p-4 text-center">
                  Non hai ancora prodotti nel catalogo. Aggiungili prima da Prodotti.
                </p>
              ) : (
                <>
                  {prodotti.length > 5 && (
                    <div className="relative mb-2">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Cerca un prodotto..."
                        value={ricercaProdotti}
                        onChange={(e) => setRicercaProdotti(e.target.value)}
                        className="pl-9 pr-8 h-9"
                      />
                      {ricercaProdotti && (
                        <button type="button" onClick={() => setRicercaProdotti('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded">
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  )}
                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {prodotti
                    .filter((p) => p.name?.toLowerCase().includes(ricercaProdotti.toLowerCase()))
                    .map((p) => {
                    const v = quantita[p.id] || { quantity: '', unit: p.unit || 'kg', lot: '', expiry_date: '' };
                    const attivo = Number(v.quantity) > 0;
                    const avanzataAperta = righeAvanzateAperte[p.id];
                    return (
                      <div key={p.id}
                           className={`rounded-xl border transition-colors ${attivo ? 'border-primary/40 bg-primary/5' : 'border-border/50 bg-card'}`}>
                        <div className="p-2.5 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`flex-1 text-sm truncate ${attivo ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                              {p.name}
                            </span>
                            <Input
                              type="number" step="0.001" placeholder="0"
                              value={v.quantity}
                              onChange={(e) => impostaQuantita(p.id, 'quantity', e.target.value)}
                              className="w-20 h-9 text-center"
                            />
                            <Select value={v.unit} onValueChange={(val) => impostaQuantita(p.id, 'unit', val)}>
                              <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {['kg', 'lt', 'pz', 'confezione'].map((u) => (
                                  <SelectItem key={u} value={u}>{u}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {attivo && (
                              <button type="button" onClick={() => toggleRigaAvanzata(p.id)}
                                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted shrink-0">
                                {avanzataAperta ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                              </button>
                            )}
                          </div>
                          <div className="flex gap-1.5 flex-wrap">
                            {(v.unit === 'pz' || v.unit === 'confezione' ? [5, 10, 20, 50] : [1, 5, 10, 20]).map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => impostaQuantita(p.id, 'quantity', String(n))}
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                  String(v.quantity) === String(n)
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-white text-muted-foreground border-border hover:border-primary/50'
                                }`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                        {attivo && avanzataAperta && (
                          <div className="grid grid-cols-2 gap-2 px-2.5 pb-2.5">
                            <Input placeholder="Lotto" value={v.lot}
                                   onChange={(e) => impostaQuantita(p.id, 'lot', e.target.value)}
                                   className="h-9" />
                            <Input type="date" value={v.expiry_date}
                                   onChange={(e) => impostaQuantita(p.id, 'expiry_date', e.target.value)}
                                   className="h-9" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMostraAvanzate((v) => !v)}
              className="w-full flex items-center justify-between py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Dettagli avanzati (causale, colli, peso, note)</span>
              {mostraAvanzate ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {mostraAvanzate && (
              <div className="space-y-3 border-t pt-3">
                <div className="space-y-1.5">
                  <Label>Causale del trasporto</Label>
                  <Select value={testata.causale}
                          onValueChange={(v) => setTestata({ ...testata, causale: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ETICHETTE_CAUSALE).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Numero colli</Label>
                    <Input type="number" value={testata.numero_colli}
                           onChange={(e) => setTestata({ ...testata, numero_colli: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Peso totale (kg)</Label>
                    <Input type="number" step="0.1" value={testata.peso_kg}
                           onChange={(e) => setTestata({ ...testata, peso_kg: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Note</Label>
                  <Textarea rows={2} value={testata.note}
                            onChange={(e) => setTestata({ ...testata, note: e.target.value })} />
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
              Il documento nasce come bozza e resta modificabile. Il numero
              progressivo viene assegnato al momento dell'emissione: da lì
              non è più modificabile, si può solo annullare e riemettere.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNuovo(false)}>Annulla</Button>
            <Button onClick={() => creaMutation.mutate()}
                    disabled={!testata.market_id || numProdottiSelezionati === 0 || creaMutation.isPending}>
              {creaMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Crea bozza
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------- dettaglio */}
      <Dialog open={!!dettaglio} onOpenChange={() => setDettaglio(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {dettaglio && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {numeroCompleto(dettaglio) ? `DDT ${numeroCompleto(dettaglio)}` : 'Bozza'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 text-sm" id="ddt-stampa">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Mittente</p>
                    <p className="font-medium">{dettaglio.mittente_ragione_sociale}</p>
                    {dettaglio.mittente_partita_iva && (
                      <p className="text-xs text-muted-foreground">P.IVA {dettaglio.mittente_partita_iva}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Destinatario</p>
                    <p className="font-medium">{dettaglio.recipient_name}</p>
                    {dettaglio.recipient_city && (
                      <p className="text-xs text-muted-foreground">{dettaglio.recipient_city}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Causale</p>
                    <p className="font-medium">{ETICHETTE_CAUSALE[dettaglio.causale]}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Data</p>
                    <p className="font-medium">{format(new Date(dettaglio.issue_date), 'd MMMM yyyy', { locale: it })}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Merce trasportata</p>
                  <div className="space-y-1.5">
                    {dettaglio.righe.map((r) => (
                      <div key={r.id} className="flex items-center justify-between border-b pb-1.5 last:border-0">
                        <span>{r.product_name}</span>
                        <span className="font-medium">{r.quantity} {r.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {dettaglio.annotazioni && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Note</p>
                    <p>{dettaglio.annotazioni}</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => window.print()} className="gap-1.5">
                  <Printer className="w-4 h-4" /> Stampa
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------- annullamento */}
      <Dialog open={!!annullamento} onOpenChange={() => setAnnullamento(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Annulla DDT</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              L'annullamento è irreversibile e resta tracciato. Indica il motivo.
            </p>
            <Textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Es. errore di battitura, merce non consegnata..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnnullamento(null)}>Indietro</Button>
            <Button variant="destructive"
                    onClick={() => annullaMutation.mutate({ id: annullamento.id, motivo })}
                    disabled={!motivo.trim() || annullaMutation.isPending}>
              {annullaMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Conferma annullamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}