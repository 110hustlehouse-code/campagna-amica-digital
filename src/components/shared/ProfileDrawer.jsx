import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { supabase } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Heart, MapPin, Building2, Newspaper, LogOut, ChevronRight, User, X, Leaf } from 'lucide-react';

const menuLinks = [
  { path: '/ordini', label: 'I miei ordini', desc: 'Visualizza e gestisci gli ordini', icon: ShoppingBag },
  { path: '/preferiti', label: 'Preferiti', desc: 'Le aziende che segui', icon: Heart },
  { path: '/aziende', label: 'Aziende', desc: 'Scopri i produttori', icon: Building2 },
  { path: '/mercati', label: 'Mercati', desc: 'Trova il mercato vicino a te', icon: MapPin },
  { path: '/notizie', label: 'Notizie', desc: 'Aggiornamenti dal mondo agricolo', icon: Newspaper },
];

export default function ProfileDrawer({ open, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const handleNav = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-full max-w-xs p-0 flex flex-col">
        {/* Header profilo */}
        <div className="bg-primary px-5 pt-8 pb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Leaf className="w-4 h-4 text-secondary" />
              <span className="text-secondary font-bold text-[10px] tracking-widest uppercase">Campagna Amica</span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xl">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-base leading-tight truncate">{user?.full_name || 'Utente'}</p>
              <p className="text-white/70 text-xs mt-0.5 truncate">{user?.email}</p>
              <span className="inline-block mt-1 bg-secondary text-primary text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Cliente
              </span>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="flex-1 overflow-y-auto py-3">
          <p className="px-5 py-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Menu</p>
          {menuLinks.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-primary/5 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
              </button>
            );
          })}

          {/* Divider */}
          <div className="mx-5 my-3 border-t border-border/50" />

          <p className="px-5 py-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Account</p>

          {/* Cambia modalità */}
          <button
            onClick={() => handleNav('/benvenuto')}
            className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-primary/5 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Cambia modalità</p>
              <p className="text-xs text-muted-foreground">Passa alla vista Produttore</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
          </button>
        </div>

        {/* Logout */}
        <div className="px-5 pt-4 pb-3 border-t border-border/50 space-y-3">
          <Button
            variant="outline"
            className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut className="w-4 h-4" />
            Esci dall'account
          </Button>
          <div className="flex items-center justify-center gap-3 pt-1 opacity-60">
            <img src="https://media.base44.com/images/public/69cd578540390a850769aa6d/570bdc5f1_cropped-coldiretti-vector-logo.png" alt="Coldiretti" className="h-5 w-auto" />
            <img src="https://media.base44.com/images/public/69cd578540390a850769aa6d/ce1586586_images.jpeg" alt="Campagna Amica" className="h-5 w-auto rounded" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}