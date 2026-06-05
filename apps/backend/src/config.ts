import { existsSync } from "node:fs";
import path from "node:path";
import { config as loadDotenv } from "dotenv";

export const REQUIRED_ENV_KEYS = [
  "APP_ENV",
  "BACKEND_PORT",
  "PUBLIC_APP_URL",
  "INTERNAL_API_URL",
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_TOKEN_TTL_MINUTES",
  "FILE_STORAGE_DRIVER",
  "FILE_STORAGE_PATH",
  "EVIDENCE_MAX_FILE_MB",
  "CORS_ORIGIN"
] as const;

type RequiredEnvKey = (typeof REQUIRED_ENV_KEYS)[number];

export type AppConfig = {
  appEnv: "development" | "test" | "demo" | "production";
  backendPort: number;
  publicAppUrl: string;
  internalApiUrl: string;
  databaseUrl: string;
  authSecret: string;
  authTokenTtlMinutes: number;
  fileStorageDriver: "local";
  fileStoragePath: string;
  evidenceMaxFileMb: number;
  corsOrigin: string;
};

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

let dotenvLoaded = false;

export function loadLocalEnv(startDirectory = process.cwd()): void {
  if (dotenvLoaded) {
    return;
  }

  dotenvLoaded = true;
  const envPath = findUp(".env", startDirectory);

  if (envPath) {
    loadDotenv({ path: envPath, quiet: true });
  }
}

export function getAppConfig(
  env: Partial<Record<RequiredEnvKey, string | undefined>> = process.env
): AppConfig {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !readEnv(env, key));

  if (missing.length > 0) {
    throw new ConfigurationError(
      [
        "Configuracion requerida incompleta.",
        `Faltan variables: ${missing.join(", ")}.`,
        "Copia .env.example a .env y define valores locales sin secretos reales."
      ].join(" ")
    );
  }

  const appEnv = parseEnum(readEnv(env, "APP_ENV"), "APP_ENV", [
    "development",
    "test",
    "demo",
    "production"
  ]);
  const authSecret = readEnv(env, "AUTH_SECRET");

  if (
    appEnv === "production" &&
    /local|example|change-me|placeholder/i.test(authSecret)
  ) {
    throw new ConfigurationError(
      "AUTH_SECRET no puede usar un valor de ejemplo en produccion."
    );
  }

  return {
    appEnv,
    backendPort: parsePort(readEnv(env, "BACKEND_PORT"), "BACKEND_PORT"),
    publicAppUrl: parseUrl(readEnv(env, "PUBLIC_APP_URL"), "PUBLIC_APP_URL"),
    internalApiUrl: parseUrl(readEnv(env, "INTERNAL_API_URL"), "INTERNAL_API_URL"),
    databaseUrl: parseUrl(readEnv(env, "DATABASE_URL"), "DATABASE_URL"),
    authSecret,
    authTokenTtlMinutes: parsePositiveInteger(
      readEnv(env, "AUTH_TOKEN_TTL_MINUTES"),
      "AUTH_TOKEN_TTL_MINUTES"
    ),
    fileStorageDriver: parseEnum(readEnv(env, "FILE_STORAGE_DRIVER"), "FILE_STORAGE_DRIVER", [
      "local"
    ]),
    fileStoragePath: readEnv(env, "FILE_STORAGE_PATH"),
    evidenceMaxFileMb: parsePositiveInteger(
      readEnv(env, "EVIDENCE_MAX_FILE_MB"),
      "EVIDENCE_MAX_FILE_MB"
    ),
    corsOrigin: parseUrl(readEnv(env, "CORS_ORIGIN"), "CORS_ORIGIN")
  };
}

export function redactConfig(config: AppConfig): Omit<
  AppConfig,
  "authSecret" | "databaseUrl"
> & {
  authSecret: "[redacted]";
  databaseUrl: string;
} {
  return {
    ...config,
    authSecret: "[redacted]",
    databaseUrl: redactDatabaseUrl(config.databaseUrl)
  };
}

function findUp(fileName: string, startDirectory: string): string | undefined {
  let currentDirectory = path.resolve(startDirectory);

  while (true) {
    const candidate = path.join(currentDirectory, fileName);

    if (existsSync(candidate)) {
      return candidate;
    }

    const parent = path.dirname(currentDirectory);

    if (parent === currentDirectory) {
      return undefined;
    }

    currentDirectory = parent;
  }
}

function readEnv(
  env: Partial<Record<RequiredEnvKey, string | undefined>>,
  key: RequiredEnvKey
): string {
  return env[key]?.trim() ?? "";
}

function parsePort(value: string, key: string): number {
  const port = Number.parseInt(value, 10);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigurationError(`${key} debe ser un puerto entre 1 y 65535.`);
  }

  return port;
}

function parsePositiveInteger(value: string, key: string): number {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    throw new ConfigurationError(`${key} debe ser un entero positivo.`);
  }

  return parsedValue;
}

function parseUrl(value: string, key: string): string {
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    throw new ConfigurationError(`${key} debe ser una URL valida.`);
  }
}

function parseEnum<const T extends readonly string[]>(
  value: string,
  key: string,
  allowedValues: T
): T[number] {
  if (!(allowedValues as readonly string[]).includes(value)) {
    throw new ConfigurationError(
      `${key} debe ser uno de: ${allowedValues.join(", ")}.`
    );
  }

  return value as T[number];
}

function redactDatabaseUrl(databaseUrl: string): string {
  return databaseUrl.replace(/\/\/([^:@/]+)(?::[^@/]*)?@/, "//[redacted]@");
}
