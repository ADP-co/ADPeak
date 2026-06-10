export type ClientConfig = {
  apiUrl: string;
};

export type ClientEnv = {
  VITE_API_URL?: string;
};

export class ClientConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClientConfigurationError";
  }
}

export function loadClientConfig(env: ClientEnv): ClientConfig {
  const apiUrl = env.VITE_API_URL?.trim();

  if (!apiUrl) {
    throw new ClientConfigurationError(
      "Falta VITE_API_URL. Copia .env.example a .env y define la URL publica del backend."
    );
  }

  try {
    return {
      apiUrl: new URL(apiUrl).toString().replace(/\/$/, "")
    };
  } catch {
    throw new ClientConfigurationError("VITE_API_URL debe ser una URL valida.");
  }
}

export type ApiDemoRole =
  | "admin_dgems"
  | "plantel"
  | "responsable_indicador";

export type DemoProgressStatus =
  | "borrador"
  | "en_revision"
  | "observado"
  | "aprobado";

export type DemoAction = "capture_submit" | "request_correction" | "approve";

export type DemoRoleCard = {
  role: "Administrador DGEMS" | "Plantel" | "Responsable de indicador";
  email: string;
  accessCode: string;
  flow: string[];
};

export type ApiDemoUser = {
  id: string;
  displayName: string;
  email: string;
  role: ApiDemoRole;
  accessCode: string;
  mainFlow: string[];
};

export type DemoStatus = {
  environment: "demo";
  status: "ready";
  generatedAt: string;
  dataPolicy: string;
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
  estado: DemoProgressStatus;
  vencimiento: "en_tiempo" | "atrasado";
  evidencias: number;
};

export type DemoSummary = {
  indicators: number;
  evidenceFiles: number;
  completionPercent: number;
  approved: number;
  pendingReview: number;
  observed: number;
  missing: number;
  late: number;
};

export type DemoDataset = {
  cycle: string;
  filters: {
    cycles: string[];
    periods: string[];
    campuses: string[];
    indicators: string[];
    activities: string[];
    responsibles: string[];
    statuses: string[];
  };
  progress: DemoIndicatorProgress[];
  summary: DemoSummary;
};

export type DemoApiState = {
  status: DemoStatus;
  users: DemoRoleCard[];
  dataset: DemoDataset;
};

export type DemoSession = {
  token: string;
  user: {
    id: string;
    displayName: string;
    email: string;
    role: ApiDemoRole;
    plantelId?: string;
    responsableId?: string;
    mainFlow: string[];
  };
};

export type DemoDashboardFilters = {
  cycle: string;
  period: string;
  campus: string;
  indicator: string;
  activity: string;
  responsible: string;
  status: string;
};

export function buildDemoLinks(apiUrl: string) {
  return {
    health: `${apiUrl}/health`,
    status: `${apiUrl}/demo/status`,
    data: `${apiUrl}/demo/data`,
    users: `${apiUrl}/demo/users`,
    report: `${apiUrl}/demo/report.csv`
  };
}

export function labelDemoRole(role: ApiDemoRole): DemoRoleCard["role"] {
  const labels: Record<ApiDemoRole, DemoRoleCard["role"]> = {
    admin_dgems: "Administrador DGEMS",
    plantel: "Plantel",
    responsable_indicador: "Responsable de indicador"
  };

  return labels[role];
}

export function toDemoRoleCard(user: ApiDemoUser): DemoRoleCard {
  return {
    role: labelDemoRole(user.role),
    email: user.email,
    accessCode: user.accessCode,
    flow: user.mainFlow
  };
}

export async function loadDemoApiState(apiUrl: string): Promise<DemoApiState> {
  const [status, usersPayload, dataset] = await Promise.all([
    fetchJson<DemoStatus>(`${apiUrl}/demo/status`),
    fetchJson<{ users: ApiDemoUser[] }>(`${apiUrl}/demo/users`),
    fetchJson<DemoDataset>(`${apiUrl}/demo/data`)
  ]);

  return {
    status,
    users: usersPayload.users.map(toDemoRoleCard),
    dataset
  };
}

export async function loginDemoUser(
  apiUrl: string,
  user: DemoRoleCard
): Promise<DemoSession> {
  return fetchJson<DemoSession>(`${apiUrl}/demo/login`, {
    body: JSON.stringify({
      email: user.email,
      accessCode: user.accessCode
    }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });
}

export async function runDemoAction(
  apiUrl: string,
  role: ApiDemoRole,
  action: DemoAction
): Promise<{ auditId: string; message: string; recorded: boolean }> {
  return fetchJson(`${apiUrl}/demo/action`, {
    body: JSON.stringify({ action, role }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });
}

export function defaultDashboardFilters(): DemoDashboardFilters {
  return {
    activity: "",
    campus: "",
    cycle: "",
    indicator: "",
    period: "",
    responsible: "",
    status: ""
  };
}

export function scopeProgressForSession(
  progress: DemoIndicatorProgress[],
  session?: DemoSession
) {
  if (!session) {
    return progress;
  }

  if (session.user.role === "plantel") {
    return progress.filter((item) => item.plantelId === session.user.plantelId);
  }

  if (session.user.role === "responsable_indicador") {
    return progress.filter(
      (item) => item.responsableId === session.user.responsableId
    );
  }

  return progress;
}

export function filterDashboardProgress(
  progress: DemoIndicatorProgress[],
  filters: DemoDashboardFilters
) {
  return progress.filter(
    (item) =>
      matchesFilter(item.cycle, filters.cycle) &&
      matchesFilter(item.periodo, filters.period) &&
      matchesFilter(item.plantel, filters.campus) &&
      matchesFilter(item.indicador, filters.indicator) &&
      matchesFilter(item.activity, filters.activity) &&
      matchesFilter(item.responsable, filters.responsible) &&
      matchesFilter(item.estado, filters.status)
  );
}

export function summarizeDashboardProgress(
  progress: DemoIndicatorProgress[]
): DemoSummary {
  const totalMeta = progress.reduce((total, item) => total + item.meta, 0);
  const totalAvance = progress.reduce((total, item) => total + item.avance, 0);

  return {
    approved: progress.filter((item) => item.estado === "aprobado").length,
    completionPercent:
      totalMeta === 0 ? 0 : Number(((totalAvance / totalMeta) * 100).toFixed(2)),
    evidenceFiles: progress.reduce((total, item) => total + item.evidencias, 0),
    indicators: progress.length,
    late: progress.filter((item) => item.vencimiento === "atrasado").length,
    missing: progress.filter((item) => item.estado === "borrador").length,
    observed: progress.filter((item) => item.estado === "observado").length,
    pendingReview: progress.filter((item) => item.estado === "en_revision").length
  };
}

export function labelStatus(status: string) {
  const labels: Record<string, string> = {
    aprobado: "Aprobado",
    atrasado: "Atrasado",
    borrador: "Faltante",
    en_revision: "En revision",
    en_tiempo: "En tiempo",
    observado: "Observado"
  };

  return labels[status] ?? status;
}

export function actionsForRole(role?: ApiDemoRole): DemoAction[] {
  if (role === "plantel") {
    return ["capture_submit"];
  }

  if (role === "responsable_indicador") {
    return ["request_correction", "approve"];
  }

  if (role === "admin_dgems") {
    return ["approve"];
  }

  return [];
}

export function labelDemoAction(action: DemoAction) {
  const labels: Record<DemoAction, string> = {
    approve: "Aprobar avance",
    capture_submit: "Capturar y enviar",
    request_correction: "Solicitar correccion"
  };

  return labels[action];
}

function matchesFilter(value: string, filterValue: string) {
  return !filterValue || value === filterValue;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`La API respondio ${response.status} para ${url}.`);
  }

  return (await response.json()) as T;
}
