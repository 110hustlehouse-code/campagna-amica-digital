import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getMyStaffMember, createMessage } from '@/api/staff';
import { getMarkets } from '@/api/markets';
import { invokeFunction } from '@/api/functions';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  CalendarPlus, MapPin, Clock, AlertCircle, CheckCircle,
  Loader2, ChevronLeft, Info,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import SearchableList from '@/components/staff/SearchableList';

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

export default function CreateEvent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [staffMember, setStaffMember] = useState(null);
  const [errors, setErrors] = useState({});
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
      if (staff.length > 0) {
        setStaffMember(staff[0]);
        setFormData(prev => ({ ...prev, market_id: staff[0].market_id || '' }));
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

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // 1. Save StaffMessage as event (with market_id for filtering)
      const market = markets.find(m => m.id === data.market_id);
      const msg = await createMessage({
        title: data.title,
        description: data.description,
        type: 'event',
        is_mandatory: data.is_mandatory,
        market_id: data.market_id,
        location: market?.name || '',
        event_date: data.event_date,
        time_start: data.time_start,
        time_end: data.time_end,
        is_published: true,
      });

      // 2. Trigger notifications via backend function
      await invokeFunction('notifyProducersNewCommunication', {
        message_id: msg.id,
        market_id: data.market_id,
        is_mandatory: data.is_mandatory,
        title: data.title,
      });

      return msg;
    },
    onSuccess: () => {
      toast({ title: '✅ Evento creato correttamente' });
      navigate('/staff');
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
    createMutation.mutate(formData);
  };

  const set = (key, val) => {
    setFormData(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const selectedMarket = markets.find(m => m.id === formData.market_id);

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
          <span className="text-primary font-bold text-xs tracking-widest uppercase">📅 Crea Evento</span>
        </div>
        <h1 className="font-heading text-4xl font-bold text-white drop-shadow-lg">Nuovo Evento</h1>
        <p className="text-white/80 text-sm mt-1">Crea un evento collegato al mercato e notifica i produttori</p>
      </div>

      <div className="px-6 py-8 max-w-2xl mx-auto space-y-6">

        {/* Titolo */}
        <Card className="p-6 border border-border/50">
          <h2 className="font-heading text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <CalendarPlus className="w-4 h-4 text-primary" /> Dettagli Evento
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
            disabled={createMutation.isPending}
            className="w-full h-13 text-base font-semibold gap-2 shadow-lg shadow-primary/20"
            size="lg"
          >
            {createMutation.isPending
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Creazione in corso...</>
              : <><CalendarPlus className="w-5 h-5" /> Crea Evento</>}
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-3">
            {formData.is_mandatory
              ? '🔴 I produttori del mercato verranno notificati automaticamente'
              : '🔵 I produttori riceveranno una notifica con possibilità di accettare o declinare'}
          </p>
        </div>
      </div>
    </div>
  );
}