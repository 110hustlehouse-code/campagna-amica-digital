/**
 * Riepilogo ordini in formato stampabile.
 *
 * Restituisce HTML invece di un PDF: il browser lo apre e lo stampa o
 * lo salva come PDF con un clic. Evita una libreria PDF lato server per
 * un documento che serve solo a essere letto e stampato.
 */
import { serviceClient, utenteChiamante, errore, preflight, CORS } from '../_shared/comune.ts'

const STATI: Record<string, string> = {
  in_attesa: 'In attesa', confermato: 'Confermato', pronto: 'Pronto',
  ritirato: 'Ritirato', annullato: 'Annullato',
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
}

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre
  try {
    const utente = await utenteChiamante(req)
    if (!utente) return errore('Non autenticato', 401)

    const { company_id, dal, al } = await req.json()
    if (!company_id) return errore('company_id mancante')

    const db = serviceClient()
    const { data: azienda } = await db
      .from('companies').select('name, created_by').eq('id', company_id).maybeSingle()
    if (azienda?.created_by?.toLowerCase() !== utente.email.toLowerCase()) {
      return errore('Non autorizzato', 403)
    }

    let q = db.from('orders').select('*').eq('company_id', company_id)
    if (dal) q = q.gte('created_date', dal)
    if (al) q = q.lte('created_date', al)
    const { data: ordini } = await q.order('created_date', { ascending: false })

    const totale = (ordini ?? []).reduce((s, o) => s + Number(o.total_amount ?? 0), 0)

    const righe = (ordini ?? []).map((o) => {
      const voci = Array.isArray(o.items) ? o.items as Record<string, unknown>[] : []
      const dettaglio = voci.map((i) => `${esc(i.product_name)} × ${esc(i.quantity)}`).join('<br>')
      return `<tr>
        <td>${new Date(o.created_date).toLocaleDateString('it-IT')}</td>
        <td>${esc(o.market_name)}</td>
        <td>${dettaglio || '—'}</td>
        <td>${esc(STATI[o.status] ?? o.status)}</td>
        <td class="n">€ ${Number(o.total_amount ?? 0).toFixed(2)}</td>
      </tr>`
    }).join('')

    const html = `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8">
<title>Ordini — ${esc(azienda?.name)}</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:32px;color:#1a1a1a}
  h1{font-size:20px;margin:0 0 4px}
  .sub{color:#666;font-size:13px;margin-bottom:24px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{text-align:left;background:#f5f5f5;padding:8px;border-bottom:2px solid #ddd}
  td{padding:8px;border-bottom:1px solid #eee;vertical-align:top}
  .n{text-align:right;white-space:nowrap}
  tfoot td{font-weight:600;border-top:2px solid #333;border-bottom:none}
  @media print{body{margin:0}}
</style></head>
<body>
  <h1>Riepilogo ordini — ${esc(azienda?.name)}</h1>
  <div class="sub">${ordini?.length ?? 0} ordini · generato il ${new Date().toLocaleDateString('it-IT')}</div>
  <table>
    <thead><tr><th>Data</th><th>Mercato</th><th>Prodotti</th><th>Stato</th><th class="n">Totale</th></tr></thead>
    <tbody>${righe || '<tr><td colspan="5">Nessun ordine nel periodo</td></tr>'}</tbody>
    <tfoot><tr><td colspan="4">Totale</td><td class="n">€ ${totale.toFixed(2)}</td></tr></tfoot>
  </table>
</body></html>`

    return new Response(html, {
      headers: { ...CORS, 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (e) {
    return errore(e instanceof Error ? e.message : 'Errore imprevisto', 500)
  }
})
