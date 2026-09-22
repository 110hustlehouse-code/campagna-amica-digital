import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyStaffMember, getAllStaffMessages, createMessage, updateMessage, deleteMessage } from '@/api/staff';
import { getMarkets } from '@/api/markets';
import { uploadFile } from '@/api/storage';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Edit2, Trash2, Eye, EyeOff, Upload, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import MarketSelector from '@/components/shared/MarketSelector';
import StaffCalendar from '@/components/staff/StaffCalendar';
import StaffDashboard from '@/components/staff/StaffDashboard';

const TYPE_LABELS = {
  closure: 'Chiusura',
  special_opening: 'Apertura speciale',
  event: 'Evento',
};

const TYPE_COLORS = {
  closure: 'bg-red-100 text-red-700',
  special_opening: 'bg-green-100 text-green-700',
  event: 'bg-blue-100 text-blue-700',
};

export default function StaffHome() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [staffMember, setStaffMember] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'event',
    is_mandatory: false,
    location: '',
    event_date: '',
    time_start: '',
    time_end: '',
    details: '',
    is_published: false,
    attachments: [],
  });
  const [isUploading, setIsUploading] = useState(false);

  // Fetch staff member to get their market
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const staff = await getMyStaffMember();
        if (staff.length > 0) {
          setStaffMember(staff[0]);
        }
      } catch (err) {
        console.error('Error fetching staff:', err);
      }
    };
    if (user?.email) {
      fetchStaff();
    }
  }, [user?.email]);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['staff-messages'],
    queryFn: getAllStaffMessages,
  });

  const { data: markets = [] } = useQuery({
    queryKey: ['markets-list'],
    queryFn: getMarkets,
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      if (editingId) {
        return updateMessage(editingId, data);
      }
      return createMessage(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-messages'] });
      resetForm();
      toast({ title: editingId ? 'Comunicazione aggiornata' : 'Comunicazione creata' });
    },
    onError: (err) => {
      toast({ title: 'Errore', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMessage,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-messages'] });
      toast({ title: 'Comunicazione eliminata' });
    },
    onError: (err) => {
      toast({ title: 'Errore', description: err.message, variant: 'destructive' });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: (msg) => updateMessage(msg.id, { is_published: !msg.is_published }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-messages'] });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'event',
      is_mandatory: false,
      location: '',
      event_date: '',
      time_start: '',
      time_end: '',
      details: '',
      is_published: false,
      attachments: [],
    });
    setEditingId(null);
    setShowDialog(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const uploadRes = await uploadFile(file, 'allegati');
      const newAttachment = {
        name: file.name,
        url: uploadRes.file_url,
        type: file.type,
      };
      setFormData({
        ...formData,
        attachments: [...(formData.attachments || []), newAttachment],
      });
      toast({ title: 'File caricato' });
    } catch (err) {
      toast({ title: 'Errore upload', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAttachment = (index) => {
    setFormData({
      ...formData,
      attachments: formData.attachments.filter((_, i) => i !== index),
    });
  };

  const handleEdit = (msg) => {
    setFormData(msg);
    setEditingId(msg.id);
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.location || !formData.event_date) {
      toast({ title: 'Compila i campi obbligatori', variant: 'destructive' });
      return;
    }
    createMutation.mutate(formData);
  };

  const filteredMessages = messages
    .filter(msg => {
      // Filter by staff member's market
      if (!staffMember?.market_id) return false;
      return msg.location === (markets.find(m => m.id === staffMember.market_id)?.name || '');
    })
    .filter(msg => {
      // Filter by selected date if any
      if (!selectedDate) return true;
      return isSameDay(new Date(msg.event_date), selectedDate);
    });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Intestazione istituzionale */}
      <div className="bg-gradient-to-r from-primary via-primary/95 to-secondary border-b-4 border-secondary px-6 pt-12 pb-8 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-secondary rounded-full px-4 py-1.5 mb-3 shadow-md">
              <span className="text-primary font-bold text-xs tracking-widest uppercase">📢 Comunicazioni Staff</span>
            </div>
            <h1 className="font-heading text-4xl font-bold text-white drop-shadow-lg">Comunicazioni</h1>
            <p className="text-white/90 text-sm mt-2 font-medium">
              Crea, gestisci e pubblica comunicazioni per i produttori certificati
            </p>
          </div>
          <div className="hidden md:block text-white/20 text-6xl">🌾</div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8 max-w-6xl mx-auto space-y-8">
        {/* Dashboard statistiche */}
          {filteredMessages.length > 0 && (
            <StaffDashboard messages={filteredMessages} />
          )}

          {/* Calendario */}
          {filteredMessages.length > 0 && (
            <StaffCalendar messages={filteredMessages} onDateSelect={setSelectedDate} />
          )}

        {/* Lista comunicazioni */}
        {!staffMember?.market_id ? (
           <div className="text-center py-16">
             <p className="text-lg font-semibold text-foreground mb-6">Assegna un mercato nel tuo profilo per ricevere notifiche</p>
           </div>
         ) : filteredMessages.length === 0 && messages.length === 0 ? (
           <div className="text-center py-16">
             <p className="text-lg font-semibold text-foreground mb-6">Nessuna comunicazione creata</p>
             <Button onClick={() => setShowDialog(true)} className="rounded-xl gap-2 h-11 text-base">
               <Plus className="w-5 h-5" />
               Nuova comunicazione
             </Button>
           </div>
         ) : filteredMessages.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🗓️</span>
                </div>
                <p className="text-muted-foreground font-medium">Nessuna comunicazione {selectedDate && `per il ${format(selectedDate, 'd MMMM yyyy', { locale: it })}`}</p>
                <Button 
                  variant="outline"
                  onClick={() => setSelectedDate(null)}
                  className="mt-4 rounded-xl"
                >
                  Mostra tutte le comunicazioni
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDate && (
                  <div className="flex items-center justify-between mb-4 bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <h2 className="text-lg font-semibold text-foreground">
                      📅 Comunicazioni per {format(selectedDate, 'EEEE d MMMM yyyy', { locale: it })}
                    </h2>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedDate(null)}
                      className="text-primary hover:text-primary/90"
                    >
                      Cancella filtro
                    </Button>
                  </div>
                )}
                {filteredMessages.map((msg) => (
                  <div key={msg.id} className="bg-white rounded-xl border-2 border-primary/20 p-6 hover:shadow-lg hover:border-primary/40 transition-all hover:-translate-y-0.5 animate-in fade-in-50 duration-300">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-heading font-semibold text-lg text-foreground">{msg.title}</h3>
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${msg.type === 'closure' ? 'bg-red-100/80 text-red-700 border-red-300' : msg.type === 'special_opening' ? 'bg-green-100/80 text-green-700 border-green-300' : 'bg-blue-100/80 text-blue-700 border-blue-300'}`}>
                            {msg.type === 'closure' ? '🔴' : msg.type === 'special_opening' ? '🟢' : '🔵'} {TYPE_LABELS[msg.type]}
                          </span>
                      {msg.is_mandatory && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          Obbligatorio
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{msg.description}</p>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground font-semibold">Luogo</p>
                        <p className="text-foreground">{msg.location}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-semibold">Data</p>
                        <p className="text-foreground">
                          {format(new Date(msg.event_date), 'd MMMM yyyy', { locale: it })}
                        </p>
                      </div>
                      {msg.time_start && (
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold">Orario</p>
                          <p className="text-foreground">
                            {msg.time_start}{msg.time_end ? ` - ${msg.time_end}` : ''}
                          </p>
                        </div>
                      )}
                      {msg.details && (
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold">Dettagli</p>
                          <p className="text-foreground">{msg.details}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {msg.is_published ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-100/60 px-2.5 py-1 rounded-lg border border-green-300/50">
                          ✓ Pubblicato
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-100/60 px-2.5 py-1 rounded-lg border border-amber-300/50">
                          📝 Bozza
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => togglePublishMutation.mutate(msg)}
                      disabled={togglePublishMutation.isPending}
                    >
                      {msg.is_published ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(msg)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => deleteMutation.mutate(msg.id)}
                      disabled={deleteMutation.isPending}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      {showDialog && (
        <Dialog open onOpenChange={() => !createMutation.isPending && resetForm()}>
          <DialogContent className="max-w-2xl mx-4 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl">
                {editingId ? 'Modifica comunicazione' : 'Nuova comunicazione'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Titolo *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Es: Mercato chiuso domenica"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Descrizione</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrizione dettagliata"
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Tipo *</label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="closure">Chiusura</SelectItem>
                      <SelectItem value="special_opening">Apertura speciale</SelectItem>
                      <SelectItem value="event">Evento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_mandatory}
                      onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-semibold text-foreground">Obbligatorio</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Luogo *</label>
                <MarketSelector
                  value={formData.location}
                  onChange={(market) => setFormData({ ...formData, location: market.name })}
                  markets={markets}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Data *</label>
                  <input
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Ora inizio</label>
                  <input
                    type="time"
                    value={formData.time_start}
                    onChange={(e) => setFormData({ ...formData, time_start: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Ora fine</label>
                  <input
                    type="time"
                    value={formData.time_end}
                    onChange={(e) => setFormData({ ...formData, time_end: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Dettagli aggiuntivi</label>
                <textarea
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  placeholder="Informazioni extra"
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  rows="2"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Allega file (PDF, immagini, documenti)</label>
                <div className="border-2 border-dashed border-input rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer block">
                    <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">
                      {isUploading ? 'Caricamento...' : 'Clicca per selezionare file'}
                    </p>
                  </label>
                </div>
                {formData.attachments?.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {formData.attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-muted/50 p-2 rounded-lg text-sm">
                        <p className="text-foreground truncate">{att.name}</p>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg p-3">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  id="publish"
                  className="w-4 h-4"
                />
                <label htmlFor="publish" className="text-sm font-semibold text-primary cursor-pointer">
                  Pubblica immediatamente per i produttori
                </label>
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