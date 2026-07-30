import { appendFileSync, copyFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(backendRoot, "../..");
const demoEnvPath = path.join(repoRoot, ".env.demo.example");
const localEnvPath = path.join(repoRoot, ".env");

if (!existsSync(demoEnvPath)) {
  console.error("No existe .env.demo.example.");
  process.exit(1);
}

if (!existsSync(localEnvPath)) {
  copyFileSync(demoEnvPath, localEnvPath);
  console.log(".env creado desde .env.demo.example.");
  process.exit(0);
}

const localEnv = readFileSync(localEnvPath, "utf8");
const demoEnv = readFileSync(demoEnvPath, "utf8");

if (!/^APP_ENV=demo$/m.test(localEnv)) {
  console.error(
    "El archivo .env existente no esta en modo demo. Revisa antes de ejecutar demo:build."
  );
  process.exit(1);
}

const keysToBackfill = ["VITE_API_BASE_URL", "SIGI_DATA_FILE"];
const missingLines = keysToBackfill.flatMap((key) => {
  if (new RegExp(`^${key}=`, "m").test(localEnv)) {
    return [];
  }

  const match = demoEnv.match(new RegExp(`^${key}=.*$`, "m"));
  return match ? [match[0]] : [];
});

if (missingLines.length > 0) {
  appendFileSync(localEnvPath, `\n${missingLines.join("\n")}\n`, "utf8");
  console.log(`.env demo actualizado con: ${missingLines.map((line) => line.split("=")[0]).join(", ")}.`);
} else {
  console.log(".env demo existente validado.");
}
