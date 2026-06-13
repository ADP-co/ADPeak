export type DemoRole = "admin_dgems" | "plantel" | "responsable_indicador";

export type DemoUser = {
  id: string;
  displayName: string;
  email: string;
  role: DemoRole;
  accessCode: string;
  plantelId?: string;
  responsableId?: string;
  mainFlow: string[];
};

export type DemoIndicatorProgress = {
  id: string;
  cycle: string;
  activity: string;
  indicador: string;
  plantel: string;
  plantelId: string;
  responsable: string;
  responsableId: string;
  periodo: string;
  meta: number;
  avance: number;
  estado: "borrador" | "en_revision" | "observado" | "aprobado";
  vencimiento: "en_tiempo" | "atrasado";
  evidencias: number;
};

export type DemoAction = "capture_submit" | "request_correction" | "approve";

export type DemoReportRecord = {
  id: string;
  actividad: string;
  responsable: string;
  estado: "Borrador" | "Enviado" | "Observado" | "Aprobado";
  avance: string;
  plantel: string;
  plantelId: string;
  periodo: string;
  ciclo: string;
  meta: number;
  evidencias: number;
  vencimiento: "en_tiempo" | "atrasado";
};

export type DemoReportIndicator = {
  nombre: string;
  descripcion: string;
  datos: DemoReportRecord[];
};

export type DemoReportPayload = {
  tipoReporte: "plantel" | "institucional";
  periodo: string;
  cicloEscolar: string;
  fechaGeneracion: string;
  identidadReporte: {
    tipo: "Plantel" | "Institucional";
    nombre: string;
  };
  indicadores: DemoReportIndicator[];
};

export type DemoReportFilters = {
  plantel?: string;
  plantelId?: string;
  periodo?: string;
  cicloEscolar?: string;
  now?: Date;
};

export const demoUsers: DemoUser[] = [
  {
    id: "demo-admin",
    displayName: "Admin DGEMS Demo",
    email: "admin.demo@adpeak.local",
    role: "admin_dgems",
    accessCode: "demo-admin",
    mainFlow: [
      "Ver resumen global",
      "Filtrar avance por plantel",
      "Exportar reporte institucional"
    ]
  },
  {
    id: "demo-plantel",
    displayName: "Plantel Norte Demo",
    email: "plantel.demo@adpeak.local",
    role: "plantel",
    accessCode: "demo-plantel",
    plantelId: "plantel-norte",
    mainFlow: [
      "Capturar avance de indicador",
      "Adjuntar evidencia ficticia",
      "Enviar a revisión"
    ]
  },
  {
    id: "demo-responsable",
    displayName: "Responsable Indicador Demo",
    email: "responsable.demo@adpeak.local",
    role: "responsable_indicador",
    accessCode: "demo-responsable",
    responsableId: "resp-egreso",
    mainFlow: [
      "Revisar avances enviados",
      "Registrar observación",
      "Aprobar avance corregido"
    ]
  }
];

export const demoProgress: DemoIndicatorProgress[] = [
  {
    id: "avance-001",
    cycle: "POA 2026",
    activity: "Seguimiento académico",
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
    responsable: "Responsable Indicador Demo",
    plantelId: "plantel-norte",
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
    activity: "Gestión administrativa",
    indicador: "Actualización de expedientes",
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
    activity: "Vinculación",
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
  return demoUsers.map((user) => ({
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    role: user.role,
    accessCode: user.accessCode,
    mainFlow: user.mainFlow
  }));
}

export function demoStatusPayload(now = new Date()) {
  return {
    environment: "demo",
    status: "ready",
    generatedAt: now.toISOString(),
    publicUrl: "http://127.0.0.1:5173",
    apiUrl: "http://127.0.0.1:8000",
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
    summary: summarizeProgress(demoProgress)
  };
}

export function summarizeProgress(progress: DemoIndicatorProgress[]) {
  const totalMeta = progress.reduce((total, item) => total + item.meta, 0);
  const totalAvance = progress.reduce((total, item) => total + item.avance, 0);

  return {
    indicators: progress.length,
    evidenceFiles: progress.reduce((total, item) => total + item.evidencias, 0),
    completionPercent:
      totalMeta === 0 ? 0 : Number(((totalAvance / totalMeta) * 100).toFixed(2)),
    approved: progress.filter((item) => item.estado === "aprobado").length,
    pendingReview: progress.filter((item) => item.estado === "en_revision").length,
    observed: progress.filter((item) => item.estado === "observado").length,
    missing: progress.filter((item) => item.estado === "borrador").length,
    late: progress.filter((item) => item.vencimiento === "atrasado").length
  };
}

export function authenticateDemoUser(email: string, accessCode: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedAccessCode = accessCode.trim();

  const user = demoUsers.find(
    (candidate) =>
      candidate.email === normalizedEmail &&
      candidate.accessCode === normalizedAccessCode
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
    demoUsers.map((user) => [
      user.role,
      {
        displayName: user.displayName,
        mainFlow: user.mainFlow
      }
    ])
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

  const messages: Record<DemoAction, string> = {
    capture_submit:
      "Plantel capturó avance, adjuntó evidencia ficticia y envió a revisión.",
    request_correction:
      "Responsable registró observación y solicitó corrección al plantel.",
    approve:
      "Responsable/admin aprobó el avance dentro de su alcance demo."
  };

  return {
    action,
    role,
    recorded: true,
    auditId: `audit-demo-${role}-${action}`,
    message: messages[action]
  };
}

export function demoReportPayload(filters: DemoReportFilters = {}): DemoReportPayload {
  const normalizedPlantel = normalizeFilter(filters.plantel);
  const normalizedPlantelId = normalizeFilter(filters.plantelId);
  const normalizedPeriodo = normalizeFilter(filters.periodo);
  const scopedProgress = demoProgress.filter((item) => {
    const matchesPlantel =
      !normalizedPlantel ||
      normalizeFilter(item.plantel) === normalizedPlantel ||
      normalizeFilter(item.plantelId) === normalizedPlantel;
    const matchesPlantelId =
      !normalizedPlantelId || normalizeFilter(item.plantelId) === normalizedPlantelId;
    const matchesPeriodo =
      !normalizedPeriodo || normalizeFilter(item.periodo) === normalizedPeriodo;

    return matchesPlantel && matchesPlantelId && matchesPeriodo;
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
    fechaGeneracion: (filters.now ?? new Date()).toISOString().slice(0, 10),
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

  return [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function groupReportIndicators(
  progress: DemoIndicatorProgress[],
  cicloEscolar: string
): DemoReportIndicator[] {
  const indicators = new Map<string, DemoReportIndicator>();

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

function reportStatusLabel(status: DemoIndicatorProgress["estado"]): DemoReportRecord["estado"] {
  const labels: Record<DemoIndicatorProgress["estado"], DemoReportRecord["estado"]> = {
    aprobado: "Aprobado",
    borrador: "Borrador",
    en_revision: "Enviado",
    observado: "Observado"
  };

  return labels[status];
}

function normalizeFilter(value?: string) {
  return value?.trim().toLowerCase();
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "es"));
}
