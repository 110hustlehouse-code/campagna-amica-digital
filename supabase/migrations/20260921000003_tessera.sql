-- ---------------------------------------------------------------------------
-- TESSERA CLIENTE — struttura di base
--
-- Le regole a punti NON sono qui dentro. I valori stanno in punti_regole,
-- una tabella di configurazione: durante il pilot si tarano sui
-- comportamenti reali senza scrivere una migration, e ogni mercato puo'
-- avere i propri. Cablarli nel codice significherebbe rifarlo ogni volta
-- che un numero si rivela sbagliato — e all'inizio lo sara'.
--
-- Gli eventi punti sono righe immutabili: un errore si corregge con una
-- riga di segno opposto, non cancellando. Stessa logica del DDT, e per lo
-- stesso motivo: un saldo che si puo' riscrivere non e' un saldo.
-- ---------------------------------------------------------------------------

create table if not exists public.tessere (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.users(id) on delete set null,
  user_email       text not null,
  intestatario     text,
  market_id        uuid references public.markets(id) on delete set null,
  codice           text not null unique,
  qr_payload       text not null,
  tipo             text not null default 'base'    check (tipo in ('base','premium')),
  stato            text not null default 'attiva'
                   check (stato in ('attiva','sospesa','scaduta','revocata')),
  data_emissione   timestamptz not null default now(),
  data_scadenza    date,
  ultimo_utilizzo  timestamptz,
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       text
);

-- Una sola tessera attiva per persona. Parziale: le revocate non bloccano
-- l'emissione di una nuova.
create unique index if not exists tessere_email_attiva_idx
  on public.tessere (lower(user_email)) where stato = 'attiva';
create index if not exists tessere_market_idx on public.tessere (market_id);

drop trigger if exists set_tessere_updated_at on public.tessere;
create trigger set_tessere_updated_at before update on public.tessere
  for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- Configurazione dei punti. market_id nullo = regola valida ovunque.
-- ---------------------------------------------------------------------------
create table if not exists public.punti_regole (
  id           uuid primary key default gen_random_uuid(),
  fonte        text not null,
  market_id    uuid references public.markets(id) on delete cascade,
  punti        integer not null check (punti >= 0),
  tetto_giorno integer,
  attiva       boolean not null default true,
  richiede_revisione boolean not null default false,
  descrizione  text,
  updated_at   timestamptz not null default now(),
  unique (fonte, market_id)
);

-- ---------------------------------------------------------------------------
-- Eventi punti: append-only. Nessuna policy UPDATE o DELETE, di proposito.
-- ---------------------------------------------------------------------------
create table if not exists public.punti_eventi (
  id              uuid primary key default gen_random_uuid(),
  tessera_id      uuid not null references public.tessere(id) on delete cascade,
  fonte           text not null,
  punti           integer not null,
  stato           text not null default 'valido'
                  check (stato in ('valido','in_sospeso','rifiutato','annullato')),
  market_id       uuid references public.markets(id) on delete set null,
  company_id      uuid references public.companies(id) on delete set null,
  order_id        uuid references public.orders(id) on delete set null,
  giorno          date not null default current_date,
  riferimento     text,
  annulla_evento  uuid references public.punti_eventi(id) on delete set null,
  revisionato_da  uuid references public.users(id) on delete set null,
  revisionato_il  timestamptz,
  note            text,
  created_at      timestamptz not null default now()
);

-- Le tre regole anti-frode che devono stare nel database, non
-- nell'interfaccia: un controllo lato browser lo aggira chiunque.
create unique index if not exists punti_presenza_una_al_giorno
  on public.punti_eventi (tessera_id, market_id, giorno)
  where fonte = 'presenza_mercato' and stato <> 'annullato';

create unique index if not exists punti_banco_uno_al_giorno
  on public.punti_eventi (tessera_id, company_id, giorno)
  where fonte = 'scan_banco' and stato <> 'annullato';

create unique index if not exists punti_attivazione_banco_unica
  on public.punti_eventi (tessera_id, company_id)
  where fonte = 'attivazione_banco' and stato <> 'annullato';

create index if not exists punti_eventi_tessera_idx on public.punti_eventi (tessera_id, created_at desc);
create index if not exists punti_eventi_revisione_idx on public.punti_eventi (stato, created_at)
  where stato = 'in_sospeso';

-- Saldo: somma degli eventi validi. Una vista, non una colonna da tenere
-- allineata a mano — un saldo memorizzato prima o poi diverge dai movimenti.
create or replace view public.v_tessere_saldo as
select t.id as tessera_id, t.user_email, t.stato, t.market_id,
       coalesce(sum(e.punti) filter (where e.stato = 'valido'), 0)     as punti_validi,
       coalesce(sum(e.punti) filter (where e.stato = 'in_sospeso'), 0) as punti_in_sospeso,
       max(e.created_at)                                               as ultimo_movimento
  from public.tessere t
  left join public.punti_eventi e on e.tessera_id = t.id
 group by t.id, t.user_email, t.stato, t.market_id;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.tessere      enable row level security;
alter table public.punti_regole enable row level security;
alter table public.punti_eventi enable row level security;

drop policy if exists tessere_select on public.tessere;
create policy tessere_select on public.tessere for select to authenticated
  using (
    lower(user_email) = lower(auth.jwt() ->> 'email')
    or public.is_staff_for_market(market_id)
    or public.puo_leggere_rete()
  );

drop policy if exists tessere_insert on public.tessere;
create policy tessere_insert on public.tessere for insert to authenticated
  with check (
    lower(user_email) = lower(auth.jwt() ->> 'email')
    or public.is_staff_for_market(market_id)
    or public.is_admin()
  );

drop policy if exists tessere_update_staff on public.tessere;
create policy tessere_update_staff on public.tessere for update to authenticated
  using (public.is_staff_for_market(market_id) or public.is_admin())
  with check (public.is_staff_for_market(market_id) or public.is_admin());

drop policy if exists punti_regole_read on public.punti_regole;
create policy punti_regole_read on public.punti_regole for select to authenticated using (true);

drop policy if exists punti_regole_write on public.punti_regole;
create policy punti_regole_write on public.punti_regole for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Il titolare vede i propri movimenti; staff e amministrazione vedono quelli
-- del proprio mercato. Nessuno puo' modificarli o cancellarli: non esistono
-- policy UPDATE o DELETE, ed e' voluto.
drop policy if exists punti_eventi_select on public.punti_eventi;
create policy punti_eventi_select on public.punti_eventi for select to authenticated
  using (
    exists (select 1 from public.tessere t
             where t.id = punti_eventi.tessera_id
               and lower(t.user_email) = lower(auth.jwt() ->> 'email'))
    or public.is_staff_for_market(market_id)
    or public.puo_leggere_rete()
  );

drop policy if exists punti_eventi_insert on public.punti_eventi;
create policy punti_eventi_insert on public.punti_eventi for insert to authenticated
  with check (public.is_staff_for_market(market_id) or public.is_admin());

-- ---------------------------------------------------------------------------
-- Valori di partenza. Da tarare durante il pilot: sono una proposta, non
-- una legge. Le fonti che richiedono revisione dello staff nascono spente:
-- al pilot nessuno ha tempo di controllare scontrini il sabato mattina.
-- ---------------------------------------------------------------------------
insert into public.punti_regole (fonte, punti, tetto_giorno, attiva, richiede_revisione, descrizione) values
  ('presenza_mercato',   10,  10, true,  false, 'Scan di presenza, una volta al giorno per mercato'),
  ('scan_banco',          5,  15, true,  false, 'QR del banco, un banco al giorno, massimo tre'),
  ('attivazione_banco',  20,  60, true,  false, 'Prima scansione di un banco mai visitato'),
  ('bonus_ricorrenza',   50,  50, true,  false, 'Quattro giornate di mercato distinte in trenta giorni'),
  ('primo_accesso',      50,  50, false, false, 'Benvenuto. Spento finche non c e verifica del telefono: senza, e farmabile'),
  ('invito_amico',       75,  75, true,  false, 'Alla prima scansione reale dell invitato, non alla registrazione'),
  ('sondaggio',          15,  30, true,  false, 'Una risposta per sondaggio'),
  ('evento_checkin',     40,  40, true,  false, 'Check-in fatto dallo staff sul posto, non l RSVP'),
  ('consegna_confermata',20,  40, true,  false, 'Ordine consegnato e confermato da entrambe le parti'),
  ('scontrino',           1,  50, false, true,  'Un punto ogni due euro. Spento al pilot: richiede revisione dello staff'),
  ('social_tag',         30,  30, false, true,  'Post con tag, una volta al mese. Spento al pilot: richiede revisione')
on conflict (fonte, market_id) do nothing;


