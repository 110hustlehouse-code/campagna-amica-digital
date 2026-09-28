-- Le comunicazioni/eventi pubblicati devono essere leggibili da chiunque
-- (clienti inclusi), non solo dai produttori con azienda in quel mercato.
-- Coerente con il pattern "public read" già usato per markets/products.
drop policy if exists "staff_messages: staff or producer read" on public.staff_messages;

create policy "staff_messages: staff read all, public read published"
  on public.staff_messages for select
  using (
    is_staff_for_market(market_id)
    or is_admin()
    or is_published = true
  );
