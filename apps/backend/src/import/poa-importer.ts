import { createHash } from "node:crypto";

export type DemoFixture = {
  sourceName: string;
  operationalYear: {
    year: number;
    label: string;
    startsAt: string;
    endsAt: string;
  };
  planteles: Array<{
    code: string;
    name: string;
    municipality?: string;
  }>;
  generation: {
    indicatorCount: number;
    activityCount: number;
    responsibleCount: number;
    contributorCount: number;
  };
};

export type PoaImportRow = {
  indicatorCode: string;
  indicatorName: string;
  activityCode: string;
  activityName: string;
  responsibleCode: string;
  responsibleName: string;
  contributorCode: string;
  contributorName: string;
  plantelCode: string;
};

export type NormalizedPoaCatalog = {
  sourceName: string;
  sourceChecksum: string;
  operationalYear: DemoFixture["operationalYear"];
  planteles: DemoFixture["planteles"];
  indicators: Array<{
    code: string;
    name: string;
    responsibleCode: string;
  }>;
  activities: Array<{
    code: string;
    name: string;
    indicatorCode: string;
    contributorCode: string;
    plantelCode: string;
  }>;
  responsibles: Array<{
    code: string;
    name: string;
  }>;
  contributors: Array<{
    code: string;
    name: string;
  }>;
  summary: {
    indicators: number;
    activities: number;
    responsibles: number;
    contributors: number;
    planteles: number;
  };
};

export class PoaImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PoaImportError";
  }
}

export function buildRowsFromDemoFixture(fixture: DemoFixture): PoaImportRow[] {
  validateGeneration(fixture);

  return Array.from({ length: fixture.generation.activityCount }, (_, index) => {
    const activityNumber = index + 1;
    const indicatorNumber = (index % fixture.generation.indicatorCount) + 1;
    const responsibleNumber = ((indicatorNumber - 1) % fixture.generation.responsibleCount) + 1;
    const contributorNumber = (index % fixture.generation.contributorCount) + 1;
    const plantel = fixture.planteles[index % fixture.planteles.length];

    return {
      indicatorCode: formatCode("IND", indicatorNumber),
      indicatorName: `Indicador demo ${indicatorNumber}`,
      activityCode: formatCode("ACT", activityNumber),
      activityName: `Actividad demo ${activityNumber}`,
      responsibleCode: formatCode("RESP", responsibleNumber),
      responsibleName: `Responsable demo ${responsibleNumber}`,
      contributorCode: formatCode("CONT", contributorNumber),
      contributorName: `Contribuyente demo ${contributorNumber}`,
      plantelCode: plantel.code
    };
  });
}

export function normalizePoaCatalog(fixture: DemoFixture, rows = buildRowsFromDemoFixture(fixture)): NormalizedPoaCatalog {
  const indicators = new Map<string, NormalizedPoaCatalog["indicators"][number]>();
  const activities = new Map<string, NormalizedPoaCatalog["activities"][number]>();
  const responsibles = new Map<string, NormalizedPoaCatalog["responsibles"][number]>();
  const contributors = new Map<string, NormalizedPoaCatalog["contributors"][number]>();
  const plantelCodes = new Set(fixture.planteles.map((plantel) => normalizeCode(plantel.code)));

  for (const row of rows) {
    const normalizedRow = normalizeRow(row);

    if (!plantelCodes.has(normalizedRow.plantelCode)) {
      throw new PoaImportError(`Plantel no declarado en fixture: ${normalizedRow.plantelCode}`);
    }

    upsertConsistent(indicators, normalizedRow.indicatorCode, {
      code: normalizedRow.indicatorCode,
      name: normalizedRow.indicatorName,
      responsibleCode: normalizedRow.responsibleCode
    });
    upsertConsistent(activities, normalizedRow.activityCode, {
      code: normalizedRow.activityCode,
      name: normalizedRow.activityName,
      indicatorCode: normalizedRow.indicatorCode,
      contributorCode: normalizedRow.contributorCode,
      plantelCode: normalizedRow.plantelCode
    });
    upsertConsistent(responsibles, normalizedRow.responsibleCode, {
      code: normalizedRow.responsibleCode,
      name: normalizedRow.responsibleName
    });
    upsertConsistent(contributors, normalizedRow.contributorCode, {
      code: normalizedRow.contributorCode,
      name: normalizedRow.contributorName
    });
  }

  const catalog: NormalizedPoaCatalog = {
    sourceName: fixture.sourceName,
    sourceChecksum: checksum({ fixture, rows }),
    operationalYear: fixture.operationalYear,
    planteles: fixture.planteles.map((plantel) => ({
      ...plantel,
      code: normalizeCode(plantel.code)
    })),
    indicators: [...indicators.values()],
    activities: [...activities.values()],
    responsibles: [...responsibles.values()],
    contributors: [...contributors.values()],
    summary: {
      indicators: indicators.size,
      activities: activities.size,
      responsibles: responsibles.size,
      contributors: contributors.size,
      planteles: fixture.planteles.length
    }
  };

  assertExpectedCounts(fixture, catalog);
  return catalog;
}

export function assertExpectedCounts(fixture: DemoFixture, catalog: NormalizedPoaCatalog): void {
  const expected = fixture.generation;

  if (catalog.summary.indicators !== expected.indicatorCount) {
    throw new PoaImportError(`Indicadores esperados=${expected.indicatorCount}, recibidos=${catalog.summary.indicators}`);
  }

  if (catalog.summary.activities !== expected.activityCount) {
    throw new PoaImportError(`Actividades esperadas=${expected.activityCount}, recibidas=${catalog.summary.activities}`);
  }

  if (catalog.summary.responsibles !== expected.responsibleCount) {
    throw new PoaImportError(`Responsables esperados=${expected.responsibleCount}, recibidos=${catalog.summary.responsibles}`);
  }

  if (catalog.summary.contributors !== expected.contributorCount) {
    throw new PoaImportError(`Contribuyentes esperados=${expected.contributorCount}, recibidos=${catalog.summary.contributors}`);
  }
}

function validateGeneration(fixture: DemoFixture): void {
  const { activityCount, contributorCount, indicatorCount, responsibleCount } = fixture.generation;

  if (activityCount < indicatorCount) {
    throw new PoaImportError("La fixture debe tener al menos una actividad por indicador.");
  }

  for (const [key, value] of Object.entries({ activityCount, contributorCount, indicatorCount, responsibleCount })) {
    if (!Number.isInteger(value) || value < 1) {
      throw new PoaImportError(`generation.${key} debe ser entero positivo.`);
    }
  }

  if (fixture.planteles.length === 0) {
    throw new PoaImportError("La fixture debe declarar al menos un plantel.");
  }
}

function normalizeRow(row: PoaImportRow): PoaImportRow {
  return {
    indicatorCode: normalizeCode(row.indicatorCode),
    indicatorName: normalizeText(row.indicatorName, "indicatorName"),
    activityCode: normalizeCode(row.activityCode),
    activityName: normalizeText(row.activityName, "activityName"),
    responsibleCode: normalizeCode(row.responsibleCode),
    responsibleName: normalizeText(row.responsibleName, "responsibleName"),
    contributorCode: normalizeCode(row.contributorCode),
    contributorName: normalizeText(row.contributorName, "contributorName"),
    plantelCode: normalizeCode(row.plantelCode)
  };
}

function normalizeCode(value: string): string {
  const normalized = value.trim().toUpperCase();

  if (!normalized) {
    throw new PoaImportError("Los codigos no pueden estar vacios.");
  }

  return normalized;
}

function normalizeText(value: string, field: string): string {
  const normalized = value.trim().replace(/\s+/gu, " ");

  if (!normalized) {
    throw new PoaImportError(`${field} no puede estar vacio.`);
  }

  return normalized;
}

function upsertConsistent<T>(map: Map<string, T>, key: string, value: T): void {
  const existing = map.get(key);

  if (!existing) {
    map.set(key, value);
    return;
  }

  if (JSON.stringify(existing) !== JSON.stringify(value)) {
    throw new PoaImportError(`Duplicado conflictivo para ${key}`);
  }
}

function checksum(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function formatCode(prefix: string, value: number): string {
  return `${prefix}-${String(value).padStart(3, "0")}`;
}
