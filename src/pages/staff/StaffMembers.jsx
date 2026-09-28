// v2
import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllStaffMembers, addStaffMember, updateStaffMember, deleteStaffMember, getMyStaffMember } from '@/api/staff';
import { getMarkets } from '@/api/markets';
import { getCompaniesByMarket } from '@/api/companies';
import { getRepresentativesByMarket, addRepresentative, removeRepresentative } from '@/api/marketRepresentatives';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Edit2, Trash2, Search, Users, CheckCircle, AlertCircle, X, ChevronRight, Megaphone, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import SearchableList from '@/components/staff/SearchableList';
import PageHeader from '@/components/layout/PageHeader';

const POSITION_LABELS = {
  market_manager: 'Responsabile Mercato',
  coordinator: 'Coordinatore',
  administrator: 'Amministratore',
};

const POSITION_COLORS = {
  market_manager: 'bg-blue-100 text-blue-700',
  coordinator: 'bg-purple-100 text-purple-700',
  administrator: 'bg-amber-100 text-amber-700',
};

export default function StaffMembers() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const searchRef = useRef(null);
  const [formData, setFormData] = useState({
    market_id: '', email: '', full_name: '', phone: '',
    position: 'market_manager', is_active: true,
  });

  const { data: staffMembers = [], isLoading } = useQuery({
    queryKey: ['staff-members'],
    queryFn: getAllStaffMembers,
  });

  const { data: markets = [] } = useQuery({
    queryKey: ['markets-list'],
    queryFn: getMarkets,
  });

  const { user } = useAuth();
  const { data: myStaffMember } = useQuery({
    queryKey: ['staffProfile', user?.email],
    queryFn: getMyStaffMember,
    enabled: !!user?.email,
  });
  const myMarketId = myStaffMember?.market_id || '';
  const myMarketName = markets.find(m => m.id === myMarketId)?.name || '';
  const isMarketManager = myStaffMember?.position === 'market_manager';

  const openNewDialog = () => {
    setFormData({ market_id: myMarketId, email: '', full_name: '', phone: '', position: 'market_manager', is_active: true });
    setEditingId(null);
    setShowDialog(true);
  };

  const marketItems = markets.map(m => ({
    id: m.id, label: m.name, sublabel: m.city || '',
  }));

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editingId
        ? updateStaffMember(editingId, data)
        : addStaffMember(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-members'] });
      resetForm();
      toast({ title: '✅ Modifica salvata correttamente' });
    },
    onError: (err) => toast({ title: 'Errore', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStaffMember,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-members'] });
      setSelectedMember(null);
      toast({ title: 'Staff eliminato' });
    },
  });

  const resetForm = () => {
    setFormData({ market_id: '', email: '', full_name: '', phone: '', position: 'market_manager', is_active: true });
    setEditingId(null);
    setShowDialog(false);
  };

  const handleEdit = (member) => {
    setFormData(member);
    setEditingId(member.id);
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.email || !formData.full_name || !formData.market_id) {
      toast({ title: 'Compila i campi obbligatori', variant: 'destructive' });
      return;
    }
    saveMutation.mutate(formData);
  };

  // Focus search on mount
  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 100);
  }, []);

  const filteredMembers = searchQuery.trim()
    ? staffMembers.filter(m =>
        m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        markets.find(mk => mk.id === m.market_id)?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : staffMembers;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        badge="👥 Team Management"
        title="Team staff"
        subtitle="Cerca, modifica e gestisci i membri del team"
        actions={isMarketManager && (
          <Button onClick={openNewDialog} className="rounded-xl gap-2 h-11 shrink-0">
            <Plus className="w-4 h-4" /> Nuovo
          </Button>
        )}
      />

      <div className="px-6 py-6 max-w-4xl mx-auto">

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cerca per nome, cognome, email o mercato..."
            className="w-full pl-12 pr-10 py-3.5 rounded-xl border-2 border-border bg-white text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mb-5 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>
            <span className="font-semibold text-foreground">{filteredMembers.length}</span>
            {searchQuery ? ` risultati per "${searchQuery}"` : ` membri totali`}
          </span>
        </div>

        {/* Results */}
        {filteredMembers.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            {searchQuery
              ? <p>Nessun membro trovato per "<strong>{searchQuery}</strong>"</p>
              : <div>
                  <p className="text-lg font-semibold text-foreground mb-4">Nessuno staff registrato</p>
                  {isMarketManager && (
                    <Button onClick={openNewDialog} className="gap-2">
                      <Plus className="w-4 h-4" /> Aggiungi Staff
                    </Button>
                  )}
                </div>
            }
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMembers.map((member) => {
              const market = markets.find(m => m.id === member.market_id);
              const isSelected = selectedMember?.id === member.id;
              return (
                <div
                  key={member.id}
                  onClick={() => setSelectedMember(isSelected ? null : member)}
                  className={`rounded-xl border-2 p-4 cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border/50 bg-white hover:border-primary/30 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                      }`}>
                        <span className="font-bold text-sm">
                          {member.full_name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground text-sm">{member.full_name}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${POSITION_COLORS[member.position] || 'bg-gray-100 text-gray-700'}`}>
                            {POSITION_LABELS[member.position]}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            member.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {member.is_active ? 'Attivo' : 'Inattivo'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{member.email}</p>
                        {market && (
                          <p className="text-xs text-primary/70 mt-0.5">📍 {market.name}</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${isSelected ? 'rotate-90' : ''}`} />
                  </div>

                  {/* Expanded actions */}
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-primary/20 flex items-center gap-3">
                      {member.phone && (
                        <span className="text-xs text-muted-foreground">📞 {member.phone}</span>
                      )}
                      {isMarketManager ? (
                        <div className="flex gap-2 ml-auto">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); handleEdit(member); }}
                            className="gap-1.5 text-xs"
                          >
                            <Edit2 className="w-3 h-3" /> Modifica
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(member.id); }}
                            disabled={deleteMutation.isPending}
                            className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                          >
                            <Trash2 className="w-3 h-3" /> Elimina
                          </Button>
                        </div>
                      ) : (
                        <span className="ml-auto text-[11px] text-muted-foreground italic">
                          Solo il responsabile mercato può modificare il team
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Rappresentante produttori */}
        {isMarketManager && myMarketId && (
          <RepresentativesSection marketId={myMarketId} addedBy={user?.id} />
        )}
      </div>

      {/* Dialog */}
      {showDialog && (
        <Dialog open onOpenChange={() => !saveMutation.isPending && resetForm()}>
          <DialogContent className="max-w-md mx-4 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">
                {editingId ? 'Modifica Staff' : 'Nuovo Membro Staff'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Nome completo *</label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Nome e cognome"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Email *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Telefono</label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+39 123 456 7890"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Mercato</label>
                <div className="px-3 py-2.5 rounded-xl border border-border bg-muted/40 text-sm text-foreground font-medium">
                  {myMarketName || 'Il tuo mercato'}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Puoi gestire solo lo staff del tuo mercato.</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Ruolo *</label>
                <Select value={formData.position} onValueChange={(v) => setFormData({ ...formData, position: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market_manager">Responsabile Mercato</SelectItem>
                    <SelectItem value="coordinator">Coordinatore</SelectItem>
                    <SelectItem value="administrator">Amministratore</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-semibold text-foreground">Attivo</span>
              </label>
            </div>

            <DialogFooter className="gap-2 mt-2">
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


function RepresentativesSection({ marketId, addedBy }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [repName, setRepName] = useState('');

  const { data: representatives = [] } = useQuery({
    queryKey: ['market-representatives', marketId],
    queryFn: () => getRepresentativesByMarket(marketId),
    enabled: !!marketId,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies-for-representative', marketId],
    queryFn: () => getCompaniesByMarket(marketId),
    enabled: showAdd && !!marketId,
  });

  const filteredCompanies = companySearch.trim()
    ? companies.filter(c => c.name?.toLowerCase().includes(companySearch.toLowerCase()))
    : companies;

  const addMutation = useMutation({
    mutationFn: () => {
      const company = companies.find(c => c.id === selectedCompanyId);
      if (!company?.owner_id) throw new Error('Azienda senza account collegato');
      return addRepresentative({
        market_id: marketId,
        user_id: company.owner_id,
        full_name: repName.trim() || company.name,
        source_company_id: company.id,
        added_by: addedBy || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['market-representatives', marketId] });
      setShowAdd(false);
      setSelectedCompanyId('');
      setRepName('');
      setCompanySearch('');
      toast({ title: 'Rappresentante aggiunto' });
    },
    onError: (e) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  const removeMutation = useMutation({
    mutationFn: removeRepresentative,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['market-representatives', marketId] });
      toast({ title: 'Rappresentante rimosso' });
    },
  });

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-heading text-lg font-bold flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" /> Rappresentante produttori
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Canale diretto con l'amministrazione, indipendente dall'azienda</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {representatives.length > 0 && (
            <Link to="/staff/rappresentante-chat">
              <Button size="sm" variant="outline" className="gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" /> Chat
              </Button>
            </Link>
          )}
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Aggiungi
          </Button>
        </div>
      </div>

      {representatives.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessun rappresentante designato per questo mercato.</p>
      ) : (
        <div className="space-y-2">
          {representatives.map(rep => (
            <div key={rep.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3">
              <div>
                <p className="font-semibold text-sm text-foreground">{rep.full_name}</p>
                <p className="text-xs text-muted-foreground">Aggiunto il {new Date(rep.created_at).toLocaleDateString('it-IT')}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => removeMutation.mutate(rep.id)}
                disabled={removeMutation.isPending}
                className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
              >
                <Trash2 className="w-3 h-3" /> Rimuovi
              </Button>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Dialog open onOpenChange={() => !addMutation.isPending && setShowAdd(false)}>
          <DialogContent className="max-w-md mx-4 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">Designa rappresentante</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Cerca azienda (per risalire alla persona)</label>
                <Input
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  placeholder="Nome azienda..."
                />
                <div className="max-h-40 overflow-y-auto mt-2 space-y-1">
                  {filteredCompanies.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCompanyId(c.id); if (!repName) setRepName(c.name); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                        selectedCompanyId === c.id ? 'bg-primary/10 border border-primary text-primary font-semibold' : 'hover:bg-muted/50'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Nome visualizzato</label>
                <Input
                  value={repName}
                  onChange={(e) => setRepName(e.target.value)}
                  placeholder="Nome della persona"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Puoi modificarlo: il ruolo di rappresentante è personale, non legato all'azienda.</p>
              </div>
            </div>
            <DialogFooter className="gap-2 mt-2">
              <Button variant="outline" onClick={() => setShowAdd(false)} disabled={addMutation.isPending}>Annulla</Button>
              <Button onClick={() => addMutation.mutate()} disabled={!selectedCompanyId || addMutation.isPending}>
                {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aggiungi'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
