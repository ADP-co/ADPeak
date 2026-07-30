export const SESSION_COOKIE_NAME = "adpeak_session";

export function setSessionCookie(response: { setHeader(name: string, value: string): void }, token: string) {
  response.setHeader("Set-Cookie", serializeSessionCookie(token, sessionMaxAgeSeconds()));
}

export function clearSessionCookie(response: { setHeader(name: string, value: string): void }) {
  response.setHeader("Set-Cookie", serializeSessionCookie("", 0));
}

export function authenticationResponse<T>(user: T, token: string) {
  return isProductionRuntime() ? { user } : { user, sessionToken: token };
}

function serializeSessionCookie(token: string, maxAge: number) {
  const attributes = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${maxAge}`
  ];

  if (isSecureRuntime()) {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

function sessionMaxAgeSeconds() {
  const minutes = Number(process.env.AUTH_TOKEN_TTL_MINUTES ?? 480);
  const boundedMinutes = Number.isFinite(minutes) ? Math.max(15, Math.min(1440, minutes)) : 480;
  return boundedMinutes * 60;
}

function isSecureRuntime() {
  return process.env.APP_ENV === "production" || process.env.VERCEL_ENV === "production" || process.env.VERCEL === "1";
}

function isProductionRuntime() {
  return process.env.APP_ENV === "production" || process.env.VERCEL_ENV === "production";
}
