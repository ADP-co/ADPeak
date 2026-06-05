const ESTADOS_REPORTE = Object.freeze({
  FALTANTES: 'faltantes',
  ENVIADOS: 'enviados',
  OBSERVADOS: 'observados',
  APROBADOS: 'aprobados',
  ATRASADOS: 'atrasados',
});

const AVANCES = [
  {
    id: 1,
    cicloId: 1,
    ciclo: '2026',
    periodoId: 1,
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
    meta: 100,
    estudiantesMujeres: 210,
    estudiantesHombres: 195,
    docentesMujeres: 18,
    docentesHombres: 15,
    fechaLimite: '2026-06-10',
  },
  {
    id: 2,
    cicloId: 1,
    ciclo: '2026',
    periodoId: 1,
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
    meta: 80,
    estudiantesMujeres: 0,
    estudiantesHombres: 0,
    docentesMujeres: 12,
    docentesHombres: 10,
    fechaLimite: '2026-06-08',
  },
  {
    id: 3,
    cicloId: 1,
    ciclo: '2026',
    periodoId: 1,
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
    meta: 100,
    estudiantesMujeres: 185,
    estudiantesHombres: 180,
    docentesMujeres: 14,
    docentesHombres: 11,
    fechaLimite: '2026-05-25',
  },
  {
    id: 4,
    cicloId: 2,
    ciclo: '2025',
    periodoId: 4,
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
    meta: 90,
    estudiantesMujeres: 92,
    estudiantesHombres: 88,
    docentesMujeres: 9,
    docentesHombres: 7,
    fechaLimite: '2025-11-15',
  },
  {
    id: 5,
    cicloId: 1,
    ciclo: '2026',
    periodoId: 2,
    periodo: '2026-P2',
    plantelId: 30,
    plantel: 'Bachillerato No. 30',
    actividadId: 505,
    actividad: 'Captura de indicadores institucionales',
    indicadorId: 105,
    indicador: 'Capturas POA completas',
    responsableId: 2,
    responsable: 'Responsable DGEMS',
    estado: 'atrasado',
    avance: 20,
    meta: 100,
    estudiantesMujeres: 130,
    estudiantesHombres: 125,
    docentesMujeres: 8,
    docentesHombres: 9,
    fechaLimite: '2026-05-24',
  },
  {
    id: 6,
    cicloId: 1,
    ciclo: '2026',
    periodoId: 1,
    periodo: '2026-P1',
    plantelId: 30,
    plantel: 'Bachillerato No. 30',
    actividadId: 506,
    actividad: 'Seguimiento de abandono',
    indicadorId: 106,
    indicador: 'Tasa de abandono escolar',
    responsableId: 2,
    responsable: 'Responsable DGEMS',
    estado: 'correccion_solicitada',
    avance: 58,
    meta: 100,
    estudiantesMujeres: 128,
    estudiantesHombres: 122,
    docentesMujeres: 8,
    docentesHombres: 9,
    fechaLimite: '2026-06-03',
  },
];

const FILTROS_VALIDOS = new Set([
  'ciclo',
  'cicloId',
  'periodo',
  'periodoId',
  'plantelId',
  'actividadId',
  'indicadorId',
  'responsableId',
  'estado',
]);

const FILTROS_NUMERICOS = new Set([
  'cicloId',
  'periodoId',
  'plantelId',
  'actividadId',
  'indicadorId',
  'responsableId',
]);

function normalizarNumero(valor) {
  if (valor === undefined || valor === null || valor === '') {
    return undefined;
  }

  const numero = Number(valor);
  return Number.isInteger(numero) ? numero : Number.NaN;
}

function headerValue(headers = {}, ...names) {
  for (const name of names) {
    const value = headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
    if (Array.isArray(value)) {
      return value[0];
    }
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function normalizarRol(valor) {
  const rol = String(valor ?? '').trim().toLowerCase();
  if (rol === 'admin' || rol === 'administrador') {
    return 'Admin';
  }
  if (rol === 'responsable') {
    return 'Responsable';
  }
  if (rol === 'plantel') {
    return 'Plantel';
  }
  return undefined;
}

function normalizarUsuario(headers = {}) {
  const rol = normalizarRol(headerValue(headers, 'x-user-role', 'x-role'));
  const plantelId = normalizarNumero(headerValue(headers, 'x-user-plantel-id', 'x-plantel-id'));
  const responsableId = normalizarNumero(
    headerValue(headers, 'x-user-responsable-id', 'x-responsable-id'),
  );

  if (!rol) {
    return { error: 'No se recibio un rol de usuario valido.' };
  }

  if (rol === 'Plantel' && !Number.isInteger(plantelId)) {
    return { error: 'El rol Plantel requiere x-user-plantel-id o x-plantel-id valido.' };
  }

  if (rol === 'Responsable' && !Number.isInteger(responsableId)) {
    return { error: 'El rol Responsable requiere x-user-responsable-id o x-responsable-id valido.' };
  }

  return { rol, plantelId, responsableId };
}

function normalizarFiltros(query) {
  const filtros = {};

  for (const [clave, valor] of Object.entries(query)) {
    if (!FILTROS_VALIDOS.has(clave) || valor === '') {
      continue;
    }

    if (FILTROS_NUMERICOS.has(clave)) {
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

function redondear(numero, decimales = 2) {
  const factor = 10 ** decimales;
  return Math.round((numero + Number.EPSILON) * factor) / factor;
}

function calcularPorcentaje(numerador, denominador, decimales = 2) {
  if (!denominador) {
    return 0;
  }

  return redondear((numerador / denominador) * 100, decimales);
}

function calcularTotalesIndicador(avance) {
  const estudiantesTotal = Number(avance.estudiantesMujeres || 0) + Number(avance.estudiantesHombres || 0);
  const docentesTotal = Number(avance.docentesMujeres || 0) + Number(avance.docentesHombres || 0);
  const porcentajeMeta = calcularPorcentaje(Number(avance.avance || 0), Number(avance.meta || 0));

  return {
    estudiantesTotal,
    docentesTotal,
    porcentajeMeta,
  };
}

function estaVencido(avance, fechaReferencia = new Date()) {
  if (!avance.fechaLimite || ['aprobado', 'cerrado'].includes(avance.estado)) {
    return false;
  }

  const limite = new Date(`${avance.fechaLimite}T23:59:59.999Z`);
  return limite.getTime() < fechaReferencia.getTime();
}

function clasificarEstado(avance, fechaReferencia = new Date()) {
  if (avance.estado === 'atrasado' || estaVencido(avance, fechaReferencia)) {
    return ESTADOS_REPORTE.ATRASADOS;
  }

  if (['borrador', 'faltante', 'pendiente'].includes(avance.estado)) {
    return ESTADOS_REPORTE.FALTANTES;
  }

  if (['enviado', 'en_revision', 'enviada'].includes(avance.estado)) {
    return ESTADOS_REPORTE.ENVIADOS;
  }

  if (['correccion', 'correccion_solicitada', 'observado'].includes(avance.estado)) {
    return ESTADOS_REPORTE.OBSERVADOS;
  }

  if (['aprobado', 'cerrado'].includes(avance.estado)) {
    return ESTADOS_REPORTE.APROBADOS;
  }

  return ESTADOS_REPORTE.FALTANTES;
}

function prepararDatoReporte(avance) {
  const calculos = calcularTotalesIndicador(avance);
  return {
    ...avance,
    ...calculos,
  };
}

function crearResumenGlobal(datos, fechaReferencia = new Date()) {
  const resumen = {
    totalRegistros: datos.length,
    totalPlanteles: new Set(datos.map((avance) => avance.plantelId)).size,
    totalResponsables: new Set(datos.map((avance) => avance.responsableId)).size,
    totalIndicadores: new Set(datos.map((avance) => avance.indicadorId)).size,
    totalEstudiantes: datos.reduce(
      (total, avance) => total + calcularTotalesIndicador(avance).estudiantesTotal,
      0,
    ),
    totalDocentes: datos.reduce((total, avance) => total + calcularTotalesIndicador(avance).docentesTotal, 0),
    avancePromedio: datos.length
      ? redondear(datos.reduce((total, avance) => total + Number(avance.avance || 0), 0) / datos.length)
      : 0,
    porcentajeCumplimiento: 0,
    faltantes: 0,
    enviados: 0,
    observados: 0,
    aprobados: 0,
    atrasados: 0,
  };

  for (const avance of datos) {
    resumen[clasificarEstado(avance, fechaReferencia)] += 1;
  }

  resumen.porcentajeCumplimiento = calcularPorcentaje(resumen.aprobados, datos.length);
  return resumen;
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
    datos: datosFiltrados.map(prepararDatoReporte),
  };
}

function crearReporteGeneral(resultado, opciones = {}) {
  const fechaGeneracion = opciones.fechaGeneracion ?? new Date();
  const fechaReferencia = opciones.fechaReferencia ?? fechaGeneracion;

  return {
    tipoReporte: 'general-dgems',
    titulo: 'Reporte general DGEMS',
    fechaGeneracion: fechaGeneracion.toISOString(),
    filtros: resultado.filtros,
    alcance: resultado.alcance,
    resumenGlobal: crearResumenGlobal(resultado.datos, fechaReferencia),
    columnas: [
      'ciclo',
      'periodo',
      'plantel',
      'actividad',
      'indicador',
      'responsable',
      'estado',
      'avance',
      'meta',
      'porcentajeMeta',
      'estudiantesTotal',
      'docentesTotal',
      'fechaLimite',
    ],
    datos: resultado.datos.map(prepararDatoReporte),
  };
}

function consultarReporteGeneral(filtros, usuario, datos = AVANCES, opciones = {}) {
  return crearReporteGeneral(consultarReportes(filtros, usuario, datos), opciones);
}

module.exports = {
  AVANCES,
  ESTADOS_REPORTE,
  aplicarAlcance,
  aplicarFiltros,
  calcularPorcentaje,
  calcularTotalesIndicador,
  clasificarEstado,
  consultarReporteGeneral,
  consultarReportes,
  crearReporteGeneral,
  crearResumenGlobal,
  estaVencido,
  normalizarFiltros,
  normalizarUsuario,
  prepararDatoReporte,
  redondear,
};
