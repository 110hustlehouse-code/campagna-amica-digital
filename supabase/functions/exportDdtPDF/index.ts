/**
 * exportDdtPDF
 * Genera il PDF di un DDT emesso, con layout ibrido (template PDF + campi Excel).
 * Carica il PDF su Storage public-assets/ddt/<company_id>/<id>.pdf,
 * aggiorna delivery_notes.pdf_url e lo restituisce come redirect (URL pubblico).
 *
 * Input: { deliveryNoteId: string }
 * Richiede JWT autenticato (produttore owner o staff del mercato o admin).
 */
import { jsPDF } from 'npm:jspdf@2.5.1';
import { corsHeaders, getUserFromRequest, supabase } from '../_shared/supabase.ts';

// ── Colori brand ──────────────────────────────────────────────────────────────
const GREEN: [number, number, number] = [46, 125, 50];
const GREEN_LIGHT: [number, number, number] = [200, 230, 201];
const GRAY_TEXT: [number, number, number] = [80, 80, 80];
const BLACK: [number, number, number] = [0, 0, 0];
const WHITE: [number, number, number] = [255, 255, 255];
const RED: [number, number, number] = [198, 40, 40];

const CAUSALE_LABELS: Record<string, string> = {
  vendita:               'Vendita',
  conto_vendita:         'Conto vendita',
  conto_deposito:        'Conto deposito',
  reso:                  'Reso',
  omaggio:               'Omaggio',
  campionatura:          'Campionatura',
  conto_lavorazione:     'Conto lavorazione',
  conto_visione:         'Conto visione',
  trasferimento_interno: 'Trasferimento interno',
};

function drawBox(doc: InstanceType<typeof jsPDF>, x: number, y: number, w: number, h: number, label: string) {
  doc.setDrawColor(...GRAY_TEXT);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, h);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRAY_TEXT);
  doc.text(label.toUpperCase(), x + 2, y + 4);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const user = await getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: 'Non autenticato' }, { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { deliveryNoteId, signedAt, signerName } = body;
    if (!deliveryNoteId) {
      return Response.json({ error: 'deliveryNoteId richiesto' }, { status: 400, headers: corsHeaders });
    }

    // ── Carica DDT + items ────────────────────────────────────────────────────
    const { data: dn, error: dnErr } = await supabase
      .from('delivery_notes')
      .select('*')
      .eq('id', deliveryNoteId)
      .single();

    if (dnErr || !dn) {
      return Response.json({ error: 'DDT non trovato' }, { status: 404, headers: corsHeaders });
    }

    // Verifica accesso: owner azienda, staff del mercato, o admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';

    if (!isAdmin) {
      const { data: company } = await supabase
        .from('companies')
        .select('owner_id')
        .eq('id', dn.company_id)
        .single();

      const isOwner = company?.owner_id === user.id;

      if (!isOwner) {
        const { data: staffMember } = await supabase
          .from('staff_members')
          .select('id')
          .eq('user_id', user.id)
          .eq('market_id', dn.market_id)
          .maybeSingle();

        if (!staffMember) {
          return Response.json({ error: 'Non autorizzato' }, { status: 403, headers: corsHeaders });
        }
      }
    }

    // Carica items
    const { data: items = [] } = await supabase
      .from('delivery_note_items')
      .select('*')
      .eq('delivery_note_id', dn.id)
      .order('position');

    // Carica dati azienda mittente
    const { data: company } = await supabase
      .from('companies')
      .select('name, description, city, category, owner_id')
      .eq('id', dn.company_id)
      .single();

    // Carica email owner per il mittente
    let ownerEmail = '';
    if (company?.owner_id) {
      const { data: ownerUser } = await supabase
        .from('users')
        .select('email')
        .eq('id', company.owner_id)
        .single();
      ownerEmail = ownerUser?.email ?? '';
    }

    // Carica nome mercato
    const { data: market } = await supabase
      .from('markets')
      .select('name, city, address')
      .eq('id', dn.market_id)
      .single();

    // ── Generazione PDF ────────────────────────────────────────────────────────
    // @ts-ignore — jsPDF constructor
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PW = doc.internal.pageSize.getWidth();   // 210
    const PH = doc.internal.pageSize.getHeight();  // 297
    let y = 15;

    // ── Titolo principale ─────────────────────────────────────────────────────
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, PW, 22, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text('DOCUMENTO DI TRASPORTO', PW / 2, 14, { align: 'center' });
    y = 30;

    // ── Numero e data ─────────────────────────────────────────────────────────
    const ddtNumLabel = dn.progressive_number
      ? `N. ${dn.progressive_year}-${String(dn.progressive_number).padStart(3, '0')}`
      : 'BOZZA';
    const issueDateStr = new Date(dn.issue_date).toLocaleDateString('it-IT');
    const transportDateStr = new Date(dn.transport_date ?? dn.issue_date).toLocaleDateString('it-IT');

    doc.setFillColor(...GREEN_LIGHT);
    doc.rect(14, y - 5, PW - 28, 12, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GREEN);
    doc.text(ddtNumLabel, 18, y + 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_TEXT);
    doc.text(`Data documento: ${issueDateStr}`, 80, y + 3);
    doc.text(`Data ritiro: ${transportDateStr}`, 145, y + 3);

    // Watermark ANNULLATO
    if (dn.status === 'cancelled') {
      doc.setFontSize(40);
      doc.setTextColor(...RED);
      doc.setFont('helvetica', 'bold');
      doc.setGState(doc.GState({ opacity: 0.15 }));
      doc.text('ANNULLATO', PW / 2, PH / 2, { align: 'center', angle: 45 });
      doc.setGState(doc.GState({ opacity: 1 }));
      doc.setTextColor(...BLACK);
    }

    y += 15;

    // ── Box MITTENTE + DESTINATARIO ───────────────────────────────────────────
    const boxY = y;
    const halfW = (PW - 28) / 2;

    // Mittente (sinistra)
    drawBox(doc, 14, boxY, halfW - 4, 38, 'Mittente');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLACK);
    doc.text(company?.name ?? '—', 16, boxY + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_TEXT);
    let mitY = boxY + 15;
    if (company?.city)     { doc.text(`Città: ${company.city}`, 16, mitY); mitY += 5; }
    if (ownerEmail)        { doc.text(`Email: ${ownerEmail}`, 16, mitY); mitY += 5; }

    // Destinatario (destra)
    const rightX = 14 + halfW;
    drawBox(doc, rightX, boxY, halfW - 4, 38, 'Destinatario');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLACK);
    doc.text(dn.recipient_name ?? '—', rightX + 2, boxY + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_TEXT);
    let destY = boxY + 15;
    if (dn.recipient_vat_or_cf) { doc.text(`P.IVA/C.F.: ${dn.recipient_vat_or_cf}`, rightX + 2, destY); destY += 5; }
    if (dn.recipient_address)   { doc.text(dn.recipient_address, rightX + 2, destY); destY += 5; }
    if (dn.recipient_cap || dn.recipient_city) {
      doc.text(`${dn.recipient_cap ?? ''} ${dn.recipient_city ?? ''}`.trim(), rightX + 2, destY);
    }

    y = boxY + 44;

    // ── Causale + Mercato ─────────────────────────────────────────────────────
    const thirdW = (PW - 28) / 3;
    drawBox(doc, 14, y, thirdW - 2, 14, 'Causale');
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK);
    doc.text(CAUSALE_LABELS[dn.causale] ?? dn.causale, 16, y + 10);

    drawBox(doc, 14 + thirdW, y, thirdW - 2, 14, 'Luogo destinazione');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRAY_TEXT);
    const marketLabel = market ? `${market.name}${market.city ? ` – ${market.city}` : ''}` : '—';
    doc.text(doc.splitTextToSize(marketLabel, thirdW - 6)[0], 16 + thirdW, y + 10);

    drawBox(doc, 14 + thirdW * 2, y, thirdW - 2, 14, 'Trasporto a mezzo');
    const trasportoLabel = dn.trasporto_a_mezzo
      ? dn.trasporto_a_mezzo.charAt(0).toUpperCase() + dn.trasporto_a_mezzo.slice(1)
      : '—';
    doc.text(trasportoLabel, 16 + thirdW * 2, y + 10);

    y += 20;

    // ── Tabella beni ──────────────────────────────────────────────────────────
    const tableX = 14;
    const tableW = PW - 28;
    const colDesc = tableW * 0.5;
    const colUM   = tableW * 0.12;
    const colQty  = tableW * 0.12;
    const colLot  = tableW * 0.16;
    const colScad = tableW - colDesc - colUM - colQty - colLot;

    // Header tabella
    doc.setFillColor(...GREEN);
    doc.rect(tableX, y, tableW, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    let hx = tableX;
    doc.text('Descrizione',  hx + 2, y + 5); hx += colDesc;
    doc.text('U.M.',         hx + 2, y + 5); hx += colUM;
    doc.text('Quantità',     hx + 2, y + 5); hx += colQty;
    doc.text('Lotto',        hx + 2, y + 5); hx += colLot;
    doc.text('Scadenza',     hx + 2, y + 5);
    y += 7;

    // Righe
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BLACK);
    doc.setFontSize(8);
    let rowAlt = false;

    for (const item of items) {
      const rowH = 7;
      if (y + rowH > PH - 30) {
        doc.addPage();
        y = 15;
      }
      if (rowAlt) {
        doc.setFillColor(245, 250, 245);
        doc.rect(tableX, y, tableW, rowH, 'F');
      }
      doc.setDrawColor(...GRAY_TEXT);
      doc.setLineWidth(0.2);
      doc.rect(tableX, y, tableW, rowH);

      let rx = tableX;
      const descLines = doc.splitTextToSize(item.product_name ?? '', colDesc - 4);
      doc.text(descLines[0], rx + 2, y + 5); rx += colDesc;
      doc.text(item.unit ?? '', rx + 2, y + 5); rx += colUM;
      doc.setFont('helvetica', 'bold');
      doc.text(String(item.quantity ?? ''), rx + 2, y + 5); rx += colQty;
      doc.setFont('helvetica', 'normal');
      doc.text(item.lot ?? '', rx + 2, y + 5); rx += colLot;
      doc.text(item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('it-IT') : '', rx + 2, y + 5);

      y += rowH;
      rowAlt = !rowAlt;
    }

    // ── Totali colli e peso ───────────────────────────────────────────────────
    y += 6;
    if (dn.numero_colli || dn.peso_totale_kg) {
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GRAY_TEXT);
      const totText = [
        dn.numero_colli    ? `Numero colli: ${dn.numero_colli}`            : null,
        dn.peso_totale_kg  ? `Peso totale: ${dn.peso_totale_kg} kg`        : null,
      ].filter(Boolean).join('   ·   ');
      doc.text(totText, tableX, y);
      y += 6;
    }

    // ── Vettore ───────────────────────────────────────────────────────────────
    if (dn.vettore_descrizione) {
      drawBox(doc, tableX, y, tableW, 12, 'Vettore / Mezzo');
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BLACK);
      doc.text(dn.vettore_descrizione, tableX + 2, y + 9);
      y += 18;
    }

    // ── Annotazioni ───────────────────────────────────────────────────────────
    if (dn.annotazioni) {
      if (y + 18 > PH - 30) { doc.addPage(); y = 15; }
      drawBox(doc, tableX, y, tableW, 16, 'Annotazioni');
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BLACK);
      const annoLines = doc.splitTextToSize(dn.annotazioni, tableW - 6);
      annoLines.slice(0, 2).forEach((line: string, i: number) => {
        doc.text(line, tableX + 2, y + 9 + i * 4);
      });
      y += 22;
    }

    // ── Firme ─────────────────────────────────────────────────────────────────
    if (y + 35 > PH - 15) { doc.addPage(); y = 15; }
    y = Math.max(y, PH - 60);
    const firmW = tableW / 3;

    // Se il DDT e stato firmato dallo staff, mostra timbro di ricezione
    const effectiveSignedAt = signedAt ?? dn.signed_at;
    const effectiveSignerName = signerName ?? null;

    if (effectiveSignedAt) {
      // Timbro verde "Ricevuto e firmato"
      const stampX = tableX + firmW;   // centrato nella colonna Destinatario
      const stampY = y;
      doc.setFillColor(232, 245, 233);  // verde chiarissimo
      doc.setDrawColor(...GREEN);
      doc.setLineWidth(0.6);
      doc.roundedRect(stampX + 2, stampY, firmW - 8, 28, 3, 3, 'FD');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GREEN);
      doc.text('RICEVUTO E FIRMATO', stampX + firmW / 2 - 2, stampY + 8, { align: 'center' });

      const signDate = new Date(effectiveSignedAt);
      const dateStr = signDate.toLocaleDateString('it-IT');
      const timeStr = signDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY_TEXT);
      doc.text(`Data: ${dateStr} ${timeStr}`, stampX + firmW / 2 - 2, stampY + 15, { align: 'center' });
      if (effectiveSignerName) {
        doc.text(`da: ${effectiveSignerName}`, stampX + firmW / 2 - 2, stampY + 21, { align: 'center' });
      }
      doc.text('Firma digitale in-app', stampX + firmW / 2 - 2, stampY + 26, { align: 'center' });

      // Righe firma mittente e vettore rimangono vuote
      ['Firma Mittente', 'Firma Vettore'].forEach((label, i) => {
        const fx = tableX + firmW * i;
        doc.setDrawColor(...GRAY_TEXT);
        doc.setLineWidth(0.3);
        doc.line(fx + 4, y + 20, fx + firmW - 8, y + 20);
        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY_TEXT);
        doc.text(label, fx + firmW / 2, y + 25, { align: 'center' });
      });
    } else {
      // Nessuna firma: 3 righe vuote
      ['Firma Mittente', 'Firma Vettore', 'Firma Destinatario'].forEach((label, i) => {
        const fx = tableX + firmW * i;
        doc.setDrawColor(...GRAY_TEXT);
        doc.setLineWidth(0.3);
        doc.line(fx + 4, y + 15, fx + firmW - 8, y + 15);
        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY_TEXT);
        doc.text(label, fx + firmW / 2, y + 20, { align: 'center' });
      });
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.setFontSize(6);
    doc.setTextColor(180, 180, 180);
    doc.text(
      `DDT emesso tramite Campagna Amica Hub  ·  ID: ${dn.id}`,
      PW / 2, PH - 5, { align: 'center' }
    );

    // ── Upload su Storage ─────────────────────────────────────────────────────
    const pdfBytes: Uint8Array = new Uint8Array(doc.output('arraybuffer') as ArrayBuffer);
    const storagePath = `ddt/${dn.company_id}/${dn.id}.pdf`;

    const { error: uploadErr } = await supabase.storage
      .from('public-assets')
      .upload(storagePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadErr) {
      console.error('[exportDdtPDF] upload error:', uploadErr);
      return Response.json({ error: 'Errore upload PDF: ' + uploadErr.message }, { status: 500, headers: corsHeaders });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('public-assets')
      .getPublicUrl(storagePath);

    // Aggiorna pdf_url sul record (solo se issued)
    if (dn.status === 'issued') {
      await supabase
        .from('delivery_notes')
        .update({ pdf_url: publicUrl })
        .eq('id', dn.id);
    }

    return Response.json({ pdf_url: publicUrl }, { headers: corsHeaders });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[exportDdtPDF] error:', msg);
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
});
