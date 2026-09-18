// v2
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyCompany, getRegisteredCompanies } from '@/api/companies';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '@/api/suppliers';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Edit2, Loader2, Truck, Phone, Mail, User, ArrowLeft, Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import SupplierPaymentsPanel from '@/components/suppliers/SupplierPaymentsPanel';

const CATEGORIES = [
  { value: 'materie_prime', label: '🌾 Materie prime' },
  { value: 'packaging', label: '📦 Packaging' },
  { value: 'attrezzature', label: '🔧 Attrezzature' },
  { value: 'servizi', label: '🛠 Servizi' },
  { value: 'trasporti', label: '🚚 Trasporti' },
  { value: 'altro', label: '📋 Altro' },
];

const CATEGORY_COLORS = {
  materie_prime: 'bg-green-100 text-green-700',
  packaging: 'bg-blue-100 text-blue-700',
  attrezzature: 'bg-orange-100 text-orange-700',
  servizi: 'bg-purple-100 text-purple-700',
  trasporti: 'bg-amber-100 text-amber-700',
  altro: 'bg-muted text-muted-foreground',
};

const emptySupplier = { name: '', contact_name: '', phone: '', email: '', category: 'altro', notes: '' };

export default function ProducerSuppliers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [editSupplier, setEditSupplier] = useState(null);
  const [search, setSearch] = useState('');
  const [expandedPayments, setExpandedPayments] = useState({});
  const [companySearch, setCompanySearch] = useState('');

  const togglePayments = (id) => setExpandedPayments(prev => ({ ...prev, [id]: !prev[id] }));

  const { data: allCompanies = [] } = useQuery({
    queryKey: ['all-companies-suppliers'],
    queryFn: getRegisteredCompanies,
  });

  const { data: myCompany } = useQuery({
    queryKey: ['my-company', user?.email],
    queryFn: getMyCompany,
    enabled: !!user?.email,
  });

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['my-suppliers', myCompany?.id],
    queryFn: () => getSuppliers(myCompany.id),
    enabled: !!myCompany?.id,
  });

  const saveMutation = useMutation({
    mutationFn: (s) => {
      const data = { ...s, company_id: myCompany.id };
      return s.id ? updateSupplier(s.id, data) : createSupplier(data);
    },
    onSuccess: () => {
      qc.invalidateQueries(['my-suppliers']);
      setEditSupplier(null);
      toast({ title: 'Fornitore salvato!' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      qc.invalidateQueries(['my-suppliers']);
      toast({ title: 'Fornitore eliminato' });
    },
  });

  const filtered = suppliers.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.contact_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-primary/20 px-5 pt-12 pb-5">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/produttore/prodotti')}
            className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="font-heading text-2xl font-bold text-foreground">Fornitori</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{suppliers.length} fornitori registrati</p>
          </div>
          <Button onClick={() => setEditSupplier({ ...emptySupplier })} className="rounded-xl gap-1.5">
            <Plus className="w-4 h-4" /> Aggiungi
          </Button>
        </div>

        {/* Search */}
        {suppliers.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cerca fornitore..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-border bg-white text-sm outline-none focus:ring-1 focus:ring-primary"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-lg">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* List */}
      <div className="px-5 pt-4 pb-28 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Truck className="w-8 h-8 text-primary/40" />
            </div>
            <p className="font-semibold text-foreground">
              {suppliers.length === 0 ? 'Nessun fornitore ancora' : 'Nessun risultato'}
            </p>
            <p className="text-sm text-muted-foreground mt-1 mb-5">
              {suppliers.length === 0 ? 'Aggiungi i tuoi fornitori di fiducia' : 'Prova un altro termine di ricerca'}
            </p>
            {suppliers.length === 0 && (
              <Button onClick={() => setEditSupplier({ ...emptySupplier })} className="rounded-xl gap-1">
                <Plus className="w-4 h-4" /> Aggiungi fornitore
              </Button>
            )}
          </div>
        ) : (
          filtered.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden hover:shadow-md transition-all">
              <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/70 to-secondary" />
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-bold text-sm text-foreground">{s.name}</p>
                      {s.category && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${CATEGORY_COLORS[s.category]}`}>
                          {CATEGORIES.find(c => c.value === s.category)?.label.split(' ').slice(1).join(' ') || s.category}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {s.contact_name && (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <User className="w-3.5 h-3.5 flex-shrink-0" /> {s.contact_name}
                        </p>
                      )}
                      {s.phone && (
                        <a href={`tel:${s.phone}`} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                          <Phone className="w-3.5 h-3.5 flex-shrink-0" /> {s.phone}
                        </a>
                      )}
                      {s.email && (
                        <a href={`mailto:${s.email}`} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                          <Mail className="w-3.5 h-3.5 flex-shrink-0" /> {s.email}
                        </a>
                      )}
                      {s.notes && (
                        <p className="text-xs text-muted-foreground italic mt-1 line-clamp-2">{s.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditSupplier({ ...s })}
                      className="p-2 rounded-xl hover:bg-muted transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(s.id)}
                      className="p-2 rounded-xl hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-destructive/60" />
                    </button>
                    <button
                      onClick={() => togglePayments(s.id)}
                      className="p-2 rounded-xl hover:bg-muted transition-colors"
                    >
                      {expandedPayments[s.id]
                        ? <ChevronUp className="w-4 h-4 text-primary" />
                        : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      }
                    </button>
                  </div>
                </div>
                {expandedPayments[s.id] && (
                  <SupplierPaymentsPanel supplierId={s.id} companyId={myCompany?.id} />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dialog */}
      {editSupplier && (
        <Dialog open onOpenChange={() => setEditSupplier(null)}>
          <DialogContent className="max-w-md mx-4 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">
                {editSupplier.id ? 'Modifica fornitore' : 'Nuovo fornitore'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Nome azienda fornitrice *"
                value={editSupplier.name}
                onChange={e => setEditSupplier(p => ({ ...p, name: e.target.value }))}
              />
              <Input
                placeholder="Nome referente"
                value={editSupplier.contact_name || ''}
                onChange={e => setEditSupplier(p => ({ ...p, contact_name: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Telefono"
                  type="tel"
                  value={editSupplier.phone || ''}
                  onChange={e => setEditSupplier(p => ({ ...p, phone: e.target.value }))}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={editSupplier.email || ''}
                  onChange={e => setEditSupplier(p => ({ ...p, email: e.target.value }))}
                />
              </div>
              <Select value={editSupplier.category} onValueChange={v => { setEditSupplier(p => ({ ...p, category: v })); setCompanySearch(''); }}>
                <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>

              {/* Box ricerca aziende Coldiretti (solo per materie prime) */}
              {editSupplier.category === 'materie_prime' && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-green-800">🌾 Seleziona un'azienda Coldiretti come fornitore</p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Cerca tra le aziende..."
                      value={companySearch}
                      onChange={e => setCompanySearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-green-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-green-400"
                    />
                  </div>
                  {companySearch.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-green-200 bg-white divide-y divide-border">
                      {allCompanies
                        .filter(c =>
                          c.name?.toLowerCase().includes(companySearch.toLowerCase()) ||
                          c.city?.toLowerCase().includes(companySearch.toLowerCase())
                        )
                        .slice(0, 20)
                        .map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setEditSupplier(p => ({
                                ...p,
                                name: c.name,
                                email: p.email || c.email || '',
                                phone: p.phone || c.phone || '',
                              }));
                              setCompanySearch('');
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-green-50 transition-colors"
                          >
                            <p className="text-sm font-medium text-foreground">{c.name}</p>
                            {c.city && <p className="text-xs text-muted-foreground">{c.city}{c.region ? `, ${c.region}` : ''}</p>}
                          </button>
                        ))
                      }
                      {allCompanies.filter(c =>
                        c.name?.toLowerCase().includes(companySearch.toLowerCase()) ||
                        c.city?.toLowerCase().includes(companySearch.toLowerCase())
                      ).length === 0 && (
                        <p className="text-xs text-muted-foreground px-3 py-2">Nessuna azienda trovata</p>
                      )}
                    </div>
                  )}
                </div>
              )}
              <textarea
                placeholder="Note (es. condizioni, frequenza ordini...)"
                value={editSupplier.notes || ''}
                onChange={e => setEditSupplier(p => ({ ...p, notes: e.target.value }))}
                className="w-full rounded-xl border border-input px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring resize-none h-20"
              />
            </div>
            <DialogFooter className="gap-2 mt-1">
              <Button variant="outline" onClick={() => setEditSupplier(null)}>Annulla</Button>
              <Button
                onClick={() => saveMutation.mutate(editSupplier)}
                disabled={saveMutation.isPending || !editSupplier.name}
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