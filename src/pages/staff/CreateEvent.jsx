import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyStaffMember, createMessage, updateMessage, deleteMessage, getPublishedMessagesAll } from '@/api/staff';
import { getMarkets } from '@/api/markets';
import { getRsvpsByMarket } from '@/api/events';
import { getCompaniesByMarket } from '@/api/companies';
import { invokeFunction } from '@/api/functions';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  CalendarPlus, MapPin, Clock, AlertCircle, CheckCircle,
  Loader2, ChevronLeft, Info, Search, ThumbsUp, ThumbsDown, HelpCircle, Calendar,
  Download, History as HistoryIcon, Pencil, Trash2,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import SearchableList from '@/components/staff/SearchableList';
import { format, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { exportRowsToPdf, exportRowsToExcel } from '@/lib/reportExport';

const MANDATORY_OPTIONS = [
  {
    value: true,
    label: 'Obbligatorio',
    description: 'Tutti i produttori del mercato vengono notificati automaticamente',
    color: 'border-red-300 bg-red-50',
    activeColor: 'border-red-500 bg-red-100 ring-2 ring-red-300',
    icon: '🔴',
  },
  {
    value: false,
    label: 'Facoltativo',
    description: 'I produttori ricevono una notifica e possono accettare o declinare',
    color: 'border-blue-300 bg-blue-50',
    activeColor: 'border-blue-500 bg-blue-100 ring-2 ring-blue-300',
    icon: '🔵',
  },
];

const TABS = [
  { key: 'create', label: 'Crea' },
  { key: 'upcoming', label: 'In programma' },
  { key: 'history', label: 'Storico' },
];

export default function CreateEvent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [staffMember, setStaffMember] = useState(null);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('upcoming');
  const [editingId, setEditingId] = useState(null);
  const [selectedEventForRsvp, setSelectedEventForRsvp] = useState(null);
  const [searchAzienda, setSearchAzienda] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    market_id: '',
    event_date: '',
    time_start: '',
    time_end: '',
    is_mandatory: true,
  });

  // Fetch staff member to prefill market
  useEffect(() => {
    const fetchStaff = async () => {
      if (!user?.email) return;
      const staff = await getMyStaffMember();
      if (staff) {
        setStaffMember(staff);
        setFormData(prev => ({ ...prev, market_id: staff.market_id || '' }));
      }
    };
    fetchStaff();
  }, [user?.email]);

  const { data: markets = [] } = useQuery({
    queryKey: ['markets-list'],
    queryFn: getMarkets,
  });

  const marketItems = markets.map(m => ({
    id: m.id, label: m.name, sublabel: m.city || '',
  }));

  const staffMarketId = staffMember?.market_id;
  const marketName = markets.find(m => m.id === staffMarketId)?.name || 'Mercato';

  const { data: publishedMessages = [] } = useQuery({
    queryKey: ['staff-messages-published'],
    queryFn: () => getPublishedMessagesAll(200),
  });

  const myEvents = useMemo(() => publishedMessages
    .filter(m => m.type === 'event' && m.market_id === staffMarketId)
    .sort((a, b) => new Date(b.event_date) - new Date(a.event_date)),
  [publishedMessages, staffMarketId]);

  const oggi = startOfDay(new Date());
  const upcomingEvents = useMemo(() => myEvents
    .filter(ev => new Date(ev.event_date) >= oggi)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date)),
  [myEvents]);
  const pastEvents = useMemo(() => myEvents
    .filter(ev => new Date(ev.event_date) < oggi),
  [myEvents]);

  const { data: rsvps = [] } = useQuery({
    queryKey: ['event-rsvps', staffMarketId],
    queryFn: () => getRsvpsByMarket(staffMarketId),
    enabled: !!staffMarketId,
  });

  const { data: marketCompanies = [] } = useQuery({
    queryKey: ['companies-market', staffMarketId],
    queryFn: () => getCompaniesByMarket(staffMarketId),
    enabled: !!staffMarketId,
  });

  const eventRsvps = useMemo(() => {
    if (!selectedEventForRsvp) return [];
    return rsvps.filter(r => r.message_id === selectedEventForRsvp.id);
  }, [rsvps, selectedEventForRsvp]);

  const filteredCompanies = useMemo(() => {
    const q = searchAzienda.trim().toLowerCase();
    return marketCompanies.filter(c => !q || c.name?.toLowerCase().includes(q));
  }, [marketCompanies, searchAzienda]);

  const statoAzienda = (companyId) => eventRsvps.find(r => r.company_id === companyId)?.status || 'pending';

  const presenti = filteredCompanies.filter(c => statoAzienda(c.id) === 'accepted');
  const assenti = filteredCompanies.filter(c => statoAzienda(c.id) === 'declined');
  const inAttesa = filteredCompanies.filter(c => statoAzienda(c.id) === 'pending');

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const market = markets.find(m => m.id === data.market_id);
      const payload = {
        title: data.title,
        description: data.description,
        is_mandatory: data.is_mandatory,
        market_id: data.market_id,
        location: market?.name || '',
        event_date: data.event_date,
        time_start: data.time_start,
        time_end: data.time_end,
      };

      if (editingId) {
        return updateMessage(editingId, payload);
      }

      const msg = await createMessage({
        ...payload,
        type: 'event',
        is_published: true,
      });

      // Notifica i produttori solo alla creazione di un evento nuovo
      await invokeFunction('notifyProducersNewCommunication', {
        message_id: msg.id,
        market_id: data.market_id,
        is_mandatory: data.is_mandatory,
        title: data.title,
      });

      return msg;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-messages-published'] });
      qc.invalidateQueries({ queryKey: ['event-rsvps'] });
      toast({ title: editingId ? '✅ Evento aggiornato' : '✅ Evento creato correttamente' });
      setFormData({
        title: '',
        description: '',
        market_id: staffMember?.market_id || '',
        event_date: '',
        time_start: '',
        time_end: '',
        is_mandatory: true,
      });
      setEditingId(null);
      setActiveTab('upcoming');
    },
    onError: (err) => {
      toast({ title: 'Errore', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteMessage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-messages-published'] });
      qc.invalidateQueries({ queryKey: ['event-rsvps'] });
      toast({ title: 'Evento eliminato' });
    },
    onError: (err) => {
      toast({ title: 'Errore', description: err.message, variant: 'destructive' });
    },
  });

  const validate = () => {
    const e = {};
    if (!formData.title.trim()) e.title = 'Il titolo è obbligatorio';
    if (!formData.market_id) e.market_id = 'Seleziona un mercato';
    if (!formData.event_date) e.event_date = 'La data è obbligatoria';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    saveMutation.mutate(formData);
  };

  const set = (key, val) => {
    setFormData(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const selectedMarket = markets.find(m => m.id === formData.market_id);

  const contaEvento = (ev) => {
    const evRsvps = rsvps.filter((r) => r.message_id === ev.id);
    const nAccepted = evRsvps.filter((r) => r.status === 'accepted').length;
    const nDeclined = evRsvps.filter((r) => r.status === 'declined').length;
    return { nAccepted, nDeclined };
  };

  const handleExportPdf = () => {
    const columns = [
      { key: 'titolo', label: 'Titolo' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'data', label: 'Data' },
      { key: 'presenti', label: 'Presenti' },
      { key: 'assenti', label: 'Assenti' },
    ];
    const rows = pastEvents.map((ev) => {
      const { nAccepted, nDeclined } = contaEvento(ev);
      return {
        titolo: ev.title || 'Senza titolo',
        tipo: ev.is_mandatory ? 'Obbligatorio' : 'Facoltativo',
        data: format(new Date(ev.event_date), 'dd/MM/yyyy', { locale: it }),
        presenti: ev.is_mandatory ? '—' : nAccepted,
        assenti: ev.is_mandatory ? '—' : nDeclined,
      };
    });
    exportRowsToPdf({
      title: 'Storico Eventi',
      marketName,
      columns,
      rows,
      filenamePrefix: `storico-eventi-${marketName.replace(/\s+/g, '_')}`,
    });
  };

  const handleExportExcel = () => {
    const columns = [
      { key: 'titolo', label: 'Titolo' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'data', label: 'Data' },
      { key: 'presenti', label: 'Presenti' },
      { key: 'assenti', label: 'Assenti' },
    ];
    const rows = pastEvents.map((ev) => {
      const { nAccepted, nDeclined } = contaEvento(ev);
      return {
        titolo: ev.title || 'Senza titolo',
        tipo: ev.is_mandatory ? 'Obbligatorio' : 'Facoltativo',
        data: format(new Date(ev.event_date), 'dd/MM/yyyy', { locale: it }),
        presenti: ev.is_mandatory ? '—' : nAccepted,
        assenti: ev.is_mandatory ? '—' : nDeclined,
      };
    });
    exportRowsToExcel({
      sheetName: 'Storico Eventi',
      columns,
      rows,
      filenamePrefix: `storico-eventi-${marketName.replace(/\s+/g, '_')}`,
    });
  };

  const EventRow = ({ ev, editable = false }) => {
    const { nAccepted, nDeclined } = contaEvento(ev);
    const clickable = !ev.is_mandatory;
    return (
      <div
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={() => { if (clickable) { setSelectedEventForRsvp(ev); setSearchAzienda(''); } }}
        className={cn(
          'w-full text-left p-3 rounded-xl border border-border/50 bg-white transition-colors',
          clickable && 'hover:border-primary/40 hover:bg-primary/5 cursor-pointer'
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-sm text-foreground">{ev.title}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            {ev.is_mandatory ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                Obbligatorio
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                Facoltativo
              </span>
            )}
            {editable && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(ev.id);
                    setFormData({
                      title: ev.title || '',
                      description: ev.description || '',
                      market_id: ev.market_id || '',
                      event_date: ev.event_date ? ev.event_date.slice(0, 10) : '',
                      time_start: ev.time_start || '',
                      time_end: ev.time_end || '',
                      is_mandatory: !!ev.is_mandatory,
                    });
                    setActiveTab('create');
                  }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  title="Modifica evento"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Eliminare l'evento "${ev.title}"?`)) {
                      deleteMutation.mutate(ev.id);
                    }
                  }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Elimina evento"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {format(new Date(ev.event_date), 'd MMM yyyy', { locale: it })}
        </p>
        {!ev.is_mandatory && (
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-3">
            <span className="flex items-center gap-1 text-primary font-medium">
              <ThumbsUp className="w-3 h-3" /> {nAccepted} presenti
            </span>
            <span className="flex items-center gap-1 text-destructive font-medium">
              <ThumbsDown className="w-3 h-3" /> {nDeclined} assenti
            </span>
            <span className="text-primary/70 underline">tocca per dettagli</span>
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary/95 to-secondary border-b-4 border-secondary px-6 pt-12 pb-8 shadow-lg">
        <button
          onClick={() => navigate('/staff')}
          className="flex items-center gap-1.5 text-white/70 hover:text-white mb-4 text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Dashboard
        </button>
        <div className="inline-flex items-center gap-1.5 bg-secondary rounded-full px-4 py-1.5 mb-3 shadow-md">
          <span className="text-primary font-bold text-xs tracking-widest uppercase">📅 Gestione Eventi</span>
        </div>
        <h1 className="font-heading text-4xl font-bold text-white drop-shadow-lg">Eventi</h1>
        <p className="text-white/80 text-sm mt-1">Crea, monitora e archivia gli eventi del tuo mercato</p>

        <div className="flex gap-1.5 mt-5 bg-white/10 rounded-xl p-1">
          {TABS.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                if (t.key === 'create') {
                  setEditingId(null);
                  setFormData({
                    title: '',
                    description: '',
                    market_id: staffMember?.market_id || '',
                    event_date: '',
                    time_start: '',
                    time_end: '',
                    is_mandatory: true,
                  });
                }
                setActiveTab(t.key);
              }}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors',
                activeTab === t.key ? 'bg-secondary text-primary shadow-md' : 'text-white/80 hover:bg-white/10'
              )}
            >
              {t.label}
              {t.key === 'upcoming' && upcomingEvents.length > 0 && ` (${upcomingEvents.length})`}
              {t.key === 'history' && pastEvents.length > 0 && ` (${pastEvents.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-8 max-w-2xl mx-auto space-y-6">

        {activeTab === 'upcoming' && (
          <Card className="p-6 border border-border/50">
            <h2 className="font-heading text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Eventi in programma
            </h2>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nessun evento in programma</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((ev) => <EventRow key={ev.id} ev={ev} editable />)}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'history' && (
          <Card className="p-6 border border-border/50">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="font-heading text-base font-semibold text-foreground flex items-center gap-2">
                <HistoryIcon className="w-4 h-4 text-primary" /> Storico eventi
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={pastEvents.length === 0}>
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Excel
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={pastEvents.length === 0}>
                  <Download className="w-3.5 h-3.5 mr-1.5" /> PDF
                </Button>
              </div>
            </div>
            {pastEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nessun evento in cronologia</p>
            ) : (
              <div className="space-y-2">
                {pastEvents.map((ev) => <EventRow key={ev.id} ev={ev} />)}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'create' && (
          <>
            {/* Titolo */}
            <Card className="p-6 border border-border/50">
              <h2 className="font-heading text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <CalendarPlus className="w-4 h-4 text-primary" /> {editingId ? 'Modifica Evento' : 'Dettagli Evento'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Titolo evento <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={formData.title}
                    onChange={e => set('title', e.target.value)}
                    placeholder="Es: Mercato Speciale di Primavera"
                    className={errors.title ? 'border-destructive ring-1 ring-destructive' : ''}
                    autoFocus
                  />
                  {errors.title && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.title}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Descrizione <span className="text-muted-foreground font-normal">(opzionale)</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={e => set('description', e.target.value)}
                    placeholder="Aggiungi dettagli sull'evento..."
                    className="w-full px-3 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                    rows="3"
                  />
                </div>
              </div>
            </Card>

            {/* Mercato */}
            <Card className="p-6 border border-border/50">
              <h2 className="font-heading text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Mercato di Riferimento
              </h2>
              <SearchableList
                items={marketItems}
                value={formData.market_id}
                onChange={(id) => set('market_id', id)}
                placeholder="Seleziona il mercato..."
                searchPlaceholder="Cerca mercato per nome o città..."
                className={errors.market_id ? 'ring-2 ring-destructive rounded-xl' : ''}
              />
              {errors.market_id && (
                <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.market_id}
                </p>
              )}
              {selectedMarket && (
                <div className="mt-3 flex items-center gap-2 text-xs text-primary bg-primary/5 border border-primary/20 px-3 py-2 rounded-lg">
                  <CheckCircle className="w-3 h-3" />
                  <span>Mercato selezionato: <strong>{selectedMarket.name}</strong>{selectedMarket.city ? `, ${selectedMarket.city}` : ''}</span>
                </div>
              )}
            </Card>

            {/* Data e orari */}
            <Card className="p-6 border border-border/50">
              <h2 className="font-heading text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Data e Orari
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Data evento <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.event_date}
                    onChange={e => set('event_date', e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                      errors.event_date ? 'border-destructive ring-1 ring-destructive' : 'border-input'
                    }`}
                  />
                  {errors.event_date && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.event_date}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">Orario inizio</label>
                    <input
                      type="time"
                      value={formData.time_start}
                      onChange={e => set('time_start', e.target.value)}
                      className="w-full px-3 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">Orario fine</label>
                    <input
                      type="time"
                      value={formData.time_end}
                      onChange={e => set('time_end', e.target.value)}
                      className="w-full px-3 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Tipo evento */}
            <Card className="p-6 border border-border/50">
              <h2 className="font-heading text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" /> Tipo Partecipazione
              </h2>
              <div className="grid grid-cols-1 gap-3">
                {MANDATORY_OPTIONS.map(opt => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => set('is_mandatory', opt.value)}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                      formData.is_mandatory === opt.value ? opt.activeColor : opt.color + ' hover:opacity-80'
                    }`}
                  >
                    <span className="text-2xl mt-0.5">{opt.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-foreground">{opt.label}</p>
                        {formData.is_mandatory === opt.value && (
                          <CheckCircle className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* CTA */}
            <div className="pb-6">
              <Button
                onClick={handleSubmit}
                disabled={saveMutation.isPending}
                className="w-full h-13 text-base font-semibold gap-2 shadow-lg shadow-primary/20"
                size="lg"
              >
                {saveMutation.isPending
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> {editingId ? 'Salvataggio...' : 'Creazione in corso...'}</>
                  : editingId
                    ? <><CheckCircle className="w-5 h-5" /> Salva Modifiche</>
                    : <><CalendarPlus className="w-5 h-5" /> Crea Evento</>}
              </Button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({
                      title: '',
                      description: '',
                      market_id: staffMember?.market_id || '',
                      event_date: '',
                      time_start: '',
                      time_end: '',
                      is_mandatory: true,
                    });
                    setActiveTab('upcoming');
                  }}
                  className="w-full text-center text-xs text-muted-foreground mt-2 underline"
                >
                  Annulla modifica
                </button>
              )}
              <p className="text-xs text-center text-muted-foreground mt-3">
                {editingId
                  ? 'Le modifiche non inviano una nuova notifica ai produttori'
                  : formData.is_mandatory
                    ? '🔴 I produttori del mercato verranno notificati automaticamente'
                    : '🔵 I produttori riceveranno una notifica con possibilità di accettare o declinare'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Dialog presenze/assenze per azienda */}
      {selectedEventForRsvp && (
        <Dialog open onOpenChange={() => setSelectedEventForRsvp(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg">{selectedEventForRsvp.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Cerca azienda..."
                  value={searchAzienda}
                  onChange={(e) => setSearchAzienda(e.target.value)}
                />
              </div>

              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <ThumbsUp className="w-3.5 h-3.5" /> Presenti previsti ({presenti.length})
                </p>
                {presenti.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nessuna azienda</p>
                ) : (
                  <div className="space-y-1.5">
                    {presenti.map((c) => (
                      <div key={c.id} className="text-sm px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                        {c.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-destructive uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <ThumbsDown className="w-3.5 h-3.5" /> Assenti previsti ({assenti.length})
                </p>
                {assenti.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nessuna azienda</p>
                ) : (
                  <div className="space-y-1.5">
                    {assenti.map((c) => (
                      <div key={c.id} className="text-sm px-3 py-2 rounded-lg bg-destructive/5 border border-destructive/10">
                        {c.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" /> In attesa di risposta ({inAttesa.length})
                </p>
                {inAttesa.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nessuna azienda</p>
                ) : (
                  <div className="space-y-1.5">
                    {inAttesa.map((c) => (
                      <div key={c.id} className="text-sm px-3 py-2 rounded-lg bg-muted/40 border border-border">
                        {c.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
