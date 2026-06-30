import { describe, expect, it } from "vitest";
import {
  listIndicators,
  sessionFromHeaders,
  templateForIndicator
} from "./sigi-store.js";

const mojibakePattern = /Ã|Â|�/;
const genericColumnPattern = /^Columna\s+\d+$/i;

describe("enterprise readiness invariants", () => {
  it("exposes only operational indicators with usable official templates", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const indicators = listIndicators(director);

    expect(indicators.length).toBeGreaterThan(0);

    indicators.forEach((indicator) => {
      expect(indicator.code, indicator.code).not.toMatch(/^FMT-|-FMT-/);
      expect(indicator.name, indicator.code).not.toMatch(mojibakePattern);
      expect(indicator.name.trim(), indicator.code).not.toHaveLength(0);

      const template = templateForIndicator(indicator, director);

      expect(template.columns.length, indicator.code).toBeGreaterThan(0);
      expect(template.initialRows.length, indicator.code).toBeGreaterThan(0);
      expect(template.indicatorName, indicator.code).not.toMatch(mojibakePattern);

      template.columns.forEach((column) => {
        expect(column.label.trim(), `${indicator.code}:${column.key}`).not.toHaveLength(0);
        expect(column.label, `${indicator.code}:${column.key}`).not.toMatch(genericColumnPattern);
        expect(column.label, `${indicator.code}:${column.key}`).not.toMatch(mojibakePattern);
      });

      const plantelColumn = template.columns.find((column) =>
        column.label.toLocaleLowerCase("es").includes("plantel")
      );

      if (plantelColumn) {
        template.initialRows.forEach((row, index) => {
          const value = String(row[plantelColumn.key] ?? "").trim();

          expect(value, `${indicator.code}:row-${index + 1}`).not.toHaveLength(0);
          expect(value, `${indicator.code}:row-${index + 1}`).not.toBe("Bachillerato");
        });
      }
    });
  });
});
