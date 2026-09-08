import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// `Intl.NumberFormat('fr-FR')` (utilisé par formatCFA) sépare les milliers
// avec une espace fine insécable (U+202F) — la police intégrée de jsPDF n'a
// pas ce glyphe et le remplace par un caractère erroné ("3 333" devient
// "3/333" ou similaire dans le PDF). On la remplace par une espace normale
// juste avant le rendu PDF, sans toucher formatCFA (l'affichage à l'écran
// est correct, seul jsPDF pose problème).
const PDF_UNSAFE_SPACES = /[  ]/g;
function pdfSafe(value) {
  return typeof value === 'string' ? value.replace(PDF_UNSAFE_SPACES, ' ') : value;
}

/**
 * Génère et télécharge un rapport PDF tabulaire (paysage, en-tête ApollonPay,
 * pagination). Utilisé pour les rapports de transactions journaliers,
 * hebdomadaires ou mensuels de l'admin.
 */
export function downloadPDFReport({ title, subtitle, headers, rows, filename }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFontSize(16);
  doc.setTextColor(49, 101, 22);
  doc.text('ApollonPay', 14, 15);

  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(pdfSafe(title), 14, 22);

  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(130, 130, 130);
    doc.text(pdfSafe(subtitle), 14, 27);
  }

  autoTable(doc, {
    startY: 32,
    head: [headers.map(pdfSafe)],
    body: rows.map((row) => row.map(pdfSafe)),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [49, 101, 22], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Généré le ${new Date().toLocaleString('fr-FR')} — Page ${i}/${pageCount}`,
      14,
      doc.internal.pageSize.getHeight() - 8
    );
  }

  doc.save(filename);
}
