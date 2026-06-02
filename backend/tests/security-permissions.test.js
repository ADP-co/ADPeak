const assert = require('node:assert/strict');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.SECRET_KEY = 'test-secret';

const { createApp, store } = require('../index');

function createServer() {
  const sessionStore = new Map();
  const app = createApp({
    secretKey: 'test-secret',
    sessionStore: {
      async set(key, value) {
        sessionStore.set(key, value);
      },
      async get(key) {
        return sessionStore.get(key);
      },
      async del(key) {
        sessionStore.delete(key);
      },
    },
  });
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  return {
    baseUrl,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const payload = await response.json();
  return { response, payload };
}

async function login(baseUrl, email) {
  const { response, payload } = await request(baseUrl, '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: '123' }),
  });

  assert.equal(response.status, 200);
  assert.ok(payload.token);
  return payload.token;
}

test('login rejects invalid input with server-side validation', async () => {
  const server = createServer();

  try {
    const { response, payload } = await request(server.baseUrl, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'bad-email', password: '' }),
    });

    assert.equal(response.status, 400);
    assert.equal(payload.error, 'Datos de entrada invalidos');
    assert.ok(payload.detalles.length >= 2);
  } finally {
    await server.close();
  }
});

test('RBAC and scope segmentation hide indicators outside the user scope', async () => {
  const server = createServer();

  try {
    const plantelToken = await login(server.baseUrl, 'plantel@poa.gov');
    const responsableToken = await login(server.baseUrl, 'responsable@poa.gov');

    const plantelResult = await request(server.baseUrl, '/api/poa/indicadores', {
      headers: { authorization: `Bearer ${plantelToken}` },
    });
    assert.equal(plantelResult.response.status, 200);
    assert.deepEqual(
      plantelResult.payload.indicadores.map((indicador) => indicador.id).sort(),
      [101, 102],
    );

    const responsableResult = await request(server.baseUrl, '/api/poa/indicadores', {
      headers: { authorization: `Bearer ${responsableToken}` },
    });
    assert.equal(responsableResult.response.status, 200);
    assert.deepEqual(
      responsableResult.payload.indicadores.map((indicador) => indicador.id).sort(),
      [101, 102],
    );

    const blocked = await request(server.baseUrl, '/api/validar-alcance/indicador/103', {
      headers: { authorization: `Bearer ${plantelToken}` },
    });
    assert.equal(blocked.response.status, 403);
  } finally {
    await server.close();
  }
});

test('admin can manage permissions and primary or secondary responsibilities', async () => {
  const server = createServer();

  try {
    const adminToken = await login(server.baseUrl, 'admin@poa.gov');
    const update = await request(server.baseUrl, '/api/usuarios/4/permisos', {
      method: 'PUT',
      headers: { authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        rol: 'Responsable',
        plantelId: 20,
        asignaciones: {
          indicadores: [{ id: 103, tipo: 'Primario' }],
          actividades: [{ id: 503, tipo: 'Secundario' }],
          planteles: [{ id: 20, tipo: 'Secundario' }],
        },
      }),
    });

    assert.equal(update.response.status, 200);
    assert.equal(update.payload.usuario.rol, 'Responsable');
    assert.equal(update.payload.usuario.plantelId, 20);

    const assignmentResult = await request(server.baseUrl, '/api/usuarios/4/asignaciones', {
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(assignmentResult.response.status, 200);
    const asignaciones = assignmentResult.payload.asignaciones;
    assert.equal(
      asignaciones.indicadores.length + asignaciones.actividades.length + asignaciones.planteles.length,
      3,
    );
    assert.ok(
      asignaciones.indicadores.some(
        (asignacion) => asignacion.id === 103 && asignacion.tipo_responsabilidad === 'Primario',
      ),
    );
  } finally {
    await server.close();
  }
});

test('critical actions are stored in the audit trail', async () => {
  store.auditLog = [];
  store.evidencias.length = 0;

  const server = createServer();

  try {
    const plantelToken = await login(server.baseUrl, 'plantel@poa.gov');
    const responsableToken = await login(server.baseUrl, 'responsable@poa.gov');
    const adminToken = await login(server.baseUrl, 'admin@poa.gov');

    const revision = await request(server.baseUrl, '/api/indicadores/101/enviar-revision', {
      method: 'POST',
      headers: { authorization: `Bearer ${plantelToken}` },
    });
    assert.equal(revision.response.status, 200);

    const evidencia = await request(server.baseUrl, '/api/indicadores/101/evidencias', {
      method: 'POST',
      headers: { authorization: `Bearer ${plantelToken}` },
      body: JSON.stringify({ nombreArchivo: 'avance.pdf', ruta: '/uploads/avance.pdf' }),
    });
    assert.equal(evidencia.response.status, 201);

    const aprobar = await request(server.baseUrl, '/api/indicadores/101/aprobar', {
      method: 'POST',
      headers: { authorization: `Bearer ${responsableToken}` },
    });
    assert.equal(aprobar.response.status, 200);

    const corregir = await request(server.baseUrl, '/api/indicadores/101/corregir', {
      method: 'POST',
      headers: { authorization: `Bearer ${responsableToken}` },
      body: JSON.stringify({ observaciones: 'Ajustar evidencia soporte' }),
    });
    assert.equal(corregir.response.status, 200);

    const descarga = await request(server.baseUrl, '/api/evidencias/1/descargar', {
      headers: { authorization: `Bearer ${responsableToken}` },
    });
    assert.equal(descarga.response.status, 200);

    const cierre = await request(server.baseUrl, '/api/indicadores/101/cerrar', {
      method: 'POST',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(cierre.response.status, 200);

    const bitacora = await request(server.baseUrl, '/api/poa/bitacora', {
      headers: { authorization: `Bearer ${adminToken}` },
    });

    assert.equal(bitacora.response.status, 200);
    const eventos = bitacora.payload.bitacora.map((evento) => evento.tipoEvento);
    for (const tipo of [
      'LOGIN',
      'ENVIADO_REVISION',
      'CARGA_EVIDENCIA',
      'APROBACION',
      'CORRECCION',
      'DESCARGA_EVIDENCIA',
      'CIERRE',
    ]) {
      assert.ok(eventos.includes(tipo), `missing audit event ${tipo}`);
    }
  } finally {
    await server.close();
  }
});
