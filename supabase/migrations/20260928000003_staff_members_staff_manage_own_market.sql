-- Lo staff (non solo l'admin) deve poter gestire il team del proprio
-- mercato dalla sezione "Gestisci Team" — stesso pattern già usato
-- per staff_messages e stall_rentals. Le policy admin restano invariate.
create policy "staff_members: staff insert own market"
  on public.staff_members for insert
  with check (is_staff_for_market(market_id));

create policy "staff_members: staff update own market"
  on public.staff_members for update
  using (is_staff_for_market(market_id))
  with check (is_staff_for_market(market_id));

create policy "staff_members: staff delete own market"
  on public.staff_members for delete
  using (is_staff_for_market(market_id));
