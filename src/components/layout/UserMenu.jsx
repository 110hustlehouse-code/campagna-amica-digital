import React from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogOut, User, ChevronRight, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function UserMenu() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shadow focus:outline-none hover:bg-primary/90 transition-colors">
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel className="font-normal">
          <p className="font-semibold text-sm truncate">{user?.full_name || 'Utente'}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/produttore/azienda')} className="gap-2">
          <Settings className="w-4 h-4" />
          Profilo azienda
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/produttore/ordini')} className="gap-2">
          <User className="w-4 h-4" />
          I miei ordini
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/benvenuto')} className="gap-2">
          <ChevronRight className="w-4 h-4" />
          Cambia modalità
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => base44.auth.logout()} className="gap-2 text-destructive focus:text-destructive">
          <LogOut className="w-4 h-4" />
          Esci
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}