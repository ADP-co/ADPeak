import { stateFileLocation } from "./state-store.js";

export type HealthPayload = {
  service: "sigi-poa-api";
  status: "ok";
  persistence: string;
  timestamp: string;
};

export function healthPayload(now = new Date()): HealthPayload {
  return {
    service: "sigi-poa-api",
    status: "ok",
    persistence: stateFileLocation(),
    timestamp: now.toISOString()
  };
}
