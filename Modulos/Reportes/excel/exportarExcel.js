function escaparXml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function celda(valor) {
  return `<Cell><Data ss:Type="String">${escaparXml(valor)}</Data></Cell>`;
}

function fila(valores) {
  return `<Row>${valores.map(celda).join('')}</Row>`;
}

function generarExcelReporte(reporte) {
  const columnas = reporte.columnas || [];
  const datos = reporte.datos || [];
  const resumen = Object.entries(reporte.resumenGlobal || {});

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Resumen">
    <Table>
      ${fila(['Reporte', reporte.titulo || 'Reporte DGEMS'])}
      ${fila(['Fecha de generacion', reporte.fechaGeneracion || new Date().toISOString()])}
      ${fila(['Rol', reporte.alcance?.rol || ''])}
      ${fila(['Filtros aplicados', JSON.stringify(reporte.filtros || {})])}
      ${fila([])}
      ${fila(['Metrica', 'Valor'])}
      ${resumen.map(([clave, valor]) => fila([clave, valor])).join('')}
    </Table>
  </Worksheet>
  <Worksheet ss:Name="Detalle">
    <Table>
      ${fila(columnas)}
      ${datos.map((registro) => fila(columnas.map((columna) => registro[columna]))).join('')}
    </Table>
  </Worksheet>
</Workbook>`;
}

module.exports = {
  escaparXml,
  generarExcelReporte,
};
