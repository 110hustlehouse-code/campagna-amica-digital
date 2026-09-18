#!/usr/bin/env python3
"""Verifica di coerenza sui 21 account produttore del Circo Massimo.

Sola lettura -- non modifica nulla. Controlla:
  1. Ogni alias ha un utente in auth.users
  2. Ogni utente ha un profilo con role='producer', role_confirmed=true
  3. Ogni alias ha esattamente un'azienda in companies (created_by combacia)
  4. Ogni azienda e' agganciata al mercato Circo Massimo (market_ids)
  5. Categoria valorizzata (non null) per ognuna
  6. Quante hanno gia' is_registered=true (cioe' il produttore si e'
     davvero loggato e ha salvato lui stesso, non solo il seed)
  7. Aziende "orfane": created_by che non corrisponde a nessun alias noto
  8. Alias noti che non hanno nessuna azienda collegata

Uso:
    export DSN=postgresql://postgres.jkrzjlfgchzbuqpfsdoh:...@aws-1-eu-west-1.pooler.supabase.com:6543/postgres
    python3 scripts/verifica_account_produttori.py
"""
import os
import sys

ALIAS_NOTI = [
    "agriapibio", "alanfarm", "apicolturadangelis", "agricolabenacquista",
    "aziendabressan", "ortodifabiana", "agricolailcerqueto", "pitzalis",
    "lafonte", "lefaeta", "agricolanicolai", "placidi", "occhiodoro",
    "tenutacasciani", "marsicola", "lerosedigianni", "nuvola", "dsbio",
    "cooppescatoriditerracina", "prediopotantino", "agricolacirce",
]
DOMINIO = "campagnamicadigital.it"
CODICE_MERCATO = "CA-RM-001"


def main():
    import psycopg2
    dsn = os.environ.get("DSN")
    if not dsn:
        sys.exit("DSN richiesto")

    alias_email = {f"{a}@{DOMINIO}" for a in ALIAS_NOTI}
    problemi = []
    ok = 0

    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            # 1+2: utenti auth + profilo
            cur.execute("""
                select u.email, p.role, p.role_confirmed
                  from auth.users u
                  left join public.profiles p on p.id = u.id
                 where u.email = any(%s)
            """, (list(alias_email),))
            righe = {r[0]: r for r in cur.fetchall()}

            for email in sorted(alias_email):
                if email not in righe:
                    problemi.append(f"[auth] {email}: NESSUN utente trovato in auth.users")
                    continue
                _, role, confirmed = righe[email]
                if role != "producer":
                    problemi.append(f"[ruolo] {email}: role='{role}' invece di 'producer'")
                elif not confirmed:
                    problemi.append(f"[ruolo] {email}: role_confirmed=false")
                else:
                    ok += 1

            # 3+4+5: aziende
            cur.execute("""
                select c.created_by, c.name, c.category, c.market_ids,
                       (select id::text from public.markets where codice_mercato = %s) as mercato_id
                  from public.companies c
                 where lower(c.created_by) = any(%s)
            """, (CODICE_MERCATO, [e.lower() for e in alias_email]))
            aziende = cur.fetchall()
            trovate_per_alias = {}

            for created_by, name, category, market_ids, mercato_id in aziende:
                created_by = created_by.lower()
                trovate_per_alias[created_by] = trovate_per_alias.get(created_by, 0) + 1
                if not category:
                    problemi.append(f"[dati] {name} ({created_by}): categoria mancante")
                if not mercato_id:
                    problemi.append(f"[dati] {name}: il mercato Circo Massimo non esiste nel DB (codice {CODICE_MERCATO})")
                elif mercato_id not in (market_ids or []):
                    problemi.append(f"[dati] {name} ({created_by}): non agganciata al mercato Circo Massimo")

            for email in sorted(alias_email):
                n = trovate_per_alias.get(email.lower(), 0)
                if n == 0:
                    problemi.append(f"[azienda] {email}: NESSUNA azienda trovata")
                elif n > 1:
                    problemi.append(f"[azienda] {email}: {n} aziende trovate (dovrebbe essere 1 sola)")

            # 6: quanti confermati davvero dal produttore
            cur.execute("""
                select count(*) from public.companies
                 where lower(created_by) = any(%s) and is_registered = true
            """, ([e.lower() for e in alias_email],))
            confermati = cur.fetchone()[0]

            # 7: aziende orfane sul mercato Circo Massimo (created_by sconosciuto)
            cur.execute("""
                select c.name, c.created_by
                  from public.companies c
                  join public.markets m on m.codice_mercato = %s
                 where m.id::text = any(c.market_ids)
                   and (c.created_by is null or lower(c.created_by) != all(%s))
            """, (CODICE_MERCATO, [e.lower() for e in alias_email]))
            orfane = cur.fetchall()
            for name, created_by in orfane:
                problemi.append(f"[orfana] {name}: created_by='{created_by}' non e' uno dei 21 alias noti")

    print(f"Account auth+profilo corretti: {ok}/21")
    print(f"Aziende confermate dal produttore (is_registered=true): {confermati}/21")
    print()
    if problemi:
        print(f"PROBLEMI TROVATI ({len(problemi)}):")
        for p in problemi:
            print(f"  - {p}")
        sys.exit(1)
    else:
        print("Nessun problema trovato: 21/21 account e aziende coerenti.")


if __name__ == "__main__":
    main()
