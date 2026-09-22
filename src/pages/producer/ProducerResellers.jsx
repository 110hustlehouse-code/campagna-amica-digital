import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Copy, Store, Loader2, Check, Eye, EyeOff } from 'lucide-react';
import { getMyCompany } from '@/api/companies';
import { getResellerPasswords, createResellerPassword, revokeResellerPassword } from '@/api/resellers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';

function generaPasswordCasuale() {
  // Facile da leggere e digitare a voce: niente 0/O, 1/l, niente simboli.
  const alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return out;
}

export default function ProducerResellers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [nuovaPer, setNuovaPer] = useState(null); // 1 o 2, quando il dialog è aperto
  const [label, setLabel] = useState('');
  const [passwordGenerata, setPasswordGenerata] = useState('');
  const [passwordCreata, setPasswordCreata] = useState(null); // { password, listino } — mostrata UNA volta
  const [mostraPassword, setMostraPassword] = useState(false);

  const { data: azienda } = useQuery({
    queryKey: ['my-company', user?.email],
    queryFn: getMyCompany,
    enabled: !!user?.email,
  });

  const { data: passwords = [], isLoading } = useQuery({
    queryKey: ['reseller-passwords', azienda?.id],
    queryFn: () => getResellerPasswords(azienda.id),
    enabled: !!azienda?.id,
  });

  const creaMutation = useMutation({
    mutationFn: async () => {
      const pwd = passwordGenerata || generaPasswordCasuale();
      await createResellerPassword(azienda.id, nuovaPer, label.trim() || null, pwd);
      return pwd;
    },
    onSuccess: (pwd) => {
      qc.invalidateQueries({ queryKey: ['reseller-passwords'] });
      setPasswordCreata({ password: pwd, listino: nuovaPer });
      setNuovaPer(null);
      setLabel('');
      setPasswordGenerata('');
    },
    onError: (e) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  const revocaMutation = useMutation({
    mutationFn: revokeResellerPassword,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reseller-passwords'] });
      toast({ title: 'Password revocata' });
    },
  });

  const apriDialog = (listino) => {
    setNuovaPer(listino);
    setLabel('');
    setPasswordGenerata(generaPasswordCasuale());
  };

  const copiaLink = () => {
    const url = `${window.location.origin}/rivenditore/${azienda.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copiato' });
  };

  const copiaPassword = (testo) => {
    navigator.clipboard.writeText(testo);
    toast({ title: 'Password copiata' });
  };

  if (!azienda) {
    return (
      <div className="p-8 text-center">
        <Store className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Completa prima il profilo della tua azienda.</p>
      </div>
    );
  }

  const attive1 = passwords.filter((p) => p.pricelist_id === 1 && !p.revoked_at);
  const attive2 = passwords.filter((p) => p.pricelist_id === 2 && !p.revoked_at);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/produttore/prodotti')} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Store className="w-6 h-6 text-primary" /> Rivenditori
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Due listini a prezzi riservati, sbloccabili con una password
          </p>
        </div>
      </div>

      <div className="border rounded-xl p-4 bg-muted/20 mb-6 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground mb-0.5">Link da dare ai rivenditori</p>
          <p className="text-sm truncate">{window.location.origin}/rivenditore/{azienda.id}</p>
        </div>
        <Button size="sm" variant="outline" onClick={copiaLink} className="shrink-0">
          <Copy className="w-3.5 h-3.5 mr-1" /> Copia
        </Button>
      </div>

      <p className="text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg p-3 mb-6">
        Il prezzo che un rivenditore vede per un prodotto è quello impostato nella scheda del
        prodotto, per il Listino 1 o il Listino 2. Un prodotto senza prezzo per quel listino
        semplicemente non compare.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-6">
          {[{ id: 1, attive: attive1 }, { id: 2, attive: attive2 }].map(({ id, attive }) => (
            <div key={id} className="border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-muted/30 border-b flex items-center justify-between">
                <p className="font-semibold text-sm">Listino {id}</p>
                <Button size="sm" variant="outline" onClick={() => apriDialog(id)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Nuova password
                </Button>
              </div>
              {attive.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nessuna password attiva</p>
              ) : (
                <div className="divide-y">
                  {attive.map((p) => (
                    <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.label || 'Senza nome'}</p>
                        <p className="text-xs text-muted-foreground">
                          Creata il {new Date(p.created_at).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                      <Button
                        size="sm" variant="ghost"
                        className="text-destructive hover:text-destructive shrink-0"
                        onClick={() => revocaMutation.mutate(p.id)}
                        disabled={revocaMutation.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Revoca
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* -------------------------------------------- nuova password */}
      <Dialog open={nuovaPer !== null} onOpenChange={(open) => !open && setNuovaPer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nuova password — Listino {nuovaPer}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Nome (per riconoscerla — es. "Bar Rossi")
              </label>
              <Input placeholder="Facoltativo" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Password</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={mostraPassword ? 'text' : 'password'}
                    value={passwordGenerata}
                    onChange={(e) => setPasswordGenerata(e.target.value)}
                    className="font-mono pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setMostraPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {mostraPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button type="button" variant="outline" onClick={() => setPasswordGenerata(generaPasswordCasuale())}>
                  Rigenera
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Generata automaticamente, modificabile. Dopo aver creato la password non sarà più
                possibile vederla di nuovo — solo revocarla e crearne una nuova.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNuovaPer(null)}>Annulla</Button>
            <Button onClick={() => creaMutation.mutate()} disabled={creaMutation.isPending || !passwordGenerata.trim()}>
              {creaMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Crea password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------- password appena creata */}
      <Dialog open={!!passwordCreata} onOpenChange={(open) => !open && setPasswordCreata(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <Check className="w-5 h-5" /> Password creata
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Copiala e mandala al rivenditore insieme al link — questa è l'unica volta che la
              vedrai. Se la perdi, dovrai revocarla e crearne una nuova.
            </p>
            <div className="flex items-center gap-2 border rounded-lg p-3 bg-muted/20">
              <span className="font-mono text-sm flex-1">{passwordCreata?.password}</span>
              <Button size="sm" variant="outline" onClick={() => copiaPassword(passwordCreata.password)}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setPasswordCreata(null)}>Fatto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}