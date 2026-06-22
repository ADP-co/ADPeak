import { beforeEach, describe, expect, it } from "vitest";
import { officialCatalogRows, officialCatalogStats, officialIndicatorPlantelScopes } from "./official-catalog.generated.js";
import { officialDataSummary, officialWorkbookTemplates } from "./official-data.generated.js";
import { createCaptureDraft, resetCaptureDraftsForTest } from "./capture-store.js";
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
  reloadSigiStateFromPersistence,
  saveIndicator,
  saveUser,
  sessionFromHeaders,
  templateForIndicator,
  SigiForbiddenError,
  SigiValidationError
} from "./sigi-store.js";

describe("SIGI store and RBAC", () => {
  beforeEach(() => {
    resetCaptureDraftsForTest();
    reloadSigiStateFromPersistence();
  });

  it("loads official indicators and responsible assignments from the imported catalog", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const indicators = listIndicators(director);

    expect(officialCatalogStats.uniqueIndicators).toBe(108);
    expect(officialDataSummary.workbookCount).toBe(69);
    expect(Object.keys(officialWorkbookTemplates)).toHaveLength(67);
    expect(indicators.length).toBeGreaterThanOrEqual(108);
    expect(indicators.some((indicator) =>
      indicator.name.toLowerCase().includes("la tabla anterior incide")
    )).toBe(false);
    expect(getIndicatorByCode("1.0.0.0.2")).toMatchObject({
      name: expect.stringContaining("titul"),
      active: true,
      plantelIds: [],
      plantelScopeSource: "official-import"
    });
    expect(listUsers(director).some((user) => user.role === "responsable" && user.indicatorCodes.length > 1)).toBe(true);
  });

  it("keeps official catalog indicators visible for plantel capture even when no detailed workbook exists", () => {
    const bachillerato16 = sessionFromHeaders({ "x-role": "plantel", "x-plantel-id": "1" });
    const visibleCodes = new Set(listIndicators(bachillerato16).map((indicator) => indicator.code));
    const catalogCodes = Array.from(new Set(officialCatalogRows.map((row) => row.code).filter(Boolean)));

    expect(catalogCodes.length).toBeGreaterThanOrEqual(48);
    expect(catalogCodes.filter((code) => !visibleCodes.has(code))).toEqual([]);
  });

  it("authenticates delivery users without exposing password hashes", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const users = listUsers(director);

    expect(authenticateUser("director", "Director2026!")).toMatchObject({
      id: "director-1",
      role: "admin"
    });
    expect(authenticateUser("admin", "Director2026!")).toMatchObject({
      id: "director-1",
      role: "admin"
    });
    expect(authenticateUser("administrador", "Director2026!")).toMatchObject({
      id: "director-1",
      role: "admin"
    });
    expect(authenticateUser("Director DGEMS", "Director2026!")).toMatchObject({
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

  it("keeps report filters explicit and includes capturable official indicators without explicit plantel scope", () => {
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
    const bachillerato4 = buildReportPayload(director, {
      plantelId: "2",
      cicloEscolar: "2025-2026",
      periodo: "2026-2"
    });
    const signature = (report: ReturnType<typeof buildReportPayload>) =>
      report.indicadores
        .flatMap((indicator) => indicator.datos)
        .slice(0, 20)
        .map((row) => `${row.estado}:${row.avance}:${row.plantel}`)
        .join("|");

    expect(signature(currentCycle)).not.toBe("");
    expect(currentCycle.periodo).toBe("2026-2");
    expect(currentCycle.cicloEscolar).toBe("2025-2026");
    expect(previousCycle.periodo).toBe("2025-2");
    expect(previousCycle.cicloEscolar).toBe("2024-2025");
    expect(currentCycle.indicadores.flatMap((indicator) => indicator.datos).every((row) => row.estado === "Borrador" || row.estado === "Aprobado")).toBe(true);
    expect(currentCycle.indicadores.flatMap((indicator) => indicator.datos).some((row) => row.plantel === "Bachillerato 16")).toBe(true);
    expect(bachillerato16.indicadores.some((indicator) => indicator.id === "1.0.0.0.2")).toBe(true);
    expect(bachillerato4.indicadores.some((indicator) => indicator.id === "1.0.0.0.2")).toBe(true);
  });

  it("keeps imported official indicators unassigned while allowing plantel capture until director narrows the scope", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const bachillerato16 = sessionFromHeaders({ "x-role": "plantel", "x-plantel-id": "1" });
    const bachillerato4 = sessionFromHeaders({ "x-role": "plantel", "x-plantel-id": "2" });
    const indicator = getIndicatorByCode("1.0.0.0.2");
    const unassigned = saveIndicator(director, {
      ...indicator!,
      plantelIds: []
    });

    expect(indicator?.plantelIds).toEqual([]);
    expect(unassigned.plantelScopeSource).toBe("official-import");
    expect(listIndicators(bachillerato16).some((item) => item.code === "1.0.0.0.2")).toBe(true);
    expect(listIndicators(bachillerato4).some((item) => item.code === "1.0.0.0.2")).toBe(true);
    expect(templateForIndicator(unassigned, director).initialRows.every((row) => typeof row.plantel === "string")).toBe(true);
    expect(templateForIndicator(unassigned, bachillerato16).initialRows.every((row) => row.plantel === "Bachillerato 16")).toBe(true);

    expect(() =>
      assertCaptureAccess(
        bachillerato16,
        {
          plantelId: 1,
          indicadorId: unassigned.id,
          payload: { rows: templateForIndicator(unassigned, bachillerato16).initialRows, justificacion: "Captura con fuente oficial" }
        },
        "submit"
      )
    ).not.toThrow();

    const saved = saveIndicator(director, {
      ...unassigned,
      plantelIds: [1]
    });

    expect(saved.plantelScopeSource).toBe("manual");
    expect(listIndicators(bachillerato16).some((item) => item.code === "1.0.0.0.2")).toBe(true);
    expect(listIndicators(bachillerato4).some((item) => item.code === "1.0.0.0.2")).toBe(false);
    const template = templateForIndicator(saved, bachillerato16);

    expect(template.initialRows.every((row) => row.plantel === "Bachillerato 16")).toBe(true);
    expect(() =>
      assertCaptureAccess(
        bachillerato16,
        {
          plantelId: 1,
          indicadorId: saved.id,
          payload: { rows: template.initialRows, justificacion: "Captura con fuente oficial" }
        },
        "submit"
      )
    ).not.toThrow();
    expect(() =>
      assertCaptureAccess(
        bachillerato4,
        { plantelId: 2, indicadorId: saved.id },
        "read"
      )
    ).toThrow(SigiForbiddenError);
  });

  it("allows director and assigned responsable review only inside official plantel scope", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const indicator = saveIndicator(director, {
      ...getIndicatorByCode("1.0.0.0.2")!,
      plantelIds: [1]
    });
    const assignedResponsable = sessionFromHeaders({
      "x-role": "responsable",
      "x-responsable-id": String(indicator.responsibleIds[0])
    });
    const unassignedResponsableId = Array.from({ length: 99 }, (_, index) => index + 1)
      .find((id) => !indicator.responsibleIds.includes(id))!;
    const unassignedResponsable = sessionFromHeaders({
      "x-role": "responsable",
      "x-responsable-id": String(unassignedResponsableId)
    });

    expect(() =>
      assertCaptureAccess(director, { plantelId: 1, indicadorId: indicator.id }, "review")
    ).not.toThrow();
    expect(() =>
      assertCaptureAccess(director, { plantelId: 2, indicadorId: indicator.id }, "review")
    ).toThrow(SigiForbiddenError);
    expect(() =>
      assertCaptureAccess(assignedResponsable, { plantelId: 1, indicadorId: indicator.id }, "review")
    ).not.toThrow();
    expect(() =>
      assertCaptureAccess(assignedResponsable, { plantelId: 2, indicadorId: indicator.id }, "review")
    ).toThrow(SigiForbiddenError);
    expect(() =>
      assertCaptureAccess(unassignedResponsable, { plantelId: 1, indicadorId: indicator.id }, "review")
    ).toThrow(SigiForbiddenError);
  });

  it("preserves official plantel values for director and filters them for plantel sessions", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const bachillerato16 = sessionFromHeaders({ "x-role": "plantel", "x-plantel-id": "1" });
    const indicator = getIndicatorByCode("B16-FMT-01-D2B34193-enlaces-unidades-de-aten");

    expect(indicator).toBeDefined();

    const directorTemplate = templateForIndicator(indicator!, director);
    const directorPlanteles = new Set(directorTemplate.initialRows.map((row) => row.plantel));

    expect(directorPlanteles.size).toBeGreaterThan(1);
    expect(directorPlanteles).toContain("Bachillerato 1");
    expect(directorPlanteles).toContain("Bachillerato 16");
    expect(directorTemplate.initialRows.some((row) => row.nombre_completo)).toBe(true);

    const plantelTemplate = templateForIndicator(indicator!, bachillerato16);

    expect(plantelTemplate.initialRows.length).toBeGreaterThan(0);
    expect(plantelTemplate.initialRows.every((row) => row.plantel === "Bachillerato 16")).toBe(true);
    expect(plantelTemplate.initialRows.some((row) => row.nombre_completo)).toBe(true);
  });

  it("does not treat manual empty plantel scope as global access", () => {
    const director = sessionFromHeaders({ "x-role": "director" });

    expect(() =>
      saveIndicator(director, {
        code: "TMP-EMPTY-SCOPE",
        name: "Indicador temporal sin plantel",
        dataType: "text",
        responsibleNames: ["Liliana Yunuen Rojas Maciel"],
        contributorNames: ["Planteles"],
        activities: ["Actividad sin plantel"],
        plantelIds: []
      })
    ).toThrow(SigiValidationError);
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
      plantel: "Indicadores oficiales y Bachillerato 16",
      topLevelFiles: 4,
      nestedFiles: 1013,
      workbookCount: 69,
      worksheetCount: 97
    });
    expect(sources.summary.worksheetNonEmptyRows).toBe(1715);
    expect(sources.evidenceGroups).toHaveLength(81);
    expect(sources.workbookSummaries).toHaveLength(69);
  });

  it("includes official evidence groups in Bachillerato 16 report exports", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const report = buildReportPayload(director, { plantelId: "1", now: new Date("2026-06-12T00:00:00.000Z") });
    const officialSources = report.indicadores.find((indicator) => indicator.id === "fuentes-oficiales-cargadas");

    expect(officialSources).toBeDefined();
    expect(report.indicadores.every((indicator) => Boolean(indicator.id))).toBe(true);
    expect(report.indicadores.flatMap((indicator) => indicator.datos).every((row) => Boolean(row.registro_id))).toBe(true);
    expect(officialSources?.datos).toHaveLength(81);
    expect(officialSources?.datos.reduce((total, row) => total + row.evidencias, 0)).toBe(1013);
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

  it("exports captured template details in report rows", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const indicator = saveIndicator(director, {
      code: "TMP-REPORT-DETAIL",
      name: "Indicador temporal para reporte completo",
      dataType: "number",
      responsibleNames: ["Liliana Yunuen Rojas Maciel"],
      contributorNames: ["Planteles"],
      activities: ["Actividad con detalle"],
      plantelIds: [1],
      templateColumns: [
        { key: "plantel", label: "Plantel", type: "readonly" },
        { key: "actividad", label: "Actividad", type: "readonly" },
        { key: "mujeres", label: "Mujeres", type: "number" },
        { key: "hombres", label: "Hombres", type: "number" },
        { key: "observaciones", label: "Observaciones", type: "text" }
      ]
    });

    createCaptureDraft({
      plantelId: 1,
      indicadorId: indicator.id,
      actividadId: 1,
      periodoId: 1,
      responsableId: indicator.primaryResponsibleId,
      payload: {
        rows: [{
          plantel: "Bachillerato 16",
          actividad: "Actividad con detalle",
          mujeres: 12,
          hombres: 10,
          observaciones: "Dato importado y editable"
        }]
      }
    });

    const report = buildReportPayload(director, { plantelId: "1", periodo: "2026-2" });
    const reportRow = report.indicadores
      .find((item) => item.id === "TMP-REPORT-DETAIL")
      ?.datos[0];

    expect(reportRow?.detalle).toEqual(expect.arrayContaining([
      { campo: "Mujeres", valor: "12" },
      { campo: "Hombres", valor: "10" },
      { campo: "Observaciones", valor: "Dato importado y editable" }
    ]));
  });

  it("repairs replacement characters from client-submitted report text", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const indicator = saveIndicator(director, {
      code: "TMP-REPORT-ENCODING",
      name: "Indicador temporal para reporte con acentos",
      dataType: "number",
      responsibleNames: ["Adriana Ruiz Rivera"],
      contributorNames: ["Planteles"],
      activities: ["Titulación"],
      plantelIds: [1],
      templateColumns: [
        { key: "plantel", label: "Plantel", type: "readonly" },
        { key: "delegacion", label: "Delegación", type: "readonly" },
        { key: "programa", label: "Programa", type: "text" }
      ]
    });

    createCaptureDraft({
      plantelId: 1,
      indicadorId: indicator.id,
      actividadId: 1,
      periodoId: 1,
      responsableId: indicator.primaryResponsibleId,
      payload: {
        rows: [{
          plantel: "Bachillerato 16",
          delegacion: "Villa de \uFFFDlvarez",
          programa: "T\uFFFDcnico Analista Programador"
        }]
      }
    });

    const report = buildReportPayload(director, { plantelId: "1", periodo: "2026-2" });
    const reportRow = report.indicadores
      .find((item) => item.id === "TMP-REPORT-ENCODING")
      ?.datos[0];

    expect(reportRow?.detalle).toEqual(expect.arrayContaining([
      { campo: "Delegación", valor: "Villa de Álvarez" },
      { campo: "Programa", valor: "Técnico Analista Programador" }
    ]));
  });

  it("builds the official health integral matrix for indicator 1.1.2.1.4", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1"
    });
    const indicator = saveIndicator(director, {
      ...getIndicatorByCode("1.1.2.1.4")!,
      plantelIds: [1]
    });

    expect(indicator).toBeDefined();
    expect(indicator.activities).toEqual(expect.arrayContaining([
      "Promoción de la salud",
      "Clínica Universitaria de Atención Psicológica",
      "Número de servicios y acciones de Desarrollo Integral dirigidos al estudiantado"
    ]));

    const directorTemplate = templateForIndicator(indicator, director);
    expect(directorTemplate.initialRows.every((row) => typeof row.plantel === "string")).toBe(true);

    const template = templateForIndicator(indicator, plantel);

    expect(template.showTotals).toBe(true);
    expect(template.columns.map((column) => [column.key, column.type])).toEqual([
      ["plantel", "readonly"],
      ["nota_anotar_solo_la_actividad_desarrollada_unida", "text"],
      ["nota_anotar_solo_la_actividad_desarrollada_unida_2", "text"],
      ["nota_anotar_solo_la_actividad_desarrollada_unida_3", "text"],
      ["febrero_agosto_2026_m", "number"],
      ["febrero_agosto_2026_h", "number"],
      ["febrero_agosto_2026_t", "number"],
      ["agosto_enero_2027_m", "number"],
      ["agosto_enero_2027_h", "number"],
      ["agosto_enero_2027_t", "number"]
    ]);
    expect(template.initialRows.every((row) => row.plantel === "Bachillerato 16")).toBe(true);

    expect(() =>
      assertCaptureAccess(
        plantel,
        {
          plantelId: 1,
          indicadorId: indicator.id,
          payload: {
            rows: [{
              ...template.initialRows[0],
              nota_anotar_solo_la_actividad_desarrollada_unida: "Servicios médicos",
              nota_anotar_solo_la_actividad_desarrollada_unida_2: "DGDI",
              nota_anotar_solo_la_actividad_desarrollada_unida_3: "CUAP",
              febrero_agosto_2026_m: 4,
              febrero_agosto_2026_h: 5,
              agosto_enero_2027_m: 6,
              agosto_enero_2027_h: 7
            }]
          }
        },
        "draft"
      )
    ).not.toThrow();

    expect(() =>
      assertCaptureAccess(
        plantel,
        {
          plantelId: 1,
          indicadorId: indicator.id,
          payload: { rows: [{ ...template.initialRows[0], columna_invalida: 1 }] }
        },
        "draft"
      )
    ).toThrow(SigiValidationError);
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
        expectedKeys: [
          "nombre_de_la_charla",
          "ponente",
          "fecha_de_la_actividad",
          "total_estudiantes_asistentes_mujeres",
          "total_docentes_asistentes_hombres"
        ],
        sampleValues: {
          nombre_de_la_charla: "Adopta una Prepa",
          ponente: "DGEMS",
          fecha_de_la_actividad: "2026-06-22",
          total_estudiantes_asistentes_mujeres: 30,
          total_estudiantes_asistentes_hombres: 20,
          total_docentes_asistentes_mujeres: 3,
          total_docentes_asistentes_hombres: 2
        }
      },
      {
        code: "B16-FMT-01-43FE55CA-formacion-docente-2026",
        expectedKeys: ["tipo_de_evento", "nombre_del_evento", "poblacion_docente_nms_h", "poblacion_docente_nms_m", "poblacion_docente_nms_total"],
        sampleValues: {
          tipo_de_evento: "Curso",
          nombre_del_evento: "Capacitación docente",
          duracion_en_horas: 12,
          modalidad: "Presencial",
          competencias_desarrolladas: "Didácticas",
          evento_organizado_por: "DGEMS",
          poblacion_docente_nms_h: 4,
          poblacion_docente_nms_m: 6
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
      const indicator = saveIndicator(director, {
        ...getIndicatorByCode(code)!,
        plantelIds: [1]
      });
      expect(indicator).toBeDefined();

      const template = templateForIndicator(indicator, director);
      const keys = template.columns.map((column) => column.key);

      expectedKeys.forEach((key) => expect(keys).toContain(key));
      expect(template.initialRows.length).toBeGreaterThan(0);

      expect(() =>
        assertCaptureAccess(
          plantel,
          {
            plantelId: 1,
            indicadorId: indicator.id,
            payload: {
              rows: [{
                ...template.initialRows[0],
                ...sampleValues
              }]
            }
          },
          "draft"
        )
      ).not.toThrow();

      expect(() =>
        assertCaptureAccess(
          plantel,
          {
            plantelId: 1,
            indicadorId: indicator.id,
            payload: { rows: [{ ...template.initialRows[0], columna_inventada: 1 }] }
          },
          "draft"
        )
      ).toThrow(SigiValidationError);
    });
  });

  it("generates readable official templates and allows plantel capture when the official import has no narrower scope", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1"
    });

    listIndicators(director)
      .filter((indicator) => indicator.plantelScopeSource === "official-import")
      .forEach((indicator) => {
      const template = templateForIndicator(indicator, director);
      const importedScope = officialIndicatorPlantelScopes[indicator.code] ?? [];
      const allowsPlantel =
        indicator.plantelIds.includes(1) ||
        importedScope.includes(1) ||
        (indicator.plantelScopeSource === "official-import" && indicator.plantelIds.length === 0 && importedScope.length === 0);

      expect(template.columns.length, indicator.code).toBeGreaterThan(0);
      expect(template.initialRows.length, indicator.code).toBeGreaterThan(0);
      expect(template.initialRows.length, indicator.code).toBeGreaterThanOrEqual(1);
      const isVisibleToPlantel = listIndicators(plantel).some((item) => item.code === indicator.code);
      if (template.columns.some((column) => column.key === "plantel")) {
        expect(template.initialRows.every((row) => typeof row.plantel === "string"), indicator.code).toBe(true);
      }

      const draftAttempt = () =>
        assertCaptureAccess(
          plantel,
          {
            plantelId: 1,
            indicadorId: indicator.id,
            payload: { rows: [template.initialRows[0]] }
          },
          "draft"
        );

      expect(isVisibleToPlantel).toBe(allowsPlantel);

      if (allowsPlantel) {
        expect(draftAttempt).not.toThrow();
      } else {
        expect(draftAttempt).toThrow(SigiForbiddenError);
      }

      const assigned = saveIndicator(director, {
        ...indicator,
        plantelIds: [1]
      });
      const assignedTemplate = templateForIndicator(assigned, plantel);

      if (assignedTemplate.columns.some((column) => column.key === "plantel")) {
        expect(assignedTemplate.initialRows.every((row) => row.plantel === "Bachillerato 16"), indicator.code).toBe(true);
      }

      expect(() =>
        assertCaptureAccess(
          plantel,
          {
            plantelId: 1,
            indicadorId: assigned.id,
            payload: { rows: [assignedTemplate.initialRows[0]] }
          },
          "draft"
        )
      ).not.toThrow();
    });
  });

  it("blocks captures for indicators that are not assigned to the requested plantel", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "2"
    });
    const indicator = saveIndicator(director, {
      ...getIndicatorByCode("1.0.0.0.2")!,
      plantelIds: [1]
    });

    expect(indicator).toBeDefined();
    expect(() =>
      assertCaptureAccess(
        plantel,
        {
          plantelId: 2,
          indicadorId: indicator.id,
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
