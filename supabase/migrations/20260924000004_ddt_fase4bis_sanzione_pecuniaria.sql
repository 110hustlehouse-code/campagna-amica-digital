-- ============================================================
-- Terzo tipo di provvedimento: avviso di sanzione pecuniaria.
-- Gestita interamente fuori dalla piattaforma (bonifico, PEC,
-- ecc.) — qui solo registrazione del motivo e notifica.
-- ============================================================

alter table public.stall_sanctions drop constraint if exists stall_sanctions_type_check;
alter table public.stall_sanctions add constraint stall_sanctions_type_check
  check (type in ('warning', 'stall_block', 'monetary_notice'));