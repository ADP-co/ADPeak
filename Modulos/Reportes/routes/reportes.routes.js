const {
  consultarReporteGeneral,
  consultarReportes,
  normalizarFiltros,
  normalizarUsuario,
} = require('../servicios/reportesServicio');
const { generarCSVReporte } = require('../csv/exportarCSV');
const { generarExcelReporte } = require('../excel/exportarExcel');
const { generarPDFBuffer } = require('../pdf/generarPDF');

function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function writeFile(res, statusCode, contentType, fileName, payload) {
  res.writeHead(statusCode, {
    'content-type': contentType,
    'content-disposition': `attachment; filename="${fileName}"`,
  });
  res.end(payload);
}

function handleReportesRequest(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const rutasReportes = new Set([
    '/api/reportes',
    '/api/reportes/avances',
    '/api/reportes/general',
    '/api/reportes/general.csv',
    '/api/reportes/general.xls',
    '/api/reportes/general.pdf',
  ]);

  if (req.method !== 'GET' || !rutasReportes.has(url.pathname)) {
    return false;
  }

  const usuario = normalizarUsuario(req.headers);
  if (usuario.error) {
    writeJson(res, 401, { error: usuario.error });
    return true;
  }

  const { filtros, error } = normalizarFiltros(Object.fromEntries(url.searchParams.entries()));
  if (error) {
    writeJson(res, 400, { error });
    return true;
  }

  if (url.pathname === '/api/reportes/general') {
    writeJson(res, 200, consultarReporteGeneral(filtros, usuario));
    return true;
  }

  if (url.pathname === '/api/reportes/general.csv') {
    const reporte = consultarReporteGeneral(filtros, usuario);
    writeFile(res, 200, 'text/csv; charset=utf-8', 'reporte-general-dgems.csv', generarCSVReporte(reporte));
    return true;
  }

  if (url.pathname === '/api/reportes/general.pdf') {
    const reporte = consultarReporteGeneral(filtros, usuario);
    writeFile(res, 200, 'application/pdf', 'reporte-general-dgems.pdf', generarPDFBuffer(reporte));
    return true;
  }

  if (url.pathname === '/api/reportes/general.xls') {
    const reporte = consultarReporteGeneral(filtros, usuario);
    writeFile(
      res,
      200,
      'application/vnd.ms-excel; charset=utf-8',
      'reporte-general-dgems.xls',
      generarExcelReporte(reporte),
    );
    return true;
  }

  writeJson(res, 200, consultarReportes(filtros, usuario));
  return true;
}

module.exports = { handleReportesRequest };
