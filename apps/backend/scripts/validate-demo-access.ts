import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { getAppConfig } from "../src/config.js";
import { publicDemoUsers, type DemoRole } from "../src/demo-data.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(backendRoot, "../..");
const localEnvPath = path.join(repoRoot, ".env");
const demoEnvPath = path.join(repoRoot, ".env.demo.example");

if (existsSync(localEnvPath)) {
  loadDotenv({ path: localEnvPath, quiet: true });
} else {
  loadDotenv({ path: demoEnvPath, quiet: true });
}

const config = getAppConfig();
const apiUrl = config.internalApiUrl;
const frontendUrl = config.publicAppUrl;

await requireOk(`${apiUrl}/health`, "API healthcheck");
await requireOk(`${apiUrl}/demo/status`, "API demo status");
await requireOk(`${apiUrl}/demo/data`, "API demo data");
await requireReportPayload(`${apiUrl}/demo/report`);
await requireOk(`${apiUrl}/demo/report.csv`, "Reporte CSV demo");

for (const user of publicDemoUsers()) {
  const response = await fetch(`${apiUrl}/demo/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: user.email,
      accessCode: user.accessCode
    })
  });

  if (!response.ok) {
    console.error(`Login demo fallo para ${user.role}: ${response.status}`);
    process.exit(1);
  }

  const session = (await response.json()) as {
    token?: string;
    user?: { role?: string; mainFlow?: string[] };
  };

  if (
    !session.token ||
    session.user?.role !== user.role ||
    !Array.isArray(session.user.mainFlow)
  ) {
    console.error(`Login demo no devolvio sesion valida para ${user.role}.`);
    process.exit(1);
  }

  await requireDemoAction(apiUrl, user.role);
}

await requireOk(frontendUrl, "Frontend demo");

console.log("Acceso demo validado: frontend, API, datos y roles responden.");

async function requireOk(url: string, label: string) {
  const response = await fetch(url);

  if (!response.ok) {
    console.error(`${label} no responde correctamente: ${response.status} ${url}`);
    process.exit(1);
  }
}

async function requireReportPayload(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    console.error(`Reporte JSON demo no responde correctamente: ${response.status} ${url}`);
    process.exit(1);
  }

  const report = (await response.json()) as {
    indicadores?: Array<{ datos?: unknown[] }>;
  };

  if (
    !Array.isArray(report.indicadores) ||
    report.indicadores.length === 0 ||
    report.indicadores.some((indicator) => !Array.isArray(indicator.datos))
  ) {
    console.error("Reporte JSON demo no incluye indicadores[].datos[].");
    process.exit(1);
  }
}

async function requireDemoAction(apiUrl: string, role: DemoRole) {
  const actionByRole: Record<DemoRole, string> = {
    admin_dgems: "approve",
    plantel: "capture_submit",
    responsable_indicador: "request_correction"
  };
  const response = await fetch(`${apiUrl}/demo/action`, {
    body: JSON.stringify({
      action: actionByRole[role],
      role
    }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    console.error(`Accion demo fallo para ${role}: ${response.status}`);
    process.exit(1);
  }
}
