-- Lo staff del mercato deve poter eliminare gli affitti che gestisce,
-- non solo l'admin (stesso bug già risolto per staff_messages).
create policy "stall_rentals: staff delete own market"
  on public.stall_rentals for delete
  using (is_staff_for_market(market_id));
