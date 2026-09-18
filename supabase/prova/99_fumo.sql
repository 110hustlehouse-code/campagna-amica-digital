select 'serie_storica_fatturato: ' || count(*) || ' mesi' from serie_storica_fatturato('italia', null, 12);
select 'metriche_operative: ' || count(*) || ' riga' from metriche_operative('italia', null, null, null);
select 'composizione_fatturato: ' || count(*) || ' voci' from composizione_fatturato('italia', null, null, null, 8);
select 'riepilogo_nazionale: ' || count(*) || ' riga' from riepilogo_nazionale(null, null);
select 'metriche_territorio: ' || count(*) || ' righe' from metriche_territorio('italia', null, null, null);
select 'ddt_nazionali: ' || count(*) || ' righe' from ddt_nazionali(null,null,null,null,10);
