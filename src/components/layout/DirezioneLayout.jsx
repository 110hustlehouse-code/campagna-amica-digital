import React from 'react';
import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { Wallet, AlertTriangle, Loader2, ShieldCheck, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

const VOCI = [
  { path: '/direzione/affitti', label: 'Affitti', icon: Wallet },
  { path: '/direzione/problemi', label: 'Problemi', icon: AlertTriangle },
];

/**
 * Struttura dell'area direzione — sola lettura.
 *
 * Il controllo qui e' solo per l'interfaccia: la protezione vera sta
 * nelle policy RLS is_direzione() / is_admin() sul database.
 */
export default function DirezioneLayout() {
  const { user, isLoadingAuth, logout } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.role !== 'direzione' && user?.role !== 'admin') return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-card sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span>Direzione</span>
          </div>

          <nav className="flex gap-1 ml-2">
            {VOCI.map((v) => (
              <NavLink key={v.path} to={v.path}
                className={({ isActive }) => cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
                )}>
                <v.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{v.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden md:inline">{user.email}</span>
            <button onClick={logout} className="text-muted-foreground hover:text-foreground" title="Esci">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}