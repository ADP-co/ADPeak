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

function filasMetadatos(reporte) {
  return [
    ['Reporte', reporte.titulo || 'Reporte DGEMS'],
    ['Fecha de generacion', reporte.fechaGeneracion || new Date().toISOString()],
    ['Rol', reporte.alcance?.rol || ''],
    ['Filtros aplicados', JSON.stringify(reporte.filtros || {})],
  ];
}

function filasResumen(reporte) {
  return Object.entries(reporte.resumenGlobal || {}).map(([clave, valor]) => [clave, valor]);
}

function generarCSVReporte(reporte) {
  const columnas = reporte.columnas || [];
  const filas = reporte.datos || [];

  return [
    ...filasMetadatos(reporte),
    [],
    ['Resumen global'],
    ...filasResumen(reporte),
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
  filasMetadatos,
  filasResumen,
  generarCSVReporte,
};
