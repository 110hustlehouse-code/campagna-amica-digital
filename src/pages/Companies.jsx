// v2
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Loader2, ShoppingBag, Building2, Leaf } from 'lucide-react';
import CompanyCard from '../components/companies/CompanyCard';
import Pagination from '../components/shared/Pagination';
import PullToRefresh from '../components/shared/PullToRefresh';

const PAGE_SIZE = 12;

const categories = [
  { value: 'all', label: 'Tutte le categorie' },
  { value: 'ortofrutticola', label: 'Ortofrutticola' },
  { value: 'lattiero_casearia', label: 'Lattiero-Casearia' },
  { value: 'vinicola', label: 'Vinicola' },
  { value: 'olearia', label: 'Olearia' },
  { value: 'cerealicola', label: 'Cerealicola' },
  { value: 'zootecnica', label: 'Zootecnica' },
  { value: 'apicoltura', label: 'Apicoltura' },
];

export default function Companies() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);

  const { data: companies = [], isLoading, refetch } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.filter({ is_registered: true }, '-created_date', 500),
    staleTime: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => companies.filter(c => {
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.city?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === 'all' || c.category === category;
    return matchSearch && matchCategory;
  }), [companies, search, category]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (val) => { setSearch(val); setPage(1); };
  const handleCategory = (val) => { setCategory(val); setPage(1); };

  return (
    <div className="min-h-screen">
      {/* Hero banner */}
      <div className="relative bg-primary overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white translate-x-16 -translate-y-16" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-secondary -translate-x-8 translate-y-8" />
        </div>
        <div className="relative px-6 md:px-12 pt-10 pb-8">
          <div className="inline-flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1 mb-3 shadow">
            <Leaf className="w-3 h-3 text-primary" />
            <span className="text-primary font-bold text-[10px] tracking-widest uppercase">Campagna Amica · Coldiretti</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold text-white leading-tight flex items-center gap-3">
                <Building2 className="w-8 h-8 text-secondary flex-shrink-0" />
                Le Nostre Aziende Coldiretti
              </h1>
              <p className="text-white/70 text-sm mt-2">Eccellenze agricole certificate · Produttori verificati</p>
              {companies.length > 0 && (
                <span className="inline-block mt-3 bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {companies.length} aziende
                </span>
              )}
            </div>
            <Link to="/ordini" className="flex-shrink-0 mt-1">
              <Button size="sm" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold rounded-xl gap-2">
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">I miei ordini</span>
              </Button>
            </Link>
          </div>

          {/* Search bar */}
          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <input
                placeholder="Cerca per nome o città..."
                value={search}
                onChange={e => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 text-sm outline-none focus:bg-white/25 transition-colors"
              />
            </div>
            <Select value={category} onValueChange={handleCategory}>
              <SelectTrigger className="w-full sm:w-52 bg-white/15 border-white/20 text-white rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <PullToRefresh onRefresh={() => refetch()}>
        <div className="px-6 md:px-12 py-8">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-primary/30" />
              </div>
              <p className="font-heading text-xl font-bold text-foreground">Nessuna azienda trovata</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">{filtered.length} aziende trovate</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginated.map(c => <CompanyCard key={c.id} company={c} />)}
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </div>
      </PullToRefresh>

      {/* Footer */}
      <div className="flex flex-col items-center gap-3 py-8 mt-4 border-t border-border/50 bg-card">
        <div className="flex items-center gap-5">
          <img src="https://media.base44.com/images/public/69cd578540390a850769aa6d/570bdc5f1_cropped-coldiretti-vector-logo.png" alt="Coldiretti" className="h-10 w-auto opacity-80" />
          <div className="w-px h-8 bg-border" />
          <img src="https://media.base44.com/images/public/69cd578540390a850769aa6d/ce1586586_images.jpeg" alt="Campagna Amica" className="h-10 w-auto rounded-lg opacity-80" />
        </div>
        <p className="text-xs text-muted-foreground">© Coldiretti · Campagna Amica</p>
      </div>
    </div>
  );
}