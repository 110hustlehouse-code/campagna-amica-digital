import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPaymentsBySupplier, createPayment, updatePayment, deletePayment } from '@/api/suppliers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Edit2, Loader2, CreditCard, Calendar, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format, isPast, isToday } from 'date-fns';
import { it } from 'date-fns/locale';

const STATUS_CONFIG = {
  da_pagare: { label: 'Da pagare', color: 'bg-amber-100 text-amber-700', icon: Clock },
  pagato:    { label: 'Pagato',    color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  scaduto:   { label: 'Scaduto',  color: 'bg-destructive/10 text-destructive', icon: AlertCircle },
};

const METHODS = [
  { value: 'bonifico', label: '🏦 Bonifico' },
  { value: 'contanti', label: '💵 Contanti' },
  { value: 'assegno', label: '📄 Assegno' },
  { value: 'altro',   label: '📋 Altro' },
];

const emptyPayment = { description: '', amount: '', due_date: '', status: 'da_pagare', payment_method: 'bonifico', notes: '' };

export default function SupplierPaymentsPanel({ supplierId, companyId }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editPayment, setEditPayment] = useState(null);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['supplier-payments', supplierId],
    queryFn: () => getPaymentsBySupplier(supplierId),
    enabled: !!supplierId,
  });

  const saveMutation = useMutation({
    mutationFn: (p) => {
      const data = { ...p, supplier_id: supplierId, company_id: companyId, amount: parseFloat(p.amount) || 0 };
      return p.id ? updatePayment(p.id, data) : createPayment(data);
    },
    onSuccess: () => {
      qc.invalidateQueries(['supplier-payments', supplierId]);
      setEditPayment(null);
      toast({ title: 'Pagamento salvato!' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePayment,
    onSuccess: () => qc.invalidateQueries(['supplier-payments', supplierId]),
  });

  const togglePaid = (p) => {
    const newStatus = p.status === 'pagato' ? 'da_pagare' : 'pagato';
    updatePayment(p.id, { status: newStatus })
      .then(() => qc.invalidateQueries(['supplier-payments', supplierId]));
  };

  // Auto-mark as scaduto if past due and not paid
  const enrichedPayments = payments.map(p => {
    if (p.status === 'da_pagare' && p.due_date && isPast(new Date(p.due_date)) && !isToday(new Date(p.due_date))) {
      return { ...p, status: 'scaduto' };
    }
    return p;
  });

  const totale = enrichedPayments.filter(p => p.status !== 'pagato').reduce((s, p) => s + (p.amount || 0), 0);
  const scaduti = enrichedPayments.filter(p => p.status === 'scaduto').length;

  return (
    <div className="mt-3 border-t border-border/30 pt-3">
      {/* Sub-header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CreditCard className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-bold text-foreground">Pagamenti & Scadenze</span>
          {scaduti > 0 && (
            <span className="text-[10px] font-bold bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">
              {scaduti} scadut{scaduti > 1 ? 'i' : 'o'}
            </span>
          )}
        </div>
        <button
          onClick={() => setEditPayment({ ...emptyPayment })}
          className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Aggiungi
        </button>
      </div>

      {/* Summary */}
      {payments.length > 0 && totale > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-2 flex items-center justify-between">
          <span className="text-xs text-amber-700 font-medium">Totale da pagare</span>
          <span className="text-sm font-bold text-amber-700">€{totale.toFixed(2)}</span>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 text-primary animate-spin" /></div>
      ) : enrichedPayments.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-1">Nessun pagamento registrato</p>
      ) : (
        <div className="space-y-1.5">
          {enrichedPayments.map(p => {
            const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.da_pagare;
            const Icon = cfg.icon;
            return (
              <div key={p.id} className={`rounded-xl border px-3 py-2 flex items-center gap-2 ${p.status === 'pagato' ? 'opacity-60 border-border/30 bg-muted/20' : 'border-border/50 bg-white'}`}>
                <button onClick={() => togglePaid(p)} className="flex-shrink-0">
                  <Icon className={`w-4 h-4 ${p.status === 'pagato' ? 'text-emerald-500' : p.status === 'scaduto' ? 'text-destructive' : 'text-amber-500'}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${p.status === 'pagato' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {p.description}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs font-bold text-primary">€{p.amount?.toFixed(2)}</span>
                    {p.due_date && (
                      <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(p.due_date), 'd MMM yyyy', { locale: it })}
                      </span>
                    )}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                  </div>
                </div>
                <div className="flex gap-0.5 flex-shrink-0">
                  <button onClick={() => setEditPayment({ ...p })} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                    <Edit2 className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <button onClick={() => deleteMutation.mutate(p.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3 h-3 text-destructive/60" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      {editPayment && (
        <Dialog open onOpenChange={() => setEditPayment(null)}>
          <DialogContent className="max-w-sm mx-4 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg">
                {editPayment.id ? 'Modifica pagamento' : 'Nuovo pagamento'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Descrizione *"
                value={editPayment.description}
                onChange={e => setEditPayment(p => ({ ...p, description: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Importo (€)"
                  type="number"
                  value={editPayment.amount}
                  onChange={e => setEditPayment(p => ({ ...p, amount: e.target.value }))}
                />
                <Input
                  type="date"
                  value={editPayment.due_date}
                  onChange={e => setEditPayment(p => ({ ...p, due_date: e.target.value }))}
                />
              </div>
              <Select value={editPayment.status} onValueChange={v => setEditPayment(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue placeholder="Stato" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                    <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={editPayment.payment_method} onValueChange={v => setEditPayment(p => ({ ...p, payment_method: v }))}>
                <SelectTrigger><SelectValue placeholder="Metodo di pagamento" /></SelectTrigger>
                <SelectContent>
                  {METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                placeholder="Note"
                value={editPayment.notes || ''}
                onChange={e => setEditPayment(p => ({ ...p, notes: e.target.value }))}
              />
            </div>
            <DialogFooter className="gap-2 mt-1">
              <Button variant="outline" onClick={() => setEditPayment(null)}>Annulla</Button>
              <Button
                onClick={() => saveMutation.mutate(editPayment)}
                disabled={saveMutation.isPending || !editPayment.description || !editPayment.amount || !editPayment.due_date}
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}