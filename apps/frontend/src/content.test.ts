import { describe, expect, it } from "vitest";
import {
  ClientConfigurationError,
  defaultDashboardFilters,
  filterDashboardProgress,
  buildDemoLinks,
  labelDemoRole,
  loadClientConfig,
  scopeProgressForSession,
  summarizeDashboardProgress,
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
      users: "http://127.0.0.1:8000/demo/users",
      report: "http://127.0.0.1:8000/demo/report.csv"
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

  it("filters dashboard progress and recalculates metrics", () => {
    const progress = [
      {
        activity: "Captura",
        avance: 5,
        cycle: "POA 2026",
        estado: "borrador" as const,
        evidencias: 0,
        id: "1",
        indicador: "Indicador A",
        meta: 10,
        periodo: "2026-1",
        plantel: "Plantel Norte",
        plantelId: "plantel-norte",
        responsable: "Responsable Uno",
        responsableId: "resp-uno",
        vencimiento: "atrasado" as const
      },
      {
        activity: "Revision",
        avance: 10,
        cycle: "POA 2026",
        estado: "aprobado" as const,
        evidencias: 1,
        id: "2",
        indicador: "Indicador B",
        meta: 10,
        periodo: "2026-2",
        plantel: "Plantel Centro",
        plantelId: "plantel-centro",
        responsable: "Responsable Dos",
        responsableId: "resp-dos",
        vencimiento: "en_tiempo" as const
      }
    ];

    const filtered = filterDashboardProgress(progress, {
      ...defaultDashboardFilters(),
      campus: "Plantel Norte"
    });

    expect(filtered).toHaveLength(1);
    expect(summarizeDashboardProgress(filtered)).toMatchObject({
      indicators: 1,
      missing: 1,
      late: 1,
      completionPercent: 50
    });
  });

  it("limits progress by active demo session scope", () => {
    const progress = [
      {
        activity: "Captura",
        avance: 5,
        cycle: "POA 2026",
        estado: "en_revision" as const,
        evidencias: 1,
        id: "1",
        indicador: "Indicador A",
        meta: 10,
        periodo: "2026-1",
        plantel: "Plantel Norte",
        plantelId: "plantel-norte",
        responsable: "Responsable Uno",
        responsableId: "resp-uno",
        vencimiento: "en_tiempo" as const
      },
      {
        activity: "Revision",
        avance: 8,
        cycle: "POA 2026",
        estado: "observado" as const,
        evidencias: 1,
        id: "2",
        indicador: "Indicador B",
        meta: 10,
        periodo: "2026-1",
        plantel: "Plantel Sur",
        plantelId: "plantel-sur",
        responsable: "Responsable Dos",
        responsableId: "resp-dos",
        vencimiento: "atrasado" as const
      }
    ];

    expect(
      scopeProgressForSession(progress, {
        token: "demo-token",
        user: {
          displayName: "Plantel Norte",
          email: "plantel.demo@adpeak.local",
          id: "demo-plantel",
          mainFlow: [],
          plantelId: "plantel-norte",
          role: "plantel"
        }
      }).map((item) => item.plantel)
    ).toEqual(["Plantel Norte"]);
  });
});
