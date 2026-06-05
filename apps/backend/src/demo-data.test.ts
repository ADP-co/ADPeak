import { describe, expect, it } from "vitest";
import {
  authenticateDemoUser,
  demoDatasetPayload,
  demoRoleFlows,
  demoStatusPayload,
  publicDemoUsers
} from "./demo-data.js";

describe("demo data", () => {
  it("publishes exactly the three demo roles required for presentation", () => {
    expect(publicDemoUsers().map((user) => user.role).sort()).toEqual([
      "admin_dgems",
      "plantel",
      "responsable_indicador"
    ]);
  });

  it("creates a deterministic demo session with role flow", () => {
    const session = authenticateDemoUser(
      "admin.demo@adpeak.local",
      "demo-admin"
    );

    expect(session).toMatchObject({
      token: "demo-token-demo-admin",
      user: {
        role: "admin_dgems",
        mainFlow: expect.arrayContaining(["Ver resumen global"])
      }
    });
  });

  it("rejects invalid demo access codes", () => {
    expect(
      authenticateDemoUser("admin.demo@adpeak.local", "wrong-code")
    ).toBeUndefined();
  });

  it("exposes controlled data without confidential sources", () => {
    const status = demoStatusPayload(new Date("2026-06-05T00:00:00.000Z"));
    const dataset = demoDatasetPayload();

    expect(status).toMatchObject({
      environment: "demo",
      status: "ready",
      dataPolicy: expect.stringContaining("Datos ficticios")
    });
    expect(dataset.summary).toMatchObject({
      indicators: 3,
      evidenceFiles: 4,
      approved: 1
    });
  });

  it("documents a main flow for every demo role", () => {
    const flows = demoRoleFlows();

    expect(Object.keys(flows).sort()).toEqual([
      "admin_dgems",
      "plantel",
      "responsable_indicador"
    ]);

    for (const flow of Object.values(flows)) {
      expect(flow.mainFlow.length).toBeGreaterThanOrEqual(3);
    }
  });
});
