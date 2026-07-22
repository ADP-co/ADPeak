import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnvironment = {
  APP_ENV: process.env.APP_ENV,
  AUTH_SECRET: process.env.AUTH_SECRET,
  INITIAL_DIRECTOR_PASSWORD: process.env.INITIAL_DIRECTOR_PASSWORD,
  INITIAL_RESPONSABLE_PASSWORD: process.env.INITIAL_RESPONSABLE_PASSWORD,
  INITIAL_PLANTEL_PASSWORD: process.env.INITIAL_PLANTEL_PASSWORD,
  OFFICIAL_CREDENTIAL_RESET_VERSION: process.env.OFFICIAL_CREDENTIAL_RESET_VERSION
};

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
    process.env.INITIAL_DIRECTOR_PASSWORD = "Director2026!";
    process.env.INITIAL_RESPONSABLE_PASSWORD = "Resp2026!";
    process.env.INITIAL_PLANTEL_PASSWORD = "Plantel2026!";
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

    expect(sigiStore.authenticateUser("director", "Director2026!")).toMatchObject({ role: "admin" });
    expect(sigiStore.authenticateUser("resp01", "Resp2026!")).toMatchObject({ role: "responsable" });
    expect(sigiStore.authenticateUser("bach1", "Plantel2026!")).toMatchObject({ role: "plantel" });
    expect(sigiStore.listUsers({ userId: "director-1", role: "director" })).toHaveLength(56);
    const restoredResponsible = sigiStore
      .listUsers({ userId: "director-1", role: "director" })
      .find((user) => user.id === "responsable-1");

    expect(restoredResponsible).toMatchObject({ active: true });
    expect(restoredResponsible?.indicatorCodes).toContain("1.0.0.0.2");
  });
});
