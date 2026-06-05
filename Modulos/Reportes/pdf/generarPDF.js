const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default;

function etiquetaCampo(campo) {
  return String(campo)
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function textoFiltros(filtros = {}) {
  const entries = Object.entries(filtros);
  if (entries.length === 0) {
    return 'Sin filtros aplicados';
  }

  return entries.map(([clave, valor]) => `${clave}: ${valor}`).join(' | ');
}

function agregarPiePagina(doc) {
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setTextColor(85, 85, 85);
    doc.setFontSize(8);
    doc.text(
      `ADPeak SIGI-POA DGEMS | Pagina ${page} de ${totalPages}`,
      40,
      doc.internal.pageSize.getHeight() - 18,
    );
  }
}

function generarPDFBuffer(reporte) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
  const columnas = reporte.columnas || [];
  const datos = reporte.datos || [];
  const margen = 40;

  doc.setFillColor(0, 72, 60);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 88, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(reporte.titulo || 'Reporte DGEMS', margen, 34);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Generado: ${reporte.fechaGeneracion || new Date().toISOString()}`, margen, 56);
  doc.text(`Filtros: ${textoFiltros(reporte.filtros)}`, margen, 74);

  const resumen = Object.entries(reporte.resumenGlobal || {}).map(([clave, valor]) => [
    etiquetaCampo(clave),
    String(valor),
  ]);

  doc.setTextColor(35, 35, 35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Resumen global', margen, 116);

  autoTable(doc, {
    startY: 128,
    head: [['Metrica', 'Valor']],
    body: resumen,
    margin: { left: margen, right: margen },
    styles: { fontSize: 9, cellPadding: 5, overflow: 'linebreak' },
    headStyles: { fillColor: [0, 72, 60], textColor: 255 },
    alternateRowStyles: { fillColor: [242, 246, 244] },
    theme: 'grid',
  });

  const detalleStart = (doc.lastAutoTable?.finalY || 128) + 28;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Detalle filtrado', margen, detalleStart);

  autoTable(doc, {
    startY: detalleStart + 12,
    head: [columnas.map(etiquetaCampo)],
    body: datos.map((fila) => columnas.map((columna) => String(fila[columna] ?? ''))),
    margin: { left: margen, right: margen, bottom: 34 },
    styles: { fontSize: 7.5, cellPadding: 3.5, overflow: 'linebreak' },
    headStyles: { fillColor: [0, 72, 60], textColor: 255 },
    alternateRowStyles: { fillColor: [242, 246, 244] },
    theme: 'grid',
  });

  agregarPiePagina(doc);
  return Buffer.from(doc.output('arraybuffer'));
}

function generarPDF(reporte) {
  return generarPDFBuffer(reporte);
}

module.exports = {
  agregarPiePagina,
  etiquetaCampo,
  generarPDF,
  generarPDFBuffer,
  textoFiltros,
};
