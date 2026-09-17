import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Sun, Moon, Monitor, Mail, Phone, MapPin, LogOut, Trash2 } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function ClientProfile() {
  const { user, logout } = useAuth();
  const { theme, updateTheme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  useEffect(() => {
    if (user?.phone) setPhone(user.phone);
    if (user?.city) setCity(user.city);
  }, [user]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await base44.auth.updateMe({ phone, city });
      toast.success('Profilo aggiornato');
    } catch (error) {
      toast.error('Errore nel salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Sei sicuro di voler uscire?')) {
      logout(true);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmInput.toLowerCase() !== 'elimina account') {
      toast.error('Conferma non valida');
      return;
    }
    try {
      await base44.functions.invoke('deleteUserAccount', {});
      toast.success('Account eliminato permanentemente');
      await base44.auth.logout();
      navigate('/benvenuto');
    } catch (err) {
      toast.error(err.message || 'Errore nell\'eliminazione dell\'account');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 bg-card border-b border-border/50">
        <div className="flex items-center gap-3 p-4">
          <BackButton />
          <h1 className="font-heading text-xl font-bold text-foreground">Il mio profilo</h1>
        </div>
      </div>

      <div className="px-4 md:px-6 py-6 max-w-2xl mx-auto space-y-6">
        {/* Account Info */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Informazioni account</CardTitle>
            <CardDescription>Dettagli del tuo account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" /> Email
              </label>
              <div className="px-3 py-2 rounded-lg bg-muted text-foreground text-sm">
                {user?.email}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nome completo</label>
              <div className="px-3 py-2 rounded-lg bg-muted text-foreground text-sm">
                {user?.full_name}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Settings */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Impostazioni profilo</CardTitle>
            <CardDescription>Personalizza il tuo profilo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" /> Telefono
              </label>
              <Input
                type="tel"
                placeholder="Es. +39 3xx xxxx xxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" /> Città
              </label>
              <Input
                type="text"
                placeholder="Es. Roma"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="rounded-lg"
              />
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full bg-primary hover:bg-primary/90 rounded-lg"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salva modifiche
            </Button>
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Tema</CardTitle>
            <CardDescription>Scegli il tema preferito</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', label: 'Chiaro', icon: Sun },
                { id: 'system', label: 'Sistema', icon: Monitor },
                { id: 'dark', label: 'Scuro', icon: Moon },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => updateTheme(id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all min-h-20 justify-center ${
                    theme === id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  <Icon className="w-6 h-6 stroke-current" />
                  <span className="text-xs font-semibold text-center">{label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Logout & Delete Account */}
        <div className="space-y-3">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full rounded-lg text-destructive border-destructive/30 hover:bg-destructive/5"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Esci
          </Button>
          <Button
            onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmInput(''); }}
            variant="outline"
            className="w-full rounded-lg text-red-600 border-red-300/50 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Elimina account
          </Button>
        </div>
      </div>

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