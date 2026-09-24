import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function UnifiedBottomNav({ navItems, stacks, setStacks }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = (item) => {
    const currentSection = navItems.find(n => 
      location.pathname === n.path || location.pathname.startsWith(n.path + '/')
    )?.section;
    
    if (item.section === currentSection && location.pathname === item.path) {
      // Re-tap: reset stack
      setStacks(prev => ({
        ...prev,
        [item.section]: [item.path],
      }));
    } else {
      // Switch section or navigate
      setStacks(prev => ({
        ...prev,
        [item.section]: [item.path],
      }));
      navigate(item.path);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-border/50 shadow-lg" 
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around px-1 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all duration-200 min-h-12 min-w-12',
                isActive
                  ? 'text-primary bg-primary/8'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="relative">
                <Icon className={cn('w-5 h-5', isActive && 'stroke-[2.5]')} />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center leading-none">
                    {item.badge > 10 ? '10+' : item.badge}
                  </span>
                )}
              </div>
              <span className={cn('text-[10px] font-medium', isActive && 'font-bold')}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}