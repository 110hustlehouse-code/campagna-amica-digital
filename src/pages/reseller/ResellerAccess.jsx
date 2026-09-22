import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Lock, LogOut, Search, Loader2 } from 'lucide-react';
import { getCompany } from '@/api/companies';
import { verifyResellerPassword } from '@/api/resellers';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Marchi from '@/components/shared/Marchi';

/**
 * Pagina pubblica, fuori dal gate di autenticazione: un rivenditore
 * non ha un account nell'app, ha solo una password fornita dal
 * produttore. Una sola sessione per scheda del browser — richiede
 * di reinserire la password se si chiude la scheda: è voluto,
 * niente sessioni a lungo termine per un accesso non autenticato.
 */
export default function ResellerAccess() {
  const { companyId } = useParams();
  const [company, setCompany] = useState(null);
  const [session, setSession] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const storageKey = `reseller_session_${companyId}`;

  useEffect(() => {
    getCompany(companyId).then(setCompany);
    const cached = sessionStorage.getItem(storageKey);
    if (cached) {
      try { setSession(JSON.parse(cached)); } catch { /* sessione corrotta, si ignora */ }
    }
  }, [companyId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await verifyResellerPassword(companyId, password.trim());
      if (res.success) {
        sessionStorage.setItem(storageKey, JSON.stringify(res));
        setSession(res);
      } else {
        setError('Password non valida');
      }
    } catch {
      setError('Password non valida o troppi tentativi. Riprova tra qualche minuto.');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(storageKey);
    setSession(null);
    setPassword('');
  }

  const products = (session?.products || []).filter((p) =>
    !search.trim() || p.name?.toLowerCase().includes(search.trim().toLowerCase())
  );

  // -------------------------------------------------- login
  if (!session) {
    return (
      <div className="min-h-screen flex flex-col px-5 pt-8 pb-8 bg-background">
        <div className="flex justify-center mb-8">
          <Marchi altezza={40} />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center max-w-xs mx-auto w-full">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold mb-1 text-center">Area Rivenditori</h1>
          <p className="text-sm text-muted-foreground text-center mb-8">
            {company?.name ? `Listino riservato di ${company.name}` : 'Inserisci la password fornita dal produttore'}
          </p>
          <form onSubmit={handleSubmit} className="w-full space-y-3">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" disabled={loading || !password.trim()} className="w-full h-12 rounded-xl">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accedi'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------- catalogo
  return (
    <div className="min-h-screen bg-background px-4 pt-6 pb-10">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="font-heading text-xl font-bold leading-tight">{company?.name}</h1>
          <p className="text-xs text-muted-foreground">
            Listino rivenditori{session.label ? ` · ${session.label}` : ''}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground border border-border rounded-xl px-3 py-2 hover:text-destructive hover:border-destructive transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Esci
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Cerca prodotto"
               value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Nessun prodotto in questo listino.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {products.map((p) => (
            <div key={p.id} className="bg-card rounded-2xl border-2 border-white shadow-md overflow-hidden">
              <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl bg-secondary/40">🌾</div>
                )}
              </div>
              <div className="p-3">
                <p className="text-[11px] text-muted-foreground capitalize">{p.category}</p>
                <h3 className="font-semibold text-sm truncate">{p.name}</h3>
                {p.code && <p className="text-[10px] text-muted-foreground">Cod. {p.code}</p>}
                <div className="mt-2 pt-2 border-t border-border flex items-baseline justify-between">
                  <span className="text-sm font-bold text-primary">€{Number(p.reseller_price).toFixed(2)}</span>
                  <span className="text-[10px] text-muted-foreground">/{p.unit} · IVA {p.vat_rate}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col items-center gap-2 pt-8 pb-2">
        <Marchi altezza={24} />
        <p className="text-[10px] text-muted-foreground">© Campagna Amica Digital · Campo Zero</p>
      </div>
    </div>
  );
}