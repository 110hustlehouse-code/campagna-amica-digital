-- ---------------------------------------------------------------------------
-- Dati di riferimento territoriali: regioni, province, comuni, quartieri.
-- Vanno caricati in OGNI ambiente, CI compresa: le funzioni di aggregazione
-- e la vista v_markets_territorio si appoggiano a questa gerarchia.
-- Idempotente: si puo' rieseguire senza danni.
-- ---------------------------------------------------------------------------

insert into public.regioni (codice_istat, nome, ripartizione) values
  ('01','Piemonte','Nord-ovest'),
  ('02','Valle d''Aosta','Nord-ovest'),
  ('03','Lombardia','Nord-ovest'),
  ('04','Trentino-Alto Adige','Nord-est'),
  ('05','Veneto','Nord-est'),
  ('06','Friuli-Venezia Giulia','Nord-est'),
  ('07','Liguria','Nord-ovest'),
  ('08','Emilia-Romagna','Nord-est'),
  ('09','Toscana','Centro'),
  ('10','Umbria','Centro'),
  ('11','Marche','Centro'),
  ('12','Lazio','Centro'),
  ('13','Abruzzo','Sud'),
  ('14','Molise','Sud'),
  ('15','Campania','Sud'),
  ('16','Puglia','Sud'),
  ('17','Basilicata','Sud'),
  ('18','Calabria','Sud'),
  ('19','Sicilia','Isole'),
  ('20','Sardegna','Isole')
on conflict (codice_istat) do nothing;

-- ---------------------------------------------------------------------
-- PROVINCE DEL LAZIO
-- ---------------------------------------------------------------------
insert into public.province (sigla, nome, codice_istat, regione_istat) values
  ('VT','Viterbo',   '056','12'),
  ('RI','Rieti',     '057','12'),
  ('RM','Roma',      '058','12'),
  ('LT','Latina',    '059','12'),
  ('FR','Frosinone', '060','12')
on conflict (sigla) do nothing;

-- ---------------------------------------------------------------------
-- COMUNE DI ROMA
-- ---------------------------------------------------------------------
insert into public.comuni (codice_istat, nome, provincia_sigla, cap_principale) values
  ('058091','Roma','RM','00100')
on conflict (codice_istat) do nothing;

-- ---------------------------------------------------------------------
-- QUARTIERE
-- ---------------------------------------------------------------------
insert into public.quartieri (nome, comune_istat, municipio) values
  ('Circo Massimo','058091','I')
on conflict (comune_istat, nome) do nothing;

-- ---------------------------------------------------------------------
-- MERCATO CIRCO MASSIMO
-- ---------------------------------------------------------------------
