#!/usr/bin/env node

import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!databaseUrl) {
  throw new Error("Migration verification requires a PostgreSQL connection URL.");
}

const parsedUrl = new URL(databaseUrl);
const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname);
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isLoopback ? false : { rejectUnauthorized: true }
});

const expectedMigrations = [
  "20260617_001_app_state.sql",
  "20260729_001_app_evidence.sql"
];

try {
  const migrationResult = await pool.query("select filename from schema_migrations order by filename");
  const applied = migrationResult.rows.map((row) => String(row.filename));

  for (const fileName of expectedMigrations) {
    if (!applied.includes(fileName)) {
      throw new Error(`Production migration was not applied: ${fileName}`);
    }
  }

  if (applied.some((fileName) => fileName.includes("_demo_"))) {
    throw new Error(`Production migration ledger contains demo migrations: ${applied.join(", ")}`);
  }

  const tablesResult = await pool.query(`
    select
      to_regclass('public.app_state') as app_state,
      to_regclass('public.app_evidence') as app_evidence,
      to_regclass('public.demo_users') as demo_users,
      to_regclass('public.demo_indicator_progress') as demo_indicator_progress
  `);
  const tables = tablesResult.rows[0];

  if (!tables?.app_state || !tables?.app_evidence) {
    throw new Error("Production tables app_state and app_evidence must exist after migration.");
  }
  if (tables.demo_users || tables.demo_indicator_progress) {
    throw new Error("Demo tables must not be created by production migrations.");
  }

  console.log(`Production migration verification passed: ${expectedMigrations.join(", ")}.`);
} finally {
  await pool.end();
}
