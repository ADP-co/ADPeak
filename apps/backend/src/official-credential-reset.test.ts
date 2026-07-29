import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnvironment = {
  APP_ENV: process.env.APP_ENV,
  AUTH_SECRET: process.env.AUTH_SECRET,
  INITIAL_DIRECTOR_PASSWORD: process.env.INITIAL_DIRECTOR_PASSWORD,
  INITIAL_RESPONSABLE_PASSWORD: process.env.INITIAL_RESPONSABLE_PASSWORD,
  INITIAL_PLANTEL_PASSWORD: process.env.INITIAL_PLANTEL_PASSWORD,
  OFFICIAL_CREDENTIAL_RESET_VERSION: process.env.OFFICIAL_CREDENTIAL_RESET_VERSION,
  OFFICIAL_FACTORY_RESET_VERSION: process.env.OFFICIAL_FACTORY_RESET_VERSION
};

const testPasswords = {
  director: "SyntheticDirector!42",
  responsable: "SyntheticResponsible!42",
  plantel: "SyntheticCampus!42"
} as const;

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  vi.resetModules();
});

describe("official credential reset", () => {
  it("restores the documented role passwords without removing persisted assignments", async () => {
    process.env.APP_ENV = "production";
    process.env.AUTH_SECRET = "credential-reset-test-secret";
    process.env.INITIAL_DIRECTOR_PASSWORD = testPasswords.director;
    process.env.INITIAL_RESPONSABLE_PASSWORD = testPasswords.responsable;
    process.env.INITIAL_PLANTEL_PASSWORD = testPasswords.plantel;
    process.env.OFFICIAL_CREDENTIAL_RESET_VERSION = "credential-reset-test-v1";
    vi.resetModules();

    const stateStore = await import("./state-store.js");
    stateStore.persistState({
      users: [
        {
          id: "responsable-1",
          username: "resp01",
          name: "Adriana Ruiz Rivera",
          role: "responsable",
          responsableId: 1,
          indicatorCodes: ["1.0.0.0.2"],
          active: false,
          passwordHash: "invalid-old-hash",
          credentialVersion: 7
        }
      ],
      officialCredentialResetVersion: "credential-reset-test-v0"
    });

    const sigiStore = await import("./sigi-store.js");

    expect(sigiStore.authenticateUser("director", testPasswords.director)).toMatchObject({ role: "admin" });
    expect(sigiStore.authenticateUser("resp01", testPasswords.responsable)).toMatchObject({ role: "responsable" });
    expect(sigiStore.authenticateUser("bach1", testPasswords.plantel)).toMatchObject({ role: "plantel" });
    expect(sigiStore.listUsers({ userId: "director-1", role: "director" })).toHaveLength(56);
    const restoredResponsible = sigiStore
      .listUsers({ userId: "director-1", role: "director" })
      .find((user) => user.id === "responsable-1");

    expect(restoredResponsible).toMatchObject({ active: true });
    expect(restoredResponsible?.indicatorCodes).toContain("1.0.0.0.2");
  });

  it("replaces mutable state with the exact official factory baseline", async () => {
    process.env.APP_ENV = "production";
    process.env.AUTH_SECRET = "factory-reset-test-secret";
    process.env.INITIAL_DIRECTOR_PASSWORD = testPasswords.director;
    process.env.INITIAL_RESPONSABLE_PASSWORD = testPasswords.responsable;
    process.env.INITIAL_PLANTEL_PASSWORD = testPasswords.plantel;
    process.env.OFFICIAL_FACTORY_RESET_VERSION = "factory-reset-test-v1";
    vi.resetModules();

    const stateStore = await import("./state-store.js");
    stateStore.persistState({
      users: [
        {
          id: "qa-user",
          username: "qa-user",
          name: "QA user",
          role: "responsable",
          responsibleId: 999,
          indicatorCodes: ["TMP-001"],
          active: true,
          passwordHash: "invalid"
        }
      ],
      indicators: [{ id: 999, code: "TMP-001", name: "Temporary" }],
      notifications: [{ id: 1, message: "Temporary" }],
      auditEvents: [{ id: 1, action: "qa" }],
      captureDrafts: [
        {
          id: 1,
          plantelId: 1,
          indicadorId: 999,
          actividadId: 1,
          periodoId: 1,
          responsableId: null,
          estado: "borrador",
          versionActual: 1,
          payload: { rows: [] },
          observacion: null,
          cerradoEn: null,
          creadoEn: "2026-07-29T00:00:00.000Z",
          actualizadoEn: "2026-07-29T00:00:00.000Z"
        }
      ],
      nextCaptureId: 2,
      officialFactoryResetVersion: "factory-reset-test-v0"
    });

    const sigiStore = await import("./sigi-store.js");

    expect(sigiStore.listUsers({ userId: "director-1", role: "director" })).toHaveLength(56);
    expect(sigiStore.listUsers({ userId: "director-1", role: "director" }))
      .not.toEqual(expect.arrayContaining([expect.objectContaining({ username: "qa-user" })]));
    const factoryIndicators = sigiStore.listIndicators({ userId: "director-1", role: "director" });
    expect(factoryIndicators).toHaveLength(16);
    expect(factoryIndicators).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "TMP-001" })])
    );
    expect(stateStore.readPersistedCollection("notifications")).toEqual([]);
    expect(stateStore.readPersistedCollection("auditEvents")).toEqual([]);
    expect(stateStore.readPersistedCollection("captureDrafts")).toEqual([]);
    expect(stateStore.readPersistedValue("nextCaptureId")).toBe(1);
    expect(stateStore.readPersistedValue("officialFactoryResetVersion")).toBe("factory-reset-test-v1");
    expect(sigiStore.authenticateUser("resp02", testPasswords.responsable)).toMatchObject({
      role: "responsable"
    });
  });
});
