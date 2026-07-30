import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  assertLoginAllowed,
  loginAttemptKey,
  recordLoginFailure,
  resetLoginRateLimitsForTests
} from "./auth-rate-limit.js";
import {
  authenticationResponse,
  clearSessionCookie,
  setSessionCookie
} from "./session-cookie.js";
import { corsDecision } from "./http-security.js";

const originalEnvironment = {
  APP_ENV: process.env.APP_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  CORS_ORIGIN: process.env.CORS_ORIGIN
};

describe("authentication perimeter", () => {
  beforeEach(async () => {
    await resetLoginRateLimitsForTests();
    process.env.APP_ENV = "production";
    delete process.env.VERCEL_ENV;
    delete process.env.CORS_ORIGIN;
  });

  afterEach(async () => {
    await resetLoginRateLimitsForTests();
    restoreEnvironment();
  });

  it("rate limits repeated failures by client and username", async () => {
    const key = loginAttemptKey({ headers: { "x-forwarded-for": "203.0.113.7" } }, "resp01");

    expect(key).toMatch(/^[a-f0-9]{64}$/);
    expect(key).not.toContain("resp01");
    expect(key).not.toContain("203.0.113.7");

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await assertLoginAllowed(key, 1_000);
      await recordLoginFailure(key, 1_000);
    }

    await expect(assertLoginAllowed(key, 1_000)).rejects.toThrow("Demasiados intentos");
  });

  it("uses an HttpOnly strict secure cookie and clears it explicitly", () => {
    const headers = new Map<string, string>();
    const response = { setHeader: (name: string, value: string) => headers.set(name, value) };

    setSessionCookie(response, "signed-token");
    expect(headers.get("Set-Cookie")).toContain("adpeak_session=signed-token");
    expect(headers.get("Set-Cookie")).toContain("HttpOnly");
    expect(headers.get("Set-Cookie")).toContain("SameSite=Strict");
    expect(headers.get("Set-Cookie")).toContain("Secure");

    clearSessionCookie(response);
    expect(headers.get("Set-Cookie")).toContain("Max-Age=0");
  });

  it("never returns the signed token in a production JSON response", () => {
    expect(authenticationResponse({ id: "responsable-1" }, "private-token"))
      .toEqual({ user: { id: "responsable-1" } });

    process.env.APP_ENV = "test";
    expect(authenticationResponse({ id: "responsable-1" }, "qa-token"))
      .toMatchObject({ sessionToken: "qa-token" });
  });

  it("allows the actual same origin and rejects a foreign origin", () => {
    const request = {
      headers: {
        origin: "https://adpeak.example",
        host: "adpeak.example",
        "x-forwarded-proto": "https"
      }
    };

    expect(corsDecision(request.headers)).toEqual({
      allowed: true,
      origin: "https://adpeak.example"
    });
    expect(corsDecision({
      ...request.headers,
      origin: "https://attacker.example"
    })).toEqual({ allowed: false });
  });
});

function restoreEnvironment() {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}
