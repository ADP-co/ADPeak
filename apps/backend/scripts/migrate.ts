import { createHash } from "node:crypto";
import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import { loadLocalEnv } from "../src/config.js";

const migrationsDir = path.resolve(process.cwd(), "migrations");
const dryRun = process.argv.includes("--dry-run");

loadLocalEnv();

await mkdir(migrationsDir, { recursive: true });

const migrationFiles = (await readdir(migrationsDir))
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort();

if (migrationFiles.length === 0) {
  console.log("No hay migraciones SQL pendientes.");
  console.log(`Directorio preparado: ${migrationsDir}`);
  process.exit(0);
}

console.log("Migraciones SQL encontradas:");

const migrations: Array<{
  fileName: string;
  content: string;
  checksum: string;
}> = [];

for (const fileName of migrationFiles) {
  if (!/^\d{3}_[a-z0-9_]+\.sql$/u.test(fileName)) {
    throw new Error(
      `Migracion con nombre invalido: ${fileName}. Usa el formato 001_nombre.sql.`
    );
  }

  const content = await readFile(path.join(migrationsDir, fileName), "utf8");

  if (!content.trim()) {
    throw new Error(`Migracion vacia: ${fileName}`);
  }

  if (!/create\s+table|alter\s+table|create\s+index/iu.test(content)) {
    throw new Error(`Migracion sin DDL reconocible: ${fileName}`);
  }

  const checksum = createHash("sha256").update(content).digest("hex");
  console.log(`- ${fileName} sha256=${checksum}`);
  migrations.push({ fileName, content, checksum });
}

if (dryRun || !process.env.DATABASE_URL) {
  console.log("Plan de migraciones validado en modo offline. Define DATABASE_URL para aplicar en PostgreSQL.");
  process.exit(0);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      file_name TEXT PRIMARY KEY,
      checksum_sha256 CHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  for (const migration of migrations) {
    const applied = await client.query<{ checksum_sha256: string }>(
      "SELECT checksum_sha256 FROM schema_migrations WHERE file_name = $1",
      [migration.fileName]
    );

    if (applied.rowCount && applied.rows[0]?.checksum_sha256 === migration.checksum) {
      console.log(`- ${migration.fileName} ya aplicada`);
      continue;
    }

    if (applied.rowCount) {
      throw new Error(`Checksum distinto para migracion ya aplicada: ${migration.fileName}`);
    }

    await client.query("BEGIN");
    try {
      await client.query(migration.content);
      await client.query(
        "INSERT INTO schema_migrations (file_name, checksum_sha256) VALUES ($1, $2)",
        [migration.fileName, migration.checksum]
      );
      await client.query("COMMIT");
      console.log(`- ${migration.fileName} aplicada`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await client.end();
}

console.log("Migraciones aplicadas correctamente.");
