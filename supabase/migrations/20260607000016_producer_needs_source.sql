-- Aggiunge colonna source a producer_needs per identificare l'origine del bisogno
-- senza dipendere da text-match sulla descrizione (fragile).
-- Valori attesi: 'session' (da ProducerSessionPanel), NULL (inserito da staff manualmente)

alter table producer_needs
  add column if not exists source text;

comment on column producer_needs.source is 'Origine del bisogno: ''session'' se creato da ProducerSessionPanel, NULL se inserito da staff';
