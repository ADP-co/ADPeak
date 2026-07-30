import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { loadLocalEnv } from "../src/config.js";
import {
  migrationPoolConfig,
  resolveMigrationDatabaseUrl,
  selectMigrationFiles
} from "./migration-config.js";

const migrationsDir = path.resolve(process.cwd(), "migrations");

loadLocalEnv();

const resolvedDatabase = resolveMigrationDatabaseUrl();

await mkdir(migrationsDir, { recursive: true });

const allMigrationFiles = await readdir(migrationsDir);
const migrationFiles = selectMigrationFiles(allMigrationFiles, process.env.APP_ENV);
const excludedDemoMigrations = allMigrationFiles
  .filter((fileName) => fileName.endsWith(".sql"))
  .filter((fileName) => !migrationFiles.includes(fileName));

if (migrationFiles.length === 0) {
  console.log("No hay migraciones SQL pendientes.");
  console.log(`Directorio preparado: ${migrationsDir}`);
  process.exit(0);
}

if (!resolvedDatabase) {
  console.log("Migraciones SQL encontradas:");

  for (const fileName of migrationFiles) {
    console.log(`- ${fileName}`);
  }

  console.log(
    "No se configuró DATABASE_URL, POSTGRES_URL, POSTGRES_PRISMA_URL ni " +
    "POSTGRES_URL_NON_POOLING; las migraciones se listaron pero no se ejecutaron."
  );
  process.exit(0);
}

if (excludedDemoMigrations.length > 0) {
  console.log(`Migraciones demo excluidas para APP_ENV=${process.env.APP_ENV || "development"}:`);
  excludedDemoMigrations.sort().forEach((fileName) => console.log(`- ${fileName}`));
}

console.log(`Conexión de migración resuelta desde ${resolvedDatabase.key}.`);
const pool = new Pool(migrationPoolConfig(resolvedDatabase.value));

try {
  await pool.query(`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const appliedResult = await pool.query<{ filename: string }>("select filename from schema_migrations");
  const applied = new Set(appliedResult.rows.map((row) => row.filename));

  for (const fileName of migrationFiles) {
    if (applied.has(fileName)) {
      console.log(`Ya aplicada: ${fileName}`);
      continue;
    }

    const sql = await readFile(path.join(migrationsDir, fileName), "utf8");
    await pool.query("begin");
    try {
      await pool.query(sql);
      await pool.query("insert into schema_migrations (filename) values ($1)", [fileName]);
      await pool.query("commit");
      console.log(`Aplicada: ${fileName}`);
    } catch (error) {
      await pool.query("rollback");
      throw error;
    }
  }

  console.log("Migraciones completadas.");
} finally {
  await pool.end();
}
