#!/usr/bin/env python3
"""Crea account produttore pronti all'uso, con alias @campagnamicadigital.it.

A differenza di seed_produttori_circo_massimo.py (che presumeva un invito
via email al produttore, con conferma fatta da lui), questo script crea
l'account GIA' con password, cosi' puoi consegnarlo di persona al mercato
senza dover aspettare che il produttore controlli la mail e clicchi un link.

L'alias (es. agriapibio@campagnamicadigital.it) va creato PRIMA su
register.it, con forward verso l'email vera del produttore -- serve come
canale di recupero password, non e' usato per il primo accesso.

Per ciascuna azienda:
  1. Genera una password casuale, diversa per ognuna
  2. Crea l'utente Supabase Auth con quell'alias + password (email_confirm
     = true: nessuna mail di conferma da aspettare, pronto subito)
  3. Promuove il profilo a role='producer', role_confirmed=true
  4. SPOSTA la proprieta' dell'azienda gia' scritta da
     seed_produttori_circo_massimo.py: created_by passa dall'email reale
     del produttore all'alias -- il produttore d'ora in poi si logga con
     l'alias, non con la sua email personale
  5. Scrive un CSV locale con alias+password, pronto per la stampa/consegna

ATTENZIONE SICUREZZA:
  - Il CSV in output contiene password in chiaro: NON va committato nel
    repo (aggiungi 'credenziali_produttori*.csv' al .gitignore, vedi sotto)
  - Va cancellato dal disco una volta stampate/consegnate le credenziali
  - Se un produttore in futuro prova ad accedere con "Continua con Google"
    usando la SUA vera Gmail, non vedra' la sua azienda: l'account valido
    e' solo quello con l'alias + password. Va spiegato a voce quando
    consegni il cartoncino.

Uso:
    export SUPABASE_URL=https://jkrzjlfgchzbuqpfsdoh.supabase.co
    export SUPABASE_SERVICE_ROLE_KEY=...
    export DSN=postgresql://postgres.jkrzjlfgchzbuqpfsdoh:...@aws-1-eu-west-1.pooler.supabase.com:6543/postgres

    python3 scripts/crea_account_produttori_alias.py                 # dry-run
    python3 scripts/crea_account_produttori_alias.py --apply         # crea davvero
"""
import argparse
import csv
import json
import os
import secrets
import string
import sys
import urllib.request
import urllib.error

DOMINIO_ALIAS = "campagnamicadigital.it"
OUTPUT_CSV = "credenziali_produttori_NON_COMMITTARE.csv"

# alias, nome azienda, email reale (quella gia' scritta da created_by nella
# riga companies esistente -- serve per trovarla e spostarne la proprieta')
PRODUTTORI = [
    ("agriapibio", "Agri. Api. Bio", "info@cremealimentari.it"),
    ("alanfarm", "Alan Farm", "info@alanfarm.com"),
    ("apicolturadangelis", "Apicoltura D'Angelis di Ripepi Fortunata", "felice.dangelis@tiscali.it"),
    ("agricolabenacquista", "Az. Agr. Benacquista Loris", "info@agricolabenacquista.it"),
    ("aziendabressan", "Az. Agr. Bressan Simona", "info@aziendabressan.it"),
    # ATTENZIONE: alias non ancora creato su register.it per questa azienda.
    # Creane uno (es. ortodifabiana@campagnamicadigital.it) e aggiorna la
    # riga sotto prima di lanciare lo script, altrimenti va in errore su
    # questa azienda quando lo esegui con --apply.
    ("ortodifabiana", "Az. Agr. Fabiana Selleri", "consegne@ortodifabiana.it"),
    ("agricolailcerqueto", "Az. Agr. Il Cerqueto", "angela.angiar@gmail.com"),
    ("pitzalis", "Az. Agr. L'Isola del Formaggio di Pitzalis Sergio", "pitzalis.sergio@virgilio.it"),
    ("lafonte", "Az. Agr. La Fonte di Mattozzi Luca", "lafonte02032@gmail.com"),
    ("lefaeta", "Az. Agr. Le Faeta di Rea Velia", "agriturismo@lefaeta.it"),
    ("agricolanicolai", "Az. Agr. Nicolai Felice", "patrizio.nicolai@gmail.com"),
    ("placidi", "Az. Agr. Placidi Vittorio", "placidivittorio@tiscali.it"),
    ("occhiodoro", "Occhiodoro Paola", "info@occhiodoro.com"),
    ("tenutacasciani", "Tenuta Casciani", "info@tenutacasciani.com"),
    ("marsicola", "Tenuta Campo di Merlo", "amministrazione.cdm@marsicola.com"),
    ("lerosedigianni", "Le Rose di Gianni", "camillaseri10@gmail.com"),
    ("nuvola", "Diamanti Angela", "info@nuovalcs.it"),
    ("dsbio", "D.S. Bio", "info@dsbiodinamica.com"),
    ("cooppescatoriditerracina", "Coop. dei Pescatori di Terracina", "cooppescatoriditerracina@gmail.com"),
    ("prediopotantino", "Az. Agr. Predio Potantino", "prediopotantino@gmail.com"),
    ("agricolacirce", "Coop. Agr. Circe", "cooperativa.agricolacirce@gmail.com"),
]

ALFABETO = "".join(c for c in string.ascii_letters + string.digits if c not in "0O1lI")


def genera_password(lunghezza_gruppo=4, gruppi=3):
    parti = ["".join(secrets.choice(ALFABETO) for _ in range(lunghezza_gruppo))
             for _ in range(gruppi)]
    return "-".join(parti)


def crea_utente(supabase_url, service_role_key, email, password):
    """Crea l'utente direttamente con password (non un invito): pronto
    subito, nessuna mail di conferma da aspettare."""
    url = f"{supabase_url.rstrip('/')}/auth/v1/admin/users"
    payload = {"email": email, "password": password, "email_confirm": True}
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(),
        headers={"apikey": service_role_key,
                 "Authorization": f"Bearer {service_role_key}",
                 "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read()).get("id")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        if "already" in body.lower() or e.code == 422:
            print(f"  [gia' esistente] {email} -- salto la creazione", file=sys.stderr)
            return None
        raise RuntimeError(f"Creazione fallita per {email}: {e.code} {body}")


def run_sql(dsn, sql, params):
    import psycopg2
    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
        conn.commit()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="Crea davvero account e scrive nel DB")
    args = ap.parse_args()

    if args.apply:
        supabase_url = os.environ.get("SUPABASE_URL")
        service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        dsn = os.environ.get("DSN")
        if not (supabase_url and service_key and dsn):
            sys.exit("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e DSN richiesti per --apply")
    else:
        print("=== DRY RUN: nessun account creato, nessun dato scritto ===\n")

    righe_csv = []

    for alias, nome, email_reale in PRODUTTORI:
        alias_email = f"{alias}@{DOMINIO_ALIAS}"
        password = genera_password()
        print(f"-> {nome}: {alias_email}")

        if not args.apply:
            print(f"   [dry-run] password che verrebbe generata: {password}")
            righe_csv.append([nome, alias_email, password, email_reale])
            continue

        user_id = crea_utente(supabase_url, service_key, alias_email, password)
        if user_id:
            run_sql(dsn,
                "update public.profiles set role='producer', role_confirmed=true where id = %s",
                (user_id,))

        run_sql(dsn,
            "update public.companies set created_by = %s where lower(created_by) = lower(%s)",
            (alias_email, email_reale))

        righe_csv.append([nome, alias_email, password, email_reale])
        print("   account creato, azienda riassegnata all'alias")

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["Azienda", "Login (alias)", "Password", "Email reale (recupero)"])
        w.writerows(righe_csv)

    print(f"\nCredenziali scritte in {OUTPUT_CSV} -- NON committarlo, cancellalo dopo la consegna.")
    if not args.apply:
        print("Rilancia con --apply per creare davvero gli account.")


if __name__ == "__main__":
    main()
