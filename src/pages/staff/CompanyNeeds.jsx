import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyStaffMember } from '@/api/staff';
import { getNeedsByMarket, getAllNeeds, createNeed, updateNeed, deleteNeed } from '@/api/needs';
import { getRegisteredCompanies } from '@/api/companies';
import { getMarkets } from '@/api/markets';
import { invokeFunction } from '@/api/functions';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Edit2, Trash2, AlertCircle, CheckCircle, Clock, MoreHorizontal, MessageCircle, History, CreditCard, BanknoteIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format, isBefore, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const CATEGORY_LABELS = {
  bags: 'Buste',
  materials: 'Materiali',
  urgent: 'Urgenza',
  maintenance: 'Manutenzione',
  other: 'Altro',
};

const CATEGORY_COLORS = {
  bags: 'bg-blue-100 text-blue-700',
  materials: 'bg-green-100 text-green-700',
  urgent: 'bg-red-100 text-red-700',
  maintenance: 'bg-yellow-100 text-yellow-700',
  other: 'bg-gray-100 text-gray-700',
};

const STATUS_ICONS = {
  open: <AlertCircle className="w-4 h-4 text-red-500" />,
  in_progress: <Clock className="w-4 h-4 text-amber-500" />,
  resolved: <CheckCircle className="w-4 h-4 text-green-500" />,
  closed: <CheckCircle className="w-4 h-4 text-gray-400" />,
};

export default function CompanyNeeds() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [staffMember, setStaffMember] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [formData, setFormData] = useState({
    company_id: '',
    market_id: '',
    category: 'bags',
    title: '',
    description: '',
    size: '',
    price: '',
    quantity: '',
    priority: 'medium',
    status: 'open',
    due_date: '',
    notes: '',
  });

  // Fetch staff member to get their market
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const staff = await getMyStaffMember();
        if (staff) {
          setStaffMember(staff);
          // Auto-set the market from staff member
          setFormData(prev => ({ ...prev, market_id: staff.market_id || '' }));
        }
      } catch (err) {
        console.error('Error fetching staff:', err);
      }
    };
    if (user?.email) {
      fetchStaff();
    }
  }, [user?.email]);

  const { data: needs = [], isLoading } = useQuery({
    queryKey: ['company-needs', staffMember?.market_id],
    queryFn: () => getNeedsByMarket(staffMember.market_id),
    enabled: !!staffMember?.market_id,
    refetchInterval: 5000,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies-list'],
    queryFn: getRegisteredCompanies,
  });

  const { data: markets = [] } = useQuery({
    queryKey: ['markets-list'],
    queryFn: getMarkets,
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      if (editingId) {
        return updateNeed(editingId, data);
      }
      return createNeed(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-needs'] });
      resetForm();
      toast({ title: editingId ? 'Bisogno aggiornato' : 'Bisogno creato' });
    },
    onError: (err) => {
      toast({ title: 'Errore', description: err.message, variant: 'destructive' });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ id, payment_status }) =>
      updateNeed(id, { payment_status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-needs'] });
      toast({ title: 'Stato pagamento aggiornato' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) =>
      updateNeed(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-needs'] });
      toast({ title: 'Stato aggiornato' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNeed,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-needs'] });
      toast({ title: 'Bisogno eliminato' });
    },
  });

  const quickReplyMutation = useMutation({
    mutationFn: async ({ id, message }) => {
      await updateNeed(id, { notes: message, status: 'in_progress' });
      // Find the need to get company_id
      const allNeeds = await getAllNeeds();
      const need = allNeeds.find(n => n.id === id);
      if (need) {
        await invokeFunction('notifyProducerNeedResponse', {
          need_id: id,
          message: message,
          company_id: need.company_id
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-needs'] });
      toast({ title: 'Messaggio inviato' });
    },
  });

  const resetForm = () => {
    setFormData({
      company_id: '',
      market_id: staffMember?.market_id || '',
      category: 'bags',
      title: '',
      description: '',
      size: '',
      price: '',
      quantity: '',
      priority: 'medium',
      status: 'open',
      due_date: '',
      notes: '',
    });
    setEditingId(null);
    setShowDialog(false);
  };

  const handleEdit = (need) => {
    setFormData(need);
    setEditingId(need.id);
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.company_id || !formData.market_id || !formData.title) {
      toast({ title: 'Compila i campi obbligatori', variant: 'destructive' });
      return;
    }
    createMutation.mutate(formData);
  };

  // Active: open/in_progress | History: resolved/closed
  // Le assenze vivono nella stessa tabella ma sono segnalazioni a parte
  // (sezione dedicata /staff/assenze), non bisogni operativi.
  const realNeeds = needs.filter(n => !n.title?.includes('Assenza segnalata'));
  const activeNeeds = realNeeds.filter(n => n.status === 'open' || n.status === 'in_progress');
  const historyNeeds = realNeeds.filter(n => n.status === 'resolved' || n.status === 'closed');

  const baseNeeds = showHistory ? historyNeeds : activeNeeds;
  const filteredNeeds = baseNeeds.filter(need => {
    if (filterStatus && need.status !== filterStatus) return false;
    if (filterPriority && need.priority !== filterPriority) return false;
    return true;
  });

  // Group by company
  const groupedByCompany = filteredNeeds.reduce((acc, need) => {
    const company = companies.find(c => c.id === need.company_id);
    const key = company?.name || 'Azienda sconosciuta';
    if (!acc[key]) acc[key] = [];
    acc[key].push(need);
    return acc;
  }, {});

  const isOverdue = (need) => {
    if (!need.due_date) return false;
    return isBefore(new Date(need.due_date), startOfDay(new Date())) && need.status !== 'resolved';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Intestazione */}
      <div className="bg-gradient-to-r from-primary via-primary/95 to-secondary border-b-4 border-secondary px-6 pt-12 pb-8 shadow-lg">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-secondary rounded-full px-4 py-1.5 mb-3 shadow-md">
            <span className="text-primary font-bold text-xs tracking-widest uppercase">📋 Esigenze Aziende</span>
          </div>
          <h1 className="font-heading text-4xl font-bold text-white drop-shadow-lg">Traccia bisogni</h1>
          <p className="text-white/90 text-sm mt-2 font-medium">
            Monitora i bisogni auto-generati dal tuo mercato di riferimento
          </p>
          <div className="mt-4">
            <Button
              variant={showHistory ? 'secondary' : 'outline'}
              onClick={() => setShowHistory(!showHistory)}
              className={showHistory ? 'bg-secondary text-primary font-bold' : 'bg-white/20 text-white border-white/40 hover:bg-white/30'}
            >
              <History className="w-4 h-4 mr-2" />
              {showHistory ? 'Mostra Attivi' : 'Cronologia Bisogni'}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8 max-w-6xl mx-auto">
        {/* Filtri */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase">Mercato</label>
              <div className="px-3 py-2.5 border border-input rounded-md text-sm bg-muted/50 text-foreground font-medium">
                {markets.find(m => m.id === staffMember?.market_id)?.name || 'Non assegnato'}
              </div>
            </div>

            <div>
               <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase">Stato</label>
               <Select value={filterStatus} onValueChange={setFilterStatus}>
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value={null}>Tutti</SelectItem>
                   <SelectItem value="open">Aperto</SelectItem>
                   <SelectItem value="in_progress">In Corso</SelectItem>
                   <SelectItem value="resolved">Risolto</SelectItem>
                   <SelectItem value="closed">Chiuso</SelectItem>
                 </SelectContent>
               </Select>
             </div>

             <div>
               <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase">Priorità</label>
               <Select value={filterPriority} onValueChange={setFilterPriority}>
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value={null}>Tutte</SelectItem>
                   <SelectItem value="low">Bassa</SelectItem>
                   <SelectItem value="medium">Media</SelectItem>
                   <SelectItem value="high">Alta</SelectItem>
                 </SelectContent>
               </Select>
             </div>
          </div>

        {filteredNeeds.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg font-semibold text-foreground mb-6">{showHistory ? 'Nessuna cronologia disponibile' : 'Nessun bisogno attivo per il tuo mercato'}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedByCompany).map(([companyName, companyNeeds]) => (
              <div key={companyName}>
                <h2 className="font-heading text-xl font-bold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-2 h-6 bg-primary rounded-full inline-block"></span>
                  {companyName}
                  <span className="text-sm font-normal text-muted-foreground">({companyNeeds.length} {companyNeeds.length === 1 ? 'bisogno' : 'bisogni'})</span>
                </h2>
                <div className="space-y-4">
            {companyNeeds.map((need) => {
              const company = companies.find(c => c.id === need.company_id);
              const market = markets.find(m => m.id === need.market_id);
              const overdue = isOverdue(need);

              const isSessionBased = need.description?.includes('sessione') || need.description?.includes('Richiesta rapida');
              return (
                <div key={need.id} className={`rounded-2xl border-2 p-6 hover:shadow-lg transition-all hover:-translate-y-1 ${
                  isSessionBased 
                    ? 'bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/40 shadow-md'
                    : overdue 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-white border-border/50'
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {STATUS_ICONS[need.status]}
                        <h3 className="font-heading font-semibold text-lg text-foreground">
                          {need.title}
                        </h3>
                        {isSessionBased && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-primary/20 text-primary border border-primary/40 flex items-center gap-1">
                            📱 Dalla sessione
                          </span>
                        )}
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${CATEGORY_COLORS[need.category]}`}>
                          {CATEGORY_LABELS[need.category]}
                        </span>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                          need.priority === 'high' ? 'bg-red-100 text-red-700 border-red-300' :
                          need.priority === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                          'bg-green-100 text-green-700 border-green-300'
                        }`}>
                          {need.priority === 'high' ? '⚡ Alta' : need.priority === 'medium' ? 'Media' : 'Bassa'}
                        </span>
                      </div>

                      {need.description && (
                        <p className="text-sm text-muted-foreground mb-3">{need.description}</p>
                      )}

                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold">Azienda</p>
                          <p className="text-foreground">{company?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold">Mercato</p>
                          <p className="text-foreground">{market?.name || 'N/A'}</p>
                        </div>
                        {need.size && (
                          <div>
                            <p className="text-xs text-muted-foreground font-semibold">Dimensione</p>
                            <p className="text-foreground">{need.size}</p>
                          </div>
                        )}
                        {need.quantity && (
                          <div>
                            <p className="text-xs text-muted-foreground font-semibold">Quantità</p>
                            <p className="text-foreground">{need.quantity}</p>
                          </div>
                        )}
                        {need.price && (
                          <div>
                            <p className="text-xs text-muted-foreground font-semibold">Prezzo unitario</p>
                            <p className="text-foreground font-semibold text-primary">€{Number(need.price).toFixed(2)}</p>
                          </div>
                        )}
                        {need.price && need.quantity && (
                          <div>
                            <p className="text-xs text-muted-foreground font-semibold">Totale stimato</p>
                            <p className="text-foreground font-bold text-secondary">€{(Number(need.price) * Number(need.quantity)).toFixed(2)}</p>
                          </div>
                        )}
                        {need.due_date && (
                          <div>
                            <p className="text-xs text-muted-foreground font-semibold">Scadenza</p>
                            <p className={overdue ? 'text-red-600 font-semibold' : 'text-foreground'}>
                              {format(new Date(need.due_date), 'd MMM yyyy', { locale: it })}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold">Stato</p>
                          <p className="text-foreground capitalize">
                            {need.status === 'open' ? 'Aperto' : 
                             need.status === 'in_progress' ? 'In Corso' :
                             need.status === 'resolved' ? 'Risolto' : 'Chiuso'}
                          </p>
                        </div>
                      </div>

                      {need.notes && (
                        <p className="text-xs text-muted-foreground italic border-l-2 border-muted-foreground/30 pl-2">
                          {need.notes}
                        </p>
                      )}

                      {/* Payment status badge - only if need has a price */}
                      {need.price && (
                        <div className="mt-3">
                          <button
                            onClick={() => updatePaymentMutation.mutate({ id: need.id, payment_status: need.payment_status === 'paid' ? 'unpaid' : 'paid' })}
                            disabled={updatePaymentMutation.isPending}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border-2 transition-all ${
                              need.payment_status === 'paid'
                                ? 'bg-green-100 text-green-700 border-green-400 hover:bg-green-200'
                                : 'bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100'
                            }`}
                          >
                            {need.payment_status === 'paid'
                              ? <><CheckCircle className="w-4 h-4" /> Pagato</>
                              : <><CreditCard className="w-4 h-4" /> Da Pagare</>}
                          </button>
                        </div>
                      )}
                      </div>

                    <div className="flex gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => quickReplyMutation.mutate({ id: need.id, message: '⏰ Sto arrivando' })} disabled={quickReplyMutation.isPending}>
                             <MessageCircle className="w-4 h-4 mr-2" /> Sto arrivando
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => quickReplyMutation.mutate({ id: need.id, message: '⏱️ 5 minuti' })} disabled={quickReplyMutation.isPending}>
                             <Clock className="w-4 h-4 mr-2" /> 5 minuti
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => quickReplyMutation.mutate({ id: need.id, message: '✅ Risolto' })} disabled={quickReplyMutation.isPending}>
                             <CheckCircle className="w-4 h-4 mr-2" /> Risolto
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: need.id, status: 'in_progress' })} disabled={need.status === 'in_progress'}>
                             In Corso
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: need.id, status: 'resolved' })} disabled={need.status === 'resolved'}>
                             Risolto
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: need.id, status: 'closed' })} disabled={need.status === 'closed'}>
                             Chiuso
                           </DropdownMenuItem>
                         </DropdownMenuContent>
                      </DropdownMenu>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(need)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => deleteMutation.mutate(need.id)}
                        disabled={deleteMutation.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog - solo per modifica */}
      {showDialog && editingId && (
        <Dialog open onOpenChange={() => !createMutation.isPending && resetForm()}>
          <DialogContent className="max-w-md mx-4 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl">
                Modifica Bisogno
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Azienda *</label>
                <Select value={formData.company_id} onValueChange={(v) => setFormData({ ...formData, company_id: v })} disabled={editingId ? false : true}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona azienda" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Mercato</label>
                <div className="px-3 py-2.5 border border-input rounded-md text-sm bg-muted/50 text-foreground font-medium">
                  {markets.find(m => m.id === formData.market_id)?.name || 'Non assegnato'}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Categoria *</label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bags">Buste</SelectItem>
                    <SelectItem value="materials">Materiali</SelectItem>
                    <SelectItem value="urgent">Urgenza</SelectItem>
                    <SelectItem value="maintenance">Manutenzione</SelectItem>
                    <SelectItem value="other">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Titolo *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Es: Servono buste piccole"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Descrizione</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrizione dettagliata del bisogno"
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Dimensione</label>
                  <Input
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    placeholder="Es. piccola, 30x40"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Prezzo (€)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Quantità</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Priorità</label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Bassa</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Stato</label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Aperto</SelectItem>
                    <SelectItem value="in_progress">In Corso</SelectItem>
                    <SelectItem value="resolved">Risolto</SelectItem>
                    <SelectItem value="closed">Chiuso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Data Scadenza</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Note</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Note aggiuntive dello staff"
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  rows="2"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={resetForm}
                disabled={createMutation.isPending}
              >
                Annulla
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}