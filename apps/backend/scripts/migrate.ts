import { mkdir, readdir } from "node:fs/promises";
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
  console.log(`- ${fileName}`);
}

console.log(
  "Conectar el motor de base de datos cuando el stack final quede definido."
);
