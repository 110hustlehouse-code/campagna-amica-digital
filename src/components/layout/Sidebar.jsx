import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Building2, MapPin, ShoppingBag, Heart, Menu, X, Leaf, Sprout } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/home', label: 'Home', icon: Home },
  { path: '/aziende', label: 'Aziende', icon: Building2 },
  { path: '/mercati', label: 'Mercati', icon: MapPin },
  { path: '/preferiti', label: 'Preferiti', icon: Heart },
  { path: '/ordini', label: 'I Miei Ordini', icon: ShoppingBag },
  { path: '/stagionalita', label: 'Stagionalità', icon: Sprout },
];

export default function Sidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile overlay (sidebar hidden on mobile, using bottom nav instead) */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full z-50 w-72 flex flex-col transition-transform duration-300",
        "bg-[#FAFAF7] border-r border-[#E8E8DF]",
        "lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="p-6 border-b border-[#E8E8DF]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center shadow-md">
              <Leaf className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h1 className="font-heading text-xl font-bold text-foreground">Campagna Amica</h1>
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase font-medium">Campagna Amica</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/home' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium",
                  isActive
                    ? "bg-primary text-white shadow-md"
                    : "text-foreground/60 hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className={cn("w-[18px] h-[18px]", isActive ? "text-secondary" : "text-foreground/40")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E8E8DF]">
          <div className="rounded-xl overflow-hidden relative h-20">
            <img src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400" alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-primary/70 flex flex-col items-center justify-center">
              <p className="text-[10px] text-white/80 tracking-widest uppercase">Dal produttore</p>
              <p className="text-sm font-bold text-secondary">al consumatore</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}