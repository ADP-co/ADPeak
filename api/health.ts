import { applyCors, handleOptions, methodNotAllowed } from "./_lib/http";

export default function handler(request: any, response: any) {
  if (handleOptions(request, response)) {
    return;
  }

  if (!applyCors(response, request)) {
    response.status(403).json({ error: "origin_not_allowed", message: "El origen de la solicitud no está autorizado." });
    return;
  }

  if (request.method !== "GET") {
    methodNotAllowed(response, ["GET", "OPTIONS"]);
    return;
  }

  response.status(200).json({
    service: "sigi-poa-api",
    status: "ok",
    runtime: "vercel",
    persistence: persistenceLocation(),
    timestamp: new Date().toISOString()
  });
}

function persistenceLocation() {
  if (
    process.env.ADPEAK_RECOVERY_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING
  ) {
    return "postgres:app_state";
  }

  if (process.env.SIGI_DATA_FILE || process.env.ADPEAK_DATA_FILE) {
    return "file";
  }

  return process.env.VERCEL ? "vercel-temp-file" : "memory-only";
}
