import { describe, expect, it } from "vitest";
import {
  ClientConfigurationError,
  buildDemoLinks,
  demoRoleCards,
  loadClientConfig
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

  it("keeps the three demo role cards visible", () => {
    expect(demoRoleCards.map((card) => card.role)).toEqual([
      "Administrador DGEMS",
      "Plantel",
      "Responsable de indicador"
    ]);
    expect(demoRoleCards.every((card) => card.flow.length >= 3)).toBe(true);
  });

  it("builds stable demo API links", () => {
    expect(buildDemoLinks("http://127.0.0.1:8000")).toEqual({
      health: "http://127.0.0.1:8000/health",
      status: "http://127.0.0.1:8000/demo/status",
      data: "http://127.0.0.1:8000/demo/data",
      users: "http://127.0.0.1:8000/demo/users"
    });
  });
});
