const http = require('node:http');

const { handleReportesRequest } = require('./Modulos/Reportes/routes/reportes.routes');

function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function createServer() {
  return http.createServer((req, res) => {
    if (handleReportesRequest(req, res)) {
      return;
    }

    if (req.method === 'GET' && new URL(req.url, 'http://localhost').pathname === '/health') {
      writeJson(res, 200, { ok: true, service: 'reportes' });
      return;
    }

    writeJson(res, 404, { error: 'Ruta no encontrada' });
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, () => {
    console.log(`Modulo de reportes escuchando en http://localhost:${port}`);
  });
}

module.exports = { createServer };
