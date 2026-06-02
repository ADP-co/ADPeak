const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default;

function etiquetaCampo(campo) {
  return String(campo)
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function generarPDFBuffer(reporte) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
  const columnas = reporte.columnas || [];
  const datos = reporte.datos || [];

  doc.setFillColor(0, 72, 60);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 72, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(reporte.titulo || 'Reporte DGEMS', 40, 34);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Generado: ${reporte.fechaGeneracion || new Date().toISOString()}`, 40, 54);

  doc.setTextColor(35, 35, 35);
  autoTable(doc, {
    startY: 96,
    head: [columnas.map(etiquetaCampo)],
    body: datos.map((fila) => columnas.map((columna) => String(fila[columna] ?? ''))),
    margin: { left: 40, right: 40 },
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: [0, 72, 60], textColor: 255 },
    theme: 'grid',
  });

  return Buffer.from(doc.output('arraybuffer'));
}

function generarPDF(reporte) {
  return generarPDFBuffer(reporte);
}

module.exports = {
  etiquetaCampo,
  generarPDF,
  generarPDFBuffer,
};
