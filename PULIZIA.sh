#!/usr/bin/env bash
# Sposta il vecchio schema in archivio e toglie i file di appoggio.
# Da lanciare dalla radice del repo, PRIMA di estrarre il pacchetto nuovo.
set -e
cd "$(git rev-parse --show-toplevel)"

echo "== archivio del vecchio schema =="
mkdir -p archivio/schema-precedente/migrations archivio/schema-precedente/functions

# Le 8 migration del 17/09 descrivono lo schema superato: non si cancellano,
# si archiviano. Servono se un domani va ricostruita la storia del progetto.
git mv supabase/migrations/20260917*.sql archivio/schema-precedente/migrations/ 2>/dev/null || true

# Le 12 Edge Function scritte per quello schema: stessa sorte.
for f in analyzeListino deleteUserAccount exportOrdersPDF invokeLLM \
         notifyFavoriteProduct notifyOrderUpdate notifyProducerNeedResponse \
         notifyProducersNewCommunication notifyReview refreshColdirettiNews \
         replyToReview rsvpProducerEvent _shared; do
  [ -e "supabase/functions/$f" ] && git mv "supabase/functions/$f" archivio/schema-precedente/functions/ || true
done

echo "== file di appoggio =="
git rm -r -q --ignore-unmatch supabase/unificato
git rm -q --ignore-unmatch supabase/seed/02_ambiente.sql
git rm -r -q --cached --ignore-unmatch supabase/.temp
rm -rf supabase/.temp
grep -qxF 'supabase/.temp/' .gitignore || echo 'supabase/.temp/' >> .gitignore

echo "== fatto. Ora estrai il pacchetto e ricontrolla con git status =="
