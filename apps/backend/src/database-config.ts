import type { PoolConfig } from "pg";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const TLS_QUERY_PARAMETERS = ["sslmode", "uselibpqcompat"];

type DatabaseEnvironment = NodeJS.ProcessEnv;

export function databasePoolConfig(
  databaseUrl: string,
  environment: DatabaseEnvironment = process.env
): PoolConfig {
  const parsedUrl = parsePostgresUrl(databaseUrl);
  const urlMode = parsedUrl.searchParams.get("sslmode")?.trim().toLowerCase();
  const configuredMode = environment.POSTGRES_SSL_MODE?.trim().toLowerCase();
  const mode = configuredMode || urlMode || (LOOPBACK_HOSTS.has(parsedUrl.hostname) ? "disable" : "verify-full");

  for (const parameter of TLS_QUERY_PARAMETERS) {
    parsedUrl.searchParams.delete(parameter);
  }

  if (mode === "disable") {
    if (!LOOPBACK_HOSTS.has(parsedUrl.hostname) && environment.POSTGRES_ALLOW_INSECURE_DB !== "true") {
      throw new Error(
        "POSTGRES_SSL_MODE=disable solo se permite para localhost. " +
        "Define POSTGRES_ALLOW_INSECURE_DB=true para aceptar explicitamente el riesgo."
      );
    }

    return { connectionString: parsedUrl.toString(), ssl: false };
  }

  if (!["require", "verify-ca", "verify-full", "no-verify"].includes(mode)) {
    throw new Error(
      `POSTGRES_SSL_MODE invalido: ${mode}. Usa disable, require, verify-ca, verify-full o no-verify.`
    );
  }

  const rejectUnauthorized = mode !== "no-verify";
  if (!rejectUnauthorized && environment.POSTGRES_ALLOW_INSECURE_DB !== "true") {
    throw new Error("POSTGRES_SSL_MODE=no-verify requiere POSTGRES_ALLOW_INSECURE_DB=true.");
  }

  const ca = normalizedCertificate(environment.POSTGRES_SSL_CA);
  return {
    connectionString: parsedUrl.toString(),
    ssl: {
      rejectUnauthorized,
      ...(ca ? { ca } : {})
    }
  };
}

function parsePostgresUrl(value: string) {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error("La URL de PostgreSQL configurada no es valida.");
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("La URL de PostgreSQL debe usar postgres:// o postgresql://.");
  }

  return parsed;
}

function normalizedCertificate(value: string | undefined) {
  const certificate = value?.trim();
  return certificate ? certificate.replaceAll("\\n", "\n") : undefined;
}
