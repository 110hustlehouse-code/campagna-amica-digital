import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus, Edit2, Trash2, Search, AlertCircle, X, ChevronDown, ChevronRight, Store, History, Building2, Clock, Ban } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import SearchableList from '@/components/staff/SearchableList';

const PAYMENT_LABELS = {
  bank_transfer: 'Bonifico',
  cash: 'Contanti',
  check: 'Assegno',
  stripe: 'Stripe',
};

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-amber-100 text-amber-700',
  terminated: 'bg-red-100 text-red-700',
};
const STATUS_LABELS = {
  active: 'Attivo',
  suspended: 'Sospeso',
  terminated: 'Terminato',
};

export default function StallRentals() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRental, setSelectedRental] = useState(null);
  const [openCompanies, setOpenCompanies] = useState(new Set());
  const searchRef = useRef(null);
  const [formData, setFormData] = useState({
    company_id: '', market_id: '', stall_number: '', monthly_rent: '',
    rental_start_date: '', rental_end_date: '', payment_method: 'bank_transfer', status: 'active',
  });

  const { data: staffProfile } = useQuery({
    queryKey: ['staffProfile', user?.email],
    queryFn: async () => {
      const list = await base44.entities.StaffMember.filter({ email: user.email }, '-updated_date', 1);
      return list[0] || null;
    },
    enabled: !!user?.email,
  });

  const staffMarketId = staffProfile?.market_id || null;

  const { data: rentals = [], isLoading } = useQuery({
    queryKey: ['stall-rentals', staffMarketId],
    queryFn: () => staffMarketId
      ? base44.entities.StallRental.filter({ market_id: staffMarketId }, '-rental_start_date', 500)
      : base44.entities.StallRental.list('-rental_start_date', 500),
    enabled: !!staffProfile,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies-list'],
    queryFn: () => base44.entities.Company.filter({ is_registered: true }, 'name', 500),
  });

  const { data: markets = [] } = useQuery({
    queryKey: ['markets-list'],
    queryFn: () => base44.entities.Market.list('name', 500),
  });

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const getPaymentStatus = (rental) => {
    if (!rental.rental_end_date) return null;
    const end = new Date(rental.rental_end_date);
    if (end < now) return 'overdue'; // past end date → scaduto
    const endMonth = end.getMonth() + 1;
    const endYear = end.getFullYear();
    if (endYear === currentYear && endMonth === currentMonth) return 'pending_current'; // ends this month
    return null;
  };

  const marketItems = markets.map(m => ({
    id: m.id, label: m.name, sublabel: m.city || '',
  }));

  const companyItems = companies.map(c => ({
    id: c.id, label: c.name, sublabel: c.city || c.region || '',
  }));

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editingId
        ? base44.entities.StallRental.update(editingId, data)
        : base44.entities.StallRental.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stall-rentals'] });
      resetForm();
      toast({ title: '✅ Modifica salvata correttamente' });
    },
    onError: (err) => toast({ title: 'Errore', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.StallRental.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stall-rentals'] });
      setSelectedRental(null);
      toast({ title: 'Affitto eliminato' });
    },
  });

  const resetForm = () => {
    setFormData({ company_id: '', market_id: '', stall_number: '', monthly_rent: '', rental_start_date: '', rental_end_date: '', payment_method: 'bank_transfer', status: 'active' });
    setEditingId(null);
    setShowDialog(false);
  };

  const handleEdit = (rental) => {
    setFormData(rental);
    setEditingId(rental.id);
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.company_id || !formData.market_id || !formData.stall_number || !formData.monthly_rent || !formData.rental_start_date) {
      toast({ title: 'Compila i campi obbligatori', variant: 'destructive' });
      return;
    }
    saveMutation.mutate({ ...formData, monthly_rent: parseFloat(formData.monthly_rent) });
  };

  const isExpiring = (rental) => {
    if (!rental.rental_end_date) return false;
    const days = Math.floor((new Date(rental.rental_end_date) - new Date()) / 86400000);
    return days <= 30 && days >= 0;
  };

  // Focus search on mount
  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 100);
  }, []);

  const filteredRentals = searchQuery.trim()
    ? rentals.filter(r => {
        const company = companies.find(c => c.id === r.company_id);
        const market = markets.find(m => m.id === r.market_id);
        const q = searchQuery.toLowerCase();
        return (
          company?.name?.toLowerCase().includes(q) ||
          market?.name?.toLowerCase().includes(q) ||
          r.stall_number?.toLowerCase().includes(q) ||
          r.rental_start_date?.includes(q)
        );
      })
    : rentals;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary/95 to-secondary border-b-4 border-secondary px-6 pt-12 pb-8 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-secondary rounded-full px-4 py-1.5 mb-3 shadow-md">
              <span className="text-primary font-bold text-xs tracking-widest uppercase">🏪 Gestione Banchi</span>
            </div>
            <h1 className="font-heading text-4xl font-bold text-white drop-shadow-lg">Affitti Banco</h1>
            <p className="text-white/80 text-sm mt-1">Cerca e gestisci gli affitti per ogni mercato</p>
          </div>
          <Button onClick={() => setShowDialog(true)} className="rounded-xl gap-2 h-11 shrink-0">
            <Plus className="w-4 h-4" /> Nuovo
          </Button>
        </div>
      </div>

      <div className="px-6 py-6 max-w-6xl mx-auto">

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cerca per azienda, mercato, numero banco o data..."
            className="w-full pl-12 pr-10 py-3.5 rounded-xl border-2 border-border bg-white text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Store className="w-4 h-4" />
            <span>
              <span className="font-semibold text-foreground">{filteredRentals.length}</span>
              {searchQuery ? ` risultati per "${searchQuery}"` : ` affitti totali`}
            </span>
          </div>
          <button
            onClick={() => setShowHistory(h => !h)}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl border transition-colors ${
              showHistory ? 'bg-primary text-white border-primary' : 'bg-white text-primary border-primary/30 hover:bg-primary/5'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            {showHistory ? 'Torna agli affitti' : 'Cronologia affitti'}
          </button>
        </div>

        {/* History View */}
        {showHistory && (
          <RentalHistoryView rentals={rentals} companies={companies} markets={markets} />
        )}

        {/* Results */}
        {!showHistory && (
          filteredRentals.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            {searchQuery
              ? <p>Nessun affitto trovato per "<strong>{searchQuery}</strong>"</p>
              : <div>
                  <p className="text-lg font-semibold text-foreground mb-4">Nessun affitto registrato</p>
                  <Button onClick={() => setShowDialog(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Nuovo Affitto
                  </Button>
                </div>
            }
          </div>
        ) : (
          <GroupedRentalList
            rentals={filteredRentals}
            companies={companies}
            markets={markets}
            openCompanies={openCompanies}
            setOpenCompanies={setOpenCompanies}
            selectedRental={selectedRental}
            setSelectedRental={setSelectedRental}
            isExpiring={isExpiring}
            getPaymentStatus={getPaymentStatus}
            handleEdit={handleEdit}
            deleteMutation={deleteMutation}
          />
        ))}
      </div>

      {/* Dialog */}
      {showDialog && (
        <Dialog open onOpenChange={() => !saveMutation.isPending && resetForm()}>
          <DialogContent className="max-w-md mx-4 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">
                {editingId ? 'Modifica Affitto' : 'Nuovo Affitto'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Azienda *</label>
                <SearchableList
                  items={companyItems}
                  value={formData.company_id}
                  onChange={(id) => setFormData({ ...formData, company_id: id })}
                  placeholder="Cerca e seleziona azienda..."
                  searchPlaceholder="Nome azienda..."
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Mercato *</label>
                <SearchableList
                  items={marketItems}
                  value={formData.market_id}
                  onChange={(id) => setFormData({ ...formData, market_id: id })}
                  placeholder="Cerca e seleziona mercato..."
                  searchPlaceholder="Nome mercato..."
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Numero Banco *</label>
                <Input
                  value={formData.stall_number}
                  onChange={(e) => setFormData({ ...formData, stall_number: e.target.value })}
                  placeholder="Es: A1, B5"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Affitto Mensile (€) *</label>
                <Input
                  type="number" step="0.01"
                  value={formData.monthly_rent}
                  onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
                  placeholder="100.00"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Data Inizio *</label>
                  <input
                    type="date"
                    value={formData.rental_start_date}
                    onChange={(e) => setFormData({ ...formData, rental_start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Data Fine</label>
                  <input
                    type="date"
                    value={formData.rental_end_date}
                    onChange={(e) => setFormData({ ...formData, rental_end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Metodo Pagamento</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="bank_transfer">Bonifico Bancario</option>
                  <option value="cash">Contanti</option>
                  <option value="check">Assegno</option>
                  <option value="stripe">Stripe</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Stato</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="active">Attivo</option>
                  <option value="suspended">Sospeso</option>
                  <option value="terminated">Terminato</option>
                </select>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={resetForm} disabled={saveMutation.isPending}>Annulla</Button>
              <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function PaymentBadge({ status }) {
  if (!status) return null;
  if (status === 'overdue') return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
      <Ban className="w-2.5 h-2.5" /> Scaduto
    </span>
  );
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
      <Clock className="w-2.5 h-2.5" /> In scadenza questo mese
    </span>
  );
}

function GroupedRentalList({ rentals, companies, markets, openCompanies, setOpenCompanies, selectedRental, setSelectedRental, isExpiring, getPaymentStatus, handleEdit, deleteMutation }) {
  // Group rentals by company
  const grouped = useMemo(() => {
    const map = {};
    rentals.forEach(r => {
      if (!map[r.company_id]) map[r.company_id] = [];
      map[r.company_id].push(r);
    });
    return map;
  }, [rentals]);

  const toggleCompany = (cid) => {
    setOpenCompanies(prev => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid);
      else next.add(cid);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([companyId, compRentals]) => {
        const company = companies.find(c => c.id === companyId);
        const isOpen = openCompanies.has(companyId);
        const hasMultiple = compRentals.length > 1;
        const hasOverdue = compRentals.some(r => getPaymentStatus(r) === 'overdue');

        // Single rental — render directly without accordion header
        if (!hasMultiple) {
          const rental = compRentals[0];
          const market = markets.find(m => m.id === rental.market_id);
          const expiring = isExpiring(rental);
          const payStatus = getPaymentStatus(rental);
          const isSelected = selectedRental?.id === rental.id;
          return (
            <div
              key={rental.id}
              onClick={() => setSelectedRental(isSelected ? null : rental)}
              className={`rounded-xl border-2 p-4 cursor-pointer transition-all duration-150 ${
                isSelected ? 'border-primary bg-primary/5 shadow-md'
                : expiring ? 'border-amber-300 bg-amber-50 hover:shadow-sm'
                : 'border-border/50 bg-white hover:border-primary/30 hover:shadow-sm'
              }`}
            >
              <RentalRow rental={rental} company={company} market={market} expiring={expiring} payStatus={payStatus} isSelected={isSelected} />
              {isSelected && <RentalActions rental={rental} handleEdit={handleEdit} deleteMutation={deleteMutation} expiring={expiring} />}
            </div>
          );
        }

        // Multiple rentals — accordion
        return (
          <div key={companyId} className="rounded-xl border-2 border-border/50 bg-white overflow-hidden shadow-sm">
            <button
              onClick={() => toggleCompany(companyId)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm text-foreground">{company?.name || 'Azienda'}</p>
                  <p className="text-xs text-muted-foreground">{compRentals.length} banchi</p>
                </div>
                {hasOverdue && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                    <Ban className="w-2.5 h-2.5" /> Pagamento scaduto
                  </span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="border-t border-border/40 divide-y divide-border/30">
                {compRentals.map(rental => {
                  const market = markets.find(m => m.id === rental.market_id);
                  const expiring = isExpiring(rental);
                  const payStatus = getPaymentStatus(rental);
                  const isSelected = selectedRental?.id === rental.id;
                  return (
                    <div
                      key={rental.id}
                      onClick={() => setSelectedRental(isSelected ? null : rental)}
                      className={`p-4 cursor-pointer transition-all duration-150 ${
                        isSelected ? 'bg-primary/5' : expiring ? 'bg-amber-50' : 'hover:bg-muted/20'
                      }`}
                    >
                      <RentalRow rental={rental} company={null} market={market} expiring={expiring} payStatus={payStatus} isSelected={isSelected} />
                      {isSelected && <RentalActions rental={rental} handleEdit={handleEdit} deleteMutation={deleteMutation} expiring={expiring} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RentalRow({ rental, company, market, expiring, payStatus, isSelected }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold ${
          isSelected ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
        }`}>
          {rental.stall_number || '#'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {company && <p className="font-semibold text-foreground text-sm">{company.name}</p>}
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[rental.status]}`}>
              {STATUS_LABELS[rental.status]}
            </span>
            {expiring && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                <AlertCircle className="w-2.5 h-2.5" /> Scadenza imminente
              </span>
            )}
            <PaymentBadge status={payStatus} />
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
            {market && <span>📍 {market.name}</span>}
            <span>€ {Number(rental.monthly_rent).toFixed(2)}/mese</span>
            <span>Dal {rental.rental_start_date ? format(new Date(rental.rental_start_date), 'd MMM yyyy', { locale: it }) : 'N/A'}</span>
          </div>
        </div>
      </div>
      <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${isSelected ? 'rotate-90' : ''}`} />
    </div>
  );
}

function RentalActions({ rental, handleEdit, deleteMutation, expiring }) {
  return (
    <div className="mt-4 pt-4 border-t border-primary/20">
      <div className="grid grid-cols-3 gap-3 text-xs mb-4">
        <div>
          <p className="text-muted-foreground font-semibold">Metodo pagamento</p>
          <p className="text-foreground">{PAYMENT_LABELS[rental.payment_method]}</p>
        </div>
        {rental.rental_end_date && (
          <div>
            <p className="text-muted-foreground font-semibold">Data fine</p>
            <p className={expiring ? 'text-amber-700 font-bold' : 'text-foreground'}>
              {format(new Date(rental.rental_end_date), 'd MMM yyyy', { locale: it })}
            </p>
          </div>
        )}
        <div>
          <p className="text-muted-foreground font-semibold">Banco</p>
          <p className="text-foreground">{rental.stall_number}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleEdit(rental); }} className="gap-1.5 text-xs">
          <Edit2 className="w-3 h-3" /> Modifica
        </Button>
        <Button
          size="sm" variant="outline"
          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(rental.id); }}
          disabled={deleteMutation.isPending}
          className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
        >
          <Trash2 className="w-3 h-3" /> Elimina
        </Button>
      </div>
    </div>
  );
}

function RentalHistoryView({ rentals, companies, markets }) {
  const grouped = rentals.reduce((acc, r) => {
    const cid = r.company_id;
    if (!acc[cid]) acc[cid] = [];
    acc[cid].push(r);
    return acc;
  }, {});

  if (rentals.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Store className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>Nessun affitto in archivio</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([companyId, compRentals]) => {
        const company = companies.find(c => c.id === companyId);
        const active = compRentals.filter(r => r.status === 'active').length;
        const terminated = compRentals.filter(r => r.status === 'terminated').length;
        const suspended = compRentals.filter(r => r.status === 'suspended').length;
        const totalMonthly = compRentals.filter(r => r.status === 'active').reduce((s, r) => s + Number(r.monthly_rent || 0), 0);

        return (
          <div key={companyId} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-3 bg-muted/20 border-b border-border">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground truncate">{company?.name || 'Azienda'}</p>
                <p className="text-xs text-muted-foreground">{compRentals.length} affitto{compRentals.length !== 1 ? 'i' : ''} totali</p>
              </div>
              {totalMonthly > 0 && (
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-primary">€{totalMonthly.toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground">/mese attivi</p>
                </div>
              )}
            </div>
            <div className="px-4 py-3 space-y-2">
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <span className="text-sm font-medium text-foreground">{active}</span>
                  <span className="text-xs text-muted-foreground">attivi</span>
                </div>
                {suspended > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="text-sm font-medium text-foreground">{suspended}</span>
                    <span className="text-xs text-muted-foreground">sospesi</span>
                  </div>
                )}
                {terminated > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="text-sm font-medium text-foreground">{terminated}</span>
                    <span className="text-xs text-muted-foreground">terminati</span>
                  </div>
                )}
              </div>
              <div className="space-y-1.5 mt-1">
                {compRentals.map(r => {
                  const market = markets.find(m => m.id === r.market_id);
                  return (
                    <div key={r.id} className="flex items-center justify-between text-xs py-1.5 border-t border-border/40">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_COLORS[r.status]}`}>{STATUS_LABELS[r.status]}</span>
                        <span className="text-muted-foreground">{market?.name || '—'} · Banco {r.stall_number}</span>
                      </div>
                      <span className="font-medium text-foreground">€{Number(r.monthly_rent).toFixed(2)}/m</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}