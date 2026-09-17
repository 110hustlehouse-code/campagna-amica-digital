/**
 * Avvisa chi ha messo tra i preferiti un'azienda quando questa
 * pubblica un nuovo prodotto.
 */
import { serviceClient, ok, errore, preflight } from '../_shared/comune.ts'

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre
  try {
    const { product_id } = await req.json()
    if (!product_id) return errore('product_id mancante')

    const db = serviceClient()
    const { data: prodotto } = await db
      .from('products').select('id, name, company_id').eq('id', product_id).maybeSingle()
    if (!prodotto) return errore('Prodotto inesistente', 404)

    const { data: azienda } = await db
      .from('companies').select('name').eq('id', prodotto.company_id).maybeSingle()

    const { data: preferiti } = await db
      .from('favorites').select('created_by').eq('company_id', prodotto.company_id)

    const destinatari = [...new Set((preferiti ?? []).map((f) => f.created_by).filter(Boolean))]
    if (destinatari.length === 0) return ok({ success: true, avvisati: 0 })

    await db.from('notifications').insert(
      destinatari.map((email) => ({
        user_email: email!,
        title: 'Nuovo prodotto',
        message: `${azienda?.name ?? 'Un produttore'} ha aggiunto ${prodotto.name}`,
        type: 'new_product',
        company_id: prodotto.company_id,
        product_id: prodotto.id,
      })),
    )
    return ok({ success: true, avvisati: destinatari.length })
  } catch (e) {
    return errore(e instanceof Error ? e.message : 'Errore imprevisto', 500)
  }
})
