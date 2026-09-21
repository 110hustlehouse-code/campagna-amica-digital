import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { FileText, Loader2, Search, Package, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { getMyStaffMember } from '@/api/staff';
import { getDdtByMarket, getDdt, ETICHETTE_STATO, ETICHETTE_CAUSALE , numeroCompleto } from '@/api/ddt';

const COLORI_STATO = {
  bozza:      'bg-slate-100 text-slate-700 border-slate-200',
  emesso:     'bg-amber-50 text-amber-800 border-amber-200',
  cancelled: 'bg-red-50 text-red-800 border-red-200',
  annullato:  'bg-red-50 text-red-700 border-red-200',
};

export default function StaffDDT() {
  const [ricerca, setRicerca] = useState('');
  const [dettaglio, setDettaglio] = useState(null);

  const { data: staff } = useQuery({ queryKey: ['my-staff'], queryFn: getMyStaffMember });
  const marketId = staff?.market_id;

  // Dall'inizio del mese: è il periodo che interessa a chi gestisce il mercato.
  const dal = format(startOfMonth(new Date()), 'yyyy-MM-dd');

  const { data: documenti = [], isLoading } = useQuery({
    queryKey: ['ddt-mercato', marketId, dal],
    queryFn: () => getDdtByMarket(marketId, dal),
    enabled: !!marketId,
  });

  const visibili = useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    if (!q) return documenti;
    return documenti.filter((d) =>
      d.mittente_ragione_sociale?.toLowerCase().includes(q) ||
      numeroCompleto(d)?.toLowerCase().includes(q));
  }, [documenti, ricerca]);

  const metriche = useMemo(() => {
    const validi = documenti.filter((d) => d.status !== 'cancelled' && d.status !== 'draft');
    return {
      totale: validi.length,
      aziende: new Set(validi.map((d) => d.company_id)).size,
      consegnati: validi.filter((d) => d.signed_at).length,
    };
  }, [documenti]);

  const apri = async (id) => setDettaglio(await getDdt(id));

  if (!marketId) {
    return (
      <div className="p-8 text-center">
        <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Nessun mercato associato al tuo profilo.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto pb-24">
      <div className="mb-5">
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          Documenti di trasporto
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          La merce entrata nel mercato da inizio mese
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { valore: metriche.totale, etichetta: 'documenti' },
          { valore: metriche.aziende, etichetta: 'aziende' },
          { valore: metriche.consegnati, etichetta: 'firmati' },
        ].map((m) => (
          <div key={m.etichetta} className="border rounded-xl p-3 bg-card text-center">
            <p className="text-2xl font-bold text-primary">{m.valore}</p>
            <p className="text-xs text-muted-foreground">{m.etichetta}</p>
          </div>
        ))}
      </div>

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Cerca per azienda o numero"
               value={ricerca} onChange={(e) => setRicerca(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : visibili.length === 0 ? (
        <div className="text-center py-16 border rounded-2xl bg-muted/20">
          <TrendingUp className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Nessun documento questo mese</p>
          <p className="text-sm text-muted-foreground mt-1">
            Compariranno qui man mano che i produttori li emettono.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibili.map((d) => (
            <button key={d.id} onClick={() => apri(d.id)}
                    className="w-full text-left border rounded-xl p-4 bg-card hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">
                  {numeroCompleto(d) ? `DDT ${numeroCompleto(d)}` : 'Bozza'}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${COLORI_STATO[d.status]}`}>
                  {ETICHETTE_STATO[d.status]}
                </span>
              </div>
              <p className="text-sm mt-1">{d.mittente_ragione_sociale}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(d.issue_date), 'd MMMM', { locale: it })}
                {' · '}{ETICHETTE_CAUSALE[d.causale]}
                {d.numero_colli ? ` · ${d.numero_colli} colli` : ''}
                {d.peso_kg ? ` · ${d.peso_kg} kg` : ''}
              </p>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!dettaglio} onOpenChange={() => setDettaglio(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {dettaglio && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {numeroCompleto(dettaglio) ? `DDT ${numeroCompleto(dettaglio)}` : 'Bozza'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Mittente</p>
                  <p className="font-medium">{dettaglio.mittente_ragione_sociale}</p>
                  {dettaglio.mittente_partita_iva && (
                    <p className="text-xs text-muted-foreground">P.IVA {dettaglio.mittente_partita_iva}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Merce</p>
                  <div className="border rounded-lg divide-y">
                    {dettaglio.righe.map((r) => (
                      <div key={r.id} className="p-2.5 flex justify-between gap-3">
                        <span className="min-w-0 truncate">{r.descrizione}</span>
                        <span className="text-muted-foreground shrink-0">{r.quantity} {r.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {dettaglio.note && <p className="text-xs">{dettaglio.note}</p>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
