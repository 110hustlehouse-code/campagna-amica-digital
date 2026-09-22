-- =====================================================================
-- Campagna Amica Digital — DDT digitale + Tessera cliente
-- Campo Zero
--
-- Il DDT (Documento Di Trasporto, DPR 472/1996) accompagna la merce dal
-- luogo di partenza a quello di destinazione. I campi qui sotto sono
-- quelli che la norma richiede: non sono campi di comodo.
-- La numerazione deve essere progressiva, univoca per emittente e anno,
-- e senza buchi: per questo usiamo un contatore con lock di riga e non
-- un max()+1, che in concorrenza genera duplicati.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. NUMERAZIONE PROGRESSIVA ATOMICA
-- ---------------------------------------------------------------------

create table public.ddt_counters (
  company_id     uuid not null references public.companies(id) on delete cascade,
  anno           integer not null,
  ultimo_numero  integer not null default 0,
  primary key (company_id, anno)
);

create or replace function public.next_ddt_number(p_company_id uuid, p_anno integer)
returns integer language plpgsql security definer set search_path = public as $$
declare v_num integer;
begin
  insert into public.ddt_counters (company_id, anno, ultimo_numero)
  values (p_company_id, p_anno, 0)
  on conflict (company_id, anno) do nothing;

  -- UPDATE prende il lock esclusivo sulla riga: due emissioni simultanee
  -- si accodano invece di ottenere lo stesso numero.
  update public.ddt_counters
     set ultimo_numero = ultimo_numero + 1
   where company_id = p_company_id and anno = p_anno
  returning ultimo_numero into v_num;

  return v_num;
end $$;

-- ---------------------------------------------------------------------
-- 2. TESTATA DDT
-- ---------------------------------------------------------------------

create table public.ddt (
  id                   uuid primary key default gen_random_uuid(),

  -- Identificazione documento.
  -- numero e anno restano NULL finche' il DDT e' in bozza: il progressivo
  -- viene assegnato solo all'emissione, altrimenti una bozza abbandonata
  -- brucerebbe un numero della serie.
  numero               integer,
  anno                 integer,
  numero_completo      text generated always as
                         (case when numero is null then null
                               else numero::text || '/' || anno::text end) stored,
  data_documento       date not null default current_date,

  -- Mittente: l'azienda che emette. I dati fiscali sono copiati qui in
  -- forma congelata: un DDT emesso non deve cambiare se domani l'azienda
  -- modifica la propria anagrafica.
  company_id           uuid not null references public.companies(id) on delete restrict,
  mittente_ragione_sociale text not null,
  mittente_partita_iva     text,
  mittente_codice_fiscale  text,
  mittente_indirizzo       text,

  -- Destinatario
  destinatario_tipo    text not null default 'mercato'
                       check (destinatario_tipo in ('mercato','cliente','altro')),
  market_id            uuid references public.markets(id) on delete restrict,
  destinatario_denominazione text not null,
  destinatario_indirizzo     text,
  destinatario_partita_iva   text,

  -- Luogo di destinazione, se diverso dalla sede del destinatario
  luogo_destinazione   text,

  -- Causale del trasporto (campo obbligatorio per norma)
  causale              text not null default 'vendita'
                       check (causale in ('vendita','conto_visione','conto_deposito',
                                          'reso','trasferimento','omaggio','riparazione','altro')),
  causale_altro        text,

  -- Trasporto
  trasporto_a_cura_di  text not null default 'mittente'
                       check (trasporto_a_cura_di in ('mittente','destinatario','vettore')),
  vettore_denominazione text,
  vettore_partita_iva   text,
  data_ora_ritiro       timestamptz,
  aspetto_beni          text default 'A vista',
  numero_colli          integer,
  peso_kg               numeric(10,3),

  -- Stato del documento. Un DDT emesso e' immutabile: si annulla, non si
  -- modifica. La bozza invece e' liberamente editabile.
  stato                text not null default 'bozza'
                       check (stato in ('bozza','emesso','consegnato','annullato')),
  data_emissione       timestamptz,
  data_consegna        timestamptz,
  data_annullamento    timestamptz,
  motivo_annullamento  text,

  -- Firma di ricezione
  firma_ricezione_url  text,
  firmato_da           text,

  pdf_url              text,
  note                 text,

  created_date         timestamptz not null default now(),
  updated_date         timestamptz not null default now(),
  created_by           text,

  constraint ddt_numero_univoco unique (company_id, anno, numero),
  constraint ddt_mercato_richiesto check (
    destinatario_tipo <> 'mercato' or market_id is not null),
  constraint ddt_causale_altro check (
    causale <> 'altro' or causale_altro is not null),
  -- Un documento non in bozza DEVE avere numero e anno.
  constraint ddt_numerato_se_emesso check (
    stato = 'bozza' or (numero is not null and anno is not null))
);
create index on public.ddt (company_id, anno desc, numero desc);
create index on public.ddt (market_id, data_documento desc);
create index on public.ddt (stato);
create index on public.ddt (data_documento desc);

comment on table public.ddt is
  'Documento di trasporto. Un DDT in stato "emesso" non e'' piu'' modificabile: '
  'la correzione avviene per annullamento e riemissione.';

-- ---------------------------------------------------------------------
-- 3. RIGHE DDT
-- ---------------------------------------------------------------------

create table public.ddt_righe (
  id           uuid primary key default gen_random_uuid(),
  ddt_id       uuid not null references public.ddt(id) on delete cascade,
  riga_numero  integer not null,

  -- product_id e' un riferimento debole: il prodotto puo' essere
  -- cancellato dal catalogo, ma la riga del DDT deve restare leggibile.
  -- Per questo descrizione, unita' e prezzo sono copiati, non join.
  product_id   uuid references public.products(id) on delete set null,
  descrizione  text not null,
  quantita     numeric(12,3) not null check (quantita > 0),
  unita        text not null default 'kg',
  prezzo_unitario numeric(10,2),
  importo      numeric(12,2) generated always as
                 (round(quantita * coalesce(prezzo_unitario, 0), 2)) stored,
  lotto        text,
  note         text,

  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text,

  unique (ddt_id, riga_numero)
);
create index on public.ddt_righe (ddt_id);

-- Totali sempre allineati alle righe
create view public.v_ddt_totali as
select d.id as ddt_id,
       count(r.id)                     as righe,
       coalesce(sum(r.quantita), 0)    as quantita_totale,
       coalesce(sum(r.importo), 0)     as importo_totale
  from public.ddt d
  left join public.ddt_righe r on r.ddt_id = d.id
 group by d.id;

-- ---------------------------------------------------------------------
-- 4. EMISSIONE E IMMUTABILITA'
-- ---------------------------------------------------------------------

-- Assegna il numero progressivo e congela il documento.
create or replace function public.emetti_ddt(p_ddt_id uuid)
returns public.ddt language plpgsql security definer set search_path = public as $$
declare v_ddt public.ddt; v_anno integer; v_num integer; v_righe integer;
begin
  select * into v_ddt from public.ddt where id = p_ddt_id for update;
  if not found then raise exception 'DDT % inesistente', p_ddt_id; end if;
  if v_ddt.stato <> 'bozza' then
    raise exception 'DDT gia'' in stato %: non e'' piu'' emettibile', v_ddt.stato;
  end if;

  select count(*) into v_righe from public.ddt_righe where ddt_id = p_ddt_id;
  if v_righe = 0 then raise exception 'Un DDT non puo'' essere emesso senza righe'; end if;

  v_anno := extract(year from v_ddt.data_documento)::integer;
  v_num  := public.next_ddt_number(v_ddt.company_id, v_anno);

  update public.ddt
     set numero = v_num, anno = v_anno, stato = 'emesso', data_emissione = now()
   where id = p_ddt_id
  returning * into v_ddt;

  return v_ddt;
end $$;

-- Blocca ogni modifica a un DDT emesso, tranne i passaggi di stato leciti.
create or replace function public.guard_ddt_immutabile()
returns trigger language plpgsql as $$
begin
  if old.stato in ('emesso','consegnato') then
    if new.stato is distinct from old.stato
       and new.stato in ('consegnato','annullato') then
      return new;  -- transizione lecita
    end if;
    if row(new.*) is distinct from row(old.*) then
      raise exception
        'DDT %/% gia'' emesso: annullare e riemettere invece di modificare',
        old.numero, old.anno;
    end if;
  end if;
  if old.stato = 'annullato' then
    raise exception 'DDT %/% annullato: non modificabile', old.numero, old.anno;
  end if;
  return new;
end $$;

create trigger trg_ddt_immutabile
  before update on public.ddt
  for each row execute function public.guard_ddt_immutabile();

create or replace function public.guard_ddt_righe_immutabili()
returns trigger language plpgsql as $$
declare v_stato text;
begin
  select stato into v_stato from public.ddt
   where id = coalesce(new.ddt_id, old.ddt_id);
  if v_stato <> 'bozza' then
    raise exception 'Le righe di un DDT % non sono modificabili', v_stato;
  end if;
  return coalesce(new, old);
end $$;

create trigger trg_ddt_righe_immutabili
  before insert or update or delete on public.ddt_righe
  for each row execute function public.guard_ddt_righe_immutabili();

-- ---------------------------------------------------------------------
-- 5. TESSERA CLIENTE
-- ---------------------------------------------------------------------
-- ATTENZIONE: le specifiche funzionali della tessera non sono ancora
-- definite (punti? sconti? sola identificazione? legata alla membership
-- premium?). Questa tabella copre la parte che sara' comune a qualunque
-- scelta — identita', codice, QR, stato, emittente — e va estesa quando
-- le regole saranno decise. Non inventiamo qui un meccanismo a punti.

create table public.tessere (
  id               uuid primary key default gen_random_uuid(),
  codice           text not null unique,
  user_id          uuid references auth.users(id) on delete set null,
  user_email       text not null,
  intestatario     text,

  market_id        uuid references public.markets(id) on delete set null,  -- mercato emittente
  tipo             text not null default 'base' check (tipo in ('base','premium')),
  stato            text not null default 'attiva'
                   check (stato in ('attiva','sospesa','scaduta','revocata')),

  data_emissione   timestamptz not null default now(),
  data_scadenza    date,
  ultimo_utilizzo  timestamptz,

  qr_payload       text not null,   -- contenuto del QR, firmato lato server
  note             text,

  created_date     timestamptz not null default now(),
  updated_date     timestamptz not null default now(),
  created_by       text
);
create unique index on public.tessere (lower(user_email)) where stato = 'attiva';
create index on public.tessere (market_id);

comment on table public.tessere is
  'Tessera cliente — struttura di base. Specifiche funzionali da definire: '
  'vedi fase 7 del piano pilot.';

-- Registro utilizzi: serve comunque, qualunque sia la logica scelta,
-- ed e' il dato che alimenta le metriche dell''area Admin.
create table public.tessera_utilizzi (
  id           uuid primary key default gen_random_uuid(),
  tessera_id   uuid not null references public.tessere(id) on delete cascade,
  market_id    uuid references public.markets(id) on delete set null,
  company_id   uuid references public.companies(id) on delete set null,
  order_id     uuid references public.orders(id) on delete set null,
  tipo_evento  text not null default 'scansione'
               check (tipo_evento in ('scansione','ordine','sconto','altro')),
  importo      numeric(10,2),
  note         text,
  created_date timestamptz not null default now(),
  created_by   text
);
create index on public.tessera_utilizzi (tessera_id, created_date desc);
create index on public.tessera_utilizzi (market_id, created_date desc);

-- Generatore codice tessera leggibile: CA-XXXXXX
create or replace function public.genera_codice_tessera()
returns text language plpgsql as $$
declare v_code text; v_exists boolean;
begin
  loop
    v_code := 'CA-' || upper(substring(encode(gen_random_bytes(6),'hex') from 1 for 6));
    select exists(select 1 from public.tessere where codice = v_code) into v_exists;
    exit when not v_exists;
  end loop;
  return v_code;
end $$;

-- ---------------------------------------------------------------------
-- 6. TRIGGER STANDARD
-- ---------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['ddt','ddt_righe','tessere'] loop
    perform public.apply_standard_triggers(t);
  end loop;
end $$;

create trigger trg_tessera_utilizzi_createdby
  before insert on public.tessera_utilizzi
  for each row execute function public.set_created_by();
