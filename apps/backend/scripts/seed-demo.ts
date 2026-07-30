import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { demoDatasetPayload, publicDemoUsers } from "../src/demo-data.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(scriptDir, "..");
const migrationsDir = path.join(backendRoot, "migrations");
const requiredSeedFiles = [
  "20260605_001_demo_schema.sql",
  "20260605_002_demo_seed.sql"
];

const missingSeedFiles = requiredSeedFiles.filter(
  (fileName) => !existsSync(path.join(migrationsDir, fileName))
);

if (missingSeedFiles.length > 0) {
  console.error(`Faltan archivos de seed demo: ${missingSeedFiles.join(", ")}`);
  process.exit(1);
}

const dataset = demoDatasetPayload();

console.log("Seed demo listo.");
console.log(`Usuarios de prueba: ${publicDemoUsers().length}`);
console.log(`Indicadores demo: ${dataset.summary.indicators}`);
console.log(`Evidencias ficticias: ${dataset.summary.evidenceFiles}`);
console.log(`Migraciones demo: ${requiredSeedFiles.join(", ")}`);
