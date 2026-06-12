export function applyCors(response: any) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-id, x-role, x-plantel-id, x-responsable-id");
}

export function handleOptions(request: any, response: any) {
  applyCors(response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return true;
  }

  return false;
}

export function methodNotAllowed(response: any, allowed: string[]) {
  response.setHeader("Allow", allowed.join(", "));
  response.status(405).json({ error: "method_not_allowed", allowed });
}

export async function readJsonBody(request: any) {
  if (request.body !== undefined) {
    return typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body;
  }

  let rawBody = "";

  for await (const chunk of request) {
    rawBody += chunk;
  }

  return rawBody ? JSON.parse(rawBody) : {};
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function positiveInteger(value: unknown) {
  return Number.isInteger(value) && Number(value) > 0;
}
