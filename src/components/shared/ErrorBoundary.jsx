import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Cattura gli errori di rendering e li mostra a schermo.
 *
 * Senza questo, un errore in una pagina produce una schermata bianca e
 * il messaggio resta nascosto nella console del browser. Con questo,
 * l'errore e' leggibile da chi sta usando l'app: durante lo sviluppo
 * fa risparmiare tempo, e davanti a un cliente una pagina che dice
 * cosa e' andato storto e' meglio di una pagina vuota.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { errore: null, dettagli: null };
  }

  static getDerivedStateFromError(errore) {
    return { errore };
  }

  componentDidCatch(errore, info) {
    this.setState({ dettagli: info?.componentStack });
    console.error('[Campagna Amica Digital]', errore, info);
  }

  render() {
    if (!this.state.errore) return this.props.children;

    const messaggio = this.state.errore?.message ?? String(this.state.errore);

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-lg w-full rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-6 h-6 text-destructive shrink-0" />
            <h2 className="font-semibold text-lg">Questa pagina non si è caricata</h2>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            L'errore è riportato qui sotto. Se stai provando l'app, copialo
            e mandalo a chi la sta sviluppando.
          </p>

          <pre className="text-xs bg-background border rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap">
            {messaggio}
          </pre>

          {this.state.dettagli && (
            <details className="mt-3">
              <summary className="text-xs text-muted-foreground cursor-pointer">
                Dettagli tecnici
              </summary>
              <pre className="text-[10px] mt-2 bg-background border rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap">
                {this.state.dettagli}
              </pre>
            </details>
          )}

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              Ricarica
            </button>
            <button
              onClick={() => { window.location.href = '/'; }}
              className="px-4 py-2 rounded-lg border text-sm font-medium"
            >
              Torna all'inizio
            </button>
          </div>
        </div>
      </div>
    );
  }
}
