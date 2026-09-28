-- Lo staff può cancellare gli eventi/comunicazioni che ha creato per il
-- proprio mercato — oggi solo l'admin poteva farlo, per cui il tasto
-- Elimina in CreateEvent.jsx falliva in silenzio (RLS nega senza dare
-- errore su un DELETE a zero righe toccate).
create policy "staff_messages: staff delete own market" on public.staff_messages for delete
  using (is_staff_for_market(market_id));
