import { createHash } from "node:crypto";
import {
  persistState,
  readPersistedValue,
  withPersistedStateMutation
} from "./state-store.js";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const PERSISTED_KEY = "loginRateLimits";

type AttemptWindow = {
  failures: number;
  resetAt: number;
};

export class LoginRateLimitError extends Error {
  readonly statusCode = 429;
  readonly code = "too_many_login_attempts";

  constructor(readonly retryAfterSeconds: number) {
    super("Demasiados intentos de inicio de sesión. Espera unos minutos e intenta de nuevo.");
    this.name = "LoginRateLimitError";
  }
}

export function loginAttemptKey(
  request: { headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } },
  username: string
) {
  const forwardedFor = headerValue(request.headers?.["x-forwarded-for"])?.split(",")[0]?.trim();
  const clientAddress = forwardedFor || headerValue(request.headers?.["x-real-ip"]) || request.socket?.remoteAddress || "unknown";
  return createHash("sha256")
    .update(`${clientAddress.toLowerCase()}:${username.trim().toLowerCase() || "anonymous"}`)
    .digest("hex");
}

export async function assertLoginAllowed(key: string, now = Date.now()) {
  await withPersistedStateMutation(async () => {
    const attempts = readAttempts();
    const changed = purgeExpiredAttempts(attempts, now);
    const current = attempts[key];

    if (changed) {
      persistState({ [PERSISTED_KEY]: attempts });
    }

    if (current && current.failures >= MAX_FAILURES) {
      throw new LoginRateLimitError(Math.max(1, Math.ceil((current.resetAt - now) / 1000)));
    }
  });
}

export async function recordLoginFailure(key: string, now = Date.now()) {
  await withPersistedStateMutation(async () => {
    const attempts = readAttempts();
    purgeExpiredAttempts(attempts, now);
    const current = attempts[key];

    attempts[key] = !current || current.resetAt <= now
      ? { failures: 1, resetAt: now + WINDOW_MS }
      : { ...current, failures: current.failures + 1 };

    persistState({ [PERSISTED_KEY]: attempts });
  });
}

export async function clearLoginFailures(key: string) {
  await withPersistedStateMutation(async () => {
    const attempts = readAttempts();
    if (!(key in attempts)) {
      return;
    }

    delete attempts[key];
    persistState({ [PERSISTED_KEY]: attempts });
  });
}

export async function resetLoginRateLimitsForTests() {
  await withPersistedStateMutation(async () => {
    persistState({ [PERSISTED_KEY]: {} });
  });
}

function readAttempts() {
  return { ...(readPersistedValue<Record<string, AttemptWindow>>(PERSISTED_KEY) ?? {}) };
}

function purgeExpiredAttempts(attempts: Record<string, AttemptWindow>, now: number) {
  let changed = false;

  for (const [key, attempt] of Object.entries(attempts)) {
    if (attempt.resetAt <= now) {
      delete attempts[key];
      changed = true;
    }
  }

  return changed;
}

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
