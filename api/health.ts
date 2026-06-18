import { applyCors, handleOptions, methodNotAllowed } from "./_lib/http";
import { stateFileLocation } from "../apps/backend/src/state-store.js";

export default function handler(request: any, response: any) {
  if (handleOptions(request, response)) {
    return;
  }

  applyCors(response);

  if (request.method !== "GET") {
    methodNotAllowed(response, ["GET", "OPTIONS"]);
    return;
  }

  response.status(200).json({
    service: "sigi-poa-api",
    status: "ok",
    runtime: "vercel",
    persistence: stateFileLocation(),
    timestamp: new Date().toISOString()
  });
}
