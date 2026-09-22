/**
 * exportOrdersPDF
 * Genera un PDF con lo storico ordini dell'azienda.
 * Usa jsPDF (npm). Restituisce il PDF come file binario.
 *
 * Chiamata dal frontend: api.functions.invoke('exportOrdersPDF', { orders, companyName })
 */
import { corsHeaders } from '../_shared/supabase.ts';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { orders, companyName } = await req.json();

    if (!orders || !Array.isArray(orders)) {
      return Response.json({ error: 'orders array required' }, { status: 400, headers: corsHeaders });
    }

    // @ts-ignore — jsPDF constructor
    const doc = new jsPDF();
    const pageWidth: number = doc.internal.pageSize.getWidth();
    const pageHeight: number = doc.internal.pageSize.getHeight();
    let yPos = 25;

    // ---- Header ----
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(70, 130, 80);
    doc.text('STORICO ORDINI', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(`Azienda: ${companyName || 'N/D'}`, 15, yPos);
    yPos += 5;
    doc.text(`Data esportazione: ${new Date().toLocaleDateString('it-IT')}`, 15, yPos);
    yPos += 10;

    // ---- Table header ----
    const colWidths = [25, 30, 50, 20, 25];
    const cols = ['Data Ordine', 'Mercato', 'Prodotto', 'Totale', 'Stato'];

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(70, 130, 80);
    doc.setTextColor(255, 255, 255);

    let xPos = 15;
    cols.forEach((col, i) => {
      doc.rect(xPos, yPos - 6, colWidths[i], 7, 'F');
      doc.text(col, xPos + colWidths[i] / 2, yPos - 2, { align: 'center' });
      xPos += colWidths[i];
    });
    yPos += 6;

    // ---- Data rows ----
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);

    for (const order of orders) {
      const orderDate = order.created_at
        ? new Date(order.created_at).toLocaleDateString('it-IT')
        : 'N/D';
      const productNames: string = Array.isArray(order.items)
        ? order.items.map((i: { product_name?: string }) => i.product_name).filter(Boolean).join(', ')
        : 'N/D';
      const total = `€${Number(order.total_amount || 0).toFixed(2)}`;
      const statusRaw: string = order.status || 'N/D';
      const status = statusRaw.replace(/_/g, ' ');

      const splitProduct: string[] = doc.splitTextToSize(productNames, colWidths[2] - 2);
      const cellHeight = Math.max(6, splitProduct.length * 3.5);

      // New page if needed
      if (yPos + cellHeight > pageHeight - 15) {
        doc.addPage();
        yPos = 15;
        // Repeat header
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(70, 130, 80);
        doc.setTextColor(255, 255, 255);
        xPos = 15;
        cols.forEach((col, i) => {
          doc.rect(xPos, yPos - 6, colWidths[i], 7, 'F');
          doc.text(col, xPos + colWidths[i] / 2, yPos - 2, { align: 'center' });
          xPos += colWidths[i];
        });
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
      }

      xPos = 15;
      doc.rect(xPos, yPos, colWidths[0], cellHeight);
      doc.text(orderDate, xPos + 2, yPos + 3);
      xPos += colWidths[0];

      doc.rect(xPos, yPos, colWidths[1], cellHeight);
      doc.text(String(order.market_name || 'N/D').substring(0, 18), xPos + 2, yPos + 3);
      xPos += colWidths[1];

      doc.rect(xPos, yPos, colWidths[2], cellHeight);
      let textY = yPos + 3;
      splitProduct.forEach((line: string) => {
        doc.text(line, xPos + 2, textY);
        textY += 3.5;
      });
      xPos += colWidths[2];

      doc.rect(xPos, yPos, colWidths[3], cellHeight);
      doc.setFont('helvetica', 'bold');
      doc.text(total, xPos + colWidths[3] / 2, yPos + cellHeight / 2, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      xPos += colWidths[3];

      doc.rect(xPos, yPos, colWidths[4], cellHeight);
      const statusColor = order.status === 'ritirato' ? [76, 175, 80] as const
        : order.status === 'annullato' ? [244, 67, 54] as const
        : [255, 152, 0] as const;
      doc.setTextColor(...statusColor);
      doc.setFont('helvetica', 'bold');
      doc.text(status, xPos + colWidths[4] / 2, yPos + cellHeight / 2, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      yPos += cellHeight;
    }

    // ---- Summary ----
    yPos += 10;
    const totalAmount = orders.reduce((s: number, o: { total_amount?: number }) => s + (o.total_amount || 0), 0);
    const completedOrders = orders.filter((o: { status?: string }) => o.status === 'ritirato').length;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTALE INCASSO: €${totalAmount.toFixed(2)}`, 15, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 5;
    doc.text(`Ordini completati: ${completedOrders}/${orders.length}`, 15, yPos);

    // ---- Footer ----
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Coldiretti · Campagna Amica · Sistema di vendita a km 0', pageWidth / 2, pageHeight - 5, { align: 'center' });

    const pdfBytes: ArrayBuffer = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=ordini-${Date.now()}.pdf`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
});
