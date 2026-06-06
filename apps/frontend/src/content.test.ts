import { describe, expect, it } from "vitest";
import {
  ClientConfigurationError,
  buildDemoLinks,
  labelDemoRole,
  loadClientConfig,
  toDemoRoleCard
} from "./content";

describe("loadClientConfig", () => {
  it("loads a configured API URL", () => {
    expect(loadClientConfig({ VITE_API_URL: "http://127.0.0.1:9000" })).toEqual({
      apiUrl: "http://127.0.0.1:9000"
    });
  });

  it("fails clearly when the API URL is missing", () => {
    expect(() => loadClientConfig({})).toThrow(ClientConfigurationError);
    expect(() => loadClientConfig({})).toThrow("VITE_API_URL");
  });

  it("rejects invalid API URLs", () => {
    expect(() => loadClientConfig({ VITE_API_URL: "invalid" })).toThrow(
      "VITE_API_URL debe ser una URL valida."
    );
  });

  it("maps backend role ids to visible labels", () => {
    expect([
      labelDemoRole("admin_dgems"),
      labelDemoRole("plantel"),
      labelDemoRole("responsable_indicador")
    ]).toEqual([
      "Administrador DGEMS",
      "Plantel",
      "Responsable de indicador"
    ]);
  });

  it("builds stable demo API links", () => {
    expect(buildDemoLinks("http://127.0.0.1:8000")).toEqual({
      health: "http://127.0.0.1:8000/health",
      status: "http://127.0.0.1:8000/demo/status",
      data: "http://127.0.0.1:8000/demo/data",
      users: "http://127.0.0.1:8000/demo/users"
    });
  });

  it("converts backend users into role cards", () => {
    expect(
      toDemoRoleCard({
        accessCode: "demo-plantel",
        displayName: "Plantel Norte Demo",
        email: "plantel.demo@adpeak.local",
        id: "demo-plantel",
        mainFlow: ["Captura", "Evidencia", "Revision"],
        role: "plantel"
      })
    ).toEqual({
      accessCode: "demo-plantel",
      email: "plantel.demo@adpeak.local",
      flow: ["Captura", "Evidencia", "Revision"],
      role: "Plantel"
    });
  });
});
