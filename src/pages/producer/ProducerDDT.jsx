import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  FileText, Plus, Trash2, Send, CheckCircle2, XCircle, Loader2, Printer, Package,
} from 'lucide-react';
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
  getDdtByCompany, getDdt, creaBozzaDdt, emettiDdt, annullaDdt, segnaConsegnato,
  ETICHETTE_STATO, ETICHETTE_CAUSALE,
} from '@/api/ddt';

const COLORI_STATO = {
  bozza:      'bg-slate-100 text-slate-700 border-slate-200',
  emesso:     'bg-amber-50 text-amber-800 border-amber-200',
  consegnato: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  annullato:  'bg-red-50 text-red-700 border-red-200',
};

const RIGA_VUOTA = { product_id: '', descrizione: '', quantita: '', unita: 'kg', prezzo_unitario: '' };

export default function ProducerDDT() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [nuovo, setNuovo] = useState(false);
  const [dettaglio, setDettaglio] = useState(null);
  const [annullamento, setAnnullamento] = useState(null);
  const [motivo, setMotivo] = useState('');

  const [testata, setTestata] = useState({
    market_id: '', causale: 'trasferimento', trasporto_a_cura_di: 'mittente',
    numero_colli: '', peso_kg: '', note: '',
  });
  const [righe, setRighe] = useState([{ ...RIGA_VUOTA }]);

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

  // I mercati in cui l'azienda è presente: sono le destinazioni abituali.
  const mieiMercati = mercati.filter((m) => (azienda?.market_ids || []).includes(m.id));

  const creaMutation = useMutation({
    mutationFn: async () => {
      const mercato = mercati.find((m) => m.id === testata.market_id);
      const valide = righe.filter((r) => r.descrizione.trim() && Number(r.quantita) > 0);
      if (valide.length === 0) throw new Error('Aggiungi almeno una riga con descrizione e quantità');

      return creaBozzaDdt(
        {
          company_id: azienda.id,
          mittente_ragione_sociale: azienda.ragione_sociale || azienda.name,
          mittente_partita_iva: azienda.partita_iva || null,
          mittente_codice_fiscale: azienda.codice_fiscale || null,
          mittente_indirizzo: azienda.sede_indirizzo || null,
          destinatario_tipo: 'mercato',
          market_id: testata.market_id,
          destinatario_denominazione: mercato?.name || 'Mercato',
          destinatario_indirizzo: mercato?.address || null,
          causale: testata.causale,
          trasporto_a_cura_di: testata.trasporto_a_cura_di,
          numero_colli: testata.numero_colli ? Number(testata.numero_colli) : null,
          peso_kg: testata.peso_kg ? Number(testata.peso_kg) : null,
          note: testata.note || null,
        },
        valide.map((r) => ({
          product_id: r.product_id || null,
          descrizione: r.descrizione.trim(),
          quantita: Number(r.quantita),
          unita: r.unita,
          prezzo_unitario: r.prezzo_unitario ? Number(r.prezzo_unitario) : null,
        })),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ddt'] });
      setNuovo(false);
      setRighe([{ ...RIGA_VUOTA }]);
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
        title: `DDT ${d.numero_completo} emesso`,
        description: 'Il documento non è più modificabile.',
      });
    },
    onError: (e) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  const consegnaMutation = useMutation({
    mutationFn: (id) => segnaConsegnato(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ddt'] });
      toast({ title: 'Segnato come consegnato' });
    },
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

  const aggiornaRiga = (i, campo, valore) => {
    setRighe((r) => r.map((riga, idx) => {
      if (idx !== i) return riga;
      if (campo === 'product_id') {
        const p = prodotti.find((x) => x.id === valore);
        return p
          ? { ...riga, product_id: valore, descrizione: p.name, unita: p.unit || 'kg', prezzo_unitario: p.price ?? '' }
          : { ...riga, product_id: '' };
      }
      return { ...riga, [campo]: valore };
    }));
  };

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
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Documenti di trasporto
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Accompagnano la merce dall'azienda al banco
          </p>
        </div>
        <Button onClick={() => setNuovo(true)} className="shrink-0">
          <Plus className="w-4 h-4 mr-1" /> Nuovo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : documenti.length === 0 ? (
        <div className="text-center py-16 border rounded-2xl bg-muted/20">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Nessun documento</p>
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
                      {d.numero_completo ? `DDT ${d.numero_completo}` : 'Bozza'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${COLORI_STATO[d.stato]}`}>
                      {ETICHETTE_STATO[d.stato]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {d.destinatario_denominazione} · {format(new Date(d.data_documento), 'd MMMM yyyy', { locale: it })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ETICHETTE_CAUSALE[d.causale]}
                  </p>
                </button>

                <div className="flex flex-col gap-1.5 shrink-0">
                  {d.stato === 'bozza' && (
                    <Button size="sm" onClick={() => emettiMutation.mutate(d.id)}
                            disabled={emettiMutation.isPending}>
                      <Send className="w-3.5 h-3.5 mr-1" /> Emetti
                    </Button>
                  )}
                  {d.stato === 'emesso' && (
                    <Button size="sm" variant="outline" onClick={() => consegnaMutation.mutate(d.id)}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Consegnato
                    </Button>
                  )}
                  {(d.stato === 'emesso' || d.stato === 'consegnato') && (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Destinazione</Label>
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
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Merce trasportata</Label>
                <Button size="sm" variant="outline"
                        onClick={() => setRighe([...righe, { ...RIGA_VUOTA }])}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Riga
                </Button>
              </div>

              <div className="space-y-2">
                {righe.map((r, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                    <div className="flex gap-2">
                      <Select value={r.product_id} onValueChange={(v) => aggiornaRiga(i, 'product_id', v)}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Dal catalogo, o scrivi sotto" />
                        </SelectTrigger>
                        <SelectContent>
                          {prodotti.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {righe.length > 1 && (
                        <Button size="icon" variant="ghost"
                                onClick={() => setRighe(righe.filter((_, idx) => idx !== i))}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    <Input placeholder="Descrizione della merce"
                           value={r.descrizione}
                           onChange={(e) => aggiornaRiga(i, 'descrizione', e.target.value)} />

                    <div className="grid grid-cols-3 gap-2">
                      <Input type="number" step="0.001" placeholder="Quantità"
                             value={r.quantita}
                             onChange={(e) => aggiornaRiga(i, 'quantita', e.target.value)} />
                      <Select value={r.unita} onValueChange={(v) => aggiornaRiga(i, 'unita', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['kg', 'lt', 'pz', 'confezione'].map((u) => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input type="number" step="0.01" placeholder="€ unitario"
                             value={r.prezzo_unitario}
                             onChange={(e) => aggiornaRiga(i, 'prezzo_unitario', e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
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

            <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
              Il documento nasce come bozza e resta modificabile. Il numero
              progressivo viene assegnato al momento dell'emissione: da lì
              non è più modificabile, si può solo annullare e riemettere.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNuovo(false)}>Annulla</Button>
            <Button onClick={() => creaMutation.mutate()}
                    disabled={!testata.market_id || creaMutation.isPending}>
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
                  {dettaglio.numero_completo ? `DDT ${dettaglio.numero_completo}` : 'Bozza'}
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
                    <p className="font-medium">{dettaglio.destinatario_denominazione}</p>
                    {dettaglio.destinatario_indirizzo && (
                      <p className="text-xs text-muted-foreground">{dettaglio.destinatario_indirizzo}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Data</p>
                    <p>{format(new Date(dettaglio.data_documento), 'd MMMM yyyy', { locale: it })}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Causale</p>
                    <p>{ETICHETTE_CAUSALE[dettaglio.causale]}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Merce</p>
                  <div className="border rounded-lg divide-y">
                    {dettaglio.righe.map((r) => (
                      <div key={r.id} className="p-2.5 flex justify-between gap-3">
                        <span className="min-w-0 truncate">{r.descrizione}</span>
                        <span className="text-muted-foreground shrink-0">
                          {r.quantita} {r.unita}
                          {r.prezzo_unitario ? ` · € ${Number(r.importo).toFixed(2)}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {(dettaglio.numero_colli || dettaglio.peso_kg) && (
                  <p className="text-xs text-muted-foreground">
                    {dettaglio.numero_colli ? `${dettaglio.numero_colli} colli` : ''}
                    {dettaglio.numero_colli && dettaglio.peso_kg ? ' · ' : ''}
                    {dettaglio.peso_kg ? `${dettaglio.peso_kg} kg` : ''}
                  </p>
                )}

                {dettaglio.note && <p className="text-xs">{dettaglio.note}</p>}

                {dettaglio.stato === 'annullato' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-red-800">Documento annullato</p>
                    {dettaglio.motivo_annullamento && (
                      <p className="text-xs text-red-700 mt-0.5">{dettaglio.motivo_annullamento}</p>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter>
                {dettaglio.stato !== 'bozza' && (
                  <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="w-4 h-4 mr-1" /> Stampa
                  </Button>
                )}
                <Button onClick={() => setDettaglio(null)}>Chiudi</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------- annullamento */}
      <Dialog open={!!annullamento} onOpenChange={() => setAnnullamento(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Annullare il documento?</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Un DDT emesso non si modifica: si annulla e se ne emette uno nuovo.
              Il documento annullato resta negli archivi, come previsto.
            </p>
            <div className="space-y-1.5">
              <Label>Motivo dell'annullamento</Label>
              <Textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Es. quantità errata" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnnullamento(null)}>Torna indietro</Button>
            <Button variant="destructive" disabled={!motivo.trim() || annullaMutation.isPending}
                    onClick={() => annullaMutation.mutate({ id: annullamento.id, motivo })}>
              Annulla il DDT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
