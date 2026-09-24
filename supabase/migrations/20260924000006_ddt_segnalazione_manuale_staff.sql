-- Lo staff può creare segnalazioni manualmente per il proprio mercato,
-- oltre a quelle già generate in automatico dal cron.
create policy "missing_ddt_reports: staff insert"
  on public.missing_ddt_reports for insert
  with check (is_staff_for_market(market_id));