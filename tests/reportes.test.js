const assert = require('node:assert/strict');
const test = require('node:test');

const { createServer } = require('../index');

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
    assert.equal(payload.total, 2);
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
    assert.match(payload.error, /rol/);
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
