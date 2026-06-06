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

export type DemoRoleCard = {
  role: "Administrador DGEMS" | "Plantel" | "Responsable de indicador";
  email: string;
  accessCode: string;
  flow: string[];
};

export type ApiDemoRole =
  | "admin_dgems"
  | "plantel"
  | "responsable_indicador";

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

export type DemoDataset = {
  cycle: string;
  summary: {
    indicators: number;
    evidenceFiles: number;
    completionPercent: number;
    approved: number;
    pendingReview: number;
    observed: number;
  };
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
    mainFlow: string[];
  };
};

export function buildDemoLinks(apiUrl: string) {
  return {
    health: `${apiUrl}/health`,
    status: `${apiUrl}/demo/status`,
    data: `${apiUrl}/demo/data`,
    users: `${apiUrl}/demo/users`
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

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`La API respondio ${response.status} para ${url}.`);
  }

  return (await response.json()) as T;
}
