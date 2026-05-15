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
