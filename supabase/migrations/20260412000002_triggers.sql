-- ============================================================
-- Trigger e Funzioni di sistema
-- ============================================================

-- ============================================================
-- 1. updated_at automatico
-- Aggiorna il campo updated_at ad ogni UPDATE su qualsiasi tabella
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Applica il trigger a tutte le tabelle con updated_at
create trigger set_updated_at before update on public.users
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.markets
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.companies
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.products
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.orders
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.market_events
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.company_market_assignments
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.staff_members
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.staff_messages
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.company_needs
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.producer_event_rsvps
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.product_stocks
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.stall_rentals
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.rental_payments
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.suppliers
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.supplier_payments
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.reviews
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- 2. Profilo utente automatico al signup
-- Crea un record in public.users ogni volta che un utente si
-- registra tramite Supabase Auth (email/password, social, ecc.)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, role, role_confirmed)
  values (
    new.id,
    new.email,
    'client',   -- ruolo default; l'utente lo cambia in /benvenuto
    false
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 3. Funzioni helper usate nelle RLS policies
-- ============================================================

-- Ritorna il ruolo dell'utente corrente (null se non autenticato)
create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

-- Ritorna true se l'utente corrente è admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.users where id = auth.uid()),
    false
  );
$$;

-- Ritorna true se l'utente corrente possiede l'azienda indicata
create or replace function public.owns_company(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.companies
    where id = p_company_id
    and owner_id = auth.uid()
  );
$$;

-- Ritorna true se l'utente corrente è staff attivo per il mercato indicato
create or replace function public.is_staff_for_market(p_market_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_members
    where user_id = auth.uid()
    and market_id = p_market_id
    and is_active = true
  );
$$;

-- Ritorna true se l'utente corrente è staff attivo per qualsiasi mercato
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_members
    where user_id = auth.uid()
    and is_active = true
  );
$$;
