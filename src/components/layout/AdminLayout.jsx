import React from 'react';
import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Loader2, ShieldCheck, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

const VOCI = [
  { path: '/admin', label: 'Panoramica', icon: LayoutDashboard, end: true },
  { path: '/admin/ddt', label: 'Registro DDT', icon: FileText },
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
      <header className="border-b bg-card sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span>Amministrazione</span>
          </div>

          <nav className="flex gap-1 ml-2">
            {VOCI.map((v) => (
              <NavLink key={v.path} to={v.path} end={v.end}
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
