import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronDown } from 'lucide-react';

export default function MarketSelector({ 
  value, 
  onChange, 
  markets = [],
  placeholder = 'Seleziona un mercato...',
  className = 'w-full'
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredMarkets = useMemo(() => {
    if (!search) return markets;
    return markets.filter(m =>
      (m.name + ' ' + (m.city || '')).toLowerCase().includes(search.toLowerCase())
    );
  }, [markets, search]);

  const selectedMarket = markets.find(m => m.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`${className} justify-between`}
        >
          <span className="truncate">
            {selectedMarket ? selectedMarket.name : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput
            placeholder="Cerca mercato..."
            value={search}
            onValueChange={setSearch}
            className="border-b"
          />
          <CommandEmpty>Nessun mercato trovato</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {filteredMarkets.map((market) => (
                <CommandItem
                  key={market.id}
                  value={market.id}
                  onSelect={() => {
                    onChange(market);
                    setOpen(false);
                    setSearch('');
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${
                      value === market.id ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{market.name}</p>
                    {market.city && <p className="text-xs text-muted-foreground">{market.city}</p>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}