import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REQUIRED_ENV_KEYS } from "../src/config.js";
import {
  demoDatasetPayload,
  publicDemoUsers,
  type DemoRole
} from "../src/demo-data.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(backendRoot, "../..");

const requiredFiles = [
  ".env.demo.example",
  "compose.demo.yaml",
  "docs/development/DEMO.md",
  "docs/development/DEMO_QA_CHECKLIST.md",
  "apps/backend/migrations/20260605_001_demo_schema.sql",
  "apps/backend/migrations/20260605_002_demo_seed.sql"
];

const missingFiles = requiredFiles.filter(
  (fileName) => !existsSync(path.join(repoRoot, fileName))
);

if (missingFiles.length > 0) {
  console.error(`Faltan archivos requeridos para demo: ${missingFiles.join(", ")}`);
  process.exit(1);
}

const demoEnv = parseEnvFile(readFileSync(path.join(repoRoot, ".env.demo.example"), "utf8"));
const missingEnvKeys = REQUIRED_ENV_KEYS.filter((key) => !demoEnv[key]);

if (missingEnvKeys.length > 0) {
  console.error(`.env.demo.example incompleto: ${missingEnvKeys.join(", ")}`);
  process.exit(1);
}

if (demoEnv.APP_ENV !== "demo") {
  console.error(".env.demo.example debe usar APP_ENV=demo.");
  process.exit(1);
}

const users = publicDemoUsers();
const dataset = demoDatasetPayload();

if (users.length !== 3) {
  console.error("La demo debe tener exactamente tres usuarios de prueba.");
  process.exit(1);
}

const roles = new Set(users.map((user) => user.role));
const requiredRoles: DemoRole[] = [
  "admin_dgems",
  "plantel",
  "responsable_indicador"
];

for (const requiredRole of requiredRoles) {
  if (!roles.has(requiredRole)) {
    console.error(`Falta el rol demo requerido: ${requiredRole}`);
    process.exit(1);
  }
}

if (
  dataset.summary.indicators < 5 ||
  dataset.summary.evidenceFiles < 5 ||
  dataset.summary.late < 1 ||
  dataset.summary.missing < 1
) {
  console.error("El dataset demo no cubre indicadores y evidencias suficientes.");
  process.exit(1);
}

if (containsRealSecretRisk(readFileSync(path.join(repoRoot, ".env.demo.example"), "utf8"))) {
  console.error(".env.demo.example contiene valores con apariencia de secreto real.");
  process.exit(1);
}

console.log("Demo validada: configuracion, seed, roles y datos ficticios listos.");

function parseEnvFile(content: string): Record<string, string> {
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)];
      })
  );
}

function containsRealSecretRisk(content: string): boolean {
  const riskyPatterns = [
    /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /AKIA[0-9A-Z]{16}/,
    /ghp_[A-Za-z0-9_]{20,}/,
    /xox[baprs]-[A-Za-z0-9-]{20,}/
  ];

  return riskyPatterns.some((pattern) => pattern.test(content));
}
