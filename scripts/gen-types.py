#!/usr/bin/env python3
"""Genera src/api/types.ts dal catalogo PostgreSQL, nel formato Supabase.

Usato perche' `supabase gen types` in locale richiede Docker. Una volta che
il progetto Supabase e' online, il comando ufficiale e' preferibile:
    supabase gen types typescript --project-id <id> > src/api/types.ts
"""
import subprocess, sys, json, collections

DSN = sys.argv[1] if len(sys.argv) > 1 else "postgresql://pgtest@127.0.0.1:5433/cad"

def sql(q):
    """Risultato via JSON: i default SQL possono contenere newline e
    spezzerebbero un output separato da caratteri."""
    wrapped = "select coalesce(json_agg(t)::text, '[]') from (%s) t" % q.strip().rstrip(";")
    out = subprocess.run(["psql", DSN, "-t", "-A", "-c", wrapped],
                         capture_output=True, text=True, check=True).stdout
    return json.loads(out.strip())

TYPES = {
    "uuid":"string","text":"string","character varying":"string","character":"string",
    "integer":"number","bigint":"number","smallint":"number","numeric":"number",
    "double precision":"number","real":"number",
    "boolean":"boolean","json":"Json","jsonb":"Json",
    "timestamp with time zone":"string","timestamp without time zone":"string",
    "date":"string","time without time zone":"string","interval":"string","bytea":"string",
}

def ts_type(data_type, udt):
    if data_type == "ARRAY":
        base = TYPES.get(udt.lstrip("_"), "string")
        if udt in ("_text","_varchar"): base = "string"
        elif udt in ("_uuid",): base = "string"
        elif udt in ("_int4","_int8","_numeric"): base = "number"
        return base + "[]"
    return TYPES.get(data_type, "string")

cols = sql("""
select c.table_name, c.column_name, c.data_type, c.udt_name, c.is_nullable,
       coalesce(c.column_default,'') as column_default, t.table_type,
       coalesce(c.is_generated,'NEVER') as is_generated,
       coalesce(c.identity_generation,'') as identity_generation
  from information_schema.columns c
  join information_schema.tables t
    on t.table_name = c.table_name and t.table_schema = c.table_schema
 where c.table_schema = 'public'
 order by t.table_type desc, c.table_name, c.ordinal_position;
""")

tables = collections.OrderedDict()
views  = collections.OrderedDict()
for r in cols:
    tn, cn, dt, udt = r["table_name"], r["column_name"], r["data_type"], r["udt_name"]
    nullable, default, ttype = r["is_nullable"], r["column_default"], r["table_type"]
    generated, identity = r["is_generated"], r["identity_generation"]
    target = tables if ttype == "BASE TABLE" else views
    target.setdefault(tn, []).append({
        "name": cn, "ts": ts_type(dt, udt),
        "nullable": nullable == "YES",
        "has_default": bool(default) or generated != "NEVER" or bool(identity),
        "generated": generated != "NEVER",
    })

# enum ricavati dai CHECK (... in ('a','b')): diventano union di literal
import re
checks = sql("""
select cl.relname, pg_get_constraintdef(co.oid) as defn
  from pg_constraint co
  join pg_class cl on cl.oid = co.conrelid
  join pg_namespace n on n.oid = cl.relnamespace
 where co.contype = 'c' and n.nspname = 'public';
""")
unions = {}
for r in checks:
    tn, defn = r["relname"], r["defn"]
    # Due forme prodotte da Postgres:
    #   CHECK ((col = ANY (ARRAY['a'::text, 'b'::text])))
    #   CHECK (((col)::text = ANY ((ARRAY['a'::character varying, ...])::text[])))
    m = re.search(r"\(?([a-z_]+)\)?(?:::text)? = ANY \(+ARRAY\[(.+?)\]", defn)
    if m:
        col = m.group(1)
        vals = re.findall(r"'([^']+)'::", m.group(2))
        if vals:
            unions[(tn, col)] = " | ".join(f'"{v}"' for v in vals)

# Foreign key: servono a Supabase per tipizzare le join (.select('*, altra(*)'))
fks_raw = sql("""
select cl.relname as tbl, co.conname as name,
       (select string_agg(a.attname, ',' order by k.ord)
          from unnest(co.conkey) with ordinality k(attnum, ord)
          join pg_attribute a on a.attrelid = co.conrelid and a.attnum = k.attnum) as cols,
       fcl.relname as ftbl,
       (select string_agg(a.attname, ',' order by k.ord)
          from unnest(co.confkey) with ordinality k(attnum, ord)
          join pg_attribute a on a.attrelid = co.confrelid and a.attnum = k.attnum) as fcols
  from pg_constraint co
  join pg_class cl on cl.oid = co.conrelid
  join pg_class fcl on fcl.oid = co.confrelid
  join pg_namespace n on n.oid = cl.relnamespace
 where co.contype = 'f' and n.nspname = 'public'
""")
fks = collections.defaultdict(list)
for r in fks_raw:
    fks[r["tbl"]].append(r)

def emit_rels(name, indent="        "):
    rs = fks.get(name, [])
    if not rs:
        return [indent + "Relationships: []"]
    L = [indent + "Relationships: ["]
    for r in rs:
        L.append(indent + "  {")
        L.append(indent + f'    foreignKeyName: "{r["name"]}"')
        L.append(indent + f'    columns: [{", ".join(chr(34)+c+chr(34) for c in r["cols"].split(","))}]')
        L.append(indent + "    isOneToOne: false")
        L.append(indent + f'    referencedRelation: "{r["ftbl"]}"')
        L.append(indent + f'    referencedColumns: [{", ".join(chr(34)+c+chr(34) for c in r["fcols"].split(","))}]')
        L.append(indent + "  },")
    L.append(indent + "]")
    return L

def emit(name, columns, is_view):
    L = [f"      {name}: {{", "        Row: {"]
    for c in columns:
        t = unions.get((name, c["name"]), c["ts"])
        L.append(f'          {c["name"]}: {t}{" | null" if c["nullable"] else ""}')
    L.append("        }")
    if is_view:
        L += emit_rels(name)
        L.append("      }")
        return L
    L.append("        Insert: {")
    for c in columns:
        if c["generated"]: continue
        t = unions.get((name, c["name"]), c["ts"])
        opt = "?" if (c["nullable"] or c["has_default"]) else ""
        L.append(f'          {c["name"]}{opt}: {t}{" | null" if c["nullable"] else ""}')
    L.append("        }")
    L.append("        Update: {")
    for c in columns:
        if c["generated"]: continue
        t = unions.get((name, c["name"]), c["ts"])
        L.append(f'          {c["name"]}?: {t}{" | null" if c["nullable"] else ""}')
    L.append("        }")
    L += emit_rels(name)
    L.append("      }")
    return L

out = ["// GENERATO AUTOMATICAMENTE — non modificare a mano.",
       "// Rigenerare con: npm run gen:types",
       "",
       "export type Json = string | number | boolean | null | { [k: string]: Json | undefined } | Json[]",
       "",
       "export type Database = {",
       "  public: {",
       "    Tables: {"]
for tn, cs in tables.items(): out += emit(tn, cs, False)
out += ["    }", "    Views: {"]
for vn, cs in views.items(): out += emit(vn, cs, True)
out += ["    }", "    Functions: {"]

funcs = sql("""
select p.proname, pg_get_function_arguments(p.oid) as args,
       pg_get_function_result(p.oid) as ret
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname='public' and p.prokind='f'
   and p.proname in ('emetti_ddt','next_ddt_number','genera_codice_tessera','user_role','is_admin')
 order by p.proname;
""")
for r in funcs:
    fname, args, ret = r["proname"], r["args"], r["ret"]
    out.append(f"      {fname}: {{")
    out.append(f"        Args: Record<string, unknown>   // {args or 'nessuno'}")
    rt = "Json" if "record" in ret or "TABLE" in ret or ret.startswith("SETOF") else TYPES.get(ret, "Json")
    out.append(f"        Returns: {rt}")
    out.append("      }")
out += ["    }", "    Enums: { [_ in never]: never }",
        "    CompositeTypes: { [_ in never]: never }", "  }", "}", "",
        "// Scorciatoie d'uso:",
        "//   type Product = Tables<'products'>",
        "//   type NewProduct = TablesInsert<'products'>",
        "export type Tables<T extends keyof Database['public']['Tables']> =",
        "  Database['public']['Tables'][T]['Row']",
        "export type TablesInsert<T extends keyof Database['public']['Tables']> =",
        "  Database['public']['Tables'][T]['Insert']",
        "export type TablesUpdate<T extends keyof Database['public']['Tables']> =",
        "  Database['public']['Tables'][T]['Update']",
        "export type Views<T extends keyof Database['public']['Views']> =",
        "  Database['public']['Views'][T]['Row']",
        ""]
print("\n".join(out))
