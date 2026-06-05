const assert = require('node:assert/strict');
const test = require('node:test');

const { createServer } = require('../index');
const {
  AVANCES,
  calcularPorcentaje,
  calcularTotalesIndicador,
  clasificarEstado,
  consultarReporteGeneral,
  crearResumenGlobal,
} = require('../Modulos/Reportes/servicios/reportesServicio');

function startServer() {
  const server = createServer().listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  return {
    baseUrl,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function getJson(baseUrl, path, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, { headers });
  const payload = await response.json();
  return { response, payload };
}

test('returns JSON reports filtered by main SCRUM-50 criteria', async () => {
  const server = startServer();

  try {
    const { response, payload } = await getJson(
      server.baseUrl,
      '/api/reportes?ciclo=2026&periodo=2026-P1&plantelId=10&actividadId=501&indicadorId=101&responsableId=2&estado=en_revision',
      { 'x-user-role': 'Admin' },
    );

    assert.equal(response.status, 200);
    assert.equal(payload.total, 1);
    assert.equal(payload.datos[0].indicadorId, 101);
    assert.equal(payload.datos[0].estado, 'en_revision');
  } finally {
    await server.close();
  }
});

test('plantel role only sees reports inside its plantel scope', async () => {
  const server = startServer();

  try {
    const { response, payload } = await getJson(server.baseUrl, '/api/reportes?ciclo=2026', {
      'x-user-role': 'Plantel',
      'x-user-plantel-id': '10',
    });

    assert.equal(response.status, 200);
    assert.equal(payload.total, 2);
    assert.ok(payload.datos.every((avance) => avance.plantelId === 10));
  } finally {
    await server.close();
  }
});

test('responsable role only sees assigned reports', async () => {
  const server = startServer();

  try {
    const { response, payload } = await getJson(server.baseUrl, '/api/reportes?periodo=2026-P1', {
      'x-user-role': 'Responsable',
      'x-user-responsable-id': '2',
    });

    assert.equal(response.status, 200);
    assert.equal(payload.total, 3);
    assert.ok(payload.datos.every((avance) => avance.responsableId === 2));
  } finally {
    await server.close();
  }
});

test('rejects report queries without user scope headers', async () => {
  const server = startServer();

  try {
    const { response, payload } = await getJson(server.baseUrl, '/api/reportes');

    assert.equal(response.status, 401);
    assert.match(payload.error, /rol/i);
  } finally {
    await server.close();
  }
});

test('rejects invalid numeric filters', async () => {
  const server = startServer();

  try {
    const { response, payload } = await getJson(server.baseUrl, '/api/reportes?plantelId=abc', {
      'x-user-role': 'Admin',
    });

    assert.equal(response.status, 400);
    assert.match(payload.error, /plantelId/);
  } finally {
    await server.close();
  }
});

test('SCRUM-51 calculations are reproducible for totals and percentages', () => {
  const indicador = AVANCES[0];
  const calculos = calcularTotalesIndicador(indicador);

  assert.equal(calculos.estudiantesTotal, 405);
  assert.equal(calculos.docentesTotal, 33);
  assert.equal(calculos.porcentajeMeta, 85);
  assert.equal(calcularPorcentaje(17, 20), 85);
});

test('SCRUM-51 state classification handles delayed and observed indicators', () => {
  const fechaReferencia = new Date('2026-06-05T00:00:00.000Z');

  assert.equal(clasificarEstado(AVANCES[0], fechaReferencia), 'enviados');
  assert.equal(clasificarEstado(AVANCES[2], fechaReferencia), 'aprobados');
  assert.equal(clasificarEstado(AVANCES[4], fechaReferencia), 'atrasados');
  assert.equal(clasificarEstado(AVANCES[5], fechaReferencia), 'atrasados');
});

test('SCRUM-52 general report exposes DGEMS global summary and dynamic detail', async () => {
  const server = startServer();

  try {
    const { response, payload } = await getJson(server.baseUrl, '/api/reportes/general?ciclo=2026', {
      'x-user-role': 'Admin',
    });

    assert.equal(response.status, 200);
    assert.equal(payload.titulo, 'Reporte general DGEMS');
    assert.equal(payload.resumenGlobal.totalRegistros, 5);
    assert.equal(payload.resumenGlobal.totalPlanteles, 3);
    assert.equal(payload.resumenGlobal.totalIndicadores, 5);
    assert.equal(payload.resumenGlobal.faltantes, 1);
    assert.equal(payload.resumenGlobal.enviados, 1);
    assert.equal(payload.resumenGlobal.aprobados, 1);
    assert.equal(payload.resumenGlobal.atrasados, 2);
    assert.ok(payload.columnas.includes('estudiantesTotal'));
    assert.ok(payload.columnas.includes('docentesTotal'));
    assert.equal(payload.datos[0].estudiantesTotal, 405);
  } finally {
    await server.close();
  }
});

test('SCRUM-52 summary can be generated deterministically from fixtures', () => {
  const resumen = crearResumenGlobal(
    AVANCES.filter((avance) => avance.ciclo === '2026'),
    new Date('2026-06-05T00:00:00.000Z'),
  );

  assert.deepEqual(
    {
      totalRegistros: resumen.totalRegistros,
      faltantes: resumen.faltantes,
      enviados: resumen.enviados,
      observados: resumen.observados,
      aprobados: resumen.aprobados,
      atrasados: resumen.atrasados,
      totalEstudiantes: resumen.totalEstudiantes,
      totalDocentes: resumen.totalDocentes,
    },
    {
      totalRegistros: 5,
      faltantes: 1,
      enviados: 1,
      observados: 0,
      aprobados: 1,
      atrasados: 2,
      totalEstudiantes: 1275,
      totalDocentes: 114,
    },
  );
});

test('SCRUM-52 respects compatible x-role headers from the API backend', async () => {
  const server = startServer();

  try {
    const { response, payload } = await getJson(server.baseUrl, '/api/reportes/general?periodoId=1', {
      'x-role': 'responsable',
      'x-responsable-id': '2',
    });

    assert.equal(response.status, 200);
    assert.equal(payload.total, undefined);
    assert.ok(payload.datos.every((avance) => avance.responsableId === 2));
  } finally {
    await server.close();
  }
});

test('SCRUM-53 exports visible report data as CSV with filters and generation date', async () => {
  const server = startServer();

  try {
    const response = await fetch(`${server.baseUrl}/api/reportes/general.csv?plantelId=10`, {
      headers: { 'x-user-role': 'Admin' },
    });
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/csv/);
    assert.match(body, /Reporte general DGEMS/);
    assert.match(body, /Fecha de generacion/);
    assert.match(body, /Filtros aplicados/);
    assert.match(body, /Resumen global/);
    assert.match(body, /Bachillerato No. 10/);
    assert.match(body, /estudiantesTotal/);
  } finally {
    await server.close();
  }
});

test('SCRUM-53 exports DGEMS report as PDF using jsPDF and AutoTable', async () => {
  const server = startServer();

  try {
    const response = await fetch(`${server.baseUrl}/api/reportes/general.pdf?responsableId=2`, {
      headers: { 'x-user-role': 'Admin' },
    });
    const body = Buffer.from(await response.arrayBuffer());

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /application\/pdf/);
    assert.equal(body.subarray(0, 4).toString(), '%PDF');
    assert.ok(body.length > 1000);
  } finally {
    await server.close();
  }
});

test('SCRUM-53 exports DGEMS report as Excel-compatible workbook', async () => {
  const server = startServer();

  try {
    const response = await fetch(`${server.baseUrl}/api/reportes/general.xls?estado=aprobado`, {
      headers: { 'x-user-role': 'Admin' },
    });
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /application\/vnd\.ms-excel/);
    assert.match(body, /<Workbook/);
    assert.match(body, /Resumen/);
    assert.match(body, /Detalle/);
    assert.match(body, /aprobado/);
  } finally {
    await server.close();
  }
});

test('SCRUM-53 export payload can be produced from service output', () => {
  const reporte = consultarReporteGeneral(
    { ciclo: '2026' },
    { rol: 'Admin' },
    AVANCES,
    {
      fechaGeneracion: new Date('2026-06-05T12:00:00.000Z'),
      fechaReferencia: new Date('2026-06-05T00:00:00.000Z'),
    },
  );

  assert.equal(reporte.fechaGeneracion, '2026-06-05T12:00:00.000Z');
  assert.equal(reporte.datos.length, 5);
  assert.equal(reporte.resumenGlobal.porcentajeCumplimiento, 20);
});
