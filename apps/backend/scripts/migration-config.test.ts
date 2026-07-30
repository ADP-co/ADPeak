import { describe, expect, it } from "vitest";
import {
  migrationPoolConfig,
  resolveMigrationDatabaseUrl,
  selectMigrationFiles
} from "./migration-config.js";

describe("migration configuration", () => {
  it("uses the same database URL precedence as the production runtime", () => {
    expect(resolveMigrationDatabaseUrl({
      ADPEAK_RECOVERY_DATABASE_URL: "postgresql://recovery/db",
      POSTGRES_URL_NON_POOLING: "postgresql://fallback/db",
      POSTGRES_URL: "postgresql://primary/db",
      DATABASE_URL: "postgresql://database/db"
    })).toEqual({
      key: "ADPEAK_RECOVERY_DATABASE_URL",
      value: "postgresql://recovery/db"
    });

    expect(resolveMigrationDatabaseUrl({
      POSTGRES_PRISMA_URL: "postgresql://prisma/db"
    })).toEqual({ key: "POSTGRES_PRISMA_URL", value: "postgresql://prisma/db" });

    expect(resolveMigrationDatabaseUrl({
      POSTGRES_URL_NON_POOLING: "postgresql://non-pooling/db"
    })).toEqual({
      key: "POSTGRES_URL_NON_POOLING",
      value: "postgresql://non-pooling/db"
    });
  });

  it("excludes demo migrations unless APP_ENV is demo", () => {
    const files = [
      "20260605_001_demo_schema.sql",
      "20260605_002_demo_seed.sql",
      "20260617_001_app_state.sql",
      "20260729_001_app_evidence.sql"
    ];

    expect(selectMigrationFiles(files, "production")).toEqual([
      "20260617_001_app_state.sql",
      "20260729_001_app_evidence.sql"
    ]);
    expect(selectMigrationFiles(files, undefined)).toEqual([
      "20260617_001_app_state.sql",
      "20260729_001_app_evidence.sql"
    ]);
    expect(selectMigrationFiles(files, "demo")).toEqual(files);
  });

  it("verifies remote certificates and removes sslmode from the connection string", () => {
    const config = migrationPoolConfig(
      "postgresql://user:test_not_secret@db.example.test/app?sslmode=require"
    );

    expect(config.connectionString).not.toContain("sslmode");
    expect(config.ssl).toMatchObject({ rejectUnauthorized: true });
  });

  it("disables TLS for loopback databases", () => {
    expect(migrationPoolConfig("postgresql://user:test_not_secret@127.0.0.1:5432/app").ssl).toBe(false);
  });

  it("requires an explicit override before disabling remote verification", () => {
    expect(() => migrationPoolConfig(
      "postgresql://user:test_not_secret@db.example.test/app",
      { POSTGRES_SSL_MODE: "no-verify" }
    )).toThrow("POSTGRES_ALLOW_INSECURE_DB=true");

    expect(migrationPoolConfig(
      "postgresql://user:test_not_secret@db.example.test/app",
      { POSTGRES_SSL_MODE: "no-verify", POSTGRES_ALLOW_INSECURE_DB: "true" }
    ).ssl).toMatchObject({ rejectUnauthorized: false });
  });
});
