import React, { useState, useEffect, useRef } from 'react';
import { Search, Check, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Reusable searchable dropdown list with autocomplete.
 * Props:
 *   items: [{ id, label, sublabel?, badge? }]
 *   value: selected id
 *   onChange: (id) => void
 *   placeholder: string
 *   searchPlaceholder: string
 *   autoFocus: bool
 *   emptyMessage: string
 *   highlightedId: string (optional - shows GPS pin)
 */
export default function SearchableList({
  items = [],
  value,
  onChange,
  placeholder = 'Seleziona...',
  searchPlaceholder = 'Cerca...',
  autoFocus = false,
  emptyMessage = 'Nessun risultato',
  highlightedId,
  className,
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const searchRef = useRef(null);
  const containerRef = useRef(null);

  const selected = items.find(i => i.id === value);

  const filtered = query.trim()
    ? items.filter(i =>
        i.label.toLowerCase().includes(query.toLowerCase()) ||
        (i.sublabel && i.sublabel.toLowerCase().includes(query.toLowerCase()))
      )
    : items;

  // Auto-focus search when opened
  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  // Auto-open if autoFocus
  useEffect(() => {
    if (autoFocus) setOpen(true);
  }, [autoFocus]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (id) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm bg-white transition-all duration-150',
          open
            ? 'border-primary shadow-md shadow-primary/10'
            : 'border-border hover:border-primary/40',
          !selected && 'text-muted-foreground'
        )}
      >
        <span className="font-medium truncate">
          {selected ? selected.label : placeholder}
        </span>
        {selected && selected.sublabel && (
          <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{selected.sublabel}</span>
        )}
        <svg className={cn('w-4 h-4 ml-2 flex-shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-xl border-2 border-primary/20 shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="p-3 border-b border-border/50 bg-muted/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                ref={searchRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</div>
            ) : (
              filtered.map(item => {
                const isSelected = item.id === value;
                const isHighlighted = item.id === highlightedId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors',
                      isSelected
                        ? 'bg-primary/8 text-primary font-semibold'
                        : 'hover:bg-muted/60 text-foreground'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{item.label}</span>
                        {isHighlighted && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex-shrink-0">
                            <MapPin className="w-2.5 h-2.5" /> Vicino
                          </span>
                        )}
                        {item.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/30 text-secondary-foreground font-medium flex-shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.sublabel && (
                        <p className="text-xs text-muted-foreground truncate">{item.sublabel}</p>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}