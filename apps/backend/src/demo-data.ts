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
  indicador: string;
  plantel: string;
  responsable: string;
  periodo: string;
  meta: number;
  avance: number;
  estado: "borrador" | "en_revision" | "observado" | "aprobado";
  evidencias: number;
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
    indicador: "Eficiencia terminal",
    plantel: "Plantel Norte",
    responsable: "Responsable Indicador Demo",
    periodo: "2026-1",
    meta: 100,
    avance: 84,
    estado: "en_revision",
    evidencias: 2
  },
  {
    id: "avance-002",
    indicador: "Atencion a tutorias",
    plantel: "Plantel Centro",
    responsable: "Responsable Indicador Demo",
    periodo: "2026-1",
    meta: 80,
    avance: 80,
    estado: "aprobado",
    evidencias: 1
  },
  {
    id: "avance-003",
    indicador: "Participacion academica",
    plantel: "Plantel Norte",
    responsable: "Responsable Indicador Demo",
    periodo: "2026-2",
    meta: 60,
    avance: 42,
    estado: "observado",
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
  const totalMeta = demoProgress.reduce((total, item) => total + item.meta, 0);
  const totalAvance = demoProgress.reduce((total, item) => total + item.avance, 0);

  return {
    cycle: "POA 2026",
    users: publicDemoUsers(),
    progress: demoProgress,
    summary: {
      indicators: demoProgress.length,
      evidenceFiles: demoProgress.reduce((total, item) => total + item.evidencias, 0),
      completionPercent:
        totalMeta === 0 ? 0 : Number(((totalAvance / totalMeta) * 100).toFixed(2)),
      approved: demoProgress.filter((item) => item.estado === "aprobado").length,
      pendingReview: demoProgress.filter((item) => item.estado === "en_revision").length,
      observed: demoProgress.filter((item) => item.estado === "observado").length
    }
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
