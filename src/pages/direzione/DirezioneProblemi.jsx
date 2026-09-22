import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, CalendarX, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase, unwrapMany } from '@/api/client';
import {
  useMarketPeriodFilter, FilterBar, KpiCard, TrendChart, DetailTable, exportCsv,
} from './_shared';

export default function DirezioneProblemi() {
  const { marketId, setMarketId, period, periodi, setPeriod, range } = useMarketPeriodFilter();

  const { data: markets = [] } = useQuery({
    queryKey: ['direzione-markets'],
    queryFn: async () => unwrapMany(await supabase.from('markets').select('id,name').order('name'), 'mercati'),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['direzione-companies'],
    queryFn: async () => unwrapMany(await supabase.from('companies').select('id,name'), 'aziende'),
  });

  const { data: needs = [], isLoading: loadingNeeds } = useQuery({
    queryKey: ['direzione-needs', marketId],
    queryFn: async () => {
      let q = supabase.from('producer_needs').select('id,company_id,market_id,status,created_at');
      if (marketId) q = q.eq('market_id', marketId);
      return unwrapMany(await q, 'bisogni produttori');
    },
  });

  const { data: absences = [], isLoading: loadingAbsences } = useQuery({
    queryKey: ['direzione-absences', marketId],
    queryFn: async () => {
      let q = supabase.from('absences').select('id,company_id,market_id,status,created_at');
      if (marketId) q = q.eq('market_id', marketId);
      return unwrapMany(await q, 'assenze');
    },
  });

  const isLoading = loadingNeeds || loadingAbsences;
  const companyName = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c.name])), [companies]);

  const needsInRange = useMemo(
    () => needs.filter((n) => n.created_at?.slice(0, 10) >= range.fromIso && n.created_at?.slice(0, 10) <= range.toIso),
    [needs, range],
  );
  const absencesInRange = useMemo(
    () => absences.filter((a) => a.created_at?.slice(0, 10) >= range.fromIso && a.created_at?.slice(0, 10) <= range.toIso),
    [absences, range],
  );

  const openNeeds = needs.filter((n) => n.status === 'open' || n.status === 'in_progress').length;
  const resolvedInRange = needsInRange.filter((n) => n.status === 'resolved' || n.status === 'closed').length;
  const unresolvedAbsences = absences.filter((a) => a.status !== 'resolved').length;

  const trendData = useMemo(() => {
    const byDay = {};
    [...needsInRange, ...absencesInRange].forEach((item) => {
      const day = item.created_at?.slice(0, 10);
      if (!day) return;
      byDay[day] = (byDay[day] || 0) + 1;
    });
    return Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
  }, [needsInRange, absencesInRange]);

  const byCompany = useMemo(() => {
    const map = {};
    needsInRange.forEach((n) => {
      const key = n.company_id;
      if (!map[key]) map[key] = { id: key, company_name: companyName[key] || 'Azienda', bisogni_aperti: 0, bisogni_risolti: 0, assenze: 0 };
      if (n.status === 'open' || n.status === 'in_progress') map[key].bisogni_aperti += 1;
      else map[key].bisogni_risolti += 1;
    });
    absencesInRange.forEach((a) => {
      const key = a.company_id;
      if (!map[key]) map[key] = { id: key, company_name: companyName[key] || 'Azienda', bisogni_aperti: 0, bisogni_risolti: 0, assenze: 0 };
      map[key].assenze += 1;
    });
    return Object.values(map).sort((a, b) => (b.bisogni_aperti + b.assenze) - (a.bisogni_aperti + a.assenze));
  }, [needsInRange, absencesInRange, companyName]);

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-heading text-2xl font-bold">Problemi</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Bisogni e assenze segnalate dai produttori</p>
      </div>

      <FilterBar markets={markets} marketId={marketId} onMarketChange={setMarketId} period={period} periodi={periodi} onPeriodChange={setPeriod} />

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Bisogni aperti" value={openNeeds} icon={AlertTriangle} />
            <KpiCard label="Risolti nel periodo" value={resolvedInRange} icon={CheckCircle2} />
            <KpiCard label="Assenze nel periodo" value={absencesInRange.length} icon={CalendarX} />
            <KpiCard label="Assenze non risolte" value={unresolvedAbsences} icon={CalendarX} />
          </div>

          <div className="bg-card border rounded-xl p-5">
            <h3 className="font-heading text-base font-bold mb-3">Segnalazioni nel tempo</h3>
            <TrendChart data={trendData} label="Segnalazioni" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading text-base font-bold">Segnalazioni per azienda</h3>
              <Button
                size="sm" variant="outline" className="gap-1.5"
                onClick={() => exportCsv('direzione-problemi-aziende', byCompany, [
                  { key: 'company_name', label: 'Azienda' },
                  { key: 'bisogni_aperti', label: 'Bisogni aperti' },
                  { key: 'bisogni_risolti', label: 'Bisogni risolti' },
                  { key: 'assenze', label: 'Assenze' },
                ])}
              >
                <Download className="w-3.5 h-3.5" /> Esporta CSV
              </Button>
            </div>
            <DetailTable
              columns={[
                { key: 'company_name', label: 'Azienda' },
                { key: 'bisogni_aperti', label: 'Bisogni aperti', align: 'right' },
                { key: 'bisogni_risolti', label: 'Bisogni risolti', align: 'right' },
                { key: 'assenze', label: 'Assenze', align: 'right' },
              ]}
              rows={byCompany}
            />
          </div>
        </div>
      )}
    </div>
  );
}