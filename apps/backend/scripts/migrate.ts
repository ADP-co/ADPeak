import { createHash } from "node:crypto";
import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const migrationsDir = path.resolve(process.cwd(), "migrations");

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
}

console.log(
  "Plan de migraciones validado. Conectar el motor de base de datos cuando el stack final quede definido."
);
