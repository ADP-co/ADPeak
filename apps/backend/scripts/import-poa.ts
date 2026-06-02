import { readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import { loadLocalEnv } from "../src/config.js";
import {
  normalizePoaCatalog,
  type DemoFixture,
  type NormalizedPoaCatalog
} from "../src/import/poa-importer.js";

type IdMap = Map<string, string>;

loadLocalEnv();

const args = process.argv.slice(2);
const fixturePath = resolveArg("--fixture") ?? "seeds/scrum-42-demo.json";
const dryRun = args.includes("--dry-run") || !process.env.DATABASE_URL;

const fixture = JSON.parse(
  await readFile(path.resolve(process.cwd(), fixturePath), "utf8")
) as DemoFixture;
const catalog = normalizePoaCatalog(fixture);

console.log(`Fuente: ${catalog.sourceName}`);
console.log(`Checksum: ${catalog.sourceChecksum}`);
console.log(`Resumen: ${JSON.stringify(catalog.summary)}`);

if (dryRun) {
  console.log("Import SCRUM-42 validado en modo offline. Define DATABASE_URL para aplicar en PostgreSQL.");
  process.exit(0);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query("BEGIN");
  await applyCatalog(client, catalog);
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}

console.log("Catalogo SCRUM-42 importado correctamente.");

function resolveArg(name: string): string | undefined {
  const index = args.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

async function applyCatalog(client: Client, catalog: NormalizedPoaCatalog): Promise<void> {
  const roleId = await getRoleId(client, "responsable");
  const plantelIds = await upsertPlanteles(client, catalog);
  const operationalYearId = await upsertOperationalYear(client, catalog);
  const userIds = await upsertUsers(client, roleId, catalog);
  const indicatorIds = await upsertIndicators(client, operationalYearId, catalog, userIds);
  const activityIds = await upsertActivities(client, indicatorIds, catalog);

  for (const indicator of catalog.indicators) {
    await upsertAssignment(client, {
      userId: userIds.get(indicator.responsibleCode),
      indicatorId: indicatorIds.get(indicator.code),
      responsibility: "primary"
    });
  }

  for (const activity of catalog.activities) {
    await upsertAssignment(client, {
      userId: userIds.get(activity.contributorCode),
      activityId: activityIds.get(activity.code),
      responsibility: "contributor"
    });
    await upsertAssignment(client, {
      userId: userIds.get(activity.contributorCode),
      plantelId: plantelIds.get(activity.plantelCode),
      responsibility: "contributor"
    });
  }

  await client.query(
    `INSERT INTO import_runs
      (source_name, source_checksum_sha256, operational_year, indicator_count, activity_count, responsible_count, contributor_count, summary)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
     ON CONFLICT (source_name, source_checksum_sha256) DO UPDATE
     SET summary = EXCLUDED.summary`,
    [
      catalog.sourceName,
      catalog.sourceChecksum,
      catalog.operationalYear.year,
      catalog.summary.indicators,
      catalog.summary.activities,
      catalog.summary.responsibles,
      catalog.summary.contributors,
      JSON.stringify(catalog.summary)
    ]
  );
}

async function getRoleId(client: Client, code: string): Promise<string> {
  const result = await client.query<{ id: string }>("SELECT id FROM roles WHERE code = $1", [code]);

  if (!result.rows[0]) {
    throw new Error(`Rol requerido no existe: ${code}`);
  }

  return result.rows[0].id;
}

async function upsertPlanteles(client: Client, catalog: NormalizedPoaCatalog): Promise<IdMap> {
  const ids: IdMap = new Map();

  for (const plantel of catalog.planteles) {
    const result = await client.query<{ id: string }>(
      `INSERT INTO planteles (code, name, municipality)
       VALUES ($1, $2, $3)
       ON CONFLICT (code) DO UPDATE
       SET name = EXCLUDED.name, municipality = EXCLUDED.municipality, updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [plantel.code, plantel.name, plantel.municipality ?? null]
    );
    ids.set(plantel.code, result.rows[0]?.id ?? "");
  }

  return ids;
}

async function upsertOperationalYear(client: Client, catalog: NormalizedPoaCatalog): Promise<string> {
  const result = await client.query<{ id: string }>(
    `INSERT INTO operational_years (year, label, starts_at, ends_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (year) DO UPDATE
     SET label = EXCLUDED.label, starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at, updated_at = CURRENT_TIMESTAMP
     RETURNING id`,
    [
      catalog.operationalYear.year,
      catalog.operationalYear.label,
      catalog.operationalYear.startsAt,
      catalog.operationalYear.endsAt
    ]
  );

  return result.rows[0]?.id ?? "";
}

async function upsertUsers(client: Client, roleId: string, catalog: NormalizedPoaCatalog): Promise<IdMap> {
  const ids: IdMap = new Map();
  const users = [
    ...catalog.responsibles.map((user) => ({ ...user, emailPrefix: user.code.toLowerCase() })),
    ...catalog.contributors.map((user) => ({ ...user, emailPrefix: user.code.toLowerCase() }))
  ];

  for (const user of users) {
    const result = await client.query<{ id: string }>(
      `INSERT INTO users (role_id, email, full_name, password_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
       SET full_name = EXCLUDED.full_name, updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [roleId, `${user.emailPrefix}@demo.sigi.test`, user.name, "demo-import-user-without-real-secret"]
    );
    ids.set(user.code, result.rows[0]?.id ?? "");
  }

  return ids;
}

async function upsertIndicators(
  client: Client,
  operationalYearId: string,
  catalog: NormalizedPoaCatalog,
  userIds: IdMap
): Promise<IdMap> {
  const ids: IdMap = new Map();

  for (const indicator of catalog.indicators) {
    const result = await client.query<{ id: string }>(
      `INSERT INTO indicators (operational_year_id, code, name, measurement_unit)
       VALUES ($1, $2, $3, 'porcentaje')
       ON CONFLICT (operational_year_id, code) DO UPDATE
       SET name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [operationalYearId, indicator.code, indicator.name]
    );
    ids.set(indicator.code, result.rows[0]?.id ?? "");

    if (!userIds.has(indicator.responsibleCode)) {
      throw new Error(`Responsable no generado: ${indicator.responsibleCode}`);
    }
  }

  return ids;
}

async function upsertActivities(client: Client, indicatorIds: IdMap, catalog: NormalizedPoaCatalog): Promise<IdMap> {
  const ids: IdMap = new Map();

  for (const activity of catalog.activities) {
    const indicatorId = indicatorIds.get(activity.indicatorCode);

    if (!indicatorId) {
      throw new Error(`Indicador no generado: ${activity.indicatorCode}`);
    }

    const result = await client.query<{ id: string }>(
      `INSERT INTO activities (indicator_id, code, name, evidence_required)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (indicator_id, code) DO UPDATE
       SET name = EXCLUDED.name, evidence_required = TRUE, updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [indicatorId, activity.code, activity.name]
    );
    ids.set(activity.code, result.rows[0]?.id ?? "");
  }

  return ids;
}

async function upsertAssignment(
  client: Client,
  assignment: {
    userId?: string;
    plantelId?: string;
    indicatorId?: string;
    activityId?: string;
    responsibility: "primary" | "secondary" | "contributor";
  }
): Promise<void> {
  if (!assignment.userId) {
    throw new Error("Asignacion sin usuario.");
  }

  const updated = await client.query(
    `UPDATE assignments
     SET active = TRUE, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
       AND COALESCE(plantel_id::text, '') = COALESCE($2, '')
       AND COALESCE(indicator_id::text, '') = COALESCE($3, '')
       AND COALESCE(activity_id::text, '') = COALESCE($4, '')
       AND responsibility = $5
       AND deleted_at IS NULL`,
    [
      assignment.userId,
      assignment.plantelId ?? null,
      assignment.indicatorId ?? null,
      assignment.activityId ?? null,
      assignment.responsibility
    ]
  );

  if (updated.rowCount && updated.rowCount > 0) {
    return;
  }

  await client.query(
    `INSERT INTO assignments (user_id, plantel_id, indicator_id, activity_id, responsibility)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      assignment.userId,
      assignment.plantelId ?? null,
      assignment.indicatorId ?? null,
      assignment.activityId ?? null,
      assignment.responsibility
    ]
  );
}
