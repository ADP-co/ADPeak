import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildRowsFromDemoFixture,
  normalizePoaCatalog,
  PoaImportError,
  type DemoFixture
} from "./poa-importer.js";

const fixture = JSON.parse(
  readFileSync(path.resolve(process.cwd(), "seeds", "scrum-42-demo.json"), "utf8")
) as DemoFixture;

describe("SCRUM-42 POA importer", () => {
  it("normaliza la fixture demo a 99 actividades y 48 indicadores unicos", () => {
    const catalog = normalizePoaCatalog(fixture);

    expect(catalog.summary).toMatchObject({
      indicators: 48,
      activities: 99,
      responsibles: 12,
      contributors: 16,
      planteles: 2
    });
    expect(catalog.sourceChecksum).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("es deterministico para permitir importaciones repetibles", () => {
    const first = normalizePoaCatalog(fixture);
    const second = normalizePoaCatalog(fixture);

    expect(second.sourceChecksum).toBe(first.sourceChecksum);
    expect(second.activities.map((activity) => activity.code)).toEqual(
      first.activities.map((activity) => activity.code)
    );
  });

  it("detecta duplicados conflictivos antes de cargar datos", () => {
    const rows = buildRowsFromDemoFixture(fixture);
    rows[1] = {
      ...rows[0],
      activityCode: rows[0]?.activityCode ?? "ACT-001",
      activityName: "Nombre conflictivo"
    };

    expect(() => normalizePoaCatalog(fixture, rows)).toThrow(PoaImportError);
    expect(() => normalizePoaCatalog(fixture, rows)).toThrow("Duplicado conflictivo");
  });
});
