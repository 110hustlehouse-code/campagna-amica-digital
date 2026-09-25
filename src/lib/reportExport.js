import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

/**
 * Genera un PDF testuale semplice a partire da un elenco di righe.
 * columns: [{ key, label }]  rows: [{ [key]: valore }]
 */
export function exportRowsToPdf({ title, marketName, columns, rows, filenamePrefix }) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text(title, 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  if (marketName) {
    doc.text(`Mercato: ${marketName}`, 14, y);
    y += 6;
  }
  doc.text(`Generato il: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: it })}`, 14, y);
  y += 10;

  if (rows.length === 0) {
    doc.setFontSize(10);
    doc.text('Nessun dato da mostrare.', 14, y);
  }

  doc.setFontSize(9);
  rows.forEach((row) => {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    const riga = columns.map((col) => `${col.label}: ${row[col.key] ?? '—'}`).join('  ·  ');
    const lines = doc.splitTextToSize(riga, pageWidth - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 3;
  });

  doc.save(`${filenamePrefix}-${format(new Date(), 'yyyyMMdd')}.pdf`);
}

/**
 * Genera un file Excel a partire da un elenco di righe.
 * columns: [{ key, label }]  rows: [{ [key]: valore }]
 */
export function exportRowsToExcel({ sheetName, columns, rows, filenamePrefix }) {
  const dati = rows.map((row) => {
    const obj = {};
    columns.forEach((col) => {
      obj[col.label] = row[col.key] ?? '';
    });
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(dati.length ? dati : [{}]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${filenamePrefix}-${format(new Date(), 'yyyyMMdd')}.xlsx`);
}
