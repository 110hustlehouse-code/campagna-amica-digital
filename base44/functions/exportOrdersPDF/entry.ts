import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { orders, companyName } = await req.json();

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 15;

    // Header con loghi
    const logoUrl = "https://images.unsplash.com/photo-1606787620894-ba6fcd67e267?w=100&h=100&fit=crop";
    const campagnaUrl = "https://images.unsplash.com/photo-1574080135285-2c76ce2216ea?w=100&h=100&fit=crop";
    
    try {
      doc.addImage(logoUrl, 'JPEG', 15, 10, 15, 15);
      doc.addImage(campagnaUrl, 'JPEG', pageWidth - 30, 10, 15, 15);
    } catch (e) {
      // Se le immagini non caricano, continua comunque
    }

    // Titolo principale
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(70, 130, 80);
    doc.text('STORICO ORDINI', pageWidth / 2, 20, { align: 'center' });
    
    // Intestazione azienda
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.text(`Azienda: ${companyName}`, 15, 32);
    doc.text(`Data esportazione: ${new Date().toLocaleDateString('it-IT')}`, 15, 37);
    
    yPos = 45;

    // Tabella con tutti i dettagli
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setFillColor(70, 130, 80);
    doc.setTextColor(255, 255, 255);

    const colWidths = [25, 30, 50, 20, 25];
    const cols = ['Data Ordine', 'Mercato', 'Prodotto', 'Totale', 'Stato'];
    let xPos = 15;

    cols.forEach((col, i) => {
      doc.rect(xPos, yPos - 6, colWidths[i], 7, 'F');
      doc.text(col, xPos + colWidths[i] / 2, yPos - 2, { align: 'center' });
      xPos += colWidths[i];
    });
    yPos += 6;

    // Righe dati
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);

    let rowHeight = 6;

    orders.forEach(order => {
      const orderDate = order.created_date ? new Date(order.created_date).toLocaleDateString('it-IT') : 'N/D';
      const productNames = order.items?.map(i => i.product_name).join(', ') || 'N/D';
      const total = `€${(order.total_amount || 0).toFixed(2)}`;
      const status = order.status?.replace(/_/g, ' ').charAt(0).toUpperCase() + order.status?.replace(/_/g, ' ').slice(1) || 'N/D';

      // Calcola l'altezza della riga in base al testo
      const splitProduct = doc.splitTextToSize(productNames, colWidths[2] - 2);
      const cellHeight = Math.max(rowHeight, splitProduct.length * 3.5);

      // Controlla se è necessaria una nuova pagina
      if (yPos + cellHeight > pageHeight - 15) {
        doc.addPage();
        yPos = 15;
        
        // Ripeti l'intestazione sulla nuova pagina
        doc.setFont(undefined, 'bold');
        doc.setFillColor(70, 130, 80);
        doc.setTextColor(255, 255, 255);
        xPos = 15;
        cols.forEach((col, i) => {
          doc.rect(xPos, yPos - 6, colWidths[i], 7, 'F');
          doc.text(col, xPos + colWidths[i] / 2, yPos - 2, { align: 'center' });
          xPos += colWidths[i];
        });
        yPos += 6;
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
      }

      // Disegna le celle
      xPos = 15;
      doc.rect(xPos, yPos, colWidths[0], cellHeight);
      doc.text(orderDate, xPos + 2, yPos + 3);
      xPos += colWidths[0];

      doc.rect(xPos, yPos, colWidths[1], cellHeight);
      doc.text(order.market_name || 'N/D', xPos + 2, yPos + 3);
      xPos += colWidths[1];

      doc.rect(xPos, yPos, colWidths[2], cellHeight);
      doc.textLines = doc.splitTextToSize(productNames, colWidths[2] - 2);
      let textY = yPos + 3;
      doc.textLines.forEach(line => {
        doc.text(line, xPos + 2, textY);
        textY += 3.5;
      });
      xPos += colWidths[2];

      doc.rect(xPos, yPos, colWidths[3], cellHeight);
      doc.setFont(undefined, 'bold');
      doc.text(total, xPos + colWidths[3] / 2, yPos + cellHeight / 2, { align: 'center', valign: 'middle' });
      doc.setFont(undefined, 'normal');
      xPos += colWidths[3];

      doc.rect(xPos, yPos, colWidths[4], cellHeight);
      const statusColor = order.status === 'ritirato' ? [76, 175, 80] : order.status === 'annullato' ? [244, 67, 54] : [255, 152, 0];
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.setFont(undefined, 'bold');
      doc.text(status, xPos + colWidths[4] / 2, yPos + cellHeight / 2, { align: 'center', valign: 'middle' });
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);

      yPos += cellHeight;
    });

    // Riepilogo totali
    const totalAmount = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const completedOrders = orders.filter(o => o.status === 'ritirato').length;

    yPos += 10;
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTALE INCASSO: €${totalAmount.toFixed(2)}`, 15, yPos);
    doc.setFont(undefined, 'normal');
    yPos += 5;
    doc.text(`Ordini completati: ${completedOrders}/${orders.length}`, 15, yPos);

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Coldiretti · Campagna Amica · Sistema di vendita a km 0', pageWidth / 2, pageHeight - 5, { align: 'center' });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=ordini-${new Date().getTime()}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});