import { describe, expect, it } from "vitest";
import {
  assertCaptureAccess,
  buildReportPayload,
  deactivateIndicator,
  getIndicatorByCode,
  listIndicators,
  listUsers,
  saveIndicator,
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
      active: true
    });
    expect(listUsers(director).some((user) => user.role === "responsable" && user.indicatorCodes.length > 1)).toBe(true);
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

  it("prevents plantel users from reading institutional reports", () => {
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1"
    });

    expect(() => buildReportPayload(plantel)).toThrow(SigiForbiddenError);
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
    const plantel = sessionFromHeaders({
      "x-role": "plantel",
      "x-plantel-id": "1"
    });
    const indicator = getIndicatorByCode("1.0.0.0.2");

    expect(indicator).toBeDefined();
    const template = templateForIndicator(indicator!);
    expect(template.columns.map((column) => column.key)).toContain("egresados_mujeres");

    expect(() =>
      assertCaptureAccess(
        plantel,
        {
          plantelId: 1,
          indicadorId: indicator!.id,
          payload: { rows: [{ columna_invalida: 1 }] }
        },
        "draft"
      )
    ).toThrow(SigiValidationError);
  });
});
