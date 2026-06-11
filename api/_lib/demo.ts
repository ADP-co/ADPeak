export type DemoRole = "admin_dgems" | "plantel" | "responsable_indicador";
export type DemoAction = "capture_submit" | "request_correction" | "approve";

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

export function demoReportCsv() {
  const headers = ["ciclo", "periodo", "plantel", "actividad", "indicador", "responsable", "estado", "meta", "avance"];
  const rows = demoProgress.map((item) => [
    item.cycle,
    item.periodo,
    item.plantel,
    item.activity,
    item.indicador,
    item.responsable,
    item.estado,
    String(item.meta),
    String(item.avance)
  ]);

  return [headers, ...rows].map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")).join("\n");
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
