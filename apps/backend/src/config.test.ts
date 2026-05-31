import { describe, expect, it } from "vitest";
import {
  ConfigurationError,
  getAppConfig,
  REQUIRED_ENV_KEYS,
  redactConfig
} from "./config.js";

const validEnv = {
  APP_ENV: "development",
  BACKEND_PORT: "8000",
  PUBLIC_APP_URL: "http://127.0.0.1:5173",
  INTERNAL_API_URL: "http://127.0.0.1:8000",
  VITE_API_URL: "http://127.0.0.1:8000",
  DATABASE_URL: "postgresql://sigi_poa:local_password@127.0.0.1:5432/sigi_poa_dev",
  AUTH_SECRET: "local-dev-auth-secret-change-me",
  AUTH_TOKEN_TTL_MINUTES: "60",
  FILE_STORAGE_DRIVER: "local",
  FILE_STORAGE_PATH: "uploads",
  EVIDENCE_MAX_FILE_MB: "25",
  CORS_ORIGIN: "http://127.0.0.1:5173"
};

describe("getAppConfig", () => {
  it("loads a valid local configuration", () => {
    expect(getAppConfig(validEnv)).toMatchObject({
      appEnv: "development",
      backendPort: 8000,
      viteApiUrl: "http://127.0.0.1:8000",
      fileStorageDriver: "local",
      fileStoragePath: "uploads"
    });
  });

  it("fails clearly when required variables are missing", () => {
    expect(() => getAppConfig({})).toThrow(ConfigurationError);
    expect(() => getAppConfig({})).toThrow(REQUIRED_ENV_KEYS.join(", "));
  });

  it("rejects invalid URLs", () => {
    expect(() =>
      getAppConfig({
        ...validEnv,
        DATABASE_URL: "not-a-url"
      })
    ).toThrow("DATABASE_URL debe ser una URL valida.");
  });

  it("requires the frontend API URL used by Vite", () => {
    const { VITE_API_URL: _viteApiUrl, ...envWithoutViteApiUrl } = validEnv;

    expect(() => getAppConfig(envWithoutViteApiUrl)).toThrow("VITE_API_URL");
  });

  it("redacts sensitive values from diagnostics", () => {
    expect(redactConfig(getAppConfig(validEnv))).toMatchObject({
      authSecret: "[redacted]",
      databaseUrl: "postgresql://[redacted]@127.0.0.1:5432/sigi_poa_dev"
    });
  });
});
