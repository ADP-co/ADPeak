import { createHmac } from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { REPO_ROOT } from "./constants.mjs";
import { QaHarnessError } from "./common.mjs";

export async function withTestBackend({ authSecret, artifactDirectory, databaseUrl, initialPasswords }, operation) {
  const port = await reservePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const backendRequire = createRequire(path.join(REPO_ROOT, "apps", "backend", "package.json"));
  const tsxCli = backendRequire.resolve("tsx/cli");
  const serverEntry = path.join(REPO_ROOT, "apps", "backend", "src", "server.ts");
  const child = spawn(process.execPath, [tsxCli, serverEntry], {
    cwd: os.tmpdir(),
    env: runtimeEnvironment({ authSecret, artifactDirectory, databaseUrl, initialPasswords, port, baseUrl }),
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  const output = captureOutput(child);

  try {
    await waitForHealth(baseUrl, child, output);
    return await operation({
      baseUrl,
      request: (route, options) => requestJson(baseUrl, route, options),
      requestBinary: (route, options) => requestBinary(baseUrl, route, options),
      tokenFor: (identity) => createSessionToken(authSecret, identity)
    });
  } finally {
    await stopChild(child);
  }
}

function runtimeEnvironment({ authSecret, artifactDirectory, databaseUrl, initialPasswords, port, baseUrl }) {
  const environment = {};
  const passThrough = [
    "COMSPEC",
    "HOMEDRIVE",
    "HOMEPATH",
    "LOCALAPPDATA",
    "PATH",
    "Path",
    "PATHEXT",
    "SYSTEMDRIVE",
    "SYSTEMROOT",
    "SystemRoot",
    "TEMP",
    "TMP",
    "USERPROFILE",
    "WINDIR"
  ];

  for (const key of passThrough) {
    if (process.env[key] !== undefined) {
      environment[key] = process.env[key];
    }
  }

  return {
    ...environment,
    APP_ENV: "test",
    NODE_ENV: "qa-certification",
    BACKEND_PORT: String(port),
    PUBLIC_APP_URL: baseUrl,
    INTERNAL_API_URL: baseUrl,
    DATABASE_URL: databaseUrl,
    AUTH_SECRET: authSecret,
    INITIAL_DIRECTOR_PASSWORD: initialPasswords.director,
    INITIAL_RESPONSABLE_PASSWORD: initialPasswords.responsable,
    INITIAL_PLANTEL_PASSWORD: initialPasswords.plantel,
    AUTH_TOKEN_TTL_MINUTES: "30",
    FILE_STORAGE_DRIVER: "local",
    FILE_STORAGE_PATH: path.join(artifactDirectory, "runtime-files"),
    EVIDENCE_MAX_FILE_MB: "1",
    CORS_ORIGIN: baseUrl
  };
}

function createSessionToken(secret, identity) {
  const payload = {
    sub: identity.userId,
    role: identity.role,
    ...(identity.plantelId ? { plantelId: identity.plantelId } : {}),
    ...(identity.responsableId ? { responsableId: identity.responsableId } : {}),
    exp: Math.floor(Date.now() / 1000) + 300
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

async function requestJson(baseUrl, route, options = {}) {
  const headers = {
    accept: "application/json",
    ...(options.headers ?? {})
  };

  if (options.token) {
    headers.authorization = `Bearer ${options.token}`;
    headers["x-session-token"] = options.token;
  }

  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
  }

  const response = await fetch(new URL(route, baseUrl), {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(10_000)
  });
  const text = await response.text();
  let body;

  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }

  return { status: response.status, body, headers: response.headers };
}

async function requestBinary(baseUrl, route, options = {}) {
  const headers = {
    accept: "application/pdf,application/octet-stream",
    ...(options.headers ?? {})
  };

  if (options.token) {
    headers.authorization = `Bearer ${options.token}`;
    headers["x-session-token"] = options.token;
  }

  const response = await fetch(new URL(route, baseUrl), {
    method: options.method ?? "GET",
    headers,
    signal: AbortSignal.timeout(10_000)
  });

  return {
    status: response.status,
    body: Buffer.from(await response.arrayBuffer()),
    headers: response.headers
  };
}

async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  await new Promise((resolve) => server.close(resolve));

  if (!address || typeof address === "string") {
    throw new QaHarnessError("Could not reserve a local backend probe port.");
  }

  return address.port;
}

function captureOutput(child) {
  const captured = { stdout: "", stderr: "" };
  const append = (key, chunk) => {
    captured[key] = `${captured[key]}${chunk.toString("utf8")}`.slice(-32_768);
  };
  child.stdout.on("data", (chunk) => append("stdout", chunk));
  child.stderr.on("data", (chunk) => append("stderr", chunk));
  return captured;
}

async function waitForHealth(baseUrl, child, output) {
  const deadline = Date.now() + 20_000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new QaHarnessError(
        `Test backend exited before healthcheck (code ${child.exitCode}). ${safeRuntimeTail(output)}`
      );
    }

    try {
      const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(1_000) });
      if (response.status === 200) {
        return;
      }
    } catch {
      // Startup polling intentionally ignores connection failures until the deadline.
    }

    await delay(200);
  }

  throw new QaHarnessError(`Test backend healthcheck timed out. ${safeRuntimeTail(output)}`);
}

async function stopChild(child) {
  if (child.exitCode !== null) {
    return;
  }

  child.kill("SIGTERM");
  const exited = await Promise.race([
    new Promise((resolve) => child.once("exit", () => resolve(true))),
    delay(3_000).then(() => false)
  ]);

  if (!exited && child.exitCode === null) {
    child.kill("SIGKILL");
    await Promise.race([
      new Promise((resolve) => child.once("exit", resolve)),
      delay(2_000)
    ]);
  }
}

function safeRuntimeTail(output) {
  return `${output.stderr || output.stdout}`
    .replace(/(postgres(?:ql)?:\/\/)[^@\s]+@/gi, "$1[redacted]@")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(-500);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
