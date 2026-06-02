require('dotenv').config();

const express = require('express');
const jwt = require('jsonwebtoken');
const { createClient } = require('redis');
const cors = require('cors');
const { body, param, validationResult } = require('express-validator');
const fs = require('node:fs');
const path = require('node:path');

const ROLES = Object.freeze({
  ADMIN: 'Admin',
  RESPONSABLE: 'Responsable',
  PLANTEL: 'Plantel',
});

const PERMISSIONS = Object.freeze({
  MANAGE_PERMISSIONS: 'manage:permissions',
  VIEW_AUDIT_LOG: 'audit:read',
  VIEW_INDICATORS: 'indicators:read',
  SUBMIT_REVIEW: 'review:submit',
  APPROVE_REVIEW: 'review:approve',
  REQUEST_CORRECTION: 'review:correct',
  CLOSE_INDICATOR: 'indicator:close',
  UPLOAD_EVIDENCE: 'evidence:upload',
  DOWNLOAD_EVIDENCE: 'evidence:download',
  VIEW_REPORTS: 'reports:read',
});

const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.RESPONSABLE]: [
    PERMISSIONS.VIEW_INDICATORS,
    PERMISSIONS.APPROVE_REVIEW,
    PERMISSIONS.REQUEST_CORRECTION,
    PERMISSIONS.DOWNLOAD_EVIDENCE,
    PERMISSIONS.VIEW_REPORTS,
  ],
  [ROLES.PLANTEL]: [
    PERMISSIONS.VIEW_INDICATORS,
    PERMISSIONS.SUBMIT_REVIEW,
    PERMISSIONS.UPLOAD_EVIDENCE,
    PERMISSIONS.DOWNLOAD_EVIDENCE,
  ],
});

const store = {
  usuarios: [
    { id: 1, email: 'admin@poa.gov', password: '123', rol: ROLES.ADMIN, plantel_id: null },
    { id: 2, email: 'responsable@poa.gov', password: '123', rol: ROLES.RESPONSABLE, plantel_id: null },
    { id: 3, email: 'plantel@poa.gov', password: '123', rol: ROLES.PLANTEL, plantel_id: 10 },
    { id: 4, email: 'plantel20@poa.gov', password: '123', rol: ROLES.PLANTEL, plantel_id: 20 },
  ],
  planteles: [
    { id: 10, nombre: 'Bachillerato 10' },
    { id: 20, nombre: 'Bachillerato 20' },
  ],
  indicadores: [
    { id: 101, plantel_id: 10, actividad_id: 501, nombre: 'Tasa de aprobacion', valor: '85%', estado: 'borrador' },
    { id: 102, plantel_id: 10, actividad_id: 502, nombre: 'Desercion escolar', valor: '5%', estado: 'en_revision' },
    { id: 103, plantel_id: 20, actividad_id: 503, nombre: 'Tasa de aprobacion', valor: '90%', estado: 'borrador' },
    { id: 104, plantel_id: null, actividad_id: 504, nombre: 'Presupuesto global', valor: '$1M', estado: 'abierto' },
  ],
  actividades: [
    { id: 501, indicador_id: 101, plantel_id: 10, nombre: 'Captura de aprobacion' },
    { id: 502, indicador_id: 102, plantel_id: 10, nombre: 'Seguimiento de abandono' },
    { id: 503, indicador_id: 103, plantel_id: 20, nombre: 'Captura de aprobacion plantel 20' },
    { id: 504, indicador_id: 104, plantel_id: null, nombre: 'Revision global DGEMS' },
  ],
  responsabilidades: [
    { id: 1, entidad_tipo: 'Indicador', entidad_id: 101, usuario_id: 2, tipo_responsabilidad: 'Primario' },
    { id: 2, entidad_tipo: 'Indicador', entidad_id: 102, usuario_id: 2, tipo_responsabilidad: 'Secundario' },
    { id: 3, entidad_tipo: 'Actividad', entidad_id: 501, usuario_id: 2, tipo_responsabilidad: 'Primario' },
    { id: 4, entidad_tipo: 'Plantel', entidad_id: 10, usuario_id: 2, tipo_responsabilidad: 'Secundario' },
  ],
  evidencias: [],
};

const auditLogPath = process.env.AUDIT_LOG_PATH || path.join(__dirname, 'data', 'audit-log.json');
const inMemorySessions = new Map();

function getSecretKey() {
  if (process.env.SECRET_KEY) {
    return process.env.SECRET_KEY;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('SECRET_KEY es requerido en produccion.');
  }

  return 'local-review-secret-change-me';
}

function getAuditLog() {
  if (process.env.NODE_ENV === 'test') {
    return store.auditLog ?? [];
  }

  try {
    if (!fs.existsSync(auditLogPath)) {
      return [];
    }

    return JSON.parse(fs.readFileSync(auditLogPath, 'utf8'));
  } catch {
    return [];
  }
}

function saveAuditLog(auditLog) {
  if (process.env.NODE_ENV === 'test') {
    store.auditLog = auditLog;
    return;
  }

  fs.mkdirSync(path.dirname(auditLogPath), { recursive: true });
  fs.writeFileSync(auditLogPath, JSON.stringify(auditLog, null, 2));
}

function registrarBitacora(usuarioId, tipoEvento, entidadAfectada, detalles = '', metadata = {}) {
  const auditLog = getAuditLog();
  const registro = {
    id: auditLog.length + 1,
    usuario_id: usuarioId,
    fecha: new Date().toISOString(),
    tipo_evento: tipoEvento,
    entidad_afectada: entidadAfectada,
    detalles,
    metadata,
  };

  auditLog.push(registro);
  saveAuditLog(auditLog);
  return registro;
}

async function createSessionStore() {
  if (!process.env.REDIS_URL) {
    return {
      async set(key, value) {
        inMemorySessions.set(key, value);
      },
      async get(key) {
        return inMemorySessions.get(key);
      },
      async del(key) {
        inMemorySessions.delete(key);
      },
    };
  }

  const redisClient = createClient({ url: process.env.REDIS_URL });
  redisClient.on('error', (error) => console.error('Error en Redis:', error));
  await redisClient.connect();
  return redisClient;
}

function validateRequest(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const detalles = errors.array();
    return res.status(400).json({
      error: 'Datos de entrada invalidos',
      detalles,
      errores: detalles,
    });
  }

  return next();
}

function hasPermission(usuario, permission) {
  return (ROLE_PERMISSIONS[usuario.rol] ?? []).includes(permission);
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!hasPermission(req.usuario, permission)) {
      return res.status(403).json({
        error: 'Acceso denegado.',
        permission,
        rol: req.usuario.rol,
      });
    }

    return next();
  };
}

function getResponsabilidadesPorUsuario(usuarioId) {
  return store.responsabilidades.filter((responsabilidad) => responsabilidad.usuario_id === usuarioId);
}

function isResponsibleFor(usuario, entidadTipo, entidadId) {
  return getResponsabilidadesPorUsuario(usuario.id).some(
    (responsabilidad) =>
      responsabilidad.entidad_tipo === entidadTipo && responsabilidad.entidad_id === entidadId
  );
}

function canAccessIndicator(usuario, indicador) {
  if (usuario.rol === ROLES.ADMIN) {
    return true;
  }

  if (usuario.rol === ROLES.PLANTEL) {
    return indicador.plantel_id === usuario.plantel_id;
  }

  if (usuario.rol === ROLES.RESPONSABLE) {
    return (
      isResponsibleFor(usuario, 'Indicador', indicador.id) ||
      isResponsibleFor(usuario, 'Actividad', indicador.actividad_id) ||
      (indicador.plantel_id !== null && isResponsibleFor(usuario, 'Plantel', indicador.plantel_id))
    );
  }

  return false;
}

function canAccessEvidence(usuario, evidencia) {
  const indicador = store.indicadores.find((item) => item.id === evidencia.indicador_id);
  return indicador ? canAccessIndicator(usuario, indicador) : false;
}

function getScopedIndicators(usuario) {
  return store.indicadores.filter((indicador) => canAccessIndicator(usuario, indicador));
}

function getResponsables(entidadTipo, entidadId) {
  return store.responsabilidades
    .filter(
      (responsabilidad) =>
        responsabilidad.entidad_tipo === entidadTipo && responsabilidad.entidad_id === entidadId
    )
    .map((responsabilidad) => {
      const usuario = store.usuarios.find((item) => item.id === responsabilidad.usuario_id);
      return {
        usuario_id: responsabilidad.usuario_id,
        email: usuario?.email ?? null,
        rol: usuario?.rol ?? null,
        tipo_responsabilidad: responsabilidad.tipo_responsabilidad,
      };
    });
}

function replaceAssignments(usuarioId, assignments = {}) {
  const created = [];
  const allowedTypes = [
    ['indicadores', 'Indicador'],
    ['actividades', 'Actividad'],
    ['planteles', 'Plantel'],
  ];

  store.responsabilidades = store.responsabilidades.filter(
    (responsabilidad) => responsabilidad.usuario_id !== usuarioId
  );

  allowedTypes.forEach(([payloadKey, entidadTipo]) => {
    const items = assignments[payloadKey] ?? [];

    items.forEach((item) => {
      const tipoResponsabilidad = item.tipo_responsabilidad || item.tipo;

      created.push({
        id: store.responsabilidades.length + created.length + 1,
        entidad_tipo: entidadTipo,
        entidad_id: item.id,
        usuario_id: usuarioId,
        tipo_responsabilidad: tipoResponsabilidad,
      });
    });
  });

  store.responsabilidades.push(...created);
  return created;
}

function buildAssignmentsForUser(usuarioId) {
  return getResponsabilidadesPorUsuario(usuarioId).reduce(
    (acc, responsabilidad) => {
      const key =
        responsabilidad.entidad_tipo === 'Indicador'
          ? 'indicadores'
          : responsabilidad.entidad_tipo === 'Actividad'
            ? 'actividades'
            : 'planteles';

      acc[key].push({
        id: responsabilidad.entidad_id,
        tipo_responsabilidad: responsabilidad.tipo_responsabilidad,
      });

      return acc;
    },
    { indicadores: [], actividades: [], planteles: [] }
  );
}

function createApp(options = {}) {
  const app = express();
  const sessionStorePromise = options.sessionStore
    ? Promise.resolve(options.sessionStore)
    : createSessionStore();
  const secretKey = options.secretKey || getSecretKey();

  app.use(express.json());
  app.use(cors());

  async function verificarAutenticacion(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Acceso denegado: no hay token.' });
    }

    const token = authHeader.slice('Bearer '.length);

    try {
      const decoded = jwt.verify(token, secretKey);
      const sessionStore = await sessionStorePromise;
      const tokenEnSesion = await sessionStore.get(`sesion:${decoded.id}`);

      if (!tokenEnSesion || tokenEnSesion !== token) {
        return res.status(401).json({ error: 'Sesion revocada o invalida.' });
      }

      const usuario = store.usuarios.find((item) => item.id === decoded.id);

      if (!usuario) {
        return res.status(401).json({ error: 'Usuario no encontrado.' });
      }

      req.usuario = usuario;
      return next();
    } catch {
      return res.status(401).json({ error: 'Token invalido o expirado.' });
    }
  }

  function updateIndicatorStatus(req, res, tipoEvento, estado, detalles = '') {
    const indicador = store.indicadores.find((item) => item.id === Number(req.params.id));

    if (!indicador || !canAccessIndicator(req.usuario, indicador)) {
      return res.status(403).json({ error: 'No tienes alcance sobre este indicador.' });
    }

    const previousStatus = indicador.estado;
    indicador.estado = estado;
    registrarBitacora(req.usuario.id, tipoEvento, `Indicador:${indicador.id}`, detalles || `Estado ${previousStatus} -> ${estado}`, {
      previousStatus,
      nextStatus: estado,
      indicador_id: indicador.id,
    });

    return res.json({ indicador });
  }

  app.post(
    '/api/auth/login',
    [
      body('email').isEmail().withMessage('El correo debe tener formato valido.'),
      body('password').isString().notEmpty().withMessage('La contrasena es requerida.'),
    ],
    validateRequest,
    async (req, res) => {
      const { email, password } = req.body;
      const usuario = store.usuarios.find((item) => item.email === email && item.password === password);

      if (!usuario) {
        return res.status(401).json({ error: 'Credenciales invalidas.' });
      }

      const token = jwt.sign(
        { id: usuario.id, rol: usuario.rol, plantel_id: usuario.plantel_id },
        secretKey,
        { expiresIn: '1h' }
      );
      const sessionStore = await sessionStorePromise;
      await sessionStore.set(`sesion:${usuario.id}`, token, { EX: 3600 });
      registrarBitacora(usuario.id, 'LOGIN', 'Sistema', `Login de ${usuario.email}`);

      return res.json({
        mensaje: `Bienvenido ${usuario.rol}`,
        token,
        usuario: {
          id: usuario.id,
          email: usuario.email,
          rol: usuario.rol,
          plantel_id: usuario.plantel_id,
          permisos: ROLE_PERMISSIONS[usuario.rol],
        },
      });
    }
  );

  app.post('/api/auth/logout', verificarAutenticacion, async (req, res) => {
    const sessionStore = await sessionStorePromise;
    await sessionStore.del(`sesion:${req.usuario.id}`);
    registrarBitacora(req.usuario.id, 'LOGOUT', 'Sistema', `Logout de ${req.usuario.email}`);
    return res.json({ mensaje: 'Sesion cerrada exitosamente.' });
  });

  app.get('/api/poa/indicadores', verificarAutenticacion, requirePermission(PERMISSIONS.VIEW_INDICATORS), (req, res) => {
    return res.json({
      datos: getScopedIndicators(req.usuario),
      indicadores: getScopedIndicators(req.usuario),
      alcance: {
        rol: req.usuario.rol,
        plantel_id: req.usuario.plantel_id,
        responsabilidades: buildAssignmentsForUser(req.usuario.id),
      },
    });
  });

  app.get(
    '/api/validar-alcance/indicador/:id',
    verificarAutenticacion,
    [param('id').isInt({ min: 1 }).withMessage('El indicador debe ser numerico.')],
    validateRequest,
    (req, res) => {
      const indicadorId = Number(req.params.id);
      const indicador = store.indicadores.find((item) => item.id === indicadorId);

      if (!indicador) {
        return res.status(404).json({ error: 'Indicador no encontrado.' });
      }

      const acceso = canAccessIndicator(req.usuario, indicador);

      if (!acceso) {
        return res.status(403).json({
          acceso: false,
          indicador_id: indicadorId,
          motivo: 'El usuario no tiene alcance sobre este indicador.',
        });
      }

      return res.json({
        acceso: true,
        indicador_id: indicadorId,
        datos_permitidos: indicador,
      });
    }
  );

  app.put(
    '/api/usuarios/:id/permisos',
    verificarAutenticacion,
    requirePermission(PERMISSIONS.MANAGE_PERMISSIONS),
    [
      param('id').isInt({ min: 1 }).withMessage('El usuario debe ser numerico.'),
      body('rol').optional().isIn(Object.values(ROLES)).withMessage('Rol no permitido.'),
      body('plantel_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Plantel invalido.'),
      body('plantelId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Plantel invalido.'),
      body('asignaciones').optional().isObject().withMessage('Las asignaciones deben ser un objeto.'),
      body('asignaciones.*.*.id').optional().isInt({ min: 1 }).withMessage('ID de asignacion invalido.'),
      body('asignaciones.*.*.tipo_responsabilidad')
        .optional()
        .isIn(['Primario', 'Secundario'])
        .withMessage('Tipo de responsabilidad invalido.'),
      body('asignaciones.*.*.tipo')
        .optional()
        .isIn(['Primario', 'Secundario'])
        .withMessage('Tipo de responsabilidad invalido.'),
    ],
    validateRequest,
    (req, res) => {
      const usuarioId = Number(req.params.id);
      const usuario = store.usuarios.find((item) => item.id === usuarioId);

      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      const before = {
        rol: usuario.rol,
        plantel_id: usuario.plantel_id,
        asignaciones: buildAssignmentsForUser(usuario.id),
      };

      if (req.body.rol !== undefined) {
        usuario.rol = req.body.rol;
      }

      if (Object.prototype.hasOwnProperty.call(req.body, 'plantel_id')) {
        usuario.plantel_id = req.body.plantel_id ?? null;
      }

      if (Object.prototype.hasOwnProperty.call(req.body, 'plantelId')) {
        usuario.plantel_id = req.body.plantelId ?? null;
      }

      if (req.body.asignaciones) {
        replaceAssignments(usuario.id, req.body.asignaciones);
      }

      const after = {
        rol: usuario.rol,
        plantel_id: usuario.plantel_id,
        asignaciones: buildAssignmentsForUser(usuario.id),
      };

      registrarBitacora(
        req.usuario.id,
        'MODIFICACION_PERMISOS',
        `Usuario:${usuario.id}`,
        'Admin modifico rol, plantel o asignaciones del usuario.',
        { before, after }
      );

      return res.json({
        mensaje: 'Permisos actualizados correctamente.',
        usuario: {
          id: usuario.id,
          email: usuario.email,
          rol: usuario.rol,
          plantelId: usuario.plantel_id,
          plantel_id: usuario.plantel_id,
          asignaciones: after.asignaciones,
        },
        usuario_actualizado: {
          id: usuario.id,
          email: usuario.email,
          rol: usuario.rol,
          plantel_id: usuario.plantel_id,
          asignaciones: after.asignaciones,
        },
      });
    }
  );

  app.get(
    '/api/usuarios/:id/asignaciones',
    verificarAutenticacion,
    requirePermission(PERMISSIONS.MANAGE_PERMISSIONS),
    [param('id').isInt({ min: 1 }).withMessage('El usuario debe ser numerico.')],
    validateRequest,
    (req, res) => {
      return res.json({ usuario_id: Number(req.params.id), asignaciones: buildAssignmentsForUser(Number(req.params.id)) });
    }
  );

  app.get(
    '/api/indicadores/:id/responsables',
    verificarAutenticacion,
    [param('id').isInt({ min: 1 }).withMessage('El indicador debe ser numerico.')],
    validateRequest,
    (req, res) => res.json({ datos: getResponsables('Indicador', Number(req.params.id)) })
  );

  app.get(
    '/api/actividades/:id/responsables',
    verificarAutenticacion,
    [param('id').isInt({ min: 1 }).withMessage('La actividad debe ser numerica.')],
    validateRequest,
    (req, res) => res.json({ datos: getResponsables('Actividad', Number(req.params.id)) })
  );

  app.get(
    '/api/planteles/:id/responsables',
    verificarAutenticacion,
    [param('id').isInt({ min: 1 }).withMessage('El plantel debe ser numerico.')],
    validateRequest,
    (req, res) => res.json({ datos: getResponsables('Plantel', Number(req.params.id)) })
  );

  app.post(
    '/api/indicadores/:id/enviar-revision',
    verificarAutenticacion,
    requirePermission(PERMISSIONS.SUBMIT_REVIEW),
    [param('id').isInt({ min: 1 })],
    validateRequest,
    (req, res) => updateIndicatorStatus(req, res, 'ENVIADO_REVISION', 'en_revision')
  );

  app.post(
    '/api/indicadores/:id/aprobar',
    verificarAutenticacion,
    requirePermission(PERMISSIONS.APPROVE_REVIEW),
    [param('id').isInt({ min: 1 })],
    validateRequest,
    (req, res) => updateIndicatorStatus(req, res, 'APROBACION', 'aprobado')
  );

  app.post(
    '/api/indicadores/:id/corregir',
    verificarAutenticacion,
    requirePermission(PERMISSIONS.REQUEST_CORRECTION),
    [
      param('id').isInt({ min: 1 }),
      body().custom((value) => {
        const motivo = value?.motivo || value?.observaciones;
        if (typeof motivo !== 'string' || motivo.trim() === '') {
          throw new Error('El motivo u observaciones son requeridos.');
        }
        return true;
      }),
    ],
    validateRequest,
    (req, res) =>
      updateIndicatorStatus(req, res, 'CORRECCION', 'correccion', req.body.motivo || req.body.observaciones)
  );

  app.post(
    '/api/indicadores/:id/cerrar',
    verificarAutenticacion,
    requirePermission(PERMISSIONS.CLOSE_INDICATOR),
    [param('id').isInt({ min: 1 })],
    validateRequest,
    (req, res) => updateIndicatorStatus(req, res, 'CIERRE', 'cerrado')
  );

  app.post(
    '/api/indicadores/:id/evidencias',
    verificarAutenticacion,
    requirePermission(PERMISSIONS.UPLOAD_EVIDENCE),
    [
      param('id').isInt({ min: 1 }),
      body().custom((value) => {
        const nombreArchivo = value?.nombre_archivo || value?.nombreArchivo;
        if (typeof nombreArchivo !== 'string' || nombreArchivo.trim() === '') {
          throw new Error('El archivo es requerido.');
        }
        return true;
      }),
    ],
    validateRequest,
    (req, res) => {
      const indicador = store.indicadores.find((item) => item.id === Number(req.params.id));

      if (!indicador || !canAccessIndicator(req.usuario, indicador)) {
        return res.status(403).json({ error: 'No tienes alcance para cargar evidencia.' });
      }

      const evidencia = {
        id: store.evidencias.length + 1,
        indicador_id: indicador.id,
        nombre_archivo: req.body.nombre_archivo || req.body.nombreArchivo,
        ruta: req.body.ruta,
        usuario_id: req.usuario.id,
        fecha: new Date().toISOString(),
      };
      store.evidencias.push(evidencia);
      registrarBitacora(req.usuario.id, 'CARGA_EVIDENCIA', `Evidencia:${evidencia.id}`, 'Carga de evidencia.', evidencia);

      return res.status(201).json({ evidencia });
    }
  );

  app.get(
    '/api/evidencias/:id/descargar',
    verificarAutenticacion,
    requirePermission(PERMISSIONS.DOWNLOAD_EVIDENCE),
    [param('id').isInt({ min: 1 })],
    validateRequest,
    (req, res) => {
      const evidencia = store.evidencias.find((item) => item.id === Number(req.params.id));

      if (!evidencia || !canAccessEvidence(req.usuario, evidencia)) {
        return res.status(403).json({ error: 'No tienes alcance para descargar evidencia.' });
      }

      registrarBitacora(req.usuario.id, 'DESCARGA_EVIDENCIA', `Evidencia:${evidencia.id}`, 'Descarga de evidencia.');
      return res.json({ evidencia, contenido: 'archivo-simulado' });
    }
  );

  app.get('/api/poa/bitacora', verificarAutenticacion, requirePermission(PERMISSIONS.VIEW_AUDIT_LOG), (req, res) => {
    const bitacora = getAuditLog();

    return res.json({
      mensaje: 'Historial de auditoria.',
      total_eventos: bitacora.length,
      datos: bitacora,
      bitacora: bitacora.map((evento) => ({
        ...evento,
        tipoEvento: evento.tipo_evento,
        entidadAfectada: evento.entidad_afectada,
      })),
    });
  });

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.locals.store = store;
  app.locals.permissions = { ROLES, PERMISSIONS, ROLE_PERMISSIONS };
  app.locals.verificarAutenticacion = verificarAutenticacion;
  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createApp().listen(port, () => {
    console.log(`Servidor de autenticacion y permisos en puerto ${port}`);
  });
}

module.exports = {
  createApp,
  store,
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  canAccessIndicator,
  registrarBitacora,
};
