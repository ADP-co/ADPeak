const AVANCES = [
  {
    id: 1,
    ciclo: '2026',
    periodo: '2026-P1',
    plantelId: 10,
    plantel: 'Bachillerato No. 10',
    actividadId: 501,
    actividad: 'Seguimiento academico',
    indicadorId: 101,
    indicador: 'Tasa de aprobacion',
    responsableId: 2,
    responsable: 'Responsable DGEMS',
    estado: 'en_revision',
    avance: 85,
  },
  {
    id: 2,
    ciclo: '2026',
    periodo: '2026-P1',
    plantelId: 10,
    plantel: 'Bachillerato No. 10',
    actividadId: 502,
    actividad: 'Capacitacion docente',
    indicadorId: 102,
    indicador: 'Docentes capacitados',
    responsableId: 2,
    responsable: 'Responsable DGEMS',
    estado: 'borrador',
    avance: 45,
  },
  {
    id: 3,
    ciclo: '2026',
    periodo: '2026-P1',
    plantelId: 20,
    plantel: 'Bachillerato No. 20',
    actividadId: 503,
    actividad: 'Vinculacion comunitaria',
    indicadorId: 103,
    indicador: 'Actividades comunitarias',
    responsableId: 5,
    responsable: 'Responsable Plantel 20',
    estado: 'aprobado',
    avance: 100,
  },
  {
    id: 4,
    ciclo: '2025',
    periodo: '2025-P2',
    plantelId: 20,
    plantel: 'Bachillerato No. 20',
    actividadId: 504,
    actividad: 'Seguimiento de tutorias',
    indicadorId: 104,
    indicador: 'Tutorias concluidas',
    responsableId: 5,
    responsable: 'Responsable Plantel 20',
    estado: 'correccion',
    avance: 62,
  },
];

const FILTROS_VALIDOS = new Set([
  'ciclo',
  'periodo',
  'plantelId',
  'actividadId',
  'indicadorId',
  'responsableId',
  'estado',
]);

function normalizarNumero(valor) {
  if (valor === undefined || valor === null || valor === '') {
    return undefined;
  }

  const numero = Number(valor);
  return Number.isInteger(numero) ? numero : Number.NaN;
}

function normalizarUsuario(headers = {}) {
  const rol = headers['x-user-role'];
  const plantelId = normalizarNumero(headers['x-user-plantel-id']);
  const responsableId = normalizarNumero(headers['x-user-responsable-id']);

  if (!rol) {
    return { error: 'No se recibio el rol del usuario.' };
  }

  if (!['Admin', 'Responsable', 'Plantel'].includes(rol)) {
    return { error: 'Rol de usuario invalido.' };
  }

  if (rol === 'Plantel' && !Number.isInteger(plantelId)) {
    return { error: 'El rol Plantel requiere x-user-plantel-id valido.' };
  }

  if (rol === 'Responsable' && !Number.isInteger(responsableId)) {
    return { error: 'El rol Responsable requiere x-user-responsable-id valido.' };
  }

  return { rol, plantelId, responsableId };
}

function normalizarFiltros(query) {
  const filtros = {};

  for (const [clave, valor] of Object.entries(query)) {
    if (!FILTROS_VALIDOS.has(clave) || valor === '') {
      continue;
    }

    if (['plantelId', 'actividadId', 'indicadorId', 'responsableId'].includes(clave)) {
      const numero = normalizarNumero(valor);
      if (!Number.isInteger(numero)) {
        return { error: `El filtro ${clave} debe ser numerico.` };
      }
      filtros[clave] = numero;
      continue;
    }

    filtros[clave] = String(valor);
  }

  return { filtros };
}

function aplicarAlcance(datos, usuario) {
  if (usuario.rol === 'Admin') {
    return datos;
  }

  if (usuario.rol === 'Plantel') {
    return datos.filter((avance) => avance.plantelId === usuario.plantelId);
  }

  return datos.filter((avance) => avance.responsableId === usuario.responsableId);
}

function aplicarFiltros(datos, filtros) {
  return datos.filter((avance) => {
    return Object.entries(filtros).every(([clave, valor]) => avance[clave] === valor);
  });
}

function consultarReportes(filtros, usuario, datos = AVANCES) {
  const datosPermitidos = aplicarAlcance(datos, usuario);
  const datosFiltrados = aplicarFiltros(datosPermitidos, filtros);

  return {
    filtros,
    alcance: {
      rol: usuario.rol,
      plantelId: usuario.plantelId,
      responsableId: usuario.responsableId,
    },
    total: datosFiltrados.length,
    datos: datosFiltrados,
  };
}

module.exports = {
  AVANCES,
  aplicarAlcance,
  aplicarFiltros,
  consultarReportes,
  normalizarFiltros,
  normalizarUsuario,
};
