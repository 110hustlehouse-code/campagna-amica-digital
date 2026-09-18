# Struttura del database

Tre cartelle, tre scopi diversi. Non mescolarle.

```
supabase/
  migrations/   schema, funzioni, policy — vanno in TUTTI gli ambienti, in ordine
  seed/         dati — 01 ovunque, 02 solo dev/demo
  prova/        impalcatura e controlli per la CI — MAI su dev/demo/prod
```

## migrations/

Si applicano in ordine alfabetico, che essendo un timestamp è anche l'ordine cronologico. Un file già applicato non si modifica mai: si aggiunge un file nuovo con timestamp successivo. Riscrivere una migration già eseguita significa che dev e prod divergono in silenzio.

| File | Cosa fa |
|---|---|
| `20260917120000_init_schema.sql` | 21 tabelle + gerarchia territoriale + vista `v_markets_territorio` |
| `20260917130000_ddt_tessera.sql` | DDT con numerazione progressiva e immutabilità, tessere, `tessera_utilizzi` |
| `20260917140000_rls.sql` | 66 policy + funzioni `is_admin` / `is_staff_of_market` / `owns_company` |
| `20260917150000_fix_policy_staff.sql` | sblocca la prima registrazione staff (policy circolare) |
| `20260917160000_mercati_azienda.sql` | `sincronizza_mercati_azienda()` — unico modo autorizzato di cambiare i mercati di un'azienda |
| `20260917170000_azienda_unica.sql` | unifica aziende duplicate + indice unico un produttore/un'azienda |
| `20260917180000_admin.sql` | `riepilogo_nazionale`, `metriche_territorio`, `ddt_nazionali` |
| `20260917190000_analitica.sql` | `serie_storica_fatturato`, `metriche_operative`, `composizione_fatturato` |

## seed/

`01_territorio.sql` — 20 regioni, province, comuni, quartieri. **Ovunque, CI compresa**: le funzioni di aggregazione si appoggiano a questa gerarchia.

`02_ambiente.sql` — mercato pilota e whitelist amministratori. **Solo dev e demo.** Prima di toccare prod vanno riviste email e mercati.

## prova/

`00_bootstrap.sql` ricrea su Postgres nudo quello che Supabase dà per scontato: schema `auth`, `auth.users`, `auth.uid()`, `auth.jwt()`, i ruoli `anon` / `authenticated` / `service_role`. **Non eseguirlo mai su un progetto Supabase**: quegli oggetti esistono già e sovrascriverli rompe l'autenticazione.

`99_fumo.sql` chiama le sei funzioni admin e verifica che rispondano.

## Rifare il database da zero, in locale

```bash
dropdb --if-exists cad && createdb cad
psql -d cad -v ON_ERROR_STOP=1 -f supabase/prova/00_bootstrap.sql
for f in supabase/migrations/*.sql; do psql -d cad -v ON_ERROR_STOP=1 -f "$f"; done
psql -d cad -v ON_ERROR_STOP=1 -f supabase/seed/01_territorio.sql
psql -d cad -v ON_ERROR_STOP=1 -f supabase/seed/02_ambiente.sql
psql -d cad -v ON_ERROR_STOP=1 -f supabase/prova/99_fumo.sql
```

La CI fa esattamente questo a ogni push, più due controlli che non devono mai passare in silenzio: **ogni tabella ha RLS attiva** e **nessuna funzione admin è raggiungibile da `anon`**.

## Stato di allineamento

Verificato il 18/09/2026: lo schema ricostruito da questa catena e quello reale di **dev** coincidono riga per riga su `tessere` e `tessera_utilizzi` — colonne, default, vincoli, indici e policy. Nessuna deriva.

**Da propagare:** `20260917190000_analitica.sql` è stato eseguito solo su dev. Va eseguito anche su demo e prod quando saranno pronti.
