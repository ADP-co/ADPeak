export type HealthPayload = {
  service: "sigi-poa-api";
  status: "ok";
  timestamp: string;
};

export function healthPayload(now = new Date()): HealthPayload {
  return {
    service: "sigi-poa-api",
    status: "ok",
    timestamp: now.toISOString()
  };
}
