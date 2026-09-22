-- ---------------------------------------------------------------------------
-- Aggancio del mercato pilota alla gerarchia territoriale.
-- Solo dev e demo. Prima di eseguirlo su prod, verificare che il mercato
-- da collegare sia quello giusto: qui si prende il primo per nome.
-- ---------------------------------------------------------------------------

-- Il quartiere esiste gia' da 01_territorio.sql; qui si collega il mercato.
update public.markets m
   set comune_istat = '058091',
       quartiere_id = (select id from public.quartieri
                        where nome = 'Circo Massimo' and comune_istat = '058091'),
       codice_mercato = coalesce(m.codice_mercato, 'RM-CM-' || left(m.id::text, 6))
 where m.comune_istat is null
   and lower(m.city) like 'roma%';

-- Controllo finale: i mercati rimasti senza territorio non compariranno
-- nel drill-down. Zero e' il valore atteso dopo il collegamento.
select count(*) as mercati_senza_territorio from public.markets where comune_istat is null;
