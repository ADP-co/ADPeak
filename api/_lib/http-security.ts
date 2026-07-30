export type HeaderMap = Record<string, string | string[] | undefined>;

export const API_SECURITY_HEADERS = Object.freeze({
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; sandbox",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
});

export function corsDecision(headers: HeaderMap = {}, environment: NodeJS.ProcessEnv = process.env) {
  const origin = headerValue(headers.origin);

  if (!origin) {
    return { allowed: true as const };
  }

  const origins = new Set(
    String(environment.CORS_ORIGIN ?? "")
      .split(",")
      .map(normalizeHttpOrigin)
      .filter((value): value is string => Boolean(value))
  );
  const host = headerValue(headers.host);
  const forwardedProtocol = headerValue(headers["x-forwarded-proto"]);
  const protocol = forwardedProtocol === "https" ? "https" : "http";

  if (host && !/[\r\n]/.test(host)) {
    const requestOrigin = normalizeHttpOrigin(`${protocol}://${host}`);

    if (requestOrigin) {
      origins.add(requestOrigin);
    }
  }

  if (!isProductionRuntime(environment)) {
    origins.add("http://localhost:5173");
    origins.add("http://127.0.0.1:5173");
  }

  const normalizedOrigin = normalizeHttpOrigin(origin);
  return normalizedOrigin && origins.has(normalizedOrigin)
    ? { allowed: true as const, origin: normalizedOrigin }
    : { allowed: false as const };
}

function normalizeHttpOrigin(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) && parsed.origin === value.replace(/\/$/, "")
      ? parsed.origin
      : undefined;
  } catch {
    return undefined;
  }
}

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isProductionRuntime(environment: NodeJS.ProcessEnv) {
  return environment.APP_ENV === "production" || environment.VERCEL_ENV === "production";
}
