function escaparCSV(valor) {
  if (valor === null || valor === undefined) {
    return '';
  }

  const texto = String(valor);
  if (/[",\n\r]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }

  return texto;
}

function generarCSVReporte(reporte) {
  const columnas = reporte.columnas || [];
  const filas = reporte.datos || [];

  return [
    ['Reporte', reporte.titulo || 'Reporte DGEMS'],
    ['Fecha de generacion', reporte.fechaGeneracion || new Date().toISOString()],
    ['Filtros aplicados', JSON.stringify(reporte.filtros || {})],
    [],
    columnas,
    ...filas.map((fila) => columnas.map((columna) => fila[columna])),
  ]
    .map((fila) => fila.map(escaparCSV).join(','))
    .join('\n');
}

function exportarCSV(reporte) {
  return generarCSVReporte(reporte);
}

module.exports = {
  escaparCSV,
  exportarCSV,
  generarCSVReporte,
};
