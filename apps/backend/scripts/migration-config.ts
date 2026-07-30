import type { PoolConfig } from "pg";
import { databasePoolConfig } from "../src/database-config.js";

const DATABASE_URL_KEYS = [
  "ADPEAK_RECOVERY_DATABASE_URL",
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING"
] as const;

const DEMO_MIGRATION_PATTERN = /(?:^|_)demo(?:_|\.)/i;

type MigrationEnvironment = NodeJS.ProcessEnv;

export type ResolvedDatabaseUrl = {
  key: (typeof DATABASE_URL_KEYS)[number];
  value: string;
};

export function resolveMigrationDatabaseUrl(
  environment: MigrationEnvironment = process.env
): ResolvedDatabaseUrl | undefined {
  for (const key of DATABASE_URL_KEYS) {
    const value = environment[key]?.trim();
    if (value) {
      return { key, value };
    }
  }

  return undefined;
}

export function selectMigrationFiles(fileNames: string[], appEnvironment: string | undefined) {
  const includeDemo = appEnvironment?.trim().toLowerCase() === "demo";

  return fileNames
    .filter((fileName) => fileName.endsWith(".sql"))
    .filter((fileName) => includeDemo || !DEMO_MIGRATION_PATTERN.test(fileName))
    .sort();
}

export function migrationPoolConfig(
  databaseUrl: string,
  environment: MigrationEnvironment = process.env
): PoolConfig {
  return databasePoolConfig(databaseUrl, environment);
}
