import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { loadLocalEnv } from "../src/config.js";

const migrationsDir = path.resolve(process.cwd(), "migrations");

loadLocalEnv();

const databaseUrl = process.env.DATABASE_URL;

await mkdir(migrationsDir, { recursive: true });

const migrationFiles = (await readdir(migrationsDir))
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort();

if (migrationFiles.length === 0) {
  console.log("No hay migraciones SQL pendientes.");
  console.log(`Directorio preparado: ${migrationsDir}`);
  process.exit(0);
}

if (!databaseUrl) {
  console.log("Migraciones SQL encontradas:");

  for (const fileName of migrationFiles) {
    console.log(`- ${fileName}`);
  }

  console.log("DATABASE_URL no configurado; las migraciones se listaron pero no se ejecutaron.");
  process.exit(0);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: false } : undefined
});

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

function shouldUseSsl(url: string) {
  return !/localhost|127\.0\.0\.1/i.test(url);
}
