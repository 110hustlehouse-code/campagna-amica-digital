-- ============================================================
-- Row Level Security (RLS)
-- Campagna Amica Hub — 4 ruoli: admin, client, producer, staff
--
-- Convenzioni:
--   admin      → accesso totale a tutto
--   staff      → gestisce i mercati di propria competenza
--   producer   → gestisce la propria azienda
--   client     → accede solo ai propri dati (ordini, preferiti, ecc.)
--   anonimo    → legge solo dati pubblici (mercati, aziende, prodotti)
-- ============================================================

-- ============================================================
-- USERS
-- ============================================================
alter table public.users enable row level security;

create policy "users: self read"
  on public.users for select
  using (auth.uid() = id or public.is_admin());

create policy "users: self update"
  on public.users for update
  using (auth.uid() = id or public.is_admin());

-- INSERT gestito dal trigger handle_new_user (security definer, bypassa RLS)

create policy "users: admin delete"
  on public.users for delete
  using (public.is_admin());

-- ============================================================
-- MARKETS — dati pubblici in lettura; scrittura solo admin/staff
-- ============================================================
alter table public.markets enable row level security;

create policy "markets: public read"
  on public.markets for select
  using (true);

create policy "markets: admin or staff write"
  on public.markets for insert
  with check (public.is_admin() or public.is_staff());

create policy "markets: admin or staff update"
  on public.markets for update
  using (public.is_admin() or public.is_staff());

create policy "markets: admin delete"
  on public.markets for delete
  using (public.is_admin());

-- ============================================================
-- COMPANIES — dati pubblici in lettura; scrittura al producer owner
-- ============================================================
alter table public.companies enable row level security;

create policy "companies: public read"
  on public.companies for select
  using (true);

create policy "companies: authenticated insert"
  on public.companies for insert
  with check (auth.uid() is not null);

create policy "companies: owner or admin update"
  on public.companies for update
  using (owner_id = auth.uid() or public.is_admin());

create policy "companies: owner or admin delete"
  on public.companies for delete
  using (owner_id = auth.uid() or public.is_admin());

-- ============================================================
-- PRODUCTS — dati pubblici in lettura; scrittura al producer owner
-- ============================================================
alter table public.products enable row level security;

create policy "products: public read"
  on public.products for select
  using (true);

create policy "products: owner insert"
  on public.products for insert
  with check (
    public.owns_company(company_id)
    or public.is_admin()
  );

create policy "products: owner or admin update"
  on public.products for update
  using (
    public.owns_company(company_id)
    or public.is_admin()
  );

create policy "products: owner or admin delete"
  on public.products for delete
  using (
    public.owns_company(company_id)
    or public.is_admin()
  );

-- ============================================================
-- ORDERS
-- Client: vede i propri ordini
-- Producer: vede gli ordini della propria azienda
-- Admin: vede tutto
-- ============================================================
alter table public.orders enable row level security;

create policy "orders: owner or producer or admin read"
  on public.orders for select
  using (
    user_id = auth.uid()
    or public.owns_company(company_id)
    or public.is_admin()
  );

create policy "orders: authenticated insert"
  on public.orders for insert
  with check (auth.uid() is not null);

create policy "orders: owner or producer or admin update"
  on public.orders for update
  using (
    user_id = auth.uid()
    or public.owns_company(company_id)
    or public.is_admin()
  );

create policy "orders: owner or admin delete"
  on public.orders for delete
  using (
    user_id = auth.uid()
    or public.is_admin()
  );

-- ============================================================
-- FAVORITES — solo il proprietario accede
-- ============================================================
alter table public.favorites enable row level security;

create policy "favorites: self read"
  on public.favorites for select
  using (user_id = auth.uid());

create policy "favorites: self insert"
  on public.favorites for insert
  with check (user_id = auth.uid());

create policy "favorites: self delete"
  on public.favorites for delete
  using (user_id = auth.uid());

-- ============================================================
-- MARKET EVENTS — dati pubblici in lettura
-- ============================================================
alter table public.market_events enable row level security;

create policy "market_events: public read"
  on public.market_events for select
  using (true);

create policy "market_events: staff or admin insert"
  on public.market_events for insert
  with check (
    public.is_staff_for_market(market_id)
    or public.is_admin()
  );

create policy "market_events: staff or admin update"
  on public.market_events for update
  using (
    public.is_staff_for_market(market_id)
    or public.is_admin()
  );

create policy "market_events: admin delete"
  on public.market_events for delete
  using (public.is_admin());

-- ============================================================
-- COMPANY MARKET ASSIGNMENTS — dati pubblici in lettura
-- ============================================================
alter table public.company_market_assignments enable row level security;

create policy "cma: public read"
  on public.company_market_assignments for select
  using (true);

create policy "cma: staff or admin insert"
  on public.company_market_assignments for insert
  with check (public.is_staff() or public.is_admin());

create policy "cma: staff or admin update"
  on public.company_market_assignments for update
  using (public.is_staff() or public.is_admin());

create policy "cma: admin delete"
  on public.company_market_assignments for delete
  using (public.is_admin());

-- ============================================================
-- STAFF MEMBERS
-- Staff vede i membri del proprio mercato; admin vede tutto
-- ============================================================
alter table public.staff_members enable row level security;

create policy "staff_members: staff or admin read"
  on public.staff_members for select
  using (
    -- il membro vede il proprio record
    user_id = auth.uid()
    -- un membro dello staff vede gli altri dello stesso mercato
    or exists (
      select 1 from public.staff_members sm
      where sm.user_id = auth.uid()
      and sm.market_id = staff_members.market_id
      and sm.is_active = true
    )
    or public.is_admin()
  );

create policy "staff_members: admin insert"
  on public.staff_members for insert
  with check (public.is_admin());

create policy "staff_members: admin update"
  on public.staff_members for update
  using (public.is_admin());

create policy "staff_members: admin delete"
  on public.staff_members for delete
  using (public.is_admin());

-- ============================================================
-- STAFF MESSAGES
-- Staff del mercato e admin possono creare/modificare
-- Produttori del mercato leggono (solo quelli pubblicati)
-- ============================================================
alter table public.staff_messages enable row level security;

create policy "staff_messages: staff or producer read"
  on public.staff_messages for select
  using (
    -- staff del mercato: vede tutto (anche non pubblicato)
    public.is_staff_for_market(market_id)
    -- produttore del mercato: vede solo i pubblicati
    or (
      is_published = true
      and exists (
        select 1 from public.companies c
        where c.owner_id = auth.uid()
        and market_id::text = any(c.market_ids)
      )
    )
    or public.is_admin()
  );

create policy "staff_messages: staff or admin insert"
  on public.staff_messages for insert
  with check (
    public.is_staff_for_market(market_id)
    or public.is_admin()
  );

create policy "staff_messages: staff or admin update"
  on public.staff_messages for update
  using (
    public.is_staff_for_market(market_id)
    or public.is_admin()
  );

create policy "staff_messages: admin delete"
  on public.staff_messages for delete
  using (public.is_admin());

-- ============================================================
-- STAFF MESSAGE READS
-- ============================================================
alter table public.staff_message_reads enable row level security;

create policy "staff_message_reads: self or staff or admin read"
  on public.staff_message_reads for select
  using (
    user_id = auth.uid()
    or public.is_staff()
    or public.is_admin()
  );

create policy "staff_message_reads: authenticated insert"
  on public.staff_message_reads for insert
  with check (auth.uid() is not null);

-- ============================================================
-- COMPANY NEEDS
-- Produttore: gestisce i bisogni della propria azienda
-- Staff del mercato: gestisce i bisogni del proprio mercato
-- ============================================================
alter table public.company_needs enable row level security;

create policy "company_needs: owner or staff or admin read"
  on public.company_needs for select
  using (
    public.owns_company(company_id)
    or public.is_staff_for_market(market_id)
    or public.is_admin()
  );

create policy "company_needs: owner or staff insert"
  on public.company_needs for insert
  with check (
    public.owns_company(company_id)
    or public.is_staff_for_market(market_id)
    or public.is_admin()
  );

create policy "company_needs: owner or staff update"
  on public.company_needs for update
  using (
    public.owns_company(company_id)
    or public.is_staff_for_market(market_id)
    or public.is_admin()
  );

create policy "company_needs: admin delete"
  on public.company_needs for delete
  using (public.is_admin());

-- ============================================================
-- PRODUCER EVENT RSVPs
-- ============================================================
alter table public.producer_event_rsvps enable row level security;

create policy "rsvps: owner or staff or admin read"
  on public.producer_event_rsvps for select
  using (
    public.owns_company(company_id)
    or public.is_staff_for_market(market_id)
    or public.is_admin()
  );

create policy "rsvps: owner insert"
  on public.producer_event_rsvps for insert
  with check (
    public.owns_company(company_id)
    or public.is_admin()
  );

create policy "rsvps: owner or admin update"
  on public.producer_event_rsvps for update
  using (
    public.owns_company(company_id)
    or public.is_admin()
  );

-- ============================================================
-- PRODUCT STOCKS
-- Solo il producer owner e admin
-- ============================================================
alter table public.product_stocks enable row level security;

create policy "product_stocks: owner or admin read"
  on public.product_stocks for select
  using (
    public.owns_company(company_id)
    or public.is_admin()
  );

create policy "product_stocks: owner or admin insert"
  on public.product_stocks for insert
  with check (
    public.owns_company(company_id)
    or public.is_admin()
  );

create policy "product_stocks: owner or admin update"
  on public.product_stocks for update
  using (
    public.owns_company(company_id)
    or public.is_admin()
  );

create policy "product_stocks: owner or admin delete"
  on public.product_stocks for delete
  using (
    public.owns_company(company_id)
    or public.is_admin()
  );

-- ============================================================
-- STALL RENTALS
-- Producer: vede il proprio affitto
-- Staff del mercato: vede e gestisce gli affitti del proprio mercato
-- ============================================================
alter table public.stall_rentals enable row level security;

create policy "stall_rentals: owner or staff or admin read"
  on public.stall_rentals for select
  using (
    public.owns_company(company_id)
    or public.is_staff_for_market(market_id)
    or public.is_admin()
  );

create policy "stall_rentals: staff or admin insert"
  on public.stall_rentals for insert
  with check (
    public.is_staff_for_market(market_id)
    or public.is_admin()
  );

create policy "stall_rentals: staff or admin update"
  on public.stall_rentals for update
  using (
    public.is_staff_for_market(market_id)
    or public.is_admin()
  );

create policy "stall_rentals: admin delete"
  on public.stall_rentals for delete
  using (public.is_admin());

-- ============================================================
-- RENTAL PAYMENTS
-- ============================================================
alter table public.rental_payments enable row level security;

create policy "rental_payments: owner or staff or admin read"
  on public.rental_payments for select
  using (
    public.owns_company(company_id)
    or public.is_staff_for_market(market_id)
    or public.is_admin()
  );

create policy "rental_payments: staff or admin insert"
  on public.rental_payments for insert
  with check (
    public.is_staff_for_market(market_id)
    or public.is_admin()
  );

create policy "rental_payments: staff or admin update"
  on public.rental_payments for update
  using (
    public.is_staff_for_market(market_id)
    or public.is_admin()
  );

create policy "rental_payments: admin delete"
  on public.rental_payments for delete
  using (public.is_admin());

-- ============================================================
-- SUPPLIERS — visibili e gestibili solo dal producer owner
-- ============================================================
alter table public.suppliers enable row level security;

create policy "suppliers: owner or admin read"
  on public.suppliers for select
  using (
    public.owns_company(company_id)
    or public.is_admin()
  );

create policy "suppliers: owner or admin insert"
  on public.suppliers for insert
  with check (
    public.owns_company(company_id)
    or public.is_admin()
  );

create policy "suppliers: owner or admin update"
  on public.suppliers for update
  using (
    public.owns_company(company_id)
    or public.is_admin()
  );

create policy "suppliers: owner or admin delete"
  on public.suppliers for delete
  using (
    public.owns_company(company_id)
    or public.is_admin()
  );

-- ============================================================
-- SUPPLIER PAYMENTS
-- ============================================================
alter table public.supplier_payments enable row level security;

create policy "supplier_payments: owner or admin read"
  on public.supplier_payments for select
  using (
    public.owns_company(company_id)
    or public.is_admin()
  );

create policy "supplier_payments: owner or admin insert"
  on public.supplier_payments for insert
  with check (
    public.owns_company(company_id)
    or public.is_admin()
  );

create policy "supplier_payments: owner or admin update"
  on public.supplier_payments for update
  using (
    public.owns_company(company_id)
    or public.is_admin()
  );

create policy "supplier_payments: owner or admin delete"
  on public.supplier_payments for delete
  using (
    public.owns_company(company_id)
    or public.is_admin()
  );

-- ============================================================
-- REVIEWS — pubbliche in lettura; scrittura autenticata
-- La risposta del producer viene gestita in update
-- ============================================================
alter table public.reviews enable row level security;

create policy "reviews: public read"
  on public.reviews for select
  using (true);

create policy "reviews: authenticated insert"
  on public.reviews for insert
  with check (
    auth.uid() is not null
    and user_id = auth.uid()
  );

create policy "reviews: self or producer reply or admin update"
  on public.reviews for update
  using (
    -- il cliente può modificare la propria recensione
    user_id = auth.uid()
    -- il producer può aggiungere la propria risposta
    or public.owns_company(company_id)
    or public.is_admin()
  );

create policy "reviews: self or admin delete"
  on public.reviews for delete
  using (
    user_id = auth.uid()
    or public.is_admin()
  );

-- ============================================================
-- NOTIFICATIONS — ogni utente vede solo le proprie
-- INSERT aperto agli autenticati (le Edge Functions usano service_role)
-- ============================================================
alter table public.notifications enable row level security;

create policy "notifications: self read"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "notifications: self update (mark as read)"
  on public.notifications for update
  using (user_id = auth.uid());

create policy "notifications: self delete"
  on public.notifications for delete
  using (user_id = auth.uid() or public.is_admin());

-- Le Edge Functions inviano notifiche con service_role (bypassa RLS),
-- quindi non serve una policy INSERT aperta agli utenti.

-- ============================================================
-- NEWS CACHE — pubblica in lettura; gestione via Edge Function
-- ============================================================
alter table public.news_cache enable row level security;

create policy "news_cache: public read"
  on public.news_cache for select
  using (true);

-- INSERT/UPDATE/DELETE solo tramite Edge Functions (service_role)
-- Nessuna policy utente necessaria.
