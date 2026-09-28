import React from 'react';
import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, FileText, TrendingUp, Loader2, ShieldCheck, LogOut, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

const VOCI = [
  { path: '/admin', label: 'Panoramica', icon: LayoutDashboard, end: true },
  { path: '/admin/andamento', label: 'Andamento', icon: TrendingUp },
  { path: '/admin/ddt', label: 'Registro DDT', icon: FileText },
  { path: '/admin/segnalazioni', label: 'Segnalazioni', icon: AlertTriangle },
];

/**
 * Struttura dell'area amministrazione.
 *
 * Il controllo qui è solo per l'interfaccia: chi non è amministratore
 * non vede il menu. La protezione vera sta nel database — le funzioni
 * di aggregazione e le policy verificano il ruolo a ogni chiamata.
 * Manomettere il browser non dà accesso a un solo dato in più.
 */
export default function AdminLayout() {
  const { user, isLoadingAuth, logout } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="bg-gradient-to-r from-primary via-primary/95 to-secondary border-b-4 border-secondary shadow-lg sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="inline-flex items-center gap-1.5 bg-secondary rounded-full px-3.5 py-1.5 shadow-md">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary font-bold text-xs tracking-widest uppercase">Amministrazione</span>
            </div>

            <nav className="flex items-center gap-1 bg-white/15 rounded-2xl p-1 ml-2">
              {VOCI.map((v) => (
                <NavLink key={v.path} to={v.path} end={v.end}
                  className={({ isActive }) => cn(
                    'px-3 py-1.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-1.5',
                    isActive ? 'bg-white text-primary shadow-sm' : 'text-white/80 hover:text-white',
                  )}>
                  <v.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{v.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-white/70 hidden md:inline">{user.email}</span>
              <button onClick={logout} className="text-white/80 hover:text-white" title="Esci">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
