import { describe, expect, it } from "vitest";
import {
  assertCaptureAccess,
  authenticateUser,
  buildReportPayload,
  deactivateIndicator,
  deactivateUser,
  getIndicatorByCode,
  listIndicators,
  listUsers,
  officialSourcesPayload,
  saveIndicator,
  saveUser,
  sessionFromHeaders,
  templateForIndicator,
  SigiForbiddenError,
  SigiValidationError
} from "./sigi-store.js";

describe("SIGI store and RBAC", () => {
  it("loads official indicators and responsible assignments from the imported catalog", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const indicators = listIndicators(director);

    expect(indicators.length).toBeGreaterThanOrEqual(48);
    expect(getIndicatorByCode("1.0.0.0.2")).toMatchObject({
      name: expect.stringContaining("titul"),
      active: true,
      plantelIds: [],
      plantelScopeSource: "official-import"
    });
    expect(listUsers(director).some((user) => user.role === "responsable" && user.indicatorCodes.length > 1)).toBe(true);
  });

  it("authenticates delivery users without exposing password hashes", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const users = listUsers(director);

    expect(authenticateUser("director", "Director2026!")).toMatchObject({
      id: "director-1",
      role: "admin"
    });
    expect(authenticateUser("resp01", "Resp2026!")).toMatchObject({
      role: "responsable",
      responsableId: 1
    });
    expect(authenticateUser("bach16", "Plantel2026!")).toMatchObject({
      role: "plantel",
      plantelId: 1
    });
    expect(authenticateUser("bach35", "Plantel2026!")).toMatchObject({
      role: "plantel"
    });
    expect(authenticateUser("bachlinea", "Plantel2026!")).toMatchObject({
      role: "plantel"
    });
    expect(authenticateUser("iuba", "Plantel2026!")).toMatchObject({
      role: "plantel"
    });
    expect(authenticateUser("director", "incorrecta")).toBeUndefined();
    expect(users.some((user) => "passwordHash" in user)).toBe(false);
  });

  it("seeds every Universidad de Colima bachillerato account", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const users = listUsers(director);
    const plantelUsers = users.filter((user) => user.role === "plantel");

    expect(plantelUsers).toHaveLength(37);
    expect(plantelUsers.map((user) => user.name)).toEqual(expect.arrayContaining([
      "Bachillerato 1",
      "Bachillerato 16",
      "Bachillerato 35",
      "Bachillerato en línea",
      "IUBA Bachillerato"
    ]));
  });

  it("keeps exactly one administrator user", () => {
    const director = sessionFromHeaders({ "x-role": "director" });

    expect(listUsers(director).filter((user) => user.role === "director")).toHaveLength(1);
    expect(() =>
      saveUser(director, {
        name: "Segundo administrador",
        role: "director"
      })
    ).toThrow(SigiValidationError);
    expect(() =>
      saveUser(director, {
        name: "Bachillerato temporal",
        role: "plantel",
        plantelId: 5
      })
    ).toThrow(SigiValidationError);
    expect(() =>
      saveUser(director, {
        id: "director-1",
        name: "Director DGEMS",
        role: "responsable"
      })
    ).toThrow(SigiValidationError);
    expect(() => deactivateUser(director, "director-1")).toThrow(SigiValidationError);
    expect(saveUser(director, {
      name: "Responsable QA",
      role: "responsable",
      responsableId: 99,
      indicatorCodes: []
    })).toMatchObject({ role: "responsable" });
  });

  it("scopes indicators for responsible users", () => {
    const responsable = sessionFromHeaders({
      "x-role": "responsable",
      "x-responsable-id": "1"
    });
    const indicators = listIndicators(responsable);

    expect(indicators.length).toBeGreaterThan(0);
    expect(indicators.every((indicator) => indicator.responsibleIds.includes(1))).toBe(true);
  });

  it("scopes report indicators for responsible users", () => {
    const responsable = sessionFromHeaders({
      "x-role": "responsable",
      "x-responsable-id": "1"
    });
    const assignedCodes = listIndicators(responsable).map((indicator) => indicator.code);
    const report = buildReportPayload(responsable, {
      cicloEscolar: "2025-2026",
      periodo: "2026-2"
    });

    expect(report.tipoReporte).toBe("responsable");
    expect(report.indicadores.length).toBeGreaterThan(0);
    expect(report.indicadores.every((indicator) => assignedCodes.includes(indicator.id))).toBe(true);
  });

  it("changes report progress by cycle and excludes unassigned official indicators from plantel filters", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const currentCycle = buildReportPayload(director, {
      cicloEscolar: "2025-2026",
      periodo: "2026-2"
    });
    const previousCycle = buildReportPayload(director, {
      cicloEscolar: "2024-2025",
      periodo: "2025-2"
    });
    const bachillerato16 = buildReportPayload(director, {
      plantelId: "1",
      cicloEscolar: "2025-2026",
      periodo: "2026-2"
    });
    const signature = (report: ReturnType<typeof buildReportPayload>) =>
      report.indicadores
        .flatMap((indicator) => indicator.datos)
        .slice(0, 20)
        .map((row) => `${row.estado}:${row.avance}:${row.plantel}`)
        .join("|");

    expect(signature(currentCycle)).not.toBe(signature(previousCycle));
    expect(signature(currentCycle)).not.toBe("");
    expect(currentCycle.indicadores.flatMap((indicator) => indicator.datos).some((row) => row.plantel === "Sin plantel asignado")).toBe(true);
    expect(bachillerato16.indicadores.some((indicator) => indicator.id === "1.0.0.0.2")).toBe(false);
  });

  it("does not expose unassigned official indicators to planteles until a scope is assigned", () => {
    const bachillerato16 = sessionFromHeaders({ "x-role": "plantel", "x-plantel-id": "1" });
    const bachillerato4 = sessionFromHeaders({ "x-role": "plantel", "x-plantel-id": "2" });
    const indicator = getIndicatorByCode("1.0.0.0.2");

    expect(indicator?.plantelIds).toEqual([]);
    expect(listIndicators(bachillerato16).some((item) => item.code === "1.0.0.0.2")).toBe(false);
    expect(listIndicators(bachillerato4).some((item) => item.code === "1.0.0.0.2")).toBe(false);
    expect(() =>
      assertCaptureAccess(
        bachillerato16,
        { plantelId: 1, indicadorId: indicator!.id },
        "read"
      )
    ).toThrow(SigiForbiddenError);
  });

  it("prevents plantel users from reading institutional reports", () => {
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1"
    });

    expect(() => buildReportPayload(plantel)).toThrow(SigiForbiddenError);
  });

  it("exposes the complete official source package as sanitized structured data", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const sources = officialSourcesPayload(director);

    expect(sources.summary).toMatchObject({
      plantel: "Bachillerato 16",
      topLevelFiles: 3,
      nestedFiles: 981,
      workbookCount: 39,
      worksheetCount: 53
    });
    expect(sources.summary.worksheetNonEmptyRows).toBeGreaterThan(2000);
    expect(sources.evidenceGroups).toHaveLength(18);
    expect(sources.workbookSummaries).toHaveLength(39);
  });

  it("includes official evidence groups in Bachillerato 16 report exports", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const report = buildReportPayload(director, { plantelId: "1", now: new Date("2026-06-12T00:00:00.000Z") });
    const officialSources = report.indicadores.find((indicator) => indicator.nombre === "Fuentes oficiales cargadas");

    expect(officialSources).toBeDefined();
    expect(report.indicadores.every((indicator) => Boolean(indicator.id))).toBe(true);
    expect(report.indicadores.flatMap((indicator) => indicator.datos).every((row) => Boolean(row.registro_id))).toBe(true);
    expect(officialSources?.datos).toHaveLength(18);
    expect(officialSources?.datos.reduce((total, row) => total + row.evidencias, 0)).toBe(981);
  });

  it("uses active false for logical indicator deletion", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const indicator = saveIndicator(director, {
      code: "TMP-QA",
      name: "Indicador temporal QA",
      responsibleNames: ["Liliana Yunuen Rojas Maciel"],
      activities: ["Actividad QA"]
    });
    const deactivated = deactivateIndicator(director, indicator.id);

    expect(deactivated).toMatchObject({ code: "TMP-QA", active: false });
  });

  it("validates capture columns against the indicator template", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1"
    });
    const indicator = saveIndicator(director, {
      code: "TMP-CAPTURE-COLUMNS",
      name: "Indicador temporal para validar columnas",
      dataType: "text",
      responsibleNames: ["Liliana Yunuen Rojas Maciel"],
      contributorNames: ["Planteles"],
      activities: ["Actividad QA"],
      plantelIds: [1]
    });

    expect(indicator).toBeDefined();
    const template = templateForIndicator(indicator);
    expect(template.columns.map((column) => column.key)).toContain("avance");

    expect(() =>
      assertCaptureAccess(
        plantel,
        {
          plantelId: 1,
          indicadorId: indicator.id,
          payload: { rows: [{ columna_invalida: 1 }] }
        },
        "draft"
      )
    ).toThrow(SigiValidationError);
  });

  it("persists manual template columns with formula calculations", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const indicator = saveIndicator(director, {
      code: "TMP-FORMULA",
      name: "Indicador con formula configurable",
      dataType: "number",
      responsibleNames: ["Liliana Yunuen Rojas Maciel"],
      contributorNames: ["Planteles"],
      activities: ["Actividad con formula"],
      plantelIds: [1],
      templateColumns: [
        { key: "plantel", label: "Plantel", type: "readonly" },
        { key: "mujeres", label: "Mujeres", type: "number" },
        { key: "hombres", label: "Hombres", type: "number" },
        {
          key: "total",
          label: "Total",
          type: "calculated",
          calculation: { type: "formula", expression: "=Mujeres + Hombres", decimals: 2 }
        }
      ]
    });
    const template = templateForIndicator(indicator, director);

    expect(template.columns.map((column) => [column.key, column.type])).toEqual([
      ["plantel", "readonly"],
      ["mujeres", "number"],
      ["hombres", "number"],
      ["total", "calculated"]
    ]);
    expect(template.columns[3].calculation).toMatchObject({
      type: "formula",
      expression: "=Mujeres + Hombres"
    });
    expect(template.initialRows[0]).toMatchObject({ plantel: "Bachillerato 16" });
  });

  it("builds the official health integral matrix for indicator 1.1.2.1.4", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1"
    });
    const indicator = getIndicatorByCode("1.1.2.1.4");

    expect(indicator).toBeDefined();
    expect(indicator?.activities).toEqual(expect.arrayContaining([
      "Promoción de la salud",
      "Clínica Universitaria de Atención Psicológica",
      "Número de servicios y acciones de Desarrollo Integral dirigidos al estudiantado"
    ]));

    const template = templateForIndicator(indicator!, director);

    expect(template.headerRows).toBeDefined();
    expect(template.showTotals).toBe(true);
    expect(template.columns.map((column) => [column.key, column.type])).toEqual([
      ["plantel", "readonly"],
      ["actividad", "readonly"],
      ["servicios_medicos", "number"],
      ["dgdi", "number"],
      ["cuap", "number"],
      ["feb_ago_mujeres", "number"],
      ["feb_ago_hombres", "number"],
      ["feb_ago_total", "calculated"],
      ["ago_ene_mujeres", "number"],
      ["ago_ene_hombres", "number"],
      ["ago_ene_total", "calculated"]
    ]);
    expect(template.initialRows.map((row) => row.actividad)).toEqual(indicator!.activities);
    expect(template.initialRows.every((row) => row.plantel === "Sin plantel asignado")).toBe(true);

    expect(() =>
      assertCaptureAccess(
        plantel,
        {
          plantelId: 1,
          indicadorId: indicator!.id,
          payload: {
            rows: [{
              ...template.initialRows[0],
              servicios_medicos: 1,
              dgdi: 2,
              cuap: 3,
              feb_ago_mujeres: 4,
              feb_ago_hombres: 5,
              ago_ene_mujeres: 6,
              ago_ene_hombres: 7
            }]
          }
        },
        "draft"
      )
    ).toThrow(SigiForbiddenError);

    expect(() =>
      assertCaptureAccess(
        plantel,
        {
          plantelId: 1,
          indicadorId: indicator!.id,
          payload: { rows: [{ ...template.initialRows[0], columna_invalida: 1 }] }
        },
        "draft"
      )
    ).toThrow(SigiForbiddenError);
  });

  it("rejects truncated capture rows when sending to review", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1"
    });
    const indicator = saveIndicator(director, {
      code: "TMP-TRUNCATED-CAPTURE",
      name: "Indicador temporal con filas obligatorias",
      dataType: "text",
      responsibleNames: ["Liliana Yunuen Rojas Maciel"],
      contributorNames: ["Planteles"],
      activities: ["Actividad uno", "Actividad dos"],
      plantelIds: [1]
    });
    const template = templateForIndicator(indicator, plantel);

    expect(template.initialRows.length).toBeGreaterThan(1);
    expect(() =>
      assertCaptureAccess(
        plantel,
          {
            plantelId: 1,
            indicadorId: indicator.id,
            payload: { rows: [template.initialRows[0]], justificacion: "Captura parcial" }
          },
        "submit"
      )
    ).toThrow(SigiValidationError);
  });

  it("builds source-based templates for the main official spreadsheet families", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1"
    });

    const cases = [
      {
        code: "1.1.2.1.1",
        expectedKeys: ["feb_ago_mujeres", "feb_ago_hombres", "feb_ago_total", "ago_ene_total", "total_anual"],
        sampleValues: {
          meta: 100,
          feb_ago_mujeres: 7,
          feb_ago_hombres: 8,
          ago_ene_mujeres: 5,
          ago_ene_hombres: 6
        }
      },
      {
        code: "1.1.2.3.1",
        expectedKeys: ["actividades_desarrollo", "matricula_total", "incorporacion_total_num", "incorporacion_total_pct"],
        sampleValues: {
          actividades_desarrollo: 2,
          actividades_formacion: 1,
          matricula_mujeres: 30,
          matricula_hombres: 20,
          incorporacion_mujeres_num: 15,
          incorporacion_hombres_num: 10,
          descripcion: "Actividades realizadas"
        }
      },
      {
        code: "1.1.2.5.5",
        expectedKeys: ["tipo_evento", "nombre_evento", "participantes_hombres", "participantes_mujeres", "participantes_total"],
        sampleValues: {
          tipo_evento: "Curso",
          nombre_evento: "Capacitación docente",
          duracion_horas: 12,
          modalidad: "Presencial",
          competencias: "Didácticas",
          organizado_por: "DGEMS",
          participantes_hombres: 4,
          participantes_mujeres: 6,
          evidencias: 1
        }
      },
      {
        code: "4.1.2.1.6",
        expectedKeys: ["rubro", "cantidad_actual", "cantidad_solicitada", "cantidad_total"],
        sampleValues: {
          rubro: "Equipo",
          descripcion: "Videoproyector",
          cantidad_actual: 1,
          cantidad_solicitada: 2,
          estado: "Solicitado"
        }
      }
    ];

    cases.forEach(({ code, expectedKeys, sampleValues }) => {
      const indicator = getIndicatorByCode(code);
      expect(indicator).toBeDefined();

      const template = templateForIndicator(indicator!, director);
      const keys = template.columns.map((column) => column.key);

      expectedKeys.forEach((key) => expect(keys).toContain(key));
      expect(template.initialRows.length).toBe(indicator!.activities.length);

      expect(() =>
        assertCaptureAccess(
          plantel,
          {
            plantelId: 1,
            indicadorId: indicator!.id,
            payload: {
              rows: [{
                ...template.initialRows[0],
                ...sampleValues
              }]
            }
          },
          "draft"
        )
      ).toThrow(SigiForbiddenError);

      expect(() =>
        assertCaptureAccess(
          plantel,
          {
            plantelId: 1,
            indicadorId: indicator!.id,
            payload: { rows: [{ ...template.initialRows[0], columna_inventada: 1 }] }
          },
          "draft"
        )
      ).toThrow(SigiForbiddenError);
    });
  });

  it("generates a readable unassigned template for every official indicator", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1"
    });

    listIndicators(director)
      .filter((indicator) => indicator.plantelScopeSource === "official-import")
      .forEach((indicator) => {
      const template = templateForIndicator(indicator, director);

      expect(template.columns.length, indicator.code).toBeGreaterThan(0);
      expect(template.initialRows.length, indicator.code).toBeGreaterThan(0);
      expect(template.initialRows.length, indicator.code).toBeGreaterThanOrEqual(
        indicator.activities.length > 0 && !["1.0.0.0.1", "1.0.0.0.2"].includes(indicator.code)
          ? indicator.activities.length
          : 1
      );
      if (template.columns.some((column) => column.key === "plantel")) {
        expect(template.initialRows.every((row) => row.plantel === "Sin plantel asignado"), indicator.code).toBe(true);
      }

      expect(() =>
        assertCaptureAccess(
          plantel,
          {
            plantelId: 1,
            indicadorId: indicator.id,
            payload: { rows: [template.initialRows[0]] }
          },
          "draft"
        )
      ).toThrow(SigiForbiddenError);
    });
  });

  it("blocks captures for indicators that are not assigned to the requested plantel", () => {
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "2"
    });
    const indicator = getIndicatorByCode("1.0.0.0.2");

    expect(indicator).toBeDefined();
    expect(() =>
      assertCaptureAccess(
        plantel,
        {
          plantelId: 2,
          indicadorId: indicator!.id,
          payload: { rows: [{ egresados_mujeres: 1, egresados_hombres: 1, matricula_mujeres: 1, matricula_hombres: 1 }] }
        },
        "draft"
      )
    ).toThrow(SigiForbiddenError);
  });

  it("uses the active plantel session when building capture templates", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "2"
    });
    const indicator = saveIndicator(director, {
      code: "TMP-PLANTEL-SESSION",
      name: "Indicador temporal con alcance de plantel",
      dataType: "text",
      responsibleNames: ["Liliana Yunuen Rojas Maciel"],
      contributorNames: ["Planteles"],
      activities: ["Actividad del plantel"],
      plantelIds: [2]
    });

    expect(indicator).toBeDefined();
    expect(templateForIndicator(indicator, plantel).initialRows[0]).toMatchObject({
      plantel: "Bachillerato 4"
    });
  });
});
