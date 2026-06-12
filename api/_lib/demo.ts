export type DemoRole = "admin_dgems" | "plantel" | "responsable_indicador";
export type DemoAction = "capture_submit" | "request_correction" | "approve";
type DemoIndicatorProgress = (typeof demoProgress)[number];
type DemoReportFilters = {
  plantel?: string;
  plantelId?: string;
  periodo?: string;
  cicloEscolar?: string;
};

const demoUsers = [
  {
    id: "demo-admin",
    displayName: "Admin DGEMS Demo",
    email: "admin.demo@adpeak.local",
    role: "admin_dgems" as DemoRole,
    accessCode: "demo-admin",
    mainFlow: ["Ver resumen global", "Filtrar avance por plantel", "Exportar reporte institucional"]
  },
  {
    id: "demo-plantel",
    displayName: "Plantel Norte Demo",
    email: "plantel.demo@adpeak.local",
    role: "plantel" as DemoRole,
    accessCode: "demo-plantel",
    plantelId: "plantel-norte",
    mainFlow: ["Capturar avance de indicador", "Adjuntar evidencia ficticia", "Enviar a revision"]
  },
  {
    id: "demo-responsable",
    displayName: "Responsable Indicador Demo",
    email: "responsable.demo@adpeak.local",
    role: "responsable_indicador" as DemoRole,
    accessCode: "demo-responsable",
    responsableId: "resp-egreso",
    mainFlow: ["Revisar avances enviados", "Registrar observacion", "Aprobar avance corregido"]
  }
];

const demoProgress = [
  {
    id: "avance-001",
    cycle: "POA 2026",
    activity: "Seguimiento academico",
    indicador: "Eficiencia terminal",
    plantel: "Plantel Norte",
    plantelId: "plantel-norte",
    responsable: "Responsable Indicador Demo",
    responsableId: "resp-egreso",
    periodo: "2026-1",
    meta: 100,
    avance: 84,
    estado: "en_revision",
    vencimiento: "en_tiempo",
    evidencias: 2
  },
  {
    id: "avance-002",
    cycle: "POA 2026",
    activity: "Acompanamiento estudiantil",
    indicador: "Atencion a tutorias",
    plantel: "Plantel Centro",
    plantelId: "plantel-centro",
    responsable: "Responsable Indicador Demo",
    responsableId: "resp-egreso",
    periodo: "2026-1",
    meta: 80,
    avance: 80,
    estado: "aprobado",
    vencimiento: "en_tiempo",
    evidencias: 1
  },
  {
    id: "avance-003",
    cycle: "POA 2026",
    activity: "Participacion academica",
    indicador: "Participacion academica",
    plantel: "Plantel Norte",
    plantelId: "plantel-norte",
    responsable: "Responsable Indicador Demo",
    responsableId: "resp-egreso",
    periodo: "2026-2",
    meta: 60,
    avance: 42,
    estado: "observado",
    vencimiento: "atrasado",
    evidencias: 1
  },
  {
    id: "avance-004",
    cycle: "POA 2026",
    activity: "Gestion administrativa",
    indicador: "Actualizacion de expedientes",
    plantel: "Plantel Sur",
    plantelId: "plantel-sur",
    responsable: "Responsable Planeacion Demo",
    responsableId: "resp-planeacion",
    periodo: "2026-2",
    meta: 50,
    avance: 20,
    estado: "borrador",
    vencimiento: "atrasado",
    evidencias: 0
  },
  {
    id: "avance-005",
    cycle: "POA 2026",
    activity: "Vinculacion",
    indicador: "Convenios activos",
    plantel: "Plantel Norte",
    plantelId: "plantel-norte",
    responsable: "Responsable Planeacion Demo",
    responsableId: "resp-planeacion",
    periodo: "2026-1",
    meta: 30,
    avance: 18,
    estado: "en_revision",
    vencimiento: "en_tiempo",
    evidencias: 1
  }
];

export function publicDemoUsers() {
  return demoUsers.map(({ accessCode, ...user }) => ({ ...user, accessCode }));
}

export function demoStatusPayload() {
  return {
    environment: "demo",
    status: "ready",
    runtime: "vercel",
    generatedAt: new Date().toISOString(),
    users: publicDemoUsers(),
    dataPolicy: "Datos ficticios y controlados. No contiene informacion confidencial."
  };
}

export function demoDatasetPayload() {
  return {
    cycle: "POA 2026",
    filters: {
      cycles: uniqueSorted(demoProgress.map((item) => item.cycle)),
      periods: uniqueSorted(demoProgress.map((item) => item.periodo)),
      campuses: uniqueSorted(demoProgress.map((item) => item.plantel)),
      indicators: uniqueSorted(demoProgress.map((item) => item.indicador)),
      activities: uniqueSorted(demoProgress.map((item) => item.activity)),
      responsibles: uniqueSorted(demoProgress.map((item) => item.responsable)),
      statuses: uniqueSorted(demoProgress.map((item) => item.estado))
    },
    users: publicDemoUsers(),
    progress: demoProgress,
    summary: summarizeProgress()
  };
}

export function authenticateDemoUser(email: string, accessCode: string) {
  const user = demoUsers.find(
    (candidate) =>
      candidate.email === email.trim().toLowerCase() &&
      candidate.accessCode === accessCode.trim()
  );

  if (!user) {
    return undefined;
  }

  return {
    token: `demo-token-${user.id}`,
    user: {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      plantelId: user.plantelId,
      responsableId: user.responsableId,
      mainFlow: user.mainFlow
    }
  };
}

export function demoRoleFlows() {
  return Object.fromEntries(
    demoUsers.map((user) => [user.role, { displayName: user.displayName, mainFlow: user.mainFlow }])
  );
}

export function runDemoAction(role: DemoRole, action: DemoAction) {
  const allowedActions: Record<DemoRole, DemoAction[]> = {
    admin_dgems: ["approve"],
    plantel: ["capture_submit"],
    responsable_indicador: ["request_correction", "approve"]
  };

  if (!allowedActions[role]?.includes(action)) {
    return undefined;
  }

  return {
    action,
    role,
    recorded: true,
    auditId: `audit-demo-${role}-${action}`,
    message: "Accion demo registrada correctamente."
  };
}

export function demoReportPayload(filters: DemoReportFilters = {}) {
  const normalizedPlantel = normalizeFilter(filters.plantel);
  const normalizedPlantelId = normalizeFilter(filters.plantelId);
  const scopedProgress = demoProgress.filter((item) => {
    const matchesPlantel =
      !normalizedPlantel ||
      normalizeFilter(item.plantel) === normalizedPlantel ||
      normalizeFilter(item.plantelId) === normalizedPlantel;
    const matchesPlantelId =
      !normalizedPlantelId || normalizeFilter(item.plantelId) === normalizedPlantelId;

    return matchesPlantel && matchesPlantelId;
  });
  const isPlantelReport = Boolean(normalizedPlantel || normalizedPlantelId);
  const identityName =
    scopedProgress[0]?.plantel ??
    filters.plantel ??
    filters.plantelId ??
    "DGEMS";
  const cicloEscolar = filters.cicloEscolar ?? "2025-2026";

  return {
    tipoReporte: isPlantelReport ? "plantel" : "institucional",
    periodo: filters.periodo ?? "2026-A",
    cicloEscolar,
    fechaGeneracion: new Date().toISOString().slice(0, 10),
    identidadReporte: {
      tipo: isPlantelReport ? "Plantel" : "Institucional",
      nombre: isPlantelReport ? identityName : "DGEMS"
    },
    indicadores: groupReportIndicators(scopedProgress, cicloEscolar)
  };
}

export function demoReportCsv(filters: DemoReportFilters = {}) {
  const report = demoReportPayload(filters);
  const headers = [
    "tipo_reporte",
    "periodo_reporte",
    "ciclo_escolar",
    "fecha_generacion",
    "identidad_tipo",
    "identidad_nombre",
    "indicador",
    "descripcion_indicador",
    "registro_id",
    "ciclo",
    "periodo",
    "plantel",
    "actividad",
    "responsable",
    "estado",
    "vencimiento",
    "meta",
    "avance",
    "evidencias"
  ];
  const rows = report.indicadores.flatMap((indicador) =>
    indicador.datos.map((dato) => [
      report.tipoReporte,
      report.periodo,
      report.cicloEscolar,
      report.fechaGeneracion,
      report.identidadReporte.tipo,
      report.identidadReporte.nombre,
      indicador.nombre,
      indicador.descripcion,
      dato.id,
      dato.ciclo,
      dato.periodo,
      dato.plantel,
      dato.actividad,
      dato.responsable,
      dato.estado,
      dato.vencimiento,
      String(dato.meta),
      dato.avance,
      String(dato.evidencias)
    ])
  );

  return [headers, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
}

function groupReportIndicators(progress: DemoIndicatorProgress[], cicloEscolar: string) {
  const indicators = new Map<string, { nombre: string; descripcion: string; datos: Array<Record<string, unknown>> }>();

  for (const item of progress) {
    const current = indicators.get(item.indicador) ?? {
      nombre: item.indicador,
      descripcion: `Registros capturados para ${item.indicador} en el ciclo escolar ${cicloEscolar}.`,
      datos: []
    };

    current.datos.push({
      id: item.id,
      actividad: item.activity,
      responsable: item.responsable,
      estado: reportStatusLabel(item.estado),
      avance: `${item.avance}%`,
      plantel: item.plantel,
      plantelId: item.plantelId,
      periodo: item.periodo,
      ciclo: item.cycle,
      meta: item.meta,
      evidencias: item.evidencias,
      vencimiento: item.vencimiento
    });
    indicators.set(item.indicador, current);
  }

  return Array.from(indicators.values()).sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es")
  );
}

function reportStatusLabel(status: DemoIndicatorProgress["estado"]) {
  const labels: Record<DemoIndicatorProgress["estado"], string> = {
    aprobado: "Aprobado",
    borrador: "Borrador",
    en_revision: "Enviado",
    observado: "Observado"
  };

  return labels[status];
}

function summarizeProgress() {
  const totalMeta = demoProgress.reduce((total, item) => total + item.meta, 0);
  const totalAvance = demoProgress.reduce((total, item) => total + item.avance, 0);

  return {
    indicators: demoProgress.length,
    evidenceFiles: demoProgress.reduce((total, item) => total + item.evidencias, 0),
    completionPercent: Number(((totalAvance / totalMeta) * 100).toFixed(2)),
    approved: demoProgress.filter((item) => item.estado === "aprobado").length,
    pendingReview: demoProgress.filter((item) => item.estado === "en_revision").length,
    observed: demoProgress.filter((item) => item.estado === "observado").length,
    missing: demoProgress.filter((item) => item.estado === "borrador").length,
    late: demoProgress.filter((item) => item.vencimiento === "atrasado").length
  };
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "es"));
}

function normalizeFilter(value?: string) {
  return value?.trim().toLowerCase();
}
