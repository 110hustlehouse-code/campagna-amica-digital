import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Building2, MapPin, Heart, Sprout } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/home', label: 'Home', icon: Home, section: 'home' },
  { path: '/aziende', label: 'Aziende', icon: Building2, section: 'aziende' },
  { path: '/mercati', label: 'Mercati', icon: MapPin, section: 'mercati' },
  { path: '/preferiti', label: 'Preferiti', icon: Heart, section: 'preferiti' },
  { path: '/stagionalita', label: 'Stagioni', icon: Sprout, section: 'stagionalita' },
];

export default function BottomNav({ stacks, setStacks }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = (item) => {
    const currentSection = navItems.find(n => location.pathname.startsWith(n.path))?.section;
    
    if (item.section === currentSection && location.pathname === item.path) {
      // Re-tap: reset stack
      setStacks(prev => ({
        ...prev,
        [item.section]: [item.path],
      }));
    } else if (item.section !== currentSection) {
      // Switch section: reset to root
      setStacks(prev => ({
        ...prev,
        [item.section]: [item.path],
      }));
      navigate(item.path);
    } else {
      // Navigate within section
      navigate(item.path);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-border/50 flex items-stretch shadow-lg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {navItems.map((item) => {
        const isActive = location.pathname.startsWith(item.path);
        return (
          <button
            key={item.path}
            onClick={() => handleNavClick(item)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors min-h-12',
              isActive ? 'text-primary' : 'text-foreground/40'
            )}
          >
            <item.icon className={cn('w-5 h-5', isActive && 'fill-primary/10')} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className={cn('text-[9px] font-medium tracking-tight', isActive ? 'text-primary' : 'text-foreground/40')}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}