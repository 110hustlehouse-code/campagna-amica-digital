import { useMemo, useState } from 'react';
import { subDays, format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const PERIODI = [
  { id: 30, label: '30 giorni' },
  { id: 90, label: '90 giorni' },
  { id: 365, label: '12 mesi' },
];

export function useMarketPeriodFilter() {
  const [marketId, setMarketId] = useState('');
  const [period, setPeriod] = useState(30);

  const range = useMemo(() => {
    const to = new Date();
    const from = subDays(to, period);
    const prevFrom = subDays(from, period);
    return {
      fromIso: format(from, 'yyyy-MM-dd'),
      toIso: format(to, 'yyyy-MM-dd'),
      prevFromIso: format(prevFrom, 'yyyy-MM-dd'),
    };
  }, [period]);

  return { marketId, setMarketId, period, setPeriod, periodi: PERIODI, range };
}

export function calcDeltaPercent(attuale, precedente) {
  if (!precedente) return null;
  return Math.round(((attuale - precedente) / precedente) * 100);
}

export function euro(n) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n ?? 0);
}

export function numero(n) {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 }).format(n ?? 0);
}

export function KpiCard({ label, value, delta, format: fmt, icon: Icon }) {
  const testo = fmt === 'currency' ? euro(value) : numero(value);
  return (
    <div className="border rounded-xl p-4 bg-card">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
      </div>
      <p className="text-2xl font-bold tabular-nums mt-1">{testo}</p>
      {delta !== null && delta !== undefined && (
        <p className={`text-xs mt-1 ${delta >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
          {delta > 0 ? '+' : ''}{delta}% sul periodo precedente
        </p>
      )}
    </div>
  );
}

export function TrendChart({ data, label, color = '#1E8549' }) {
  if (!data.length) {
    return <p className="text-sm text-muted-foreground py-10 text-center">Nessun dato nel periodo.</p>;
  }
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} minTickGap={16} />
          <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={50} />
          <Tooltip formatter={(v) => [euro(v), label]} labelFormatter={(d) => d} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DetailTable({ columns, rows }) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Nessun dato.</p>;
  }
  return (
    <div className="border rounded-xl bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            {columns.map((c) => (
              <th key={c.key} className={`px-3 py-2 font-medium text-xs text-muted-foreground ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-2 ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FilterBar({ markets, marketId, onMarketChange, period, periodi, onPeriodChange }) {
  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      <select
        className="text-sm border rounded-lg px-2 py-1.5 bg-background"
        value={marketId}
        onChange={(e) => onMarketChange(e.target.value)}
      >
        <option value="">Tutti i mercati</option>
        {markets.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
      <div className="flex gap-1 ml-auto">
        {periodi.map((p) => (
          <button
            key={p.id}
            onClick={() => onPeriodChange(p.id)}
            className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
              period === p.id ? 'bg-primary/10 border-primary/30 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function exportCsv(nomeFile, righe, colonne) {
  const header = colonne.map((c) => c.label).join(';');
  const body = righe.map((r) => colonne.map((c) => (c.render ? c.render(r) : r[c.key])).join(';')).join('\n');
  const csv = `${header}\n${body}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nomeFile}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}