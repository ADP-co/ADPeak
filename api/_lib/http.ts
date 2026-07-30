import { API_SECURITY_HEADERS, corsDecision } from "./http-security";

const ALLOWED_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const ALLOWED_HEADERS = [
  "Authorization",
  "Content-Type",
  "x-session-token",
  "x-user-id",
  "x-role",
  "x-plantel-id",
  "x-responsable-id",
  "x-request-id"
].join(", ");

export function applyCors(response: any, request?: any) {
  applySecurityHeaders(response);
  const decision = corsDecision(request?.headers ?? {});

  if (!decision.allowed) {
    return false;
  }

  if (!decision.origin) {
    return true;
  }

  response.setHeader("Access-Control-Allow-Origin", decision.origin);
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS);
  response.setHeader("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  appendVary(response, "Origin");
  return true;
}

export function handleOptions(request: any, response: any) {
  if (request.method !== "OPTIONS") {
    applySecurityHeaders(response);
    return false;
  }

  if (!applyCors(response, request)) {
    response.status(403).json({
      error: "origin_not_allowed",
      message: "El origen de la solicitud no está autorizado."
    });
    return true;
  }

  response.status(204).end();
  return true;
}

export function methodNotAllowed(response: any, allowed: string[]) {
  response.setHeader("Allow", allowed.join(", "));
  response.status(405).json({ error: "method_not_allowed", allowed });
}

export class InvalidJsonBodyError extends Error {
  constructor() {
    super("Invalid JSON body");
    this.name = "InvalidJsonBodyError";
  }
}

export async function readJsonBody(request: any) {
  try {
    if (request.body !== undefined) {
      return typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body;
    }

    let rawBody = "";

    for await (const chunk of request) {
      rawBody += chunk;
    }

    return rawBody ? JSON.parse(rawBody) : {};
  } catch {
    throw new InvalidJsonBodyError();
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function positiveInteger(value: unknown) {
  return Number.isInteger(value) && Number(value) > 0;
}

function applySecurityHeaders(response: any) {
  for (const [name, value] of Object.entries(API_SECURITY_HEADERS)) {
    response.setHeader(name, value);
  }
}

function appendVary(response: any, value: string) {
  const current = response.getHeader?.("Vary");
  const entries = String(current ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!entries.some((entry) => entry.toLowerCase() === value.toLowerCase())) {
    entries.push(value);
  }

  response.setHeader("Vary", entries.join(", "));
}
