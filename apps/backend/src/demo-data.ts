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
      "Enviar a revision"
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
      "Registrar observacion",
      "Aprobar avance corregido"
    ]
  }
];

export const demoProgress: DemoIndicatorProgress[] = [
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

  if (!allowedActions[role].includes(action)) {
    return undefined;
  }

  const messages: Record<DemoAction, string> = {
    capture_submit:
      "Plantel capturo avance, adjunto evidencia ficticia y envio a revision.",
    request_correction:
      "Responsable registro observacion y solicito correccion al plantel.",
    approve:
      "Responsable/admin aprobo el avance dentro de su alcance demo."
  };

  return {
    action,
    role,
    recorded: true,
    auditId: `audit-demo-${role}-${action}`,
    message: messages[action]
  };
}

export function demoReportCsv() {
  const headers = [
    "ciclo",
    "periodo",
    "plantel",
    "actividad",
    "indicador",
    "responsable",
    "estado",
    "vencimiento",
    "meta",
    "avance",
    "evidencias"
  ];
  const rows = demoProgress.map((item) => [
    item.cycle,
    item.periodo,
    item.plantel,
    item.activity,
    item.indicador,
    item.responsable,
    item.estado,
    item.vencimiento,
    String(item.meta),
    String(item.avance),
    String(item.evidencias)
  ]);

  return [headers, ...rows]
    .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "es"));
}
