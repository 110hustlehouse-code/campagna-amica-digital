# DESIGN_DNA — Campagna Amica Digital

Estratto da `110hustlehouse-code/campagna-amica-digital@97e438a`, 18/09/2026.

## 1. In una frase

Un prodotto istituzionale ma caldo: verde Coldiretti come colore d'autorità, oro/senape come accento, sfondo panna invece di bianco puro, titoli in serif (Playfair Display) su corpo sans (Inter) — la combinazione comunica "mercato agricolo" più che "app tech generica".

## 2. Colore

Dichiarato in `src/index.css:11-37` (light) e `:39-61` (dark), mappato ai nomi Tailwind in `tailwind.config.js:14-56`.

| Token | Valore (HSL) | Uso semantico | Occorrenze in `className` |
|---|---|---|---|
| `primary` | `145 63% 32%` (~`#1e8549`) | verde marchio, azioni principali, icone attive | 248× `text-primary`, 48× `bg-primary` |
| `secondary` / `accent` | `46 92% 55%` (oro/senape) | accento, badge, evidenze | 44× `text-secondary` |
| `background` | `48 33% 97%` | sfondo pagina, panna caldo non bianco | — |
| `card` | `0 0% 100%` | superfici, bianco puro | 58× `bg-white`, 39× `bg-muted` |
| `foreground` | `150 25% 10%` | testo principale, verde scurissimo non nero | 289× `text-foreground` |
| `muted-foreground` | `150 10% 45%` | testo secondario | 425× `text-muted` |
| `destructive` | `0 84% 60%` | errori, azioni distruttive | 48× `text-destructive` |
| `sidebar-*` | base `145 63% 32%` | barra laterale, inversa (testo bianco su verde) | `src/index.css:31-38` |

**Sottosistema separato — colori di stato.** Fuori dai token semantici, l'app usa la palette Tailwind di default per badge di stato (`amber`=in attesa, `green`/`emerald`=ok, `red`=errore, `blue`=informativo), con centinaia di occorrenze coerenti in tutto il progetto — es. `text-amber-700` (23×), `bg-green-100` (18×), `text-red-700` (20×). Esempio concreto in `src/pages/admin/AdminDDT.jsx:22-26`:
```js
const COLORI = {
  emesso:     'bg-amber-50 text-amber-800 border-amber-200',
  consegnato: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  annullato:  'bg-red-50 text-red-700 border-red-200',
};
```
Questo è **sistema**, non deriva: è un secondo linguaggio cromatico, usato solo per stato/badge, mai per brand. Va rispettato tale e quale, non fuso con `primary`/`destructive`.

**Colori letterali fuori sistema, misurati:**
| Valore | Occorrenze | Nota |
|---|---|---|
| `#f5c518` | 12 | variante oro non passata da token |
| `#004d26`, `#00802b`, `#006633` | 8+6+6 | varianti di verde non passate da token |
| `#1e8549` | 1 (`src/pages/admin/AdminAndamento.jsx:23`) | **identico a `--primary`**, ma hardcoded di proposito — Recharts richiede hex letterale, non legge le CSS custom properties. Commento esplicativo già nel file (righe 18-21). Deriva giustificata tecnicamente, non un errore |
| `#8cc9a5`, `#94a3b8` | 1+1 | stesso file, stesse ragioni (previsione tratteggiata, banda grigia) |

## 3. Tipografia

`src/index.css:1,10,11-12`: `Playfair Display` (pesi 400-700) per `font-heading`, `Inter` (300-700) per `font-body`, importati da Google Fonts. `body` applica `font-body` di default (`src/index.css:76`); i titoli usano `font-heading` esplicitamente per componente, es. `src/pages/admin/AdminDashboard.jsx:66` (`font-heading text-2xl font-bold`).

Scala misurata più frequente: `text-xs` (380×), `text-sm` (379×), `text-lg` (57×), `text-2xl` (44×) — impaginazione a bassa gerarchia, molto testo piccolo/secondario rispetto a titoli grandi.

## 4. Spazio e ritmo

Unità base 4px (scala Tailwind standard, nessuna scala custom dichiarata). Valori più frequenti: `gap-2` (248×), `gap-3` (125×), `p-4`/`p-3` (74×/52×), `px-4`/`px-6` (51×/54×). Ritmo verticale tipico tra blocchi: `space-y-4`/`space-y-6` (visto in `AdminDashboard.jsx:63,70`).

## 5. Forma

`--radius: 0.75rem` dichiarato in `src/index.css:35`, mappato su `lg`/`md`/`sm` in `tailwind.config.js:10-13`. Uso reale: `rounded-xl` (191×) è il raggio dominante per card e contenitori, `rounded-full` (170×) per avatar/badge/pill, `rounded-2xl` (112×) per superfici più grandi. Ombre: `shadow-sm` (72×) di gran lunga la più usata, `shadow-lg` solo per elementi sollevati (menu, dialog).

## 6. Componenti

Libreria shadcn/ui completa in `src/components/ui/` (accordion, alert, avatar, badge, button, card, dialog, dropdown-menu, select, sidebar, ecc. — 39 file). Pattern ricorrente di una card-statistica, es. `src/pages/admin/AdminDashboard.jsx:85-89`:
```jsx
<div className="border rounded-xl p-4 bg-card">
  <t.icona className="w-4 h-4 text-primary mb-2" />
  <p className="text-2xl font-bold">{t.valore}</p>
  <p className="text-xs text-muted-foreground">{t.etichetta}</p>
</div>
```
Icona piccola in alto (colore `primary`), valore grande in grassetto, etichetta piccola muted sotto. Larghezza massima contenitore pagina: `max-w-6xl` per admin (`AdminLayout.jsx:39,45`), `max-w-sm` per la card di login (`Login.jsx:64`).

Target di tocco minimo 44×44 imposto globalmente su `button, a, [role="button"]` (`src/index.css:83-84`) — già coerente con WCAG.

## 7. Movimento

`framer-motion` in dipendenze; 104 file usano `framer-motion`, `transition-` o `animate-`. Nessuna curva/durata custom dichiarata a livello di token — solo le utility Tailwind standard (`transition-colors`, `animate-spin` per i loader) e le keyframe accordion di shadcn (`tailwind.config.js:58-72`).

## 8. Voce

Italiano, impersonale/diretto, minuscolo nei titoli di frase (non Title Case). Esempi da codice:
- Stato vuoto: *"Nessun dato per questo territorio nel periodo scelto."* (`AdminDashboard.jsx:122-124`)
- Errore tradotto, non tecnico: *"Email o password non corretti."* (`Login.jsx:37`)
- Avviso con spiegazione, non solo allarme: *"documenti annullati nel periodo. Un numero alto può indicare errori ricorrenti in fase di emissione."* (`AdminDashboard.jsx:95-96`)
- Nessun punto esclamativo osservato nei messaggi utente. Registro sobrio, mai entusiastico.

## 9. Accessibilità

Target di tocco 44px globale (vedi §6). Contrasto non misurato in questa passata (servirebbe calcolo sulle coppie reali renderizzate, non solo sui valori HSL dichiarati) — da fare come passo dedicato se si vuole certezza numerica, specialmente su `text-muted` su `bg-muted` in badge di stato.

## 10. Deriva rilevata

| Cosa | File:riga | Gravità |
|---|---|---|
| `#1E8549`/`#8CC9A5`/`#94A3B8` hardcoded | `AdminAndamento.jsx:23-25` | Nessuna — giustificata da vincolo tecnico Recharts, documentata nel codice |
| `#f5c518` e varianti verde a mano (12+20 occorrenze) | vari, non ancora mappati riga per riga | Da verificare: se è lo stesso pattern (libreria grafica esterna) è giustificata, altrimenti è deriva vera da correggere riportando al token |
| Asset ospitati su dominio terzo | `media.base44.com`, 27 occorrenze in `src/` | **Segnalato in prima pagina**: dipendenza esterna che un giorno smette di funzionare. Già nel piano di lavoro del progetto (punto 5, "loghi via da media.base44.com") |

## 11. Vincoli

- **Il design è già stato mostrato e approvato da Campagna Amica.** Vincolo esplicito di Carlo: non si cambia palette, tipografia o linguaggio dei componenti senza richiesta esplicita.
- Verde/oro sono riconducibili all'identità Coldiretti — non sostituibili per gusto personale.
- Il sottosistema di colori di stato (amber/green/red/blue Tailwind) è intenzionalmente separato dai token di brand: non va normalizzato dentro `primary`/`destructive`.

## 12. Aperto

- I 12 usi di `#f5c518` e le varianti di verde a mano non sono ancora stati letti singolarmente file per file — prossimo passo se si vuole chiudere la mappatura completa.
- Contrasto non misurato numericamente.
- Nessun token di durata/curva per le animazioni — oggi sono tutte default Tailwind/framer-motion, non è chiaro se sia una scelta o un'assenza.
