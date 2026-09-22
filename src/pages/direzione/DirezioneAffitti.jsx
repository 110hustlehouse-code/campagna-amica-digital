import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Store, Wallet, AlertCircle, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase, unwrapMany } from '@/api/client';
import {
  useMarketPeriodFilter, FilterBar, KpiCard, TrendChart, DetailTable,
  exportCsv, calcDeltaPercent, euro,
} from './_shared';

export default function DirezioneAffitti() {
  const { marketId, setMarketId, period, periodi, setPeriod, range } = useMarketPeriodFilter();

  const { data: markets = [] } = useQuery({
    queryKey: ['direzione-markets'],
    queryFn: async () => unwrapMany(await supabase.from('markets').select('id,name').order('name'), 'mercati'),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['direzione-companies'],
    queryFn: async () => unwrapMany(await supabase.from('companies').select('id,name'), 'aziende'),
  });

  const { data: stallRentals = [], isLoading: loadingRentals } = useQuery({
    queryKey: ['direzione-stall-rentals', marketId],
    queryFn: async () => {
      let q = supabase.from('stall_rentals').select('id,company_id,market_id,monthly_rent,status');
      if (marketId) q = q.eq('market_id', marketId);
      return unwrapMany(await q, 'affitti banco');
    },
  });

  const { data: rentalPayments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['direzione-rental-payments', marketId, range.prevFromIso, range.toIso],
    queryFn: async () => {
      let q = supabase.from('rental_payments')
        .select('id,company_id,market_id,amount,payment_date,status')
        .gte('payment_date', range.prevFromIso)
        .lte('payment_date', range.toIso);
      if (marketId) q = q.eq('market_id', marketId);
      return unwrapMany(await q, 'pagamenti affitto');
    },
  });

  // Gli scaduti non hanno data di pagamento: vanno contati a parte,
  // fuori dalla finestra temporale usata per gli incassi.
  const { data: overdue = [] } = useQuery({
    queryKey: ['direzione-rental-overdue', marketId],
    queryFn: async () => {
      let q = supabase.from('rental_payments').select('id,market_id').eq('status', 'overdue');
      if (marketId) q = q.eq('market_id', marketId);
      return unwrapMany(await q, 'affitti scaduti');
    },
  });

  const isLoading = loadingRentals || loadingPayments;
  const companyName = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c.name])), [companies]);

  const paymentsInRange = useMemo(
    () => rentalPayments.filter((p) => p.status === 'paid' && p.payment_date >= range.fromIso && p.payment_date <= range.toIso),
    [rentalPayments, range],
  );
  const paymentsInPrevRange = useMemo(
    () => rentalPayments.filter((p) => p.status === 'paid' && p.payment_date >= range.prevFromIso && p.payment_date < range.fromIso),
    [rentalPayments, range],
  );

  const incassi = paymentsInRange.reduce((s, p) => s + Number(p.amount || 0), 0);
  const prevIncassi = paymentsInPrevRange.reduce((s, p) => s + Number(p.amount || 0), 0);
  const activeRentals = stallRentals.filter((r) => r.status === 'active');
  const canoneMensileAttivo = activeRentals.reduce((s, r) => s + Number(r.monthly_rent || 0), 0);

  const trendData = useMemo(() => {
    const byDay = {};
    paymentsInRange.forEach((p) => {
      const day = p.payment_date;
      if (!day) return;
      byDay[day] = (byDay[day] || 0) + Number(p.amount || 0);
    });
    return Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
  }, [paymentsInRange]);

  const byCompany = useMemo(() => {
    const map = {};
    activeRentals.forEach((r) => {
      const key = r.company_id;
      if (!map[key]) map[key] = { id: key, company_name: companyName[key] || 'Azienda', banchi: 0, canone_mensile: 0, incassato: 0 };
      map[key].banchi += 1;
      map[key].canone_mensile += Number(r.monthly_rent || 0);
    });
    paymentsInRange.forEach((p) => {
      const key = p.company_id;
      if (!map[key]) map[key] = { id: key, company_name: companyName[key] || 'Azienda', banchi: 0, canone_mensile: 0, incassato: 0 };
      map[key].incassato += Number(p.amount || 0);
    });
    return Object.values(map).sort((a, b) => b.incassato - a.incassato);
  }, [activeRentals, paymentsInRange, companyName]);

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-heading text-2xl font-bold">Affitti</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Incassi e occupazione banchi</p>
      </div>

      <FilterBar markets={markets} marketId={marketId} onMarketChange={setMarketId} period={period} periodi={periodi} onPeriodChange={setPeriod} />

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Incassi periodo" value={incassi} delta={calcDeltaPercent(incassi, prevIncassi)} format="currency" icon={Wallet} />
            <KpiCard label="Banchi attivi" value={activeRentals.length} icon={Store} />
            <KpiCard label="Canone mensile attivo" value={canoneMensileAttivo} format="currency" icon={Wallet} />
            <KpiCard label="Pagamenti scaduti" value={overdue.length} icon={AlertCircle} />
          </div>

          <div className="bg-card border rounded-xl p-5">
            <h3 className="font-heading text-base font-bold mb-3">Andamento incassi</h3>
            <TrendChart data={trendData} label="Incassi" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading text-base font-bold">Affitti per azienda</h3>
              <Button
                size="sm" variant="outline" className="gap-1.5"
                onClick={() => exportCsv('direzione-affitti-aziende', byCompany, [
                  { key: 'company_name', label: 'Azienda' },
                  { key: 'banchi', label: 'Banchi attivi' },
                  { key: 'canone_mensile', label: 'Canone mensile' },
                  { key: 'incassato', label: 'Incassato nel periodo' },
                ])}
              >
                <Download className="w-3.5 h-3.5" /> Esporta CSV
              </Button>
            </div>
            <DetailTable
              columns={[
                { key: 'company_name', label: 'Azienda' },
                { key: 'banchi', label: 'Banchi attivi', align: 'right' },
                { key: 'canone_mensile', label: 'Canone mensile', align: 'right', render: (r) => euro(r.canone_mensile) },
                { key: 'incassato', label: 'Incassato nel periodo', align: 'right', render: (r) => euro(r.incassato) },
              ]}
              rows={byCompany}
            />
          </div>
        </div>
      )}
    </div>
  );
}