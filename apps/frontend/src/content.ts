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

export const demoRoleCards: DemoRoleCard[] = [
  {
    role: "Administrador DGEMS",
    email: "admin.demo@adpeak.local",
    accessCode: "demo-admin",
    flow: ["Resumen global", "Filtros por plantel", "Reporte institucional"]
  },
  {
    role: "Plantel",
    email: "plantel.demo@adpeak.local",
    accessCode: "demo-plantel",
    flow: ["Captura de avance", "Evidencia ficticia", "Envio a revision"]
  },
  {
    role: "Responsable de indicador",
    email: "responsable.demo@adpeak.local",
    accessCode: "demo-responsable",
    flow: ["Revision", "Observacion", "Aprobacion"]
  }
];

export function buildDemoLinks(apiUrl: string) {
  return {
    health: `${apiUrl}/health`,
    status: `${apiUrl}/demo/status`,
    data: `${apiUrl}/demo/data`,
    users: `${apiUrl}/demo/users`
  };
}
