import { describe, expect, it } from "vitest";
import {
  authenticateDemoUser,
  demoDatasetPayload,
  demoReportCsv,
  demoReportPayload,
  demoRoleFlows,
  demoStatusPayload,
  publicDemoUsers,
  runDemoAction
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
      approved: 1,
      evidenceFiles: 5,
      indicators: 5,
      late: 2,
      missing: 1
    });
    expect(dataset.filters.campuses).toContain("Plantel Norte");
    expect(dataset.progress.every((item) => item.plantelId)).toBe(true);
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

  it("records only actions allowed by the active demo role", () => {
    expect(runDemoAction("plantel", "capture_submit")).toMatchObject({
      recorded: true,
      role: "plantel"
    });
    expect(runDemoAction("plantel", "approve")).toBeUndefined();
    expect(runDemoAction("responsable_indicador", "request_correction")).toMatchObject({
      recorded: true
    });
    expect(runDemoAction("rol_invalido" as never, "approve")).toBeUndefined();
  });

  it("exports a CSV report with the same demo dimensions", () => {
    const report = demoReportCsv();

    expect(report).toContain('"indicador"');
    expect(report).toContain('"Plantel Norte"');
    expect(report).toContain('"vencimiento"');
    expect(report).toContain('"Seguimiento académico"');
    expect(report).toContain('"84%"');
  });

  it("exposes report indicators with complete nested records", () => {
    const report = demoReportPayload({
      now: new Date("2026-06-11T00:00:00.000Z"),
      plantelId: "plantel-norte"
    });

    expect(report).toMatchObject({
      tipoReporte: "plantel",
      periodo: "2026-A",
      cicloEscolar: "2025-2026",
      fechaGeneracion: "2026-06-11",
      identidadReporte: {
        tipo: "Plantel",
        nombre: "Plantel Norte"
      }
    });
    expect(report.indicadores.length).toBeGreaterThan(0);
    expect(report.indicadores.every((indicator) => Boolean(indicator.id))).toBe(true);
    expect(report.indicadores.every((indicator) => indicator.datos.length > 0)).toBe(true);
    expect(report.indicadores.flatMap((indicator) => indicator.datos)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          registro_id: "avance-001",
          actividad: "Seguimiento académico",
          avance: "84%",
          estado: "Enviado",
          plantel: "Plantel Norte",
          responsable: "Responsable Indicador Demo"
        })
      ])
    );
  });

  it("filters report rows by periodo", () => {
    const report = demoReportPayload({
      periodo: "2026-2",
      plantelId: "plantel-norte"
    });
    const rows = report.indicadores.flatMap((indicator) => indicator.datos);

    expect(rows).toHaveLength(1);
    expect(rows.every((row) => row.periodo === "2026-2")).toBe(true);
    expect(rows[0]).toMatchObject({
      actividad: "Participacion academica",
      plantel: "Plantel Norte"
    });
  });
});
