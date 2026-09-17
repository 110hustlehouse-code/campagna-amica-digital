import React from 'react';
import { supabase } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogOut, Building2, MapPin, ShoppingBag, Newspaper, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function UserMenuClient() {
  const { user } = useAuth();

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white border-2 border-white/30 shadow-lg transition-all duration-200 hover:shadow-xl active:scale-95">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs font-heading">
            {initials}
          </div>
          <ChevronDown className="w-4 h-4 opacity-80" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="font-semibold text-sm truncate">{user?.full_name || 'Utente'}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="px-2 py-1.5">
          <p className="text-xs text-muted-foreground font-semibold mb-2">Categorie App</p>
          <div className="space-y-1">
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to="/aziende" className="flex gap-2">
                <Building2 className="w-4 h-4" />
                Aziende
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to="/mercati" className="flex gap-2">
                <MapPin className="w-4 h-4" />
                Mercati
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to="/ordini" className="flex gap-2">
                <ShoppingBag className="w-4 h-4" />
                I miei ordini
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to="/notizie" className="flex gap-2">
                <Newspaper className="w-4 h-4" />
                Notizie
              </Link>
            </DropdownMenuItem>
          </div>
        </div>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => supabase.auth.signOut()} className="gap-2 text-destructive focus:text-destructive">
          <LogOut className="w-4 h-4" />
          Esci
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}