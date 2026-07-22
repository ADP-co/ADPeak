import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { officialCatalogRows, officialCatalogStats, officialIndicatorPlantelScopes } from "./official-catalog.generated.js";
import { officialDataSummary, officialWorkbookTemplates } from "./official-data.generated.js";
import {
  approveCapture,
  createCaptureDraft,
  requestCaptureCorrection,
  resetCaptureDraftsForTest,
  sendCaptureToReview,
  updateCaptureDraft
} from "./capture-store.js";
import {
  assertCaptureAccess,
  assertEvidenceOpenedBeforeApproval,
  authenticateUser,
  authenticateUserResult,
  buildReportPayload,
  createSessionToken,
  deactivateIndicator,
  deactivateUser,
  getIndicatorByCode,
  listAuditEvents,
  listAuditEventsForTest,
  listIndicators,
  listIndicatorHistory,
  listNotifications,
  listReviewCaptures,
  listUsers,
  markNotificationRead,
  mergeInitialIndicatorsForTest,
  mergeInitialUsersForTest,
  officialSourcesPayload,
  planteles,
  recordAuditEvent,
  recordCaptureNotification,
  reconcilePersistedAssignments,
  reloadSigiStateFromPersistence,
  resolveOfficialResponsibleId,
  resetUserPassword,
  recordEvidenceOpened,
  resetAuditEventsForTest,
  resetNotificationsForTest,
  saveIndicator,
  saveUser,
  sessionFromHeaders,
  templateForIndicator,
  updateOwnPassword,
  SigiAuthError,
  SigiForbiddenError,
  SigiValidationError,
  templateSessionForPlantelScope
} from "./sigi-store.js";

describe("SIGI store and RBAC", () => {
  beforeEach(() => {
    resetCaptureDraftsForTest();
    resetNotificationsForTest();
    resetAuditEventsForTest();
    reloadSigiStateFromPersistence();
  });

  const evidencePdf = () => {
    const content = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n", "ascii");

    return {
      nombre: "evidencia-qa.pdf",
      tipo: "application/pdf",
      tamanoBytes: content.length,
      contenidoBase64: content.toString("base64")
    };
  };
  const evidencePdfWithContent = evidencePdf;

  const completedRowsForTemplate = (template: ReturnType<typeof templateForIndicator>) =>
    template.initialRows.map((row, rowIndex) => {
      const completed: Record<string, unknown> = { ...row };

      for (const column of template.columns) {
        if (column.type === "readonly" || column.type === "calculated") {
          continue;
        }

        const value = completed[column.key];
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          continue;
        }

        completed[column.key] = column.type === "number" ? 1 : `Dato ${rowIndex + 1}`;
      }

      return completed;
    });

  const completedReviewPayload = (template: ReturnType<typeof templateForIndicator>) => ({
    rows: completedRowsForTemplate(template),
    justificacion: "Captura completa con evidencia oficial.",
    evidencia: evidencePdf()
  });

  const columnKeyByLabel = (template: ReturnType<typeof templateForIndicator>, ...tokens: string[]) => {
    const normalizedTokens = tokens.map((token) => token.toLowerCase());
    const column = template.columns.find((item) => {
      const normalizedLabel = item.label.toLowerCase();
      return normalizedTokens.every((token) => normalizedLabel.includes(token));
    });

    if (!column) {
      throw new Error(`No se encontró columna para ${tokens.join(", ")}`);
    }

    return column.key;
  };

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
    const titulation = indicators.find((indicator) => indicator.code === "1.0.0.0.2");
    const bachillerato4 = sessionFromHeaders({ "x-role": "plantel", "x-plantel-id": "2" });

    expect(titulation?.effectivePlantelIds).toEqual(officialIndicatorPlantelScopes["1.0.0.0.2"]);
    expect(listIndicators(bachillerato4).some((indicator) => indicator.code === "1.0.0.0.2")).toBe(true);
    expect(listUsers(director).some((user) => user.role === "responsable" && user.indicatorCodes.length > 1)).toBe(true);
    expect(listUsers(director).filter((user) => user.role === "responsable")).toHaveLength(18);
    expect(listUsers(director).filter((user) => user.role === "responsable").map((user) => user.username)).toEqual(
      Array.from({ length: 18 }, (_, index) => `resp${String(index + 1).padStart(2, "0")}`)
    );
  });

  it("maps abbreviated ZIP responsible names to the canonical official account", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const angel = listUsers(director).find((user) => user.username === "resp02");

    expect(getIndicatorByCode("4.1.1.0.1")).toMatchObject({
      primaryResponsibleId: 2,
      responsibleIds: [2],
      responsibleNames: ["Angel Ordoñez Ayala"]
    });
    expect(getIndicatorByCode("4.1.1.1.1")).toMatchObject({
      primaryResponsibleId: 2,
      responsibleIds: [2],
      responsibleNames: ["Angel Ordoñez Ayala"]
    });
    expect(angel?.indicatorCodes).toEqual(expect.arrayContaining(["4.1.1.0.1", "4.1.1.1.1"]));
  });

  it("rejects unmapped ZIP responsible names instead of defaulting to responsible 1", () => {
    expect(() => resolveOfficialResponsibleId("Responsable ZIP desconocido"))
      .toThrow('No existe una cuenta oficial para el responsable importado "Responsable ZIP desconocido".');
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

    const titulationTemplate = officialWorkbookTemplates["1.0.0.0.2"];
    expect(titulationTemplate?.columns.find((column) => column.key === "egresados_titulados_en_el_ano_2025_total")).toMatchObject({
      type: "calculated",
      calculation: {
        type: "sum",
        sourceKeys: [
          "egresados_titulados_en_el_ano_2025_mujeres",
          "egresados_titulados_en_el_ano_2025_hombres"
        ]
      }
    });
    expect(titulationTemplate?.columns.find((column) => column.key === "matricula_de_primer_ingreso_de_la_misma_cohorte__3")).toMatchObject({
      type: "calculated",
      calculation: {
        type: "sum",
        sourceKeys: [
          "matricula_de_primer_ingreso_de_la_misma_cohorte_",
          "matricula_de_primer_ingreso_de_la_misma_cohorte__2"
        ]
      }
    });
    expect(titulationTemplate?.columns.find((column) => column.key === "de_titulacion_por_cohorte")).toMatchObject({
      type: "calculated",
      calculation: {
        type: "percentage",
        numeratorKey: "egresados_titulados_en_el_ano_2025_total",
        denominatorKey: "matricula_de_primer_ingreso_de_la_misma_cohorte__3",
        decimals: 2
      }
    });
  });

  it("removes stale responsible IDs and rebuilds names and user assignments", () => {
    const source = getIndicatorByCode("4.1.1.1.1");
    expect(source).toBeDefined();

    const result = reconcilePersistedAssignments(
      [{
        ...source!,
        primaryResponsibleId: 2,
        responsibleIds: [2, 11, 13],
        responsibleNames: ["Angel Ordoñez", "gael2", "Andy"]
      }],
      [{
        id: "responsable-2",
        username: "resp02",
        name: "Angel Ordoñez",
        role: "responsable",
        responsableId: 2,
        indicatorCodes: ["1.0.0.0.2"],
        active: true,
        passwordHash: "test"
      }]
    );

    expect(result.indicators[0]).toMatchObject({
      primaryResponsibleId: 2,
      responsibleIds: [2],
      responsibleNames: ["Angel Ordoñez"]
    });
    expect(result.users[0].indicatorCodes).toEqual(["4.1.1.1.1"]);
  });

  it("uses one canonical responsible label for base report rows", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const source = getIndicatorByCode("1.1.2.5.3");
    expect(source).toBeDefined();

    saveIndicator(director, {
      ...source!,
      primaryResponsibleId: 2,
      responsibleIds: [1, 2],
      responsibleNames: ["Adriana Ruiz Rivera", "Angel Ordoñez Ayala"],
      plantelIds: [3],
      operationalScope: "specific_planteles",
      contributorNames: ["Planteles"]
    });

    const report = buildReportPayload(director, {
      tipo: "avance",
      plantelId: "3",
      periodo: "2026-A"
    });
    const labels = report.indicadores.flatMap((indicator) =>
      indicator.id === source!.code ? indicator.datos.map((row) => row.responsable) : []
    );

    expect(labels.length).toBeGreaterThan(0);
    expect(new Set(labels)).toEqual(new Set([
      "Principal: Angel Ordoñez Ayala; Revisores: Adriana Ruiz Rivera"
    ]));
  });

  it("preserves an official plantel scope when the director saves its effective ids unchanged", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const original = getIndicatorByCode("1.0.0.0.2")!;
    const saved = saveIndicator(director, {
      ...original,
      operationalScope: "specific_planteles",
      plantelIds: officialIndicatorPlantelScopes[original.code]
    });

    expect(saved.plantelScopeSource).toBe("official-import");
    expect(saved.plantelIds).toEqual([]);
    expect(listIndicators(director).find((indicator) => indicator.code === original.code)?.effectivePlantelIds)
      .toEqual(officialIndicatorPlantelScopes[original.code]);
  });

  it("rejects plantel context for an indicator assigned only to specific responsables", () => {
    const responsable = sessionFromHeaders({ "x-role": "responsable", "x-responsable-id": "1" });
    const indicator = {
      ...getIndicatorByCode("1.0.0.0.2")!,
      operationalScope: "specific_responsables" as const,
      plantelIds: [],
      contributorResponsibleIds: [1],
      contributorNames: ["Adriana Ruiz Rivera"]
    };

    expect(() => templateSessionForPlantelScope(responsable, indicator, 1)).toThrow(SigiForbiddenError);
  });

  it("exposes sanitized calculation references that point to real template keys", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const template = templateForIndicator(getIndicatorByCode("1.0.0.0.2")!, director);
    const keys = new Set(template.columns.map((column) => column.key));

    for (const column of template.columns) {
      if (column.type !== "calculated" || !column.calculation) {
        continue;
      }

      if (column.calculation.type === "sum") {
        expect(column.calculation.sourceKeys.every((key) => keys.has(key))).toBe(true);
      }

      if (column.calculation.type === "percentage") {
        expect(keys.has(column.calculation.numeratorKey)).toBe(true);
        expect(keys.has(column.calculation.denominatorKey)).toBe(true);
      }
    }
  });

  it("preserves the complete official template when only indicator metadata is saved", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const original = getIndicatorByCode("1.0.0.0.2")!;
    const before = templateForIndicator(original, director);
    const saved = saveIndicator(director, {
      id: original.id,
      code: original.code,
      name: original.name,
      description: original.description,
      dataType: original.dataType,
      period: original.period,
      active: original.active,
      primaryResponsibleId: original.primaryResponsibleId,
      responsibleIds: original.responsibleIds,
      responsibleNames: original.responsibleNames,
      contributorResponsibleIds: original.contributorResponsibleIds,
      contributorNames: original.contributorNames,
      activities: original.activities,
      operationalScope: original.operationalScope
    });
    const after = templateForIndicator(saved, director);

    expect(saved.templateColumns).toBeUndefined();
    expect(saved.templateStructureCustomized).not.toBe(true);
    expect(after.headerRows).toEqual(before.headerRows);
    expect(after.initialRows).toEqual(before.initialRows);
    expect(after.columns).toEqual(before.columns);
    expect(after.columns.find((column) => column.key === "de_titulacion_por_cohorte")?.calculation)
      .toMatchObject({ type: "percentage", decimals: 2 });
  });

  it("migrates a degraded official column projection back to its workbook template", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const original = getIndicatorByCode("1.0.0.0.2")!;
    const officialTemplate = templateForIndicator(original, director);
    const degraded = {
      ...original,
      templateColumns: officialTemplate.columns,
      templateStructureCustomized: undefined
    };
    const migrated = mergeInitialIndicatorsForTest([degraded]).find((indicator) => indicator.code === original.code)!;
    const recoveredTemplate = templateForIndicator(migrated, director);

    expect(migrated.templateColumns).toBeUndefined();
    expect(migrated.templateStructureCustomized).not.toBe(true);
    expect(recoveredTemplate.headerRows).toEqual(officialTemplate.headerRows);
    expect(recoveredTemplate.initialRows).toEqual(officialTemplate.initialRows);
    expect(recoveredTemplate.columns).toEqual(officialTemplate.columns);
  });

  it("keeps an explicitly marked safe custom structure for an official indicator", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const original = getIndicatorByCode("1.0.0.0.2")!;
    const customColumns = [
      { key: "registro_custom", label: "Registro personalizado", type: "text" as const }
    ];
    const migrated = mergeInitialIndicatorsForTest([{
      ...original,
      templateColumns: customColumns,
      templateStructureCustomized: true
    }]).find((indicator) => indicator.code === original.code)!;

    expect(migrated.templateStructureCustomized).toBe(true);
    expect(migrated.templateColumns).toEqual(expect.arrayContaining([
      expect.objectContaining(customColumns[0])
    ]));
    expect(templateForIndicator(migrated, director).headerRows).toBeUndefined();
  });

  it("normalizes persisted responsible contributors away from an impossible none scope", () => {
    const original = getIndicatorByCode("1.0.0.0.2")!;
    const migrated = mergeInitialIndicatorsForTest([{
      ...original,
      operationalScope: "none",
      contributorResponsibleIds: [1],
      contributorNames: ["Adriana Ruiz Rivera"],
      plantelIds: []
    }]).find((indicator) => indicator.code === original.code)!;

    expect(migrated.operationalScope).toBe("specific_responsables");
    expect(migrated.contributorResponsibleIds).toEqual([1]);
  });

  it("rejects unknown, duplicate and empty structural configuration values", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const base = {
      code: "QA-CONFIG-STRICT",
      name: "Configuración estricta",
      dataType: "number" as const,
      activities: ["Actividad"]
    };

    expect(() => saveIndicator(director, {
      ...base,
      responsibleNames: ["Responsable inexistente"],
      contributorNames: ["Planteles"],
      operationalScope: "all_planteles"
    })).toThrow(/No existe el responsable/);

    expect(() => saveIndicator(director, {
      ...base,
      responsibleIds: [1, 1],
      responsibleNames: ["Adriana Ruiz Rivera", "Adriana Ruiz Rivera"],
      contributorNames: ["Planteles"],
      operationalScope: "all_planteles"
    })).toThrow(/más de una vez/);

    expect(() => saveIndicator(director, {
      ...base,
      responsibleIds: [1],
      responsibleNames: ["Adriana Ruiz Rivera"],
      contributorNames: ["Planteles"],
      operationalScope: "all_planteles",
      templateColumns: [{ key: "sin_nombre", label: "", type: "number" }]
    })).toThrow(/debe tener un nombre/);
  });

  it("authenticates delivery users without exposing password hashes", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const users = listUsers(director);

    expect(authenticateUser("director", "TestDirector-Only!")).toMatchObject({
      id: "director-1",
      role: "admin"
    });
    expect(authenticateUser("admin", "TestDirector-Only!")).toMatchObject({
      id: "director-1",
      role: "admin"
    });
    expect(authenticateUser("administrador", "TestDirector-Only!")).toMatchObject({
      id: "director-1",
      role: "admin"
    });
    expect(authenticateUser("Director DGEMS", "TestDirector-Only!")).toMatchObject({
      id: "director-1",
      role: "admin"
    });
    expect(authenticateUser("resp01", "TestResponsible-Only!")).toMatchObject({
      role: "responsable",
      responsableId: 1
    });
    expect(authenticateUser("bach16", "TestPlantel-Only!")).toMatchObject({
      role: "plantel",
      plantelId: 1
    });
    expect(authenticateUser("bach35", "TestPlantel-Only!")).toMatchObject({
      role: "plantel"
    });
    expect(authenticateUser("bachlinea", "TestPlantel-Only!")).toMatchObject({
      role: "plantel"
    });
    expect(authenticateUser("iuba", "TestPlantel-Only!")).toMatchObject({
      role: "plantel"
    });
    expect(authenticateUser("director", "incorrecta")).toBeUndefined();
    expect(users.some((user) => "passwordHash" in user)).toBe(false);
  });

  it("requires passwords for new responsible users and persists their indicator assignments", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const targetCode = "1.0.0.0.2";

    expect(() => saveUser(director, {
      name: "Responsable QA sin contraseña",
      role: "responsable",
      indicatorCodes: [targetCode]
    })).toThrow(SigiValidationError);

    const created = saveUser(director, {
      name: "Responsable QA Temporal",
      role: "responsable",
      password: "Temporal2026!",
      indicatorCodes: [targetCode]
    });

    expect(created.username).toMatch(/^resp\d+$/);
    expect(authenticateUser(created.username ?? "", "Temporal2026!")).toMatchObject({
      id: created.id,
      role: "responsable"
    });

    const responsableSession = sessionFromHeaders({
      "x-user-id": created.id,
      "x-role": "responsable",
      "x-responsable-id": String(created.responsableId)
    });

    expect(listIndicators(responsableSession).map((indicator) => indicator.code)).toContain(targetCode);
    expect(getIndicatorByCode(targetCode)?.responsibleIds).toContain(created.responsableId);

    saveUser(director, {
      id: created.id,
      name: created.name,
      role: "responsable",
      responsableId: created.responsableId,
      indicatorCodes: [],
      active: true
    });

    expect(listIndicators(responsableSession).map((indicator) => indicator.code)).not.toContain(targetCode);
    expect(getIndicatorByCode(targetCode)?.responsibleIds).not.toContain(created.responsableId);
  });

  it("rejects duplicate usernames when creating or updating users", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const responsibleUsers = listUsers(director).filter((user) => user.role === "responsable");
    const first = responsibleUsers[0];
    const second = responsibleUsers[1];

    expect(first).toBeDefined();
    expect(second).toBeDefined();

    expect(() => saveUser(director, {
      name: "Responsable con usuario repetido",
      username: first.username,
      role: "responsable",
      password: "Temporal2026!",
      indicatorCodes: []
    })).toThrow("Ese nombre de usuario ya está registrado.");

    expect(() => saveUser(director, {
      id: second.id,
      name: second.name,
      username: ` ${first.username?.toUpperCase()} `,
      role: "responsable",
      responsableId: second.responsableId,
      indicatorCodes: second.indicatorCodes,
      active: second.active
    })).toThrow("Ese nombre de usuario ya está registrado.");

    expect(() => saveUser(director, {
      name: "Responsable con alias reservado",
      username: "admin",
      role: "responsable",
      password: "Temporal2026!",
      indicatorCodes: []
    })).toThrow("Ese nombre de usuario ya está registrado.");
  });

  it("preserves official account credentials and status during catalog migrations", () => {
    const persistedUsers = [
      {
        id: "responsable-1",
        username: "responsable-personalizado",
        name: "Responsable Personalizado",
        role: "responsable" as const,
        responsableId: 1,
        indicatorCodes: ["codigo-obsoleto"],
        active: false,
        passwordHash: "hash-personalizado"
      },
      {
        id: "plantel-1",
        username: "plantel-personalizado",
        name: "Plantel Personalizado",
        role: "plantel" as const,
        plantelId: 1,
        indicatorCodes: ["codigo-obsoleto"],
        active: true,
        passwordHash: "hash-plantel-personalizado"
      },
      {
        id: "responsable-99",
        username: "temporal",
        name: "Temporal",
        role: "responsable" as const,
        responsableId: 99,
        indicatorCodes: [],
        active: true,
        passwordHash: "hash-temporal"
      }
    ];

    const migrated = mergeInitialUsersForTest(persistedUsers, true);
    const responsible = migrated.find((user) => user.id === "responsable-1");
    const plantel = migrated.find((user) => user.id === "plantel-1");

    expect(migrated).toHaveLength(56);
    expect(migrated.some((user) => user.id === "responsable-99")).toBe(false);
    expect(responsible).toMatchObject({
      username: "responsable-personalizado",
      name: "Responsable Personalizado",
      active: false,
      passwordHash: "hash-personalizado"
    });
    expect(responsible?.indicatorCodes).not.toContain("codigo-obsoleto");
    expect(plantel).toMatchObject({
      username: "plantel-personalizado",
      name: "Plantel Personalizado",
      active: true,
      passwordHash: "hash-plantel-personalizado",
      indicatorCodes: []
    });
  });

  it("allows creating configurable temporary indicators from administration", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const indicator = saveIndicator(director, {
      code: "TMP-QA-INDICADOR",
      name: "Indicador QA configurable",
      responsibleNames: ["Adriana Ruiz Rivera"],
      contributorNames: ["Planteles"],
      activities: ["Captura configurada"],
      templateColumns: [
        { key: "hombres_primer_ingreso", label: "Hombres primer ingreso", type: "number" },
        { key: "mujeres_primer_ingreso", label: "Mujeres primer ingreso", type: "number" }
      ]
    });

    expect(indicator).toMatchObject({
      code: "TMP-QA-INDICADOR",
      name: "Indicador QA configurable",
      active: true
    });
    expect(indicator.plantelIds.length).toBeGreaterThan(0);
    expect(templateForIndicator(indicator, director).columns.map((column) => column.label)).toEqual([
      "Hombres primer ingreso",
      "Mujeres primer ingreso"
    ]);
  });

  it("updates the active user's password only after validating the current password", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const authenticatedDirector = authenticateUser("director", "TestDirector-Only!")!;
    const tokenBeforeChange = createSessionToken(authenticatedDirector);

    expect(() =>
      updateOwnPassword(director, {
        currentPassword: "incorrecta",
        newPassword: "Nueva2026!",
        confirmPassword: "Nueva2026!"
      })
    ).toThrow(SigiValidationError);

    expect(() =>
      updateOwnPassword(director, {
        currentPassword: "TestDirector-Only!",
        newPassword: "corta",
        confirmPassword: "corta"
      })
    ).toThrow(SigiValidationError);

    expect(() =>
      updateOwnPassword(director, {
        currentPassword: "TestDirector-Only!",
        newPassword: "Nueva2026!",
        confirmPassword: "Distinta2026!"
      })
    ).toThrow(SigiValidationError);

    expect(updateOwnPassword(director, {
      currentPassword: "TestDirector-Only!",
      newPassword: "Nueva2026!",
      confirmPassword: "Nueva2026!"
    })).toMatchObject({ id: "director-1" });
    expect(authenticateUser("director", "TestDirector-Only!")).toBeUndefined();
    expect(authenticateUser("director", "Nueva2026!")).toMatchObject({ id: "director-1" });
    expect(() => sessionFromHeaders({ authorization: `Bearer ${tokenBeforeChange}` })).toThrow(SigiAuthError);
    const renewedToken = createSessionToken(authenticateUser("director", "Nueva2026!")!);
    expect(sessionFromHeaders({ authorization: `Bearer ${renewedToken}` })).toMatchObject({ userId: "director-1" });
    updateOwnPassword(director, {
      currentPassword: "Nueva2026!",
      newPassword: "TestDirector-Only!",
      confirmPassword: "TestDirector-Only!"
    });
  });

  it("rejects signed session tokens whose expiration is missing or not an integer", () => {
    const user = authenticateUser("director", "TestDirector-Only!")!;
    const validToken = createSessionToken(user);
    const [encodedPayload] = validToken.split(".");
    const originalPayload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Record<string, unknown>;
    const sign = (payload: Record<string, unknown>) => {
      const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
      const secret = process.env.AUTH_SECRET || process.env.SIGI_AUTH_SECRET || "adpeak-local-session-secret-change-me";
      const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
      return `${encoded}.${signature}`;
    };
    const missingExpiration = { ...originalPayload };
    delete missingExpiration.exp;
    const fractionalExpiration = {
      ...originalPayload,
      exp: Math.floor(Date.now() / 1000) + 600.5
    };

    expect(() => sessionFromHeaders({ authorization: `Bearer ${sign(missingExpiration)}` })).toThrow(SigiAuthError);
    expect(() => sessionFromHeaders({ authorization: `Bearer ${sign(fractionalExpiration)}` })).toThrow(SigiAuthError);
    expect(sessionFromHeaders({ authorization: `Bearer ${validToken}` })).toMatchObject({ userId: "director-1" });
  });

  it("lets the director reset non-admin passwords without changing assignments", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const created = saveUser(director, {
      name: "Responsable QA Reset",
      role: "responsable",
      password: "Anterior2026!",
      indicatorCodes: ["1.0.0.0.2"]
    });
    const authenticatedBeforeReset = authenticateUser(created.username ?? "", "Anterior2026!")!;
    const tokenBeforeReset = createSessionToken(authenticatedBeforeReset);
    expect(sessionFromHeaders({ authorization: `Bearer ${tokenBeforeReset}` })).toMatchObject({
      userId: created.id
    });

    expect(() =>
      resetUserPassword(director, created.id, {
        password: "corta",
        confirmPassword: "corta"
      })
    ).toThrow(SigiValidationError);
    expect(() =>
      resetUserPassword(director, created.id, {
        password: "Nueva2026!",
        confirmPassword: "Distinta2026!"
      })
    ).toThrow(SigiValidationError);

    const updated = resetUserPassword(director, created.id, {
      password: "Nueva2026!",
      confirmPassword: "Nueva2026!"
    });

    expect(updated).toMatchObject({
      id: created.id,
      indicatorCodes: ["1.0.0.0.2"]
    });
    expect(authenticateUser(created.username ?? "", "Anterior2026!")).toBeUndefined();
    expect(authenticateUser(created.username ?? "", "Nueva2026!")).toMatchObject({ id: created.id });
    expect(() => sessionFromHeaders({ authorization: `Bearer ${tokenBeforeReset}` })).toThrow(SigiAuthError);
    expect(() =>
      resetUserPassword(director, "director-1", {
        password: "Otra2026!",
        confirmPassword: "Otra2026!"
      })
    ).toThrow(SigiValidationError);
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
      indicatorCodes: [],
      password: "RespQA2026!"
    })).toMatchObject({ role: "responsable" });
  });

  it("reports blocked users separately from invalid credentials", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const blocked = saveUser(director, {
      name: "Responsable bloqueado",
      username: "resp-bloqueado",
      role: "responsable",
      responsableId: 98,
      indicatorCodes: ["1.0.0.0.2"],
      password: "TestResponsible-Only!"
    });

    deactivateUser(director, blocked.id);

    expect(authenticateUser("resp-bloqueado", "TestResponsible-Only!")).toBeUndefined();
    expect(authenticateUserResult("resp-bloqueado", "TestResponsible-Only!")).toMatchObject({
      reason: "inactive_user"
    });
    expect(authenticateUserResult("resp-bloqueado", "incorrecta")).toMatchObject({
      reason: "inactive_user"
    });
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

  it("persists and enforces every explicit operational scope", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const plantel1 = sessionFromHeaders({ "x-role": "plantel", "x-plantel-id": "1" });
    const plantel2 = sessionFromHeaders({ "x-role": "plantel", "x-plantel-id": "2" });
    const base = {
      name: "Indicador de alcance QA",
      dataType: "number" as const,
      responsibleNames: ["Adriana Ruiz Rivera"],
      activities: ["Actividad de alcance"],
      templateColumns: [{ key: "valor", label: "Valor", type: "number" as const }]
    };
    const allPlanteles = saveIndicator(director, {
      ...base,
      code: "QA-SCOPE-ALL",
      operationalScope: "all_planteles",
      contributorNames: ["Planteles"]
    });
    const specificPlantel = saveIndicator(director, {
      ...base,
      code: "QA-SCOPE-PLANTEL",
      operationalScope: "specific_planteles",
      contributorNames: ["Planteles"],
      plantelIds: [2]
    });
    const specificResponsible = saveIndicator(director, {
      ...base,
      code: "QA-SCOPE-RESP",
      operationalScope: "specific_responsables",
      contributorNames: ["Adriana Ruiz Rivera"],
      contributorResponsibleIds: [1]
    });
    const noOperationalScope = saveIndicator(director, {
      ...base,
      code: "QA-SCOPE-NONE",
      operationalScope: "none",
      contributorNames: []
    });
    const responsable = sessionFromHeaders({
      "x-role": "responsable",
      "x-responsable-id": String(specificResponsible.responsibleIds[0])
    });

    expect(allPlanteles.operationalScope).toBe("all_planteles");
    expect(specificPlantel).toMatchObject({ operationalScope: "specific_planteles", plantelIds: [2] });
    expect(specificResponsible).toMatchObject({
      operationalScope: "specific_responsables",
      plantelIds: [],
      contributorResponsibleIds: [1]
    });
    expect(noOperationalScope).toMatchObject({ operationalScope: "none", plantelIds: [] });
    expect(listIndicators(plantel1).some((item) => item.code === allPlanteles.code)).toBe(true);
    expect(listIndicators(plantel2).some((item) => item.code === allPlanteles.code)).toBe(true);
    expect(listIndicators(plantel1).some((item) => item.code === specificPlantel.code)).toBe(false);
    expect(listIndicators(plantel2).some((item) => item.code === specificPlantel.code)).toBe(true);
    expect(listIndicators(plantel1).some((item) => item.code === specificResponsible.code)).toBe(false);
    expect(listIndicators(plantel1).some((item) => item.code === noOperationalScope.code)).toBe(false);
    expect(listIndicators(responsable).some((item) => item.code === specificResponsible.code)).toBe(true);
    expect(listIndicators(responsable).some((item) => item.code === noOperationalScope.code)).toBe(true);

    const assignmentNotifications = listNotifications(responsable).filter((notification) =>
      notification.eventType === "assignment_changed" && notification.indicadorCodigo === specificResponsible.code
    );
    expect(assignmentNotifications).toHaveLength(1);

    saveIndicator(director, specificResponsible);
    expect(listNotifications(responsable).filter((notification) =>
      notification.eventType === "assignment_changed" && notification.indicadorCodigo === specificResponsible.code
    )).toHaveLength(1);
  });

  it("scopes indicator history to the responsible user's assigned indicators", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const assigned = saveIndicator(director, {
      code: "QA-HISTORY-ASSIGNED",
      name: "Indicador temporal asignado al responsable",
      dataType: "text",
      responsibleNames: ["Liliana Yunuen Rojas Maciel"],
      contributorNames: ["Planteles"],
      activities: ["Actividad de historial"],
      plantelIds: [1]
    });
    const unassigned = saveIndicator(director, {
      code: "QA-HISTORY-UNASSIGNED",
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

  it("allows only directors to read audit events and returns them newest first", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const plantel = sessionFromHeaders({ "x-role": "plantel", "x-plantel-id": "1" });

    recordAuditEvent(plantel, {
      action: "capture_saved",
      resourceType: "capture",
      resourceId: "41",
      status: "ok",
      requestId: "req-older"
    });
    recordAuditEvent(director, {
      action: "capture_approved",
      resourceType: "capture",
      resourceId: "41",
      status: "ok",
      requestId: "req-newer"
    });

    expect(() => listAuditEvents(plantel)).toThrow(SigiForbiddenError);
    expect(listAuditEvents(director).map((event) => event.requestId)).toEqual([
      "req-newer",
      "req-older"
    ]);
  });

  it("records a correction submission as capture_resubmitted in the audit trail", () => {
    const plantel = sessionFromHeaders({ "x-role": "plantel", "x-plantel-id": "1" });
    const resubmitted = recordAuditEvent(plantel, {
      action: "capture_submitted",
      resourceType: "capture",
      resourceId: "81",
      before: { estado: "correccion_solicitada", versionActual: 2 },
      after: { estado: "en_revision", versionActual: 3 },
      status: "ok"
    });
    const submitted = recordAuditEvent(plantel, {
      action: "capture_submitted",
      resourceType: "capture",
      resourceId: "82",
      before: { estado: "borrador", versionActual: 1 },
      after: { estado: "en_revision", versionActual: 2 },
      status: "ok"
    });

    expect(resubmitted.action).toBe("capture_resubmitted");
    expect(submitted.action).toBe("capture_submitted");
  });

  it("sanitizes audit snapshots and bounds request IDs before persistence", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const longRequestId = `request-${"x".repeat(300)}`;

    const recorded = recordAuditEvent(director, {
      action: "capture_updated",
      resourceType: "capture",
      resourceId: "52",
      before: {
        password: "plain-password",
        passwordHash: "password-hash",
        sessionToken: "session-token-value",
        cookie: "session=cookie-value",
        authorization: "Bearer authorization-value",
        storageRef: "private/evidence.pdf",
        contenidoBase64: Buffer.from("private evidence").toString("base64"),
        sha256: "a".repeat(64),
        nested: {
          safeField: "visible",
          attachment: "data:application/pdf;base64,private-data"
        }
      },
      after: {
        estado: "borrador",
        rows: [{ resultado: 12 }]
      },
      status: "ok",
      requestId: longRequestId
    });
    const stored = JSON.stringify(recorded);
    const listed = JSON.stringify(listAuditEvents(director));

    expect(recorded.requestId).toHaveLength(128);
    expect(recorded.requestId).toBe(longRequestId.slice(0, 128));
    expect(stored).toContain('"safeField":"visible"');
    expect(stored).toContain('"attachment":"[omitido]"');
    expect(stored).not.toMatch(/plain-password|password-hash|session-token-value|cookie-value|authorization-value|private\/evidence|private-data/);
    expect(stored).not.toMatch(/passwordHash|sessionToken|contenidoBase64|storageRef|sha256|authorization|cookie/);
    expect(listed).toBe(stored.startsWith("[") ? stored : `[${stored}]`);
  });

  it("scopes report indicators for responsible users", () => {
    const responsable = sessionFromHeaders({
      "x-role": "responsable",
      "x-responsable-id": "1"
    });
    const assigned = listIndicators(responsable).find((indicator) =>
      indicator.plantelIds.length === 0 || indicator.plantelIds.includes(1)
    )!;
    const template = templateForIndicator(assigned, responsable);

    createCaptureDraft({
      plantelId: 1,
      indicadorId: assigned.id,
      actividadId: 1,
      periodoId: 1,
      responsableId: assigned.primaryResponsibleId,
      payload: {
        rows: template.initialRows,
        justificacion: "Captura real para reporte de responsable."
      }
    });

    const assignedCodes = listIndicators(responsable).map((indicator) => indicator.code);
    const report = buildReportPayload(responsable, {
      cicloEscolar: "2025-2026",
      periodo: "2026-2"
    });

    expect(report.tipoReporte).toBe("responsable");
    expect(report.indicadores.length).toBeGreaterThan(0);
    expect(report.indicadores.every((indicator) => assignedCodes.includes(indicator.id))).toBe(true);
    expect(report.indicadores.flatMap((indicator) => indicator.datos).every((row) => row.plantelId === "1")).toBe(true);
  });

  it("rejects plantel-scoped report filters for responsible users", () => {
    const responsable = sessionFromHeaders({
      "x-role": "responsable",
      "x-responsable-id": "1"
    });

    expect(() =>
      buildReportPayload(responsable, {
        plantelId: "1",
        cicloEscolar: "2025-2026",
        periodo: "2026-2"
      })
    ).toThrow(SigiForbiddenError);
  });

  it("builds detailed reports from captured row values, including non-template fields", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const indicator = saveIndicator(director, {
      ...getIndicatorByCode("1.0.0.0.2")!,
      plantelIds: [1]
    });

    createCaptureDraft({
      plantelId: 1,
      indicadorId: indicator.id,
      actividadId: 1,
      periodoId: 1,
      responsableId: indicator.responsibleIds[0],
      payload: {
        rows: [{
          plantel: "Bachillerato 16",
          actividad: "Captura de egresados titulados",
          programa: "Técnico Analista Programador",
          egresados_mujeres: 12,
          egresados_hombres: 10,
          observacion_especial: "Dato almacenado en la captura"
        }],
        justificacion: "Datos completos para reporte detallado."
      }
    });

    const report = buildReportPayload(director, {
      plantelId: "1",
      cicloEscolar: "2025-2026",
      periodo: "2026-2",
      tipo: "detalle"
    });
    const row = report.indicadores.find((item) => item.id === indicator.code)?.datos[0];

    expect(report.vistaReporte).toBe("detalle");
    expect(row?.detalle).toEqual(expect.arrayContaining([
      { campo: "Programa", valor: "Técnico Analista Programador" },
      { campo: "Egresados Mujeres", valor: "12" },
      { campo: "Egresados Hombres", valor: "10" },
      { campo: "Observacion Especial", valor: "Dato almacenado en la captura" }
    ]));
  });

  it("derives report progress from the official calculated percentage regardless of capture status", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const indicator = getIndicatorByCode("1.0.0.0.2")!;
    const draft = createCaptureDraft({
      plantelId: 1,
      indicadorId: indicator.id,
      actividadId: 1,
      periodoId: 1,
      responsableId: indicator.primaryResponsibleId,
      payload: {
        rows: [{
          plantel: "Bachillerato 16",
          programa_educativo: "Programa de prueba",
          egresados_titulados_en_el_ano_2025_mujeres: 30,
          egresados_titulados_en_el_ano_2025_hombres: 10,
          matricula_de_primer_ingreso_de_la_misma_cohorte_: 60,
          matricula_de_primer_ingreso_de_la_misma_cohorte_2: 20
        }],
        justificacion: "Captura para comprobar el porcentaje oficial calculado."
      }
    });

    sendCaptureToReview(draft.id);
    const inReview = buildReportPayload(director, {
      plantelId: "1",
      cicloEscolar: "2025-2026",
      periodo: "2026-2"
    });
    approveCapture(draft.id);
    const approved = buildReportPayload(director, {
      plantelId: "1",
      cicloEscolar: "2025-2026",
      periodo: "2026-2"
    });

    expect(inReview.indicadores.flatMap((item) => item.datos).find((row) => row.captureId === draft.id)?.avance).toBe("50%");
    expect(approved.indicadores.flatMap((item) => item.datos).find((row) => row.captureId === draft.id)?.avance).toBe("50%");
  });

  it("returns no report rows for unknown or inconsistent periods", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const unknown = buildReportPayload(director, {
      cicloEscolar: "2098-2099",
      periodo: "2099-X"
    });
    const inconsistent = buildReportPayload(director, {
      cicloEscolar: "2024-2025",
      periodo: "2026-2"
    });

    expect(unknown.periodo).toBe("2099-X");
    expect(unknown.indicadores).toHaveLength(0);
    expect(inconsistent.indicadores).toHaveLength(0);
  });

  it("filters overdue rows by an explicit deadline and keeps undated drafts in time", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const indicator = getIndicatorByCode("1.0.0.0.2")!;
    const undatedIndicator = getIndicatorByCode("1.1.2.1.4")!;
    const overdueDraft = createCaptureDraft({
      plantelId: 1,
      indicadorId: indicator.id,
      actividadId: 1,
      periodoId: 1,
      responsableId: indicator.primaryResponsibleId,
      payload: {
        rows: [{ plantel: "Bachillerato 16", fecha_limite: "2026-06-30" }],
        justificacion: "Captura con fecha limite vencida."
      }
    });
    const undatedDraft = createCaptureDraft({
      plantelId: 0,
      indicadorId: undatedIndicator.id,
      actividadId: 1,
      periodoId: 1,
      responsableId: undatedIndicator.primaryResponsibleId,
      payload: {
        rows: [{ plantel: "Bachillerato 4" }],
        justificacion: "Captura sin fecha limite."
      }
    });
    const now = new Date("2026-07-01T12:00:00.000Z");
    const allRows = buildReportPayload(director, { periodo: "2026-2", now })
      .indicadores.flatMap((item) => item.datos);
    const overdueRows = buildReportPayload(director, { periodo: "2026-2", estado: "Atrasado", now })
      .indicadores.flatMap((item) => item.datos);

    expect(allRows.find((row) => row.captureId === overdueDraft.id)?.vencimiento).toBe("atrasado");
    expect(allRows.find((row) => row.captureId === undatedDraft.id)?.vencimiento).toBe("en_tiempo");
    expect(overdueRows.map((row) => row.captureId)).toEqual([overdueDraft.id]);
  });

  it("keeps every detail column when repeated labels represent different periods", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const indicator = getIndicatorByCode("1.1.2.1.4")!;
    const draft = createCaptureDraft({
      plantelId: 0,
      indicadorId: indicator.id,
      actividadId: 1,
      periodoId: 1,
      responsableId: indicator.primaryResponsibleId,
      payload: {
        rows: [{
          plantel: "Bachillerato 16",
          febrero_agosto_2026_m: 5,
          agosto_enero_2027_m: 7
        }],
        justificacion: "Captura con columnas homonimas de distintos periodos."
      }
    });
    const row = buildReportPayload(director, {
      periodo: "2026-2",
      tipo: "detalle"
    }).indicadores.flatMap((item) => item.datos).find((item) => item.captureId === draft.id);

    expect(row?.detalle).toEqual(expect.arrayContaining([
      { campo: "M (Febrero Agosto 2026 M)", valor: "5" },
      { campo: "M (Agosto Enero 2027 M)", valor: "7" }
    ]));
  });

  it("keeps report filters explicit and respects official plantel scope", () => {
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
    expect(currentCycle.indicadores.flatMap((indicator) => indicator.datos).every((row) =>
      row.exportable === false && row.blockingIssues?.includes("No hay registros capturados para este indicador.")
    )).toBe(true);
    expect(previousCycle.indicadores.flatMap((indicator) => indicator.datos).length).toBeLessThan(
      currentCycle.indicadores.flatMap((indicator) => indicator.datos).length
    );
    expect(currentCycle.indicadores.flatMap((indicator) => indicator.datos).some((row) => row.plantel === "Bachillerato 16")).toBe(true);
    expect(bachillerato16.indicadores.some((indicator) => indicator.id === "1.0.0.0.2")).toBe(true);
    expect(bachillerato4.indicadores.some((indicator) => indicator.id === "1.0.0.0.2")).toBe(false);
    expect(() => buildReportPayload(director, { plantelId: "999", periodo: "2026-2" })).toThrow(SigiValidationError);
  });

  it("applies report status filters", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const invalidStatus = buildReportPayload(director, { estado: "NO_EXISTE", periodo: "2026-2" });
    const misleadingStatus = buildReportPayload(director, { estado: "NO_PENDIENTE", periodo: "2026-2" });
    const drafts = buildReportPayload(director, { estado: "Borrador", periodo: "2026-2" });

    expect(invalidStatus.indicadores).toHaveLength(0);
    expect(misleadingStatus.indicadores).toHaveLength(0);
    expect(drafts.indicadores.flatMap((indicator) => indicator.datos).length).toBeGreaterThan(0);
    expect(drafts.indicadores.flatMap((indicator) => indicator.datos).every((row) => row.estado === "Borrador")).toBe(true);
    expect(() => buildReportPayload(director, { tipo: "NO_EXISTE", periodo: "2026-2" }))
      .toThrow(/tipo de reporte/i);
  });

  it("keeps imported official indicators out of plantel scope until director assigns one", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const bachillerato16 = sessionFromHeaders({ "x-role": "plantel", "x-plantel-id": "1" });
    const bachillerato4 = sessionFromHeaders({ "x-role": "plantel", "x-plantel-id": "2" });
    const indicator = listIndicators(director).find((item) =>
      item.plantelScopeSource === "official-import" &&
      item.plantelIds.length === 0 &&
      !officialIndicatorPlantelScopes[item.code]?.length
    );
    expect(indicator).toBeDefined();
    const responsable = sessionFromHeaders({
      "x-role": "responsable",
      "x-responsable-id": String(indicator?.responsibleIds[0] ?? 1)
    });
    const unassigned = saveIndicator(director, {
      ...indicator!,
      plantelIds: []
    });

    expect(indicator?.plantelIds).toEqual([]);
    expect(unassigned.plantelScopeSource).toBe("official-import");
    expect(listIndicators(responsable).some((item) => item.code === unassigned.code)).toBe(true);
    expect(listIndicators(bachillerato16).some((item) => item.code === unassigned.code)).toBe(false);
    expect(listIndicators(bachillerato4).some((item) => item.code === unassigned.code)).toBe(false);
    expect(() =>
      assertCaptureAccess(
        responsable,
        {
          plantelId: 1,
          indicadorId: unassigned.id,
          payload: completedReviewPayload(templateForIndicator(unassigned, responsable))
        },
        "submit"
      )
    ).toThrow(SigiForbiddenError);
    expect(() =>
      assertCaptureAccess(
        bachillerato16,
        { plantelId: 1, indicadorId: unassigned.id },
        "read"
      )
    ).toThrow(SigiForbiddenError);

    const saved = saveIndicator(director, {
      ...unassigned,
      plantelIds: [1]
    });

    expect(saved.plantelScopeSource).toBe("manual");
    expect(listIndicators(bachillerato16).some((item) => item.code === unassigned.code)).toBe(true);
    expect(listIndicators(bachillerato4).some((item) => item.code === unassigned.code)).toBe(false);
    const template = templateForIndicator(saved, bachillerato16);

    if (template.columns.some((column) => column.key === "plantel")) {
      expect(template.initialRows.every((row) => row.plantel === "Bachillerato 16")).toBe(true);
    }
    expect(() =>
      assertCaptureAccess(
        bachillerato16,
        {
          plantelId: 1,
          indicadorId: saved.id,
          payload: completedReviewPayload(template)
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

  it("prevents assigned responsables from creating and submitting captures as plantel", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const indicator = saveIndicator(director, {
      ...getIndicatorByCode("1.0.0.0.2")!,
      plantelIds: [1]
    });
    const responsable = sessionFromHeaders({
      "x-role": "responsable",
      "x-responsable-id": String(indicator.responsibleIds[0])
    });
    const unassignedResponsable = sessionFromHeaders({
      "x-role": "responsable",
      "x-responsable-id": "99"
    });
    const template = templateForIndicator(indicator, responsable);
    const payload = completedReviewPayload(template);

    expect(() =>
      assertCaptureAccess(responsable, { plantelId: 1, indicadorId: indicator.id, payload }, "draft")
    ).toThrow(SigiForbiddenError);
    expect(() =>
      assertCaptureAccess(responsable, { plantelId: 1, indicadorId: indicator.id, payload }, "submit")
    ).toThrow(SigiForbiddenError);
    expect(() =>
      assertCaptureAccess(unassignedResponsable, { plantelId: 1, indicadorId: indicator.id, payload }, "draft")
    ).toThrow(SigiForbiddenError);

    const draft = createCaptureDraft({
      plantelId: 1,
      indicadorId: indicator.id,
      actividadId: 1,
      periodoId: 1,
      responsableId: indicator.responsibleIds[0],
      payload
    });
    const reviewed = sendCaptureToReview(draft.id, {
      userId: "plantel-1",
      role: "plantel"
    });

    expect(reviewed).toMatchObject({ estado: "en_revision" });
    expect(() =>
      assertCaptureAccess(responsable, { ...reviewed!, payload }, "review")
    ).not.toThrow();
  });

  it("lists review captures only for director and assigned responsables", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const indicator = saveIndicator(director, {
      ...getIndicatorByCode("1.0.0.0.2")!,
      plantelIds: [1]
    });
    const assignedResponsable = sessionFromHeaders({
      "x-role": "responsable",
      "x-responsable-id": String(indicator.responsibleIds[0])
    });
    const unassignedResponsable = sessionFromHeaders({
      "x-role": "responsable",
      "x-responsable-id": "99"
    });
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1"
    });
    const template = templateForIndicator(indicator, assignedResponsable);
    const draft = createCaptureDraft({
      plantelId: 1,
      indicadorId: indicator.id,
      actividadId: 1,
      periodoId: 1,
      responsableId: indicator.responsibleIds[0],
      payload: {
        ...completedReviewPayload(template),
        justificacion: "Captura enviada para la bandeja de revision."
      }
    });

    sendCaptureToReview(draft.id);

    expect(listReviewCaptures(director)).toMatchObject([
      {
        captureId: draft.id,
        indicadorId: indicator.id,
        code: indicator.code,
        plantelId: 1,
         periodoId: 1,
         actividadId: 1,
         estado: "en_revision",
         allowedActions: ["view", "open_evidence", "request_correction", "approve"]
      }
    ]);
    expect(listReviewCaptures(assignedResponsable)).toHaveLength(1);
    expect(listReviewCaptures(unassignedResponsable)).toHaveLength(0);
    expect(() => listReviewCaptures(plantel)).toThrow(SigiForbiddenError);

    requestCaptureCorrection(draft.id, "Corregir evidencia.");
    expect(listReviewCaptures(director)).toHaveLength(0);

    sendCaptureToReview(draft.id);
    expect(listReviewCaptures(assignedResponsable)).toHaveLength(1);

    approveCapture(draft.id);
    expect(listReviewCaptures(director)).toHaveLength(0);
  });

  it("creates internal notifications when captures move through review", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const indicator = saveIndicator(director, {
      ...getIndicatorByCode("1.0.0.0.2")!,
      plantelIds: [1]
    });
    const responsable = sessionFromHeaders({
      "x-role": "responsable",
      "x-responsable-id": String(indicator.responsibleIds[0])
    });
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1",
      "x-user-id": "plantel-1"
    });
    const template = templateForIndicator(indicator, plantel);
    const draft = createCaptureDraft({
      plantelId: 1,
      indicadorId: indicator.id,
      actividadId: 1,
      periodoId: 1,
      responsableId: indicator.responsibleIds[0],
      payload: {
        ...completedReviewPayload(template),
        justificacion: "Captura con notificación interna."
      }
    });

    const submitted = sendCaptureToReview(draft.id)!;
    recordCaptureNotification("submitted", plantel, submitted);
    recordCaptureNotification("submitted", plantel, submitted);

    const responsableNotifications = listNotifications(responsable);
    expect(responsableNotifications).toHaveLength(1);
    expect(responsableNotifications[0]).toMatchObject({
      captureId: draft.id,
      estado: "en_revision",
      eventType: "capture_submitted",
      rolDestino: "responsable",
      readAt: null
    });

    const read = markNotificationRead(responsable, responsableNotifications[0].id);
    expect(read?.readAt).toBeTruthy();

    const observed = requestCaptureCorrection(draft.id, "Ajustar evidencia.")!;
    recordCaptureNotification("correction_requested", responsable, observed);
    expect(listNotifications(plantel).some((notification) => notification.estado === "correccion_solicitada")).toBe(true);

    const resent = sendCaptureToReview(draft.id)!;
    recordCaptureNotification("resubmitted", plantel, resent);
    expect(listNotifications(responsable).some((notification) =>
      notification.eventType === "capture_resubmitted"
    )).toBe(true);
    const approved = approveCapture(resent.id)!;
    recordCaptureNotification("approved", responsable, approved);
    expect(listNotifications(plantel).some((notification) => notification.estado === "aprobado")).toBe(true);
  });

  it("returns actionable capture metadata for responsible assigned indicators", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const indicator = saveIndicator(director, {
      ...getIndicatorByCode("1.0.0.0.2")!,
      plantelIds: [1]
    });
    const responsable = sessionFromHeaders({
      "x-role": "responsable",
      "x-responsable-id": String(indicator.responsibleIds[0])
    });
    const plantel = sessionFromHeaders({ "x-role": "plantel", "x-plantel-id": "1" });
    const template = templateForIndicator(indicator, responsable);
    const pendingItem = listIndicators(responsable).find((item) => item.id === indicator.id);
    const plantelItem = listIndicators(plantel).find((item) => item.id === indicator.id);

    expect(plantelItem?.allowedActions).toEqual(
      expect.arrayContaining(["view", "capture", "submit_review"])
    );

    expect(pendingItem).toMatchObject({
      status: "Pendiente",
      plantelId: 1,
      actividadId: 1,
      periodoId: 1,
      canEdit: false,
      canReview: false,
      isReadOnly: true,
      allowedActions: ["view"]
    });

    const draft = createCaptureDraft({
      plantelId: 1,
      indicadorId: indicator.id,
      actividadId: 1,
      periodoId: 1,
      responsableId: indicator.responsibleIds[0],
      payload: {
        rows: template.initialRows,
        justificacion: "Captura usada para validar metadatos de trabajo."
      }
    });
    const underReview = sendCaptureToReview(draft.id)!;
    const reviewItem = listIndicators(responsable).find((item) => item.id === indicator.id);

    expect(reviewItem).toMatchObject({
      status: "En revisión",
      captureId: underReview.id,
      plantelId: 1,
      actividadId: 1,
      periodoId: 1,
      captureStatus: "en_revision",
      canEdit: false,
      canReview: true,
      isReadOnly: true,
      allowedActions: expect.arrayContaining(["view", "request_correction", "approve"])
    });

    approveCapture(draft.id);
    const approvedItem = listIndicators(responsable).find((item) => item.id === indicator.id);

    expect(approvedItem).toMatchObject({
      status: "Aprobado",
      captureId: draft.id,
      captureStatus: "aprobado",
      canEdit: false,
      canReview: false,
      isReadOnly: true,
      readOnlyReason: "La captura ya fue aprobada.",
      allowedActions: ["view"]
    });
  });

  it("blocks assigned responsables from editing captured data under review", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const indicator = saveIndicator(director, {
      ...getIndicatorByCode("1.0.0.0.2")!,
      plantelIds: [1]
    });
    const responsable = sessionFromHeaders({
      "x-role": "responsable",
      "x-responsable-id": String(indicator.responsibleIds[0])
    });
    const template = templateForIndicator(indicator, responsable);
    const editableColumn = template.columns.find((column) => column.type === "number" || column.type === "text");

    expect(editableColumn).toBeDefined();

    const draft = createCaptureDraft({
      plantelId: 1,
      indicadorId: indicator.id,
      actividadId: 1,
      periodoId: 1,
      responsableId: indicator.responsibleIds[0],
      payload: {
        rows: template.initialRows,
        justificacion: "Captura enviada para revision."
      }
    });
    const underReview = sendCaptureToReview(draft.id)!;
    const payload = {
      ...underReview.payload,
      rows: underReview.payload.rows.map((row, index) =>
        index === 0 && editableColumn
          ? { ...row, [editableColumn.key]: editableColumn.type === "number" ? 99 : "Actualizado por responsable" }
          : row
      )
    };

    expect(() =>
      assertCaptureAccess(responsable, { ...underReview, payload }, "draft")
    ).toThrow(SigiForbiddenError);
    expect(() =>
      assertCaptureAccess(responsable, underReview, "review")
    ).not.toThrow();
    expect(updateCaptureDraft(underReview.id, payload)).toBeUndefined();
  });

  it("keeps academy workbook formats internal instead of exposing them as indicators", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const academyRows = officialCatalogRows.filter((row) => row.officialCode === "1.1.1.1.1");
    const adriana = listUsers(director).find((user) => user.name === "Adriana Ruiz Rivera");
    const visibleCodes = new Set(listIndicators(director).map((indicator) => indicator.code));

    expect(academyRows).toHaveLength(2);
    expect(academyRows.every((row) => row.classification !== "operational" && !row.visible)).toBe(true);
    expect(officialWorkbookTemplates["1.1.1.1.1"]).toBeDefined();
    expect(
      Object.keys(officialWorkbookTemplates).some((key) => key.startsWith("1.1.1.1.1-FMT-"))
    ).toBe(true);
    expect(getIndicatorByCode("1.1.1.1.1")).toBeUndefined();
    expect(visibleCodes.has("1.1.1.1.1")).toBe(false);
    expect(adriana?.indicatorCodes).not.toContain("1.1.1.1.1");
  });

  it("removes hidden or pending workbook codes from responsible assignments", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const user = saveUser(director, {
      id: "responsable-hidden-codes",
      username: "resp-hidden-codes",
      name: "Responsable temporal",
      role: "responsable",
      responsableId: 99,
      password: "RespQA2026!",
      indicatorCodes: [
        "1.0.0.0.2",
        "1.1.1.1.1",
        "1.1.1.1.1-FMT-489662BE",
        "FMT-01-43FE55CA-formacion-docente-2026"
      ]
    });

    expect(user.indicatorCodes).toEqual(["1.0.0.0.2"]);
  });

  it("removes indicators from responsible scope when admin updates assignments", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const responsable = listUsers(director).find((user) =>
      user.role === "responsable" && user.indicatorCodes.length > 1
    );

    expect(responsable).toBeDefined();
    const [keptCode, removedCode] = responsable!.indicatorCodes;

    const updated = saveUser(director, {
      id: responsable!.id,
      name: responsable!.name,
      role: "responsable",
      responsableId: responsable!.responsableId,
      indicatorCodes: [keptCode]
    });
    const responsableSession = sessionFromHeaders({
      "x-role": "responsable",
      "x-user-id": updated.id,
      "x-responsable-id": String(updated.responsableId)
    });
    const visibleCodes = listIndicators(responsableSession).map((indicator) => indicator.code);

    expect(updated.indicatorCodes).toEqual([keptCode]);
    expect(visibleCodes).toContain(keptCode);
    expect(visibleCodes).not.toContain(removedCode);
  });

  it("notifies affected responsables and audits assignment changes made from Users", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const responsable = listUsers(director).find((user) =>
      user.role === "responsable" && user.reviewerIndicatorCodes.length > 1
    )!;
    const removedCode = responsable.reviewerIndicatorCodes[0];
    const addedIndicator = listIndicators(director).find((indicator) =>
      !responsable.indicatorCodes.includes(indicator.code)
    )!;
    const nextReviewerCodes = [
      ...responsable.reviewerIndicatorCodes.filter((code) => code !== removedCode),
      addedIndicator.code
    ];
    const responsableSession = sessionFromHeaders({
      "x-role": "responsable",
      "x-user-id": responsable.id,
      "x-responsable-id": String(responsable.responsableId)
    });

    const updated = saveUser(director, {
      id: responsable.id,
      name: responsable.name,
      role: "responsable",
      responsableId: responsable.responsableId,
      indicatorCodes: nextReviewerCodes
    });
    const effectiveUser = listUsers(director).find((user) => user.id === updated.id)!;

    const assignmentNotifications = listNotifications(responsableSession)
      .filter((notification) => notification.eventType === "assignment_changed");
    expect(assignmentNotifications).toEqual(expect.arrayContaining([
      expect.objectContaining({ indicadorCodigo: removedCode, actorUserId: director.userId }),
      expect.objectContaining({ indicadorCodigo: addedIndicator.code, actorUserId: director.userId })
    ]));
    expect(assignmentNotifications).toHaveLength(2);

    const assignmentAudit = listAuditEventsForTest().find((event) =>
      event.action === "user_indicator_assignments_changed" && event.resourceId === responsable.id
    );
    expect(assignmentAudit).toMatchObject({
      userId: director.userId,
      role: "director",
      resourceType: "user",
      before: { indicatorCodes: responsable.indicatorCodes },
      after: {
        indicatorCodes: effectiveUser.indicatorCodes,
        changes: expect.arrayContaining([
          expect.objectContaining({ codigo: removedCode, assigned: false }),
          expect.objectContaining({ codigo: addedIndicator.code, assigned: true })
        ])
      },
      status: "ok"
    });

    saveUser(director, {
      id: updated.id,
      name: updated.name,
      role: "responsable",
      responsableId: updated.responsableId,
      indicatorCodes: effectiveUser.reviewerIndicatorCodes
    });
    expect(listNotifications(responsableSession)
      .filter((notification) => notification.eventType === "assignment_changed")).toHaveLength(2);
    expect(listAuditEventsForTest()
      .filter((event) => event.action === "user_indicator_assignments_changed")).toHaveLength(1);

    saveUser(director, {
      id: responsable.id,
      name: responsable.name,
      role: "responsable",
      responsableId: responsable.responsableId,
      indicatorCodes: responsable.reviewerIndicatorCodes
    });
  });

  it("shows specific responsible contributors in their indicators without review permissions", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const resp01 = listUsers(director).find((user) => user.username === "resp01")!;
    const resp02 = listUsers(director).find((user) => user.username === "resp02")!;
    const baseIndicator = getIndicatorByCode("1.1.2.0.1")!;

    const indicator = saveIndicator(director, {
      ...baseIndicator,
      primaryResponsibleId: resp02.responsableId!,
      responsibleIds: [resp02.responsableId!],
      responsibleNames: [resp02.name],
      contributorNames: [resp01.name],
      contributorResponsibleIds: [resp01.responsableId!],
      plantelIds: []
    });
    const resp01Session = sessionFromHeaders({
      "x-user-id": resp01.id,
      "x-role": "responsable",
      "x-responsable-id": String(resp01.responsableId)
    });
    const resp02Session = sessionFromHeaders({
      "x-user-id": resp02.id,
      "x-role": "responsable",
      "x-responsable-id": String(resp02.responsableId)
    });
    const payload = completedReviewPayload(templateForIndicator(indicator, resp01Session));
    const draft = createCaptureDraft({
      plantelId: 1,
      indicadorId: indicator.id,
      actividadId: 1,
      periodoId: 1,
      responsableId: resp02.responsableId,
      payload
    });

    const underReview = sendCaptureToReview(draft.id, { userId: "plantel-1", role: "plantel" })!;
    const visible = listIndicators(resp01Session).find((item) => item.code === indicator.code);
    const updatedResp01 = listUsers(director).find((user) => user.id === resp01.id)!;

    expect(resp01.indicatorCodes).not.toContain(indicator.code);
    expect(updatedResp01.indicatorCodes).toContain(indicator.code);
    expect(updatedResp01.reviewerIndicatorCodes).not.toContain(indicator.code);
    expect(updatedResp01.contributorIndicatorCodes).toContain(indicator.code);
    expect(visible).toMatchObject({
      code: indicator.code,
      canEdit: false,
      canReview: false,
      isReadOnly: true
    });
    expect(listReviewCaptures(resp01Session)).toHaveLength(0);
    expect(listReviewCaptures(resp02Session)).toMatchObject([{ captureId: draft.id }]);
    expect(() =>
      assertCaptureAccess(resp01Session, underReview, "review")
    ).toThrow(SigiForbiddenError);
    expect(() =>
      assertCaptureAccess(resp02Session, underReview, "review")
    ).not.toThrow();
    expect(() =>
      assertCaptureAccess(
        resp01Session,
        {
          plantelId: 1,
          indicadorId: indicator.id,
          payload
        },
        "draft"
      )
    ).toThrow(SigiForbiddenError);

    saveUser(director, {
      ...updatedResp01,
      role: "responsable",
      indicatorCodes: updatedResp01.reviewerIndicatorCodes
    });
    const afterAdministrativeSave = getIndicatorByCode(indicator.code)!;
    expect(afterAdministrativeSave.responsibleIds).not.toContain(resp01.responsableId);
    expect(afterAdministrativeSave.contributorResponsibleIds).toContain(resp01.responsableId);
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

  it("keeps the complete official source package restricted to the Director", () => {
    const responsible = sessionFromHeaders({ "x-role": "responsable", "x-responsable-id": "1" });
    const plantel = sessionFromHeaders({ "x-role": "plantel", "x-plantel-id": "1" });

    expect(() => officialSourcesPayload(responsible)).toThrow(SigiForbiddenError);
    expect(() => officialSourcesPayload(plantel)).toThrow(SigiForbiddenError);
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

  it("rejects negative values in numeric capture columns", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1"
    });
    const indicator = saveIndicator(director, {
      ...getIndicatorByCode("1.0.0.0.2")!,
      plantelIds: [1]
    });
    const template = templateForIndicator(indicator, plantel);
    const rows = completedRowsForTemplate(template);
    const numericColumn = template.columns.find((column) => column.type === "number");

    expect(numericColumn).toBeDefined();
    rows[0][numericColumn!.key] = -1;

    expect(() =>
      assertCaptureAccess(
        plantel,
        {
          plantelId: 1,
          indicadorId: indicator.id,
          payload: { rows }
        },
        "draft"
      )
    ).toThrow(SigiValidationError);
    expect(() =>
      assertCaptureAccess(
        plantel,
        {
          plantelId: 1,
          indicadorId: indicator.id,
          payload: {
            rows,
            justificacion: "Captura historica con totales por recalcular."
          }
        },
        "read"
      )
    ).not.toThrow();
  });

  it("rejects decimal values in integer capture columns", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1"
    });
    const indicator = listIndicators(director).find((item) =>
      item.name.toLowerCase().includes("abandono escolar")
    )!;
    const scopedIndicator = saveIndicator(director, {
      ...indicator,
      plantelIds: [1]
    });
    const template = templateForIndicator(scopedIndicator, plantel);
    const rows = completedRowsForTemplate(template);
    const numericColumn = template.columns.find((column) => column.type === "number")!;

    rows[0][numericColumn.key] = 7.8;

    expect(() =>
      assertCaptureAccess(
        plantel,
        {
          plantelId: 1,
          indicadorId: scopedIndicator.id,
          payload: { rows }
        },
        "draft"
      )
    ).toThrow(SigiValidationError);
  });

  it("allows valid decimal percentages but rejects invalid percentage ranges", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1"
    });
    const indicator = saveIndicator(director, {
      ...getIndicatorByCode("1.1.2.0.3")!,
      plantelIds: [1]
    });
    const template = templateForIndicator(indicator, plantel);
    const rows = completedRowsForTemplate(template);
    const tasaColumn = template.columns.find((column) =>
      column.type === "number" && column.key.includes("tasa_de_reprobacion")
    )!;

    expect(tasaColumn).toBeDefined();
    rows[0][tasaColumn.key] = 7.8;

    expect(() =>
      assertCaptureAccess(
        plantel,
        {
          plantelId: 1,
          indicadorId: indicator.id,
          payload: { rows }
        },
        "draft"
      )
    ).not.toThrow();

    rows[0][tasaColumn.key] = 120;

    expect(() =>
      assertCaptureAccess(
        plantel,
        {
          plantelId: 1,
          indicadorId: indicator.id,
          payload: { rows }
        },
        "draft"
      )
    ).toThrow(SigiValidationError);
  });

  it("treats official PTC columns as integer non-negative numbers", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1"
    });
    const indicator = saveIndicator(director, {
      ...getIndicatorByCode("1.1.2.5.3")!,
      plantelIds: [1]
    });
    const template = templateForIndicator(indicator, plantel);
    const rows = completedRowsForTemplate(template);
    const ptcColumn = template.columns.find((column) =>
      column.key.includes("ptc") || column.label.toLowerCase().includes("ptc")
    )!;

    expect(ptcColumn).toMatchObject({
      type: "number",
      validation: expect.objectContaining({ min: 0, integer: true })
    });

    rows[0][ptcColumn.key] = -1;
    expect(() =>
      assertCaptureAccess(
        plantel,
        {
          plantelId: 1,
          indicadorId: indicator.id,
          payload: { rows }
        },
        "draft"
      )
    ).toThrow(SigiValidationError);

    rows[0][ptcColumn.key] = 3.5;
    expect(() =>
      assertCaptureAccess(
        plantel,
        {
          plantelId: 1,
          indicadorId: indicator.id,
          payload: { rows }
        },
        "draft"
      )
    ).toThrow(SigiValidationError);
  });

  it("persists manual template columns with formula calculations", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1"
    });
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

    const payload: { rows: Array<Record<string, unknown>> } = {
      rows: [{ plantel: "Bachillerato 16", mujeres: 12, hombres: 5 }]
    };
    assertCaptureAccess(
      plantel,
      {
        plantelId: 1,
        indicadorId: indicator.id,
        payload
      },
      "draft"
    );
    expect(payload.rows[0].total).toBe(17);
  });

  it("rejects synthetic indicator codes in production", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const previousAppEnv = process.env.APP_ENV;

    process.env.APP_ENV = "production";
    try {
      for (const code of ["TMP-NO-PUBLICAR", "FMT-01-NO-PUBLICAR", "1.2.3-FMT-VARIANTE"]) {
        expect(() => saveIndicator(director, {
          code,
          name: "Plantilla interna",
          dataType: "number",
          responsibleNames: ["Liliana Yunuen Rojas Maciel"],
          contributorNames: ["Planteles"],
          activities: ["Actividad interna"],
          plantelIds: [1]
        })).toThrow(/plantilla interna/i);
      }
    } finally {
      if (previousAppEnv === undefined) {
        delete process.env.APP_ENV;
      } else {
        process.env.APP_ENV = previousAppEnv;
      }
    }
  });

  it("rejects invalid, circular, and incoherent configurable field rules", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const base = {
      code: "TMP-FORMULA-VALIDATION",
      name: "Validacion de formulas configurables",
      dataType: "number" as const,
      responsibleNames: ["Liliana Yunuen Rojas Maciel"],
      contributorNames: ["Planteles"],
      activities: ["Actividad configurable"],
      plantelIds: [1]
    };

    expect(() => saveIndicator(director, {
      ...base,
      templateColumns: [
        { key: "mujeres", label: "Mujeres", type: "number" },
        {
          key: "total",
          label: "Total",
          type: "calculated",
          calculation: { type: "formula", expression: "=NoExiste + 1" }
        }
      ]
    })).toThrow(/campos u operadores no v[aá]lidos|campos no configurados/i);

    expect(() => saveIndicator(director, {
      ...base,
      templateColumns: [
        {
          key: "a",
          label: "A",
          type: "calculated",
          calculation: { type: "formula", expression: "=B + 1" }
        },
        {
          key: "b",
          label: "B",
          type: "calculated",
          calculation: { type: "formula", expression: "=A + 1" }
        }
      ]
    })).toThrow(/referencia circular/i);

    expect(() => saveIndicator(director, {
      ...base,
      templateColumns: [
        {
          key: "conteo",
          label: "Conteo",
          type: "number",
          validation: { min: 10, max: 5, integer: true }
        }
      ]
    })).toThrow(/m[ií]nimo.*m[aá]ximo/i);
  });

  it("disables evidence-open approval requirements when evidence itself is optional", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const indicator = saveIndicator(director, {
      code: "TMP-EVIDENCE-OPTIONAL",
      name: "Evidencia opcional",
      dataType: "number",
      responsibleNames: ["Liliana Yunuen Rojas Maciel"],
      contributorNames: ["Planteles"],
      activities: ["Actividad configurable"],
      plantelIds: [1],
      evidenceRules: {
        required: false,
        allowedTypes: ["application/pdf"],
        maxSizeMb: 5,
        requireOpenBeforeApproval: true
      }
    });

    expect(indicator.evidenceRules).toMatchObject({
      required: false,
      requireOpenBeforeApproval: false
    });
  });

  it("rejects titulation counts that exceed the matching cohort sex", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1"
    });
    const indicator = saveIndicator(director, {
      ...getIndicatorByCode("1.0.0.0.2")!,
      plantelIds: [1]
    });
    const template = templateForIndicator(indicator, plantel);
    const row = completedRowsForTemplate(template)[0];
    const keyFor = (pattern: RegExp) => template.columns.find((column) => pattern.test(column.label))!.key;

    row[keyFor(/Egresados titulados.*Mujeres/i)] = 12;
    row[keyFor(/Egresados titulados.*Hombres/i)] = 5;
    row[keyFor(/Matr[ií]cula.*Mujeres/i)] = 10;
    row[keyFor(/Matr[ií]cula.*Hombres/i)] = 20;

    expect(() =>
      assertCaptureAccess(
        plantel,
        {
          plantelId: 1,
          indicadorId: indicator.id,
          payload: { rows: [row] }
        },
        "draft"
      )
    ).toThrow(/mujeres egresadas tituladas/i);
  });

  it("exports captured template details in report rows", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const indicator = saveIndicator(director, {
      code: "QA-REPORT-DETAIL",
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
        }],
        justificacion: "Justificación capturada para el reporte.",
        evidencia: {
          nombre: "evidencia-detalle.pdf",
          tipo: "application/pdf",
          tamanoBytes: 2048
        }
      }
    });

    const report = buildReportPayload(director, { plantelId: "1", periodo: "2026-2" });
    const previousPeriodReport = buildReportPayload(director, {
      plantelId: "1",
      cicloEscolar: "2024-2025",
      periodo: "2025-2"
    });
    const reportRow = report.indicadores
      .find((item) => item.id === "QA-REPORT-DETAIL")
      ?.datos[0];
    const previousPeriodRow = previousPeriodReport.indicadores
      .find((item) => item.id === "QA-REPORT-DETAIL")
      ?.datos[0];

    expect(reportRow?.detalle).toEqual(expect.arrayContaining([
      { campo: "Mujeres", valor: "12" },
      { campo: "Hombres", valor: "10" },
      { campo: "Observaciones", valor: "Dato importado y editable" }
    ]));
    expect(reportRow).toMatchObject({
      justificacion: "Justificación capturada para el reporte.",
      evidenciaNombre: "evidencia-detalle.pdf",
      evidencias: 1
    });
    expect(report.scopeSummary).toBe("Plantel único: Bachillerato 16");
    expect(report.estadoConteos).toMatchObject({
      total: expect.any(Number),
      pendientes: expect.any(Number),
      enRevision: expect.any(Number),
      observados: expect.any(Number),
      aprobados: expect.any(Number)
    });
    expect(previousPeriodRow?.captureId).toBeUndefined();
  });

  it("repairs replacement characters from client-submitted report text", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const indicator = saveIndicator(director, {
      code: "QA-REPORT-ENCODING",
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
      .find((item) => item.id === "QA-REPORT-ENCODING")
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

  it("generates readable official templates and allows plantel capture only when scoped to that plantel", () => {
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
        importedScope.includes(1);

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

  it("normalizes official workbook table headers without duplicate or useless context columns", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const duplicatedPlantelCodes = ["3.1.0.0.1", "3.1.1.3.6", "1.1.2.2.10", "1.1.2.2.11"];

    duplicatedPlantelCodes.forEach((code) => {
      const indicator = getIndicatorByCode(code);
      expect(indicator, code).toBeDefined();

      const template = templateForIndicator(indicator!, director);
      const plantelColumns = template.columns.filter((column) => column.label === "Plantel");
      const rowKeys = new Set(template.initialRows.flatMap((row) => Object.keys(row)));

      expect(plantelColumns, code).toHaveLength(1);
      expect(rowKeys.has("plantel_2"), code).toBe(false);
    });

    const plantelValueCodes = [
      ...duplicatedPlantelCodes,
      "1.0.0.0.2",
      "1.1.2.5.3",
      "1.1.2.1.4"
    ];

    plantelValueCodes.forEach((code) => {
      const template = templateForIndicator(getIndicatorByCode(code)!, director);
      const plantelColumn = template.columns.find((column) => column.label.toLowerCase() === "plantel");

      expect(plantelColumn, code).toBeDefined();
      expect(template.initialRows[0]?.[plantelColumn!.key], code).toBe("Bachillerato 16");
      expect(template.initialRows.some((row) => row[plantelColumn!.key] === "Bachillerato"), code).toBe(false);
    });

    const softwareTemplate = templateForIndicator(getIndicatorByCode("4.1.1.0.1")!, director);
    expect(softwareTemplate.columns[0]).toMatchObject({ key: "registro", label: "Registro" });
    expect(softwareTemplate.columns.some((column) => /^Columna\s+\d+$/i.test(column.label))).toBe(false);

    const titulationTemplate = templateForIndicator(getIndicatorByCode("1.0.0.0.2")!, director);
    expect(titulationTemplate.columns.some((column) => column.label === "Delegación")).toBe(false);
    expect(titulationTemplate.columns.map((column) => column.label)).toEqual(
      expect.arrayContaining([
        "Plantel",
        "Programa Educativo",
        "Egresados Titulados En El Año 2025 Mujeres",
        "Matrícula De Primer Ingreso De La Misma Cohorte Total"
      ])
    );

    const adoptTemplate = templateForIndicator(getIndicatorByCode("1.1.2.3.1")!, director);
    expect(adoptTemplate.columns[0]).toMatchObject({ key: "registro", label: "Registro" });
    expect(adoptTemplate.columns.filter((column) => column.label === "Nombre de la charla")).toHaveLength(1);

    const languageTemplate = templateForIndicator(getIndicatorByCode("1.1.2.5.10")!, director);
    expect(languageTemplate.columns.map((column) => column.key)).toEqual(
      expect.arrayContaining(["total", "total_2", "total_3"])
    );
    expect(languageTemplate.columns.length).toBeGreaterThanOrEqual(9);
  });

  it("ignores persisted captures whose rows belong to an older official template", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const indicator = getIndicatorByCode("1.0.0.0.2")!;

    const staleCapture = createCaptureDraft({
      plantelId: 1,
      indicadorId: indicator.id,
      actividadId: 1,
      periodoId: 1,
      responsableId: indicator.responsibleIds[0],
      payload: {
        rows: [{ delegacion: "Colima", plantel: "Bachillerato 16", campo_obsoleto: 1 }],
        justificacion: "Captura de una plantilla anterior."
      }
    });
    approveCapture(staleCapture.id);

    const listed = listIndicators(director).find((item) => item.code === indicator.code);

    expect(listed?.captureId).toBeUndefined();
    expect(listed?.captureStatus).toBeUndefined();
    expect(listed?.status).toBe("Pendiente");
  });

  it("requires a PDF evidence before sending captures to review", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1"
    });
    const indicator = saveIndicator(director, {
      ...getIndicatorByCode("1.0.0.0.2")!,
      plantelIds: [1]
    });
    const template = templateForIndicator(indicator, plantel);

    expect(() =>
      assertCaptureAccess(
        plantel,
        {
          plantelId: 1,
          indicadorId: indicator.id,
          payload: {
            rows: completedRowsForTemplate(template),
            justificacion: "Captura completa sin evidencia."
          }
        },
        "submit"
      )
    ).toThrow(SigiValidationError);
  });

  it("rejects evidence whose MIME, size or content does not describe a real PDF", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1",
      "x-user-id": "plantel-1"
    });
    const indicator = saveIndicator(director, {
      ...getIndicatorByCode("1.0.0.0.2")!,
      plantelIds: [1]
    });
    const rows = completedRowsForTemplate(templateForIndicator(indicator, plantel));
    const html = Buffer.from("<html><script>alert(1)</script></html>", "utf8");
    const basePayload = {
      rows,
      justificacion: "Captura completa con evidencia oficial."
    };

    expect(() => assertCaptureAccess(plantel, {
      plantelId: 1,
      indicadorId: indicator.id,
      payload: {
        ...basePayload,
        evidencia: {
          nombre: "evidencia.pdf",
          tipo: "text/html",
          tamanoBytes: html.length,
          contenidoBase64: html.toString("base64")
        }
      }
    }, "draft")).toThrow(/PDF/);

    expect(() => assertCaptureAccess(plantel, {
      plantelId: 1,
      indicadorId: indicator.id,
      payload: {
        ...basePayload,
        evidencia: {
          nombre: "evidencia.pdf",
          tipo: "application/pdf",
          tamanoBytes: html.length,
          contenidoBase64: html.toString("base64")
        }
      }
    }, "draft")).toThrow(/no contiene un PDF/);

    const validEvidence = evidencePdf();
    expect(() => assertCaptureAccess(plantel, {
      plantelId: 1,
      indicadorId: indicator.id,
      payload: {
        ...basePayload,
        evidencia: { ...validEvidence, tamanoBytes: validEvidence.tamanoBytes + 1 }
      }
    }, "draft")).toThrow(/tamaño real/);
  });

  it("requires reviewers to open evidence before approving a capture", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1",
      "x-user-id": "plantel-1"
    });
    const indicator = saveIndicator(director, {
      ...getIndicatorByCode("1.0.0.0.2")!,
      plantelIds: [1]
    });
    const reviewer = sessionFromHeaders({
      "x-role": "responsable",
      "x-responsable-id": String(indicator.responsibleIds[0]),
      "x-user-id": `responsable-${indicator.responsibleIds[0]}`
    });
    const draft = createCaptureDraft({
      plantelId: 1,
      indicadorId: indicator.id,
      actividadId: 1,
      periodoId: 1,
      responsableId: indicator.responsibleIds[0],
      payload: {
        rows: completedRowsForTemplate(templateForIndicator(indicator, plantel)),
        justificacion: "Captura completa con evidencia oficial.",
        evidencia: evidencePdfWithContent()
      }
    });
    const sent = sendCaptureToReview(draft.id, {
      userId: plantel.userId,
      role: plantel.role
    })!;

    expect(() => assertEvidenceOpenedBeforeApproval(reviewer, sent)).toThrow(SigiValidationError);

    recordEvidenceOpened(reviewer, sent, "qa-request");

    expect(() => assertEvidenceOpenedBeforeApproval(reviewer, sent)).not.toThrow();

    const observed = requestCaptureCorrection(sent.id, "Actualiza la evidencia oficial.", sent.versionActual)!;
    const corrected = updateCaptureDraft(observed.id, {
      ...observed.payload,
      evidencia: evidencePdfWithContent()
    }, { expectedVersion: observed.versionActual })!;
    const resent = sendCaptureToReview(corrected.id, {
      userId: plantel.userId,
      role: plantel.role
    }, corrected.versionActual)!;

    expect(() => assertEvidenceOpenedBeforeApproval(reviewer, resent)).toThrow(SigiValidationError);
    recordEvidenceOpened(reviewer, resent, "qa-request-updated-evidence");
    expect(() => assertEvidenceOpenedBeforeApproval(reviewer, resent)).not.toThrow();
  });

  it("respects indicator evidence rules when opening evidence is not required before approval", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1",
      "x-user-id": "plantel-1"
    });
    const indicator = saveIndicator(director, {
      ...getIndicatorByCode("1.0.0.0.2")!,
      plantelIds: [1],
      evidenceRules: {
        required: true,
        allowedTypes: ["application/pdf"],
        maxSizeMb: 5,
        requireOpenBeforeApproval: false
      }
    });
    const reviewer = sessionFromHeaders({
      "x-role": "responsable",
      "x-responsable-id": String(indicator.responsibleIds[0]),
      "x-user-id": `responsable-${indicator.responsibleIds[0]}`
    });
    const draft = createCaptureDraft({
      plantelId: 1,
      indicadorId: indicator.id,
      actividadId: 1,
      periodoId: 1,
      responsableId: indicator.responsibleIds[0],
      payload: {
        rows: completedRowsForTemplate(templateForIndicator(indicator, plantel)),
        justificacion: "Captura completa con evidencia oficial.",
        evidencia: evidencePdfWithContent()
      }
    });
    const sent = sendCaptureToReview(draft.id, {
      userId: plantel.userId,
      role: plantel.role
    })!;

    expect(() => assertEvidenceOpenedBeforeApproval(reviewer, sent)).not.toThrow();
  });

  it("rejects incoherent official calculated totals for titulation captures", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1"
    });
    const indicator = saveIndicator(director, {
      ...getIndicatorByCode("1.0.0.0.2")!,
      plantelIds: [1]
    });
    const template = templateForIndicator(indicator, plantel);
    const rows = completedRowsForTemplate(template);
    const egresadasMujeres = columnKeyByLabel(template, "egresados", "mujeres");
    const egresadosHombres = columnKeyByLabel(template, "egresados", "hombres");
    const egresadosTotal = columnKeyByLabel(template, "egresados", "total");
    const matriculaMujeres = columnKeyByLabel(template, "matrícula", "mujeres");
    const matriculaHombres = columnKeyByLabel(template, "matrícula", "hombres");
    const matriculaTotal = columnKeyByLabel(template, "matrícula", "total");
    const porcentaje = columnKeyByLabel(template, "titulación");

    rows[0] = {
      ...rows[0],
      [egresadasMujeres]: 1,
      [egresadosHombres]: 1,
      [egresadosTotal]: 9,
      [matriculaMujeres]: 2,
      [matriculaHombres]: 2,
      [matriculaTotal]: 4,
      [porcentaje]: 225
    };

    expect(() =>
      assertCaptureAccess(
        plantel,
        {
          plantelId: 1,
          indicadorId: indicator.id,
          payload: {
            rows,
            justificacion: "Captura completa con evidencia oficial.",
            evidencia: evidencePdf()
          }
        },
        "submit"
      )
    ).toThrow(SigiValidationError);
    expect(() =>
      assertCaptureAccess(
        plantel,
        {
          plantelId: 1,
          indicadorId: indicator.id,
          payload: {
            rows,
            justificacion: "Borrador con totales incoherentes."
          }
        },
        "draft"
      )
    ).toThrow(SigiValidationError);
  });

  it("accepts coherent titulation totals and percentage calculations", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1"
    });
    const indicator = saveIndicator(director, {
      ...getIndicatorByCode("1.0.0.0.2")!,
      plantelIds: [1]
    });
    const template = templateForIndicator(indicator, plantel);
    const rows = completedRowsForTemplate(template);
    const egresadasMujeres = columnKeyByLabel(template, "egresados", "mujeres");
    const egresadosHombres = columnKeyByLabel(template, "egresados", "hombres");
    const egresadosTotal = columnKeyByLabel(template, "egresados", "total");
    const matriculaMujeres = columnKeyByLabel(template, "matrícula", "mujeres");
    const matriculaHombres = columnKeyByLabel(template, "matrícula", "hombres");
    const matriculaTotal = columnKeyByLabel(template, "matrícula", "total");
    const porcentaje = columnKeyByLabel(template, "titulación");

    rows[0] = {
      ...rows[0],
      [egresadasMujeres]: 12,
      [egresadosHombres]: 5,
      [egresadosTotal]: 17,
      [matriculaMujeres]: 20,
      [matriculaHombres]: 10,
      [matriculaTotal]: 30,
      [porcentaje]: 56.67
    };

    expect(() =>
      assertCaptureAccess(
        plantel,
        {
          plantelId: 1,
          indicadorId: indicator.id,
          payload: {
            rows,
            justificacion: "Borrador con totales coherentes."
          }
        },
        "draft"
      )
    ).not.toThrow();
  });

  it("rejects numeric-only justifications when sending captures to review", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1"
    });
    const indicator = saveIndicator(director, {
      ...getIndicatorByCode("1.0.0.0.2")!,
      plantelIds: [1]
    });
    const template = templateForIndicator(indicator, plantel);

    expect(() =>
      assertCaptureAccess(
        plantel,
        {
          plantelId: 1,
          indicadorId: indicator.id,
          payload: {
            rows: completedRowsForTemplate(template),
            justificacion: "1234567890123",
            evidencia: evidencePdf()
          }
        },
        "submit"
      )
    ).toThrow(SigiValidationError);
  });

  it("marks draft report rows without evidence or meaningful justification as non exportable", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1"
    });
    const indicator = saveIndicator(director, {
      ...getIndicatorByCode("1.0.0.0.2")!,
      plantelIds: [1]
    });

    createCaptureDraft({
      plantelId: 1,
      indicadorId: indicator.id,
      actividadId: 1,
      periodoId: 1,
      responsableId: indicator.responsibleIds[0],
      payload: {
        rows: completedRowsForTemplate(templateForIndicator(indicator, plantel)),
        justificacion: "9876543210"
      }
    });

    const report = buildReportPayload(director, { plantelId: "1", periodo: "2026-2" });
    const reportRows = report.indicadores.flatMap((item) => item.datos);
    const issues = reportRows.flatMap((row) => row.blockingIssues ?? []);

    expect(reportRows.some((row) => row.exportable === false)).toBe(true);
    expect(issues.some((issue) => issue.includes("borrador"))).toBe(true);
    expect(issues.some((issue) => issue.includes("evidencia PDF"))).toBe(true);
    expect(issues.some((issue) => issue.includes("Justificación"))).toBe(true);
  });

  it("adds quality warnings to reports for suspicious persisted values", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1"
    });
    const indicator = saveIndicator(director, {
      ...getIndicatorByCode("1.0.0.0.2")!,
      plantelIds: [1]
    });
    const template = templateForIndicator(indicator, plantel);
    const rows = completedRowsForTemplate(template);
    const numericColumn = template.columns.find((column) => column.type === "number")!;

    rows[0] = {
      ...rows[0],
      [numericColumn.key]: 1_500_000
    };

    createCaptureDraft({
      plantelId: 1,
      indicadorId: indicator.id,
      actividadId: 1,
      periodoId: 1,
      responsableId: indicator.responsibleIds[0],
      payload: {
        rows,
        justificacion: "Captura histórica con valor sospechoso.",
        evidencia: evidencePdfWithContent()
      }
    });

    const report = buildReportPayload(director, { plantelId: "1", periodo: "2026-2" });
    const warnings = report.indicadores.flatMap((item) => item.datos.flatMap((row) => row.qualityWarnings ?? []));

    expect(warnings.some((warning) => warning.includes("inusualmente alto"))).toBe(true);
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

  it("uses the requested capture plantel when a responsable opens a read-only template", () => {
    const indicator = getIndicatorByCode("1.0.0.0.2")!;
    const responsable = sessionFromHeaders({
      "x-role": "responsable",
      "x-responsable-id": String(indicator.responsibleIds[0])
    });
    const scopedPlantel = planteles.find((plantel) =>
      plantel.id === (officialIndicatorPlantelScopes[indicator.code]?.[0] ?? indicator.plantelIds[0])
    )!;

    const scopedSession = templateSessionForPlantelScope(responsable, indicator, scopedPlantel.id);
    const template = templateForIndicator(indicator, scopedSession);

    expect(template.initialRows[0]).toMatchObject({
      plantel: scopedPlantel.name
    });
  });
});
