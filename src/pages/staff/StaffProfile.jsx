import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/client';
import { getMyProfile } from '@/api/auth';
import { getMyStaffMember, updateStaffMember } from '@/api/staff';
import { getMarkets, updateMarket } from '@/api/markets';
import { uploadFile } from '@/api/storage';
import { invokeFunction } from '@/api/functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LogOut, Mail, Shield, Calendar, User, CheckCircle, Trash2,
  MapPin, Loader2, Phone, Building2, AlertCircle, Key, Edit2, Save, X, Users, Upload, ImageIcon,
} from 'lucide-react';
import StaffMembers from '@/pages/staff/StaffMembers';
import { useToast } from '@/components/ui/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import SearchableList from '@/components/staff/SearchableList';

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const POSITION_LABELS = {
  market_manager: 'Gestore Mercato',
  coordinator: 'Coordinatore',
  administrator: 'Amministratore',
};

export default function StaffProfile() {
  const [user, setUser] = useState(null);
  const [staffMember, setStaffMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState('');
  const [marketError, setMarketError] = useState(false);
  const [editPosition, setEditPosition] = useState(false);
  const [editPhone, setEditPhone] = useState(false);
  const [newPosition, setNewPosition] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [gpsMarketId, setGpsMarketId] = useState(null);
  const [showTeam, setShowTeam] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploadingMarketPhoto, setUploadingMarketPhoto] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: markets = [] } = useQuery({
    queryKey: ['markets-list'],
    queryFn: getMarkets,
  });

  // GPS detection
  useEffect(() => {
    if (markets.length === 0) return;
    navigator.geolocation?.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      let closest = null, minDist = Infinity;
      markets.forEach(m => {
        if (m.latitude && m.longitude) {
          const d = haversine(latitude, longitude, m.latitude, m.longitude);
          if (d < minDist) { minDist = d; closest = m.id; }
        }
      });
      if (closest && minDist < 30) setGpsMarketId(closest);
    });
  }, [markets]);

  const marketItems = markets.map(m => ({
    id: m.id,
    label: m.name,
    sublabel: m.city || '',
  }));

  const updateMarketMutation = useMutation({
    mutationFn: (marketId) =>
      updateStaffMember(staffMember.id, { market_id: marketId }),
    onSuccess: (data) => {
      setStaffMember(data);
      qc.invalidateQueries({ queryKey: ['staff-profile'] });
      toast({ title: '✅ Mercato aggiornato correttamente' });
    },
    onError: (err) => toast({ title: 'Errore', description: err.message, variant: 'destructive' }),
  });

  const updatePositionMutation = useMutation({
    mutationFn: (position) =>
      updateStaffMember(staffMember.id, { position }),
    onSuccess: (data) => {
      setStaffMember(data);
      setEditPosition(false);
      toast({ title: '✅ Posizione aggiornata correttamente' });
    },
    onError: (err) => toast({ title: 'Errore', description: err.message, variant: 'destructive' }),
  });

  const updatePhoneMutation = useMutation({
    mutationFn: (phone) =>
      updateStaffMember(staffMember.id, { phone }),
    onSuccess: (data) => {
      setStaffMember(data);
      setEditPhone(false);
      toast({ title: '✅ Telefono aggiornato correttamente' });
    },
    onError: (err) => toast({ title: 'Errore', description: err.message, variant: 'destructive' }),
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await getMyProfile();
        setUser(userData);
        const staff = await getMyStaffMember();
        if (staff.length > 0) {
          setStaffMember(staff[0]);
          setSelectedMarket(staff[0].market_id || '');
          setNewPosition(staff[0].position || 'market_manager');
          setNewPhone(staff[0].phone || '');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const handleSaveMarket = () => {
    if (!selectedMarket) { setMarketError(true); return; }
    setMarketError(false);
    updateMarketMutation.mutate(selectedMarket);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/benvenuto');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmInput.toLowerCase() !== 'elimina account') {
      toast({ title: 'Errore', description: 'Conferma non valida', variant: 'destructive' });
      return;
    }
    try {
      // Delete user via backend (requires a function)
      await invokeFunction('deleteUserAccount', {});
      toast({ title: 'Account eliminato', description: 'Il tuo account è stato eliminato permanentemente' });
      await supabase.auth.signOut();
      navigate('/benvenuto');
    } catch (err) {
      toast({ title: 'Errore', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const currentMarketName = markets.find(m => m.id === staffMember?.market_id)?.name;
  const currentMarket = markets.find(m => m.id === staffMember?.market_id);

  const handleMarketPhotoUpload = async (file) => {
    if (!currentMarket) return;
    setUploadingMarketPhoto(true);
    const { file_url } = await uploadFile(file, 'mercati');
    await updateMarket(currentMarket.id, { image_url: file_url });
    qc.invalidateQueries({ queryKey: ['markets-list'] });
    qc.invalidateQueries({ queryKey: ['markets-count'] });
    qc.invalidateQueries({ queryKey: ['market', currentMarket.id] });
    setUploadingMarketPhoto(false);
    toast({ title: '✅ Foto mercato aggiornata!' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary/95 to-secondary border-b-4 border-secondary px-6 pt-12 pb-8 shadow-lg">
        <div className="inline-flex items-center gap-1.5 bg-secondary rounded-full px-4 py-1.5 mb-3 shadow-md">
          <span className="text-primary font-bold text-xs tracking-widest uppercase">👤 Account</span>
        </div>
        <h1 className="font-heading text-4xl font-bold text-white drop-shadow-lg">Il tuo Profilo</h1>
        <p className="text-white/80 text-sm mt-1">Gestisci le tue informazioni e il mercato di riferimento</p>
      </div>

      <div className="px-6 py-8 max-w-2xl mx-auto space-y-6">

        {/* User Info */}
        <Card className="p-6 border border-border/50">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0 shadow-md">
              <User className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-heading text-2xl font-bold text-foreground">{user?.full_name}</h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                  {user?.role === 'admin' ? '👑 Amministratore' : '👤 Staff'}
                </span>
                {user?.created_at && (
                  <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-full">
                    Iscritto {formatDistanceToNow(new Date(user.created_at), { locale: it, addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Email</p>
                  <p className="text-sm font-medium text-foreground break-all">{user?.email}</p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/20">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-secondary flex-shrink-0" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Membro dal</p>
                  {user?.created_at && (
                    <p className="text-sm font-medium text-foreground">
                      {format(new Date(user.created_at), 'd MMMM yyyy', { locale: it })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100">
            <Key className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <p className="text-xs text-blue-700">La tua password è protetta e gestita in sicurezza dal sistema</p>
          </div>
        </Card>

        {/* Market Selection Card */}
        {staffMember && (
          <Card className="p-6 border border-border/50">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold text-foreground">Mercato di Riferimento</h3>
                <p className="text-xs text-muted-foreground">
                  {currentMarketName
                    ? <span className="text-primary font-medium">Attuale: {currentMarketName}</span>
                    : 'Nessun mercato selezionato'}
                </p>
              </div>
            </div>

            <SearchableList
              items={marketItems}
              value={selectedMarket}
              onChange={(id) => { setSelectedMarket(id); setMarketError(false); }}
              placeholder="Seleziona un mercato..."
              searchPlaceholder="Cerca per nome o città..."
              highlightedId={gpsMarketId}
              className={marketError ? 'ring-2 ring-destructive rounded-xl' : ''}
            />
            {marketError && (
              <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Seleziona un mercato per continuare
              </p>
            )}

            <Button
              onClick={handleSaveMarket}
              disabled={updateMarketMutation.isPending || selectedMarket === (staffMember.market_id || '')}
              className="w-full mt-4 h-11 text-base font-semibold gap-2"
            >
              {updateMarketMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><Save className="w-4 h-4" /> Salva e Continua</>}
            </Button>
          </Card>
        )}

        {/* Foto Mercato */}
        {staffMember && currentMarket && (
          <Card className="p-6 border border-border/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold text-foreground">Foto Mercato</h3>
                <p className="text-xs text-muted-foreground">Immagine visibile in /mercati</p>
              </div>
            </div>
            <div className="relative rounded-xl overflow-hidden bg-muted aspect-[16/9] mb-3">
              {currentMarket.image_url ? (
                <img src={currentMarket.image_url} alt={currentMarket.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <MapPin className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">Nessuna foto</p>
                </div>
              )}
            </div>
            <label className="flex items-center justify-center gap-2 cursor-pointer w-full py-2.5 rounded-xl border border-primary/30 text-primary text-sm font-medium hover:bg-primary/5 transition-colors">
              {uploadingMarketPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploadingMarketPhoto ? 'Caricamento...' : (currentMarket.image_url ? 'Cambia foto' : 'Carica foto')}
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleMarketPhotoUpload(e.target.files[0])} disabled={uploadingMarketPhoto} />
            </label>
          </Card>
        )}

        {/* Professional Details */}
        {staffMember && (
          <Card className="p-6 border border-border/50 bg-gradient-to-br from-primary/5 to-secondary/5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" /> Incarico Professionale
              </h3>
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                staffMember.is_active
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {staffMember.is_active
                  ? <><CheckCircle className="w-3 h-3" /> Attivo</>
                  : <><AlertCircle className="w-3 h-3" /> Inattivo</>}
              </span>
            </div>

            <div className="space-y-4">
              {/* Position */}
              <div className="p-4 rounded-xl bg-white/50 border border-white/60">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" /> Posizione
                  </label>
                  {!editPosition && (
                    <button onClick={() => setEditPosition(true)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <Edit2 className="w-3 h-3" /> Modifica
                    </button>
                  )}
                </div>
                {editPosition ? (
                   <div className="flex gap-2">
                     <Select value={newPosition} onValueChange={setNewPosition}>
                       <SelectTrigger className="flex-1">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="market_manager">Gestore Mercato</SelectItem>
                         <SelectItem value="coordinator">Coordinatore</SelectItem>
                         <SelectItem value="administrator">Amministratore</SelectItem>
                       </SelectContent>
                     </Select>
                     <Button size="sm" onClick={() => updatePositionMutation.mutate(newPosition)} disabled={updatePositionMutation.isPending}>
                       {updatePositionMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                     </Button>
                     <Button size="sm" variant="outline" onClick={() => { setEditPosition(false); setNewPosition(staffMember.position); }}>
                       <X className="w-3 h-3" />
                     </Button>
                   </div>
                 ) : (
                   <p className="text-sm font-semibold text-foreground">{POSITION_LABELS[newPosition] || 'Non definita'}</p>
                 )}
              </div>

              {/* Phone */}
              <div className="p-4 rounded-xl bg-white/50 border border-white/60">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" /> Telefono
                  </label>
                  {!editPhone && (
                    <button onClick={() => setEditPhone(true)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <Edit2 className="w-3 h-3" /> {newPhone ? 'Modifica' : 'Aggiungi'}
                    </button>
                  )}
                </div>
                {editPhone ? (
                  <div className="flex gap-2">
                    <Input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="+39 3xx xxx xxxx"
                      className="flex-1"
                    />
                    <Button size="sm" onClick={() => updatePhoneMutation.mutate(newPhone)} disabled={updatePhoneMutation.isPending}>
                      {updatePhoneMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditPhone(false); setNewPhone(staffMember.phone || ''); }}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-foreground">
                    {newPhone || <span className="text-muted-foreground italic">Non inserito</span>}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Gestisci Team */}
        <Card className="p-5 border border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-heading text-base font-semibold text-foreground">Team Staff</h3>
                <p className="text-xs text-muted-foreground">Visualizza e gestisci i membri del team</p>
              </div>
            </div>
            <Button
              onClick={() => setShowTeam(true)}
              variant="outline"
              className="gap-2 text-sm font-semibold border-primary/30 text-primary hover:bg-primary/5"
            >
              <Users className="w-4 h-4" /> Gestisci Team
            </Button>
          </div>
        </Card>

        {/* Logout & Delete Account */}
        <div className="pt-2 space-y-3">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full h-11 gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
          >
            <LogOut className="w-4 h-4" /> Esci dal tuo account
          </Button>
          <Button
            onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmInput(''); }}
            variant="outline"
            className="w-full h-11 gap-2 text-red-600 border-red-300/50 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" /> Elimina account
          </Button>
        </div>
      </div>

      {/* Team Dialog */}
      {showTeam && (
        <Dialog open onOpenChange={setShowTeam}>
          <DialogContent className="max-w-2xl w-full mx-2 rounded-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
            <DialogHeader className="sr-only">
              <DialogTitle>Gestisci Team</DialogTitle>
            </DialogHeader>
            <StaffMembers />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Account Confirmation Dialog */}
      {showDeleteConfirm && (
        <Dialog open onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-md mx-2 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> Elimina account
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                <p className="text-sm text-red-900 font-semibold mb-2">⚠️ Azione irreversibile</p>
                <p className="text-sm text-red-800">
                  L'eliminazione dell'account è permanente e non può essere annullata. Tutti i tuoi dati verranno cancellati.
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Digita <span className="font-mono bg-primary/10 px-2 py-1 rounded">elimina account</span> per confermare:
                </label>
                <Input
                  type="text"
                  placeholder="Scrivi qui..."
                  value={deleteConfirmInput}
                  onChange={(e) => setDeleteConfirmInput(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1"
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmInput.toLowerCase() !== 'elimina account'}
                  className="flex-1 bg-red-600 hover:bg-red-700 gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Elimina
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}