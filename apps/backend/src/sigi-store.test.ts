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
  listIndicatorHistory,
  listUsers,
  officialSourcesPayload,
  reloadSigiStateFromPersistence,
  saveIndicator,
  saveUser,
  sessionFromHeaders,
  templateForIndicator,
  updateOwnPassword,
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

    expect(officialCatalogStats.uniqueIndicators).toBe(14);
    expect(officialCatalogStats.operationalRows).toBe(20);
    expect(officialCatalogStats.templateRows).toBe(1);
    expect(officialCatalogStats.templateVariantRows).toBe(3);
    expect(officialCatalogStats.pendingMappingRows).toBe(4);
    expect(officialDataSummary.workbookCount).toBe(30);
    expect(Object.keys(officialWorkbookTemplates)).toHaveLength(28);
    expect(indicators).toHaveLength(14);
    expect(indicators.length).toBeGreaterThan(0);
    expect(indicators.every((indicator) => !indicator.code.startsWith("FMT-") && !indicator.code.includes("-FMT-"))).toBe(true);
    expect(indicators.some((indicator) => indicator.code === "1.1.1.1.1")).toBe(false);
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
    const director = sessionFromHeaders({ "x-role": "director" });
    const visibleCodes = new Set(listIndicators(director).map((indicator) => indicator.code));
    const catalogSourceCodes = Array.from(new Set(officialCatalogRows.map((row) => row.sourceCode).filter(Boolean)));
    const operationalCodes = Array.from(new Set(
      officialCatalogRows
        .filter((row) => row.classification === "operational" && row.visible)
        .map((row) => row.code)
    ));
    const hiddenCodes = new Set(
      officialCatalogRows
        .filter((row) => row.classification !== "operational" || !row.visible)
        .flatMap((row) => [row.code, row.sourceCode])
    );

    expect(catalogSourceCodes.length).toBe(28);
    expect(operationalCodes).toHaveLength(14);
    expect(operationalCodes.filter((code) => !visibleCodes.has(code))).toEqual([]);
    expect(Array.from(hiddenCodes).some((code) => visibleCodes.has(code))).toBe(false);
  });

  it("converts official Excel attendance formulas into calculated template columns", () => {
    const nivelacionTemplate = Object.values(officialWorkbookTemplates).find((template) =>
      template.sourceLabel.includes("NIVELACION ACADEMICA")
    );

    expect(nivelacionTemplate).toBeDefined();
    expect(nivelacionTemplate?.columns.find((column) => column.key === "atencion")).toMatchObject({
      type: "calculated",
      calculation: {
        type: "percentage",
        numeratorKey: "cantidad_estudiantes_que_asistieron_t",
        denominatorKey: "matricula_t",
        decimals: 2
      }
    });
    expect(
      nivelacionTemplate?.initialRows.some((row) =>
        Object.values(row).some((value) => String(value).trim().startsWith("="))
      )
    ).toBe(false);
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

  it("updates the active user's password only after validating the current password", () => {
    const director = sessionFromHeaders({ "x-role": "director" });

    expect(() =>
      updateOwnPassword(director, {
        currentPassword: "incorrecta",
        newPassword: "Nueva2026!",
        confirmPassword: "Nueva2026!"
      })
    ).toThrow(SigiValidationError);

    expect(() =>
      updateOwnPassword(director, {
        currentPassword: "Director2026!",
        newPassword: "corta",
        confirmPassword: "corta"
      })
    ).toThrow(SigiValidationError);

    expect(() =>
      updateOwnPassword(director, {
        currentPassword: "Director2026!",
        newPassword: "Nueva2026!",
        confirmPassword: "Distinta2026!"
      })
    ).toThrow(SigiValidationError);

    expect(updateOwnPassword(director, {
      currentPassword: "Director2026!",
      newPassword: "Nueva2026!",
      confirmPassword: "Nueva2026!"
    })).toMatchObject({ id: "director-1" });
    expect(authenticateUser("director", "Director2026!")).toBeUndefined();
    expect(authenticateUser("director", "Nueva2026!")).toMatchObject({ id: "director-1" });
    updateOwnPassword(director, {
      currentPassword: "Nueva2026!",
      newPassword: "Director2026!",
      confirmPassword: "Director2026!"
    });
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

  it("scopes indicator history to the responsible user's assigned indicators", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const assigned = saveIndicator(director, {
      code: "TMP-HISTORY-ASSIGNED",
      name: "Indicador temporal asignado al responsable",
      dataType: "text",
      responsibleNames: ["Liliana Yunuen Rojas Maciel"],
      contributorNames: ["Planteles"],
      activities: ["Actividad de historial"],
      plantelIds: [1]
    });
    const unassigned = saveIndicator(director, {
      code: "TMP-HISTORY-UNASSIGNED",
      name: "Indicador temporal asignado a otro responsable",
      dataType: "text",
      responsibleNames: ["Adriana Ruiz Rivera"],
      contributorNames: ["Planteles"],
      activities: ["Actividad externa"],
      plantelIds: [1]
    });
    const responsable = sessionFromHeaders({
      "x-role": "responsable",
      "x-responsable-id": String(assigned.responsibleIds[0])
    });
    const history = listIndicatorHistory(responsable);
    const directorHistory = listIndicatorHistory(director);

    expect(history.some((item) => item.code === assigned.code)).toBe(true);
    expect(history.some((item) => item.code === unassigned.code)).toBe(false);
    expect(history.find((item) => item.code === assigned.code)).toMatchObject({
      action: "Creado",
      updatedBy: "Director DGEMS",
      active: true
    });
    expect(directorHistory.some((item) => item.code === unassigned.code)).toBe(true);
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
    expect(previousCycle.indicadores.flatMap((indicator) => indicator.datos).length).toBeLessThan(
      currentCycle.indicadores.flatMap((indicator) => indicator.datos).length
    );
    expect(currentCycle.indicadores.flatMap((indicator) => indicator.datos).some((row) => row.plantel === "Bachillerato 16")).toBe(true);
    expect(bachillerato16.indicadores.some((indicator) => indicator.id === "1.0.0.0.2")).toBe(true);
    expect(bachillerato4.indicadores.some((indicator) => indicator.id === "1.0.0.0.2")).toBe(true);
    expect(() => buildReportPayload(director, { plantelId: "999", periodo: "2026-2" })).toThrow(SigiValidationError);
  });

  it("applies report status filters", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const invalidStatus = buildReportPayload(director, { estado: "NO_EXISTE", periodo: "2026-2" });
    const drafts = buildReportPayload(director, { estado: "Borrador", periodo: "2026-2" });

    expect(invalidStatus.indicadores).toHaveLength(0);
    expect(drafts.indicadores.flatMap((indicator) => indicator.datos).length).toBeGreaterThan(0);
    expect(drafts.indicadores.flatMap((indicator) => indicator.datos).every((row) => row.estado === "Borrador")).toBe(true);
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

  it("keeps academy workbook formats internal instead of exposing them as indicators", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const academyRows = officialCatalogRows.filter((row) => row.officialCode === "1.1.1.1.1");
    const adriana = listUsers(director).find((user) => user.name === "Adriana Ruiz Rivera");
    const visibleCodes = new Set(listIndicators(director).map((indicator) => indicator.code));

    expect(academyRows).toHaveLength(2);
    expect(academyRows.every((row) => row.classification !== "operational" && !row.visible)).toBe(true);
    expect(officialWorkbookTemplates["1.1.1.1.1"]).toBeDefined();
    expect(officialWorkbookTemplates["1.1.1.1.1-FMT-489662BE"]).toBeDefined();
    expect(getIndicatorByCode("1.1.1.1.1")).toBeUndefined();
    expect(visibleCodes.has("1.1.1.1.1")).toBe(false);
    expect(adriana?.indicatorCodes).not.toContain("1.1.1.1.1");
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

  it("allows plantel users to read only their own report scope", () => {
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1"
    });
    const report = buildReportPayload(plantel, {
      plantelId: "2",
      cicloEscolar: "2025-2026",
      periodo: "2026-2"
    });

    expect(report.tipoReporte).toBe("plantel");
    expect(report.identidadReporte).toMatchObject({
      tipo: "Plantel",
      nombre: "Bachillerato 16"
    });
    expect(report.indicadores.flatMap((indicator) => indicator.datos).every((row) => row.plantelId === "1")).toBe(true);
  });

  it("exposes the complete official source package as sanitized structured data", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const sources = officialSourcesPayload(director);

    expect(sources.summary).toMatchObject({
      plantel: "Indicadores oficiales",
      topLevelFiles: 4,
      nestedFiles: 32,
      workbookCount: 30,
      worksheetCount: 44
    });
    expect(sources.summary.worksheetNonEmptyRows).toBe(402);
    expect(sources.evidenceGroups).toHaveLength(11);
    expect(sources.workbookSummaries).toHaveLength(30);
  });

  it("keeps official ZIP evidence groups outside report exports", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const sources = officialSourcesPayload(director);
    const report = buildReportPayload(director, { plantelId: "1", now: new Date("2026-06-12T00:00:00.000Z") });
    const officialSources = report.indicadores.find((indicator) => indicator.id === "fuentes-oficiales-cargadas");

    expect(sources.evidenceGroups).toHaveLength(11);
    expect(sources.evidenceGroups.reduce((total, group) => total + group.fileCount, 0)).toBe(32);
    expect(officialSources).toBeUndefined();
    expect(report.indicadores.every((indicator) => Boolean(indicator.id))).toBe(true);
    expect(report.indicadores.flatMap((indicator) => indicator.datos).every((row) => Boolean(row.registro_id))).toBe(true);
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
    const previousPeriodReport = buildReportPayload(director, {
      plantelId: "1",
      cicloEscolar: "2024-2025",
      periodo: "2025-2"
    });
    const reportRow = report.indicadores
      .find((item) => item.id === "TMP-REPORT-DETAIL")
      ?.datos[0];
    const previousPeriodRow = previousPeriodReport.indicadores
      .find((item) => item.id === "TMP-REPORT-DETAIL")
      ?.datos[0];

    expect(reportRow?.detalle).toEqual(expect.arrayContaining([
      { campo: "Mujeres", valor: "12" },
      { campo: "Hombres", valor: "10" },
      { campo: "Observaciones", valor: "Dato importado y editable" }
    ]));
    expect(previousPeriodRow?.captureId).toBeUndefined();
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
      "PROMOCIÓN DE LA SALUD"
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
        code: "1.1.2.2.10",
        expectedKeys: ["nombre_de_la_actividad", "descripcion_de_la_actividad", "total_estudiantes_mujeres", "total_estudiantes_hombres"],
        sampleValues: {
          nombre_de_la_actividad: "Acción ambiental",
          descripcion_de_la_actividad: "Campaña de reciclaje",
          total_estudiantes_mujeres: 7,
          total_estudiantes_hombres: 8
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
        code: "FMT-01-43FE55CA-formacion-docente-2026",
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
        code: "FMT-01-E81E8473-41221-porcentaje-de-uo-q",
        expectedKeys: ["dependencia_area", "actividad", "descripcion", "total_de_equipos", "equipos_atendidos"],
        sampleValues: {
          dependencia_area: "DGEMS",
          actividad: "Mantenimiento preventivo",
          descripcion: "Revisión de equipos",
          total_de_equipos: 10,
          equipos_atendidos: "8"
        }
      }
    ];

    cases.forEach(({ code, expectedKeys, sampleValues }) => {
      const existingIndicator = getIndicatorByCode(code);
      if (!existingIndicator) {
        const internalTemplate = officialWorkbookTemplates[code];
        const internalKeys = internalTemplate?.columns.map((column) => column.key) ?? [];

        expect(internalTemplate).toBeDefined();
        expectedKeys.forEach((key) => expect(internalKeys).toContain(key));
        expect(listIndicators(director).some((indicator) => indicator.code === code)).toBe(false);
        return;
      }

      const indicator = saveIndicator(director, {
        ...existingIndicator,
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
