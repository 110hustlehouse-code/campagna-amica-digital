import React, { useState } from 'react';
import { invokeFunction } from '@/api/functions';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function AdminSyncMarkets() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg font-semibold text-destructive">Accesso non autorizzato</p>
      </div>
    );
  }

  const handleSync = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await invokeFunction('fetchCampagnaAmicaMarkets', {});
      setResult(response.data);
    } catch (err) {
      setError(err.message || 'Errore durante la sincronizzazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-card rounded-2xl border border-border p-8">
          <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
            Sincronizza Mercati
          </h1>
          <p className="text-muted-foreground mb-6">
            Importa i mercati da CampagnaAmica.it con orari e giorni di apertura
          </p>

          <Button
            onClick={handleSync}
            disabled={loading}
            className="w-full h-12 text-base font-semibold gap-2 mb-6"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sincronizzazione in corso...
              </>
            ) : (
              'Sincronizza Mercati da CampagnaAmica'
            )}
          </Button>

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 mb-6">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">Errore</p>
                <p className="text-sm text-destructive/80 mt-1">{error}</p>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-primary">Sincronizzazione completata</p>
                  <p className="text-sm text-primary/80 mt-1">
                    {result.created} mercati creati, {result.skipped} duplicati saltati su {result.total} totali
                  </p>
                </div>
              </div>

              {result.markets && result.markets.length > 0 && (
                <div className="mt-6">
                  <h2 className="font-heading font-semibold text-foreground mb-3">
                    Anteprima mercati importati:
                  </h2>
                  <div className="space-y-2">
                    {result.markets.map((m, idx) => (
                      <div key={idx} className="p-3 rounded-lg border border-border/30 bg-muted/30">
                        <p className="font-medium text-foreground">{m.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {m.city} {m.region && `· ${m.region}`}
                        </p>
                        {m.opening_hours && (
                          <p className="text-sm text-primary/80 font-medium mt-1">
                            {m.opening_days} · {m.opening_hours}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}