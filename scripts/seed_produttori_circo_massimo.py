#!/usr/bin/env python3
"""Invita i produttori reali del mercato Circo Massimo e crea le loro aziende.

Dati raccolti a mano dal sito ufficiale mercatocircomassimo.campagnamica.it
(la pagina blocca lo scraping automatico via robots.txt, quindi non e' un
estratto meccanico: indirizzi, email, telefoni e descrizioni sono stati
copiati dal sito e incollati in chat da Carlo il 18/09/2026).

Per ciascuna azienda:
  1. Invia un invito REALE via Supabase Auth (auth.admin.invite) -- crea
     auth.users + profiles (trigger, ruolo default 'client')
  2. Promuove il profilo a role='producer', role_confirmed=true
  3. Inserisce/aggiorna la riga in companies (created_by = email, in modo
     che la RLS companies_update_own riconosca il proprietario)
  4. Aggancia l'azienda al mercato Circo Massimo (companies.market_ids +
     markets.company_ids -- stesso campo "debito tecnico" gia' in uso)

ATTENZIONE: il passo 1 manda email vere a indirizzi di aziende vere.
Di default lo script gira in --dry-run (stampa cosa farebbe, non tocca
nulla). Vanno passati esplicitamente --invite e/o --apply-sql per agire
davvero -- due flag separati apposta, cosi' puoi popolare i dati (SQL)
prima e decidere solo dopo quando davvero spedire gli inviti.

Uso:
    pip install psycopg2-binary --break-system-packages   # una volta sola

    export SUPABASE_URL=https://xxxx.supabase.co
    export SUPABASE_SERVICE_ROLE_KEY=...      # mai nel frontend, solo qui
    export DSN=postgresql://postgres:...@...  # connessione diretta Postgres

    python3 scripts/seed_produttori_circo_massimo.py                # dry-run
    python3 scripts/seed_produttori_circo_massimo.py --apply-sql    # solo dati
    python3 scripts/seed_produttori_circo_massimo.py --apply-sql --invite  # tutto

NOTE APERTE (non inventate: mancano dal sito, vanno chieste ai produttori
prima di emettere un DDT vero, che richiede dati fiscali del mittente):
  - partita_iva, codice_fiscale, ragione_sociale: lasciati NULL
  - categoria assegnata a occhio dalla descrizione: rivedere le due segnate
    "altro" (fiori, pesca) che non rientrano bene nell'enum esistente
"""
import argparse
import json
import os
import sys
import urllib.request
import urllib.error

CODICE_MERCATO_CIRCO_MASSIMO = "CA-RM-001"

PRODUTTORI = [
    dict(name="Agri. Api. Bio", email="info@cremealimentari.it", phone="0776/280165",
         website="https://www.cremealimentari.it/", city="Cassino", category="ortofrutticola",
         sede_indirizzo="Via Colle Romano 1, 03043 Cassino (FR)",
         description="Azienda agricola biologica a conduzione familiare, certificazione CCPB. "
                      "Produce creme spalmabili, dolci e piccanti, peperoni in agrodolce, "
                      "grigliati, confetture e marmellate da verdure coltivate in azienda e "
                      "da aziende amiche biologiche (peperoni di Pontecorvo, aglio rosso di Castelliri)."),
    dict(name="Alan Farm", email="info@alanfarm.com", phone="0773/850147",
         website="https://www.caseificioalanfarm.com/", city="Pontinia", category="lattiero_casearia",
         sede_indirizzo="Via Migliara 51 Sinistra 167, 04014 Pontinia (LT)",
         description="Azienda agro-zootecnico-casearia, 50 ettari, 200 bovini di razza Frisona "
                      "Italiana (90 in lattazione). Vende prodotti caseari e carne di propria "
                      "produzione, anche tramite agriturismo dal 2011."),
    dict(name="Apicoltura D'Angelis di Ripepi Fortunata", email="felice.dangelis@tiscali.it",
         phone="320/1599125", website=None, city="Fondi", category="apicoltura",
         sede_indirizzo="Via Colle Troiano 8, 04022 Fondi (LT)",
         description="Piccola impresa familiare, mieli tipici delle zone collinari e montane "
                      "del centro Italia (acacia, millefiori, castagno, melata) e altri prodotti "
                      "dell'attivita' apistica (pappa reale, propoli, cera, idromele, sciami)."),
    dict(name="Az. Agr. Benacquista Loris", email="info@agricolabenacquista.it", phone="0776/884085",
         website="https://www.agricolabenacquista.it/", city="Campoli Appennino", category="lattiero_casearia",
         sede_indirizzo="Via Capranica 11, 03030 Campoli Appennino (FR)",
         description="Specialità caprine: formaggio fresco, caprini a stagionatura media e lunga, "
                      "la Marzolina (Primo Presidio Slow Food del Lazio dal 2000). Fattorie "
                      "didattiche e turismo gastronomico. Linea parallela di tartufi e creme di tartufo."),
    dict(name="Az. Agr. Bressan Simona", email="info@aziendabressan.it", phone="336/540212",
         website="http://www.aziendabressan.it/", city="Latina", category="ortofrutticola",
         sede_indirizzo="Strada Astura 24, 04100 Latina (LT)",
         description="Fondata nel 1949, specializzata nella coltivazione del fungo Pleurotus con "
                      "ciclo produttivo interamente interno. Linea di funghi sott'olio (Ricetta "
                      "Tradizionale, Orecchiette alla brace, crema di funghi)."),
    dict(name="Az. Agr. Fabiana Selleri", email="consegne@ortodifabiana.it", phone="331/6871776",
         website="https://www.ortodifabiana.it/", city="Roma", category="ortofrutticola",
         sede_indirizzo="Via di Baccanello 30, 00123 Roma (RM)",
         description="L'Orto di Fabiana, azienda biologica a Cesano (agro romano), 10 ettari di "
                      "ortaggi e frutta senza diserbanti ne' pesticidi. Team giovane, coltivazione "
                      "in campo aperto e serre non riscaldate."),
    dict(name="Az. Agr. Il Cerqueto", email="angela.angiar@gmail.com", phone="347/0560976",
         website="https://www.cerquetosrl.it/index.php/it/", city="Acquapendente", category="cerealicola",
         sede_indirizzo="Via Falconiera 101, 01021 Acquapendente (VT)",
         description="Azienda agricola e agrituristica dell'alta Tuscia laziale, dal 1990. Legumi "
                      "e cereali tipici, iscritta ARSIAL dal 2010 per la conservazione di semi antichi "
                      "(fagiolo del Purgatorio di Gradoli, lenticchia di Onano e altri)."),
    dict(name="Az. Agr. L'Isola del Formaggio di Pitzalis Sergio", email="pitzalis.sergio@virgilio.it",
         phone="06/9987072", website="http://lisoladelformaggio.it/", city="Bracciano", category="lattiero_casearia",
         sede_indirizzo="Via Settevene Palo 39, 00062 Bracciano (RM)",
         description="Dal 2000, circa 1500 ovini al pascolo vicino Cerveteri. Formaggi tramandati "
                      "dalla generazione precedente. Socio fondatore dell'Associazione formaggi "
                      "storici della campagna romana."),
    dict(name="Az. Agr. La Fonte di Mattozzi Luca", email="lafonte02032@gmail.com", phone="333/6926012",
         website=None, city="Fara in Sabina", category="olearia",
         sede_indirizzo="Via Farense 443, 02032 Fara in Sabina (RI)",
         description="Piccola azienda familiare sulle colline di Fara in Sabina, dal 2009. Nata "
                      "sull'olio extravergine d'oliva, poi specializzata anche in erbe selvatiche "
                      "e frutta/ortaggi di stagione."),
    dict(name="Az. Agr. Le Faeta di Rea Velia", email="agriturismo@lefaeta.it", phone="0776/881005",
         website=None, city="Arpino", category="cerealicola",
         sede_indirizzo="Via Collina 44, 03033 Arpino (FR)",
         description="Dal 2009, grani antichi (grano tenero Abbondanza, farro, grano duro, avena), "
                      "farine macinate a pietra, pane a lievitazione naturale cotto a legna. "
                      "Pasticceria secca con burro di bufala e marmellata di visciole artigianale."),
    dict(name="Az. Agr. Nicolai Felice", email="patrizio.nicolai@gmail.com", phone="329/0248665",
         website=None, city="Tuscania", category="altro",
         sede_indirizzo="Localita' Musino snc, 01017 Tuscania (VT)",
         description="Azienda nella Tuscia, vicino al centro archeologico del ducato di Castro e "
                      "Vulci. Nessuna descrizione di prodotto disponibile dal sito -- da chiedere "
                      "direttamente al produttore."),
    dict(name="Az. Agr. Placidi Vittorio", email="placidivittorio@tiscali.it", phone="0765/578475",
         website=None, city="Collevecchio", category="zootecnica",
         sede_indirizzo="Via San Valentino 45, 02042 Collevecchio (RI)",
         description="Oltre 30 anni di agricoltura e allevamento sulle colline sabine. Carni bovine "
                      "chianina, suini, ovini, conigli, pollame; prodotti da forno cotti a legna, "
                      "pasta fresca, formaggi, salumi."),
    dict(name="Occhiodoro Paola", email="info@occhiodoro.com", phone="0775/741058",
         website="https://occhiodoro.com/", city="Sgurgola", category="zootecnica",
         sede_indirizzo="Via Mezzeria snc, 03010 Sgurgola (FR)",
         description="Azienda avicola ai piedi dei Monti Lepini, 25 ettari, nata come incubatoio "
                      "negli anni '60. Pulcini, uova da cova, capponi, pecore, mangimi; articoli "
                      "per orto e irrigazione."),
    dict(name="Tenuta Casciani", email="info@tenutacasciani.com", phone="0761/910090",
         website="https://www.tenutacasciani.com/", city="Civitella d'Agliano", category="vinicola",
         sede_indirizzo="Localita' Morre della Chiesa 3, 01020 Civitella d'Agliano (VT)",
         description="Azienda vitivinicola dal 1974, 115 ettari (90 di vigneto) sulle colline al "
                      "confine con l'Umbria. Merlot, Chardonnay, Sangiovese, Grechetto, Vermentino, "
                      "Montepulciano (Violone)."),
    dict(name="Tenuta Campo di Merlo", email="amministrazione.cdm@marsicola.com", phone=None,
         website="https://www.tenutacampodimerlo.com/", city="Roma", category="altro",
         sede_indirizzo="Via della Magliana 1081, 00148 Roma (RM)",
         description="Famiglia attiva dal 1850, quattro generazioni tra tradizione e innovazione "
                      "nell'Agro Romano. Biologico dal 1992, trasformazione di materie prime "
                      "agricole BIO in prodotti agroalimentari diretti al consumatore."),
    dict(name="Le Rose di Gianni", email="camillaseri10@gmail.com", phone="388/4045851",
         website=None, city="Cerveteri", category="altro",
         sede_indirizzo="Via Furbara Sasso 2, 00052 Cerveteri (RM)",
         description="Azienda floricola dal 1994, oltre 50 varieta' di rose (dalle inglesi alle "
                      "piu' moderne). Al mercato anche ranuncoli, anemoni, fresie, camomilla, "
                      "ortensie, cardi e garofani."),
    dict(name="Diamanti Angela", email="info@nuovalcs.it", phone="338/2379169",
         website="https://marcocciasalumi.it/", city="Veroli", category="zootecnica",
         sede_indirizzo="Via Cotropagno 25, 03029 Veroli (FR)",
         description="Nessuna descrizione estesa disponibile dal sito -- vendita salumi, sito "
                      "commerciale collegato marcocciasalumi.it."),
    dict(name="D.S. Bio", email="info@dsbiodinamica.com", phone="349/8612984",
         website="https://www.dsbiodinamica.com/it/", city="Pescosolido", category="vinicola",
         sede_indirizzo="Via Piana 32, 03030 Pescosolido (FR)",
         description="Dal 2012, viticoltura biodinamica a 630m slm, vitigni autoctoni (Maturano "
                      "bianco, Pampanaro, Capolongo, Lecinaro, Uva Giulia) allevati ad alberata "
                      "maritati all'ulivo. Nessun concime chimico ne' diserbante."),
    dict(name="Coop. dei Pescatori di Terracina", email="cooppescatoriditerracina@gmail.com",
         phone=None, website=None, city="Terracina", category="altro",
         sede_indirizzo="Via Traiano snc, 04019 Terracina (LT)",
         description="Cooperativa dal 2007, vendita diretta del pescato locale. Nata per ridurre "
                      "l'impatto ambientale ed economico della filiera e favorire scelte d'acquisto "
                      "consapevoli."),
    dict(name="Az. Agr. Predio Potantino", email="prediopotantino@gmail.com", phone="328/9789057",
         website="https://prediopotantino.it/", city="Proceno", category="cerealicola",
         sede_indirizzo="Localita' Potantino snc, 01020 Proceno (VT)",
         description="Dal 1995, aglio rosso di Proceno; oggi circa 70 referenze nell'agroalimentare "
                      "biologico. Farro, grano e legumi trasformati in pasta, biscotti e creme; "
                      "rotazione triennale delle colture, oltre 1500 querce piantate."),
    dict(name="Coop. Agr. Circe", email="cooperativa.agricolacirce@gmail.com", phone="0773/853140",
         website="https://agricolacirce.it/", city="Pontinia", category="lattiero_casearia",
         sede_indirizzo="Strada Lungo Ufente 2344, 04014 Pontinia (LT)",
         description="Caseificio della Cooperativa Agricola Circe, latte di oltre mille bufale "
                      "trasformato artigianalmente in mozzarelle e formaggi di alta qualita'."),
]

REGION = "Lazio"


def invite_user(supabase_url, service_role_key, email):
    """Chiama l'endpoint Supabase Auth Admin per invitare un utente reale.
    Ritorna l'id (uuid) dell'utente creato, o None se gia' registrato."""
    url = f"{supabase_url.rstrip('/')}/auth/v1/invite"
    req = urllib.request.Request(
        url,
        data=json.dumps({"email": email}).encode(),
        headers={
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            body = json.loads(resp.read())
            return body.get("id")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        if "already" in err_body.lower() or e.code == 422:
            print(f"  [gia' registrato] {email} -- salto l'invito, aggiorno solo i dati", file=sys.stderr)
            return None
        raise RuntimeError(f"Invito fallito per {email}: {e.code} {err_body}")


def run_sql(dsn, sql, params):
    import psycopg2
    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
        conn.commit()


def build_sql_for(p, user_id_or_none, dry_run):
    """Ritorna (sql, params) per upsert di profiles + companies + agganci al mercato."""
    statements = []

    if user_id_or_none:
        statements.append((
            "update public.profiles set role='producer', role_confirmed=true where id = %s",
            (user_id_or_none,)
        ))

    statements.append((
        """
        insert into public.companies
            (name, description, website, category, region, city, phone, email,
             sede_indirizzo, market_ids, is_registered, created_by)
        select %(name)s, %(description)s, %(website)s, %(category)s, %(region)s, %(city)s,
               %(phone)s, %(email)s, %(sede_indirizzo)s,
               array[(select id::text from public.markets where codice_mercato = %(codice_mercato)s)],
               false, %(email)s
        on conflict (lower(created_by)) where created_by is not null do update set
            name = excluded.name, description = excluded.description,
            website = excluded.website, category = excluded.category,
            region = excluded.region, city = excluded.city, phone = excluded.phone,
            sede_indirizzo = excluded.sede_indirizzo,
            market_ids = excluded.market_ids, updated_date = now()
        """,
        dict(name=p["name"], description=p["description"], website=p["website"],
             category=p["category"], region=REGION, city=p["city"], phone=p["phone"],
             email=p["email"], sede_indirizzo=p["sede_indirizzo"],
             codice_mercato=CODICE_MERCATO_CIRCO_MASSIMO)
    ))

    statements.append((
        """
        update public.markets
           set company_ids = array(select distinct unnest(
                 company_ids || array[(select id::text from public.companies where lower(created_by) = lower(%(email)s))]
               ))
         where codice_mercato = %(codice_mercato)s
        """,
        dict(email=p["email"], codice_mercato=CODICE_MERCATO_CIRCO_MASSIMO)
    ))

    return statements


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--invite", action="store_true", help="Invia inviti REALI via email")
    ap.add_argument("--apply-sql", action="store_true", help="Esegue davvero le query SQL")
    args = ap.parse_args()

    dry = not (args.invite or args.apply_sql)
    if dry:
        print("=== DRY RUN: nessuna email inviata, nessun dato scritto ===\n")

    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    dsn = os.environ.get("DSN")

    if args.invite and not (supabase_url and service_key):
        sys.exit("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY richiesti per --invite")
    if args.apply_sql and not dsn:
        sys.exit("DSN richiesto per --apply-sql")

    for p in PRODUTTORI:
        print(f"-> {p['name']} ({p['email']})")
        user_id = None
        if args.invite:
            user_id = invite_user(supabase_url, service_key, p["email"])
            print(f"   invito inviato, user_id={user_id}")
        elif not dry:
            print("   [--apply-sql senza --invite] presumo account gia' esistente, aggiorno solo i dati")

        statements = build_sql_for(p, user_id, dry)
        if args.apply_sql:
            for sql, params in statements:
                run_sql(dsn, sql, params)
            print("   dati scritti")
        elif dry:
            print(f"   [dry-run] {len(statements)} query pronte (profilo+azienda+mercato)")

    print(f"\nFatto: {len(PRODUTTORI)} aziende elaborate.")
    if dry:
        print("Rilancia con --apply-sql per scrivere i dati, poi --invite quando vuoi davvero mandare gli inviti.")


if __name__ == "__main__":
    main()
