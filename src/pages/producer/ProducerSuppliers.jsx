// v3 — fornitori vincolati a due sole tipologie
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyCompany, getRegisteredCompanies } from '@/api/companies';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '@/api/suppliers';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Edit2, Loader2, Truck, Phone, Mail, Building2, Package, ArrowLeft, Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import SupplierPaymentsPanel from '@/components/suppliers/SupplierPaymentsPanel';

const TIPO_LABEL = {
  azienda_circuito: { label: 'Azienda del circuito', icon: Building2, color: 'bg-green-100 text-green-700' },
  buste_campagna_amica: { label: 'Buste Campagna Amica', icon: Package, color: 'bg-blue-100 text-blue-700' },
};

const emptySupplier = {
  supplier_type: '', supplier_company_id: null, name: '', bag_size: '',
  contact_name: '', phone: '', email: '', notes: '',
};

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

  const { data: myCompany } = useQuery({
    queryKey: ['my-company', user?.email],
    queryFn: getMyCompany,
    enabled: !!user?.email,
  });

  const { data: allCompanies = [] } = useQuery({
    queryKey: ['all-companies-suppliers'],
    queryFn: getRegisteredCompanies,
  });

  const aziendeSelezionabili = allCompanies.filter(c => c.id !== myCompany?.id);

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
      setCompanySearch('');
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

  const puoSalvare = editSupplier && (
    (editSupplier.supplier_type === 'azienda_circuito' && !!editSupplier.supplier_company_id) ||
    (editSupplier.supplier_type === 'buste_campagna_amica' && !!editSupplier.bag_size)
  );

  const sceglAzienda = (c) => {
    setEditSupplier(p => ({
      ...p,
      supplier_company_id: c.id,
      name: c.name,
      email: c.email || '',
      phone: c.phone || '',
    }));
    setCompanySearch('');
  };

  const scegliTaglia = (taglia) => {
    setEditSupplier(p => ({ ...p, bag_size: taglia, name: `Buste Campagna Amica (${taglia})` }));
  };

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
              {suppliers.length === 0 ? 'Aggiungi un\'azienda del circuito o le buste Campagna Amica' : 'Prova un altro termine di ricerca'}
            </p>
            {suppliers.length === 0 && (
              <Button onClick={() => setEditSupplier({ ...emptySupplier })} className="rounded-xl gap-1">
                <Plus className="w-4 h-4" /> Aggiungi fornitore
              </Button>
            )}
          </div>
        ) : (
          filtered.map(s => {
            const tipo = TIPO_LABEL[s.supplier_type];
            const Icon = tipo?.icon || Truck;
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden hover:shadow-md transition-all">
                <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/70 to-secondary" />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-bold text-sm text-foreground">{s.name}</p>
                        {tipo && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1 ${tipo.color}`}>
                            <Icon className="w-3 h-3" /> {tipo.label}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
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
                      <button onClick={() => setEditSupplier({ ...s })} className="p-2 rounded-xl hover:bg-muted transition-colors">
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(s.id)} className="p-2 rounded-xl hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-4 h-4 text-destructive/60" />
                      </button>
                      <button onClick={() => togglePayments(s.id)} className="p-2 rounded-xl hover:bg-muted transition-colors">
                        {expandedPayments[s.id] ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>
                  {expandedPayments[s.id] && (
                    <SupplierPaymentsPanel supplierId={s.id} companyId={myCompany?.id} />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dialog */}
      {editSupplier && (
        <Dialog open onOpenChange={() => { setEditSupplier(null); setCompanySearch(''); }}>
          <DialogContent className="max-w-md mx-4 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">
                {editSupplier.id ? 'Modifica fornitore' : 'Nuovo fornitore'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {!editSupplier.id && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditSupplier(p => ({ ...emptySupplier, supplier_type: 'azienda_circuito' }))}
                    className={`p-3 rounded-xl border-2 text-left transition-colors ${
                      editSupplier.supplier_type === 'azienda_circuito' ? 'border-green-400 bg-green-50' : 'border-border hover:border-green-200'
                    }`}
                  >
                    <Building2 className="w-5 h-5 text-green-700 mb-1" />
                    <p className="text-xs font-semibold text-foreground">Azienda del circuito</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditSupplier(p => ({ ...emptySupplier, supplier_type: 'buste_campagna_amica' }))}
                    className={`p-3 rounded-xl border-2 text-left transition-colors ${
                      editSupplier.supplier_type === 'buste_campagna_amica' ? 'border-blue-400 bg-blue-50' : 'border-border hover:border-blue-200'
                    }`}
                  >
                    <Package className="w-5 h-5 text-blue-700 mb-1" />
                    <p className="text-xs font-semibold text-foreground">Buste Campagna Amica</p>
                  </button>
                </div>
              )}

              {editSupplier.supplier_type === 'azienda_circuito' && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-green-800">Seleziona un'azienda del circuito</p>
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
                  {editSupplier.supplier_company_id && (
                    <div className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-green-300">
                      <p className="text-sm font-medium text-foreground">{editSupplier.name}</p>
                      <button type="button" onClick={() => setEditSupplier(p => ({ ...p, supplier_company_id: null, name: '' }))}>
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  )}
                  {companySearch.length > 0 && !editSupplier.supplier_company_id && (
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-green-200 bg-white divide-y divide-border">
                      {aziendeSelezionabili
                        .filter(c =>
                          c.name?.toLowerCase().includes(companySearch.toLowerCase()) ||
                          c.city?.toLowerCase().includes(companySearch.toLowerCase())
                        )
                        .slice(0, 20)
                        .map(c => (
                          <button key={c.id} type="button" onClick={() => sceglAzienda(c)} className="w-full text-left px-3 py-2 hover:bg-green-50 transition-colors">
                            <p className="text-sm font-medium text-foreground">{c.name}</p>
                            {c.city && <p className="text-xs text-muted-foreground">{c.city}{c.region ? `, ${c.region}` : ''}</p>}
                          </button>
                        ))}
                      {aziendeSelezionabili.filter(c =>
                        c.name?.toLowerCase().includes(companySearch.toLowerCase()) ||
                        c.city?.toLowerCase().includes(companySearch.toLowerCase())
                      ).length === 0 && (
                        <p className="text-xs text-muted-foreground px-3 py-2">Nessuna azienda trovata</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {editSupplier.supplier_type === 'buste_campagna_amica' && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-blue-800">Seleziona la taglia</p>
                  <div className="grid grid-cols-3 gap-2">
                    {['S', 'M', 'L'].map((taglia) => (
                      <button
                        key={taglia}
                        type="button"
                        onClick={() => scegliTaglia(taglia)}
                        className={`py-2.5 rounded-lg text-sm font-bold border-2 transition-colors ${
                          editSupplier.bag_size === taglia ? 'border-blue-400 bg-blue-100 text-blue-800' : 'border-blue-200 bg-white text-blue-700'
                        }`}
                      >
                        {taglia}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {editSupplier.supplier_type && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="Telefono"
                      type="tel"
                      value={editSupplier.phone || ''}
                      onChange={e => setEditSupplier(p => ({ ...p, phone: e.target.value }))}
                      className="rounded-xl border border-input px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                    />
                    <input
                      placeholder="Email"
                      type="email"
                      value={editSupplier.email || ''}
                      onChange={e => setEditSupplier(p => ({ ...p, email: e.target.value }))}
                      className="rounded-xl border border-input px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <textarea
                    placeholder="Note (es. condizioni, frequenza ordini...)"
                    value={editSupplier.notes || ''}
                    onChange={e => setEditSupplier(p => ({ ...p, notes: e.target.value }))}
                    className="w-full rounded-xl border border-input px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring resize-none h-20"
                  />
                </>
              )}
            </div>
            <DialogFooter className="gap-2 mt-1">
              <Button variant="outline" onClick={() => { setEditSupplier(null); setCompanySearch(''); }}>Annulla</Button>
              <Button onClick={() => saveMutation.mutate(editSupplier)} disabled={saveMutation.isPending || !puoSalvare}>
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}