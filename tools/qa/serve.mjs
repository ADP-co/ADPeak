#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  loadManifest,
  readEnvironmentFile,
  scrubInheritedDatabaseEnvironment
} from "./lib/common.mjs";
import { assertManifestTarget } from "./lib/database.mjs";
import { REPO_ROOT } from "./lib/constants.mjs";

scrubInheritedDatabaseEnvironment();

const options = parseServeArguments(process.argv.slice(2));

if (!options.secrets) {
  throw new Error("qa:serve requires --secrets pointing to a private clone-only JSON file.");
}

const manifest = await loadManifest(options.manifest);
const environment = await readEnvironmentFile(manifest.artifacts.environment);
const target = assertManifestTarget(manifest, environment);
const passwords = JSON.parse((await readFile(path.resolve(options.secrets), "utf8")).replace(/^\uFEFF/, ""));
const backendPort = positivePort(options.backendPort, 3101);
const frontendPort = positivePort(options.frontendPort, 5174);
const backendUrl = `http://127.0.0.1:${backendPort}`;
const frontendUrl = `http://127.0.0.1:${frontendPort}`;

assertPasswords(passwords);

const backendRequire = createRequire(path.join(REPO_ROOT, "apps", "backend", "package.json"));
const frontendRequire = createRequire(path.join(REPO_ROOT, "apps", "frontend", "package.json"));
const tsxCli = backendRequire.resolve("tsx/cli");
const viteCli = path.resolve(path.dirname(frontendRequire.resolve("vite")), "..", "..", "bin", "vite.js");
const children = [];

const backend = spawn(process.execPath, [tsxCli, path.join(REPO_ROOT, "apps", "backend", "src", "server.ts")], {
  cwd: REPO_ROOT,
  env: {
    ...safeProcessEnvironment(),
    APP_ENV: "test",
    NODE_ENV: "qa-certification",
    BACKEND_PORT: String(backendPort),
    PUBLIC_APP_URL: frontendUrl,
    INTERNAL_API_URL: backendUrl,
    DATABASE_URL: target.url.toString(),
    AUTH_SECRET: environment.QA_AUTH_SECRET,
    INITIAL_DIRECTOR_PASSWORD: passwords.director,
    INITIAL_RESPONSABLE_PASSWORD: passwords.responsable,
    INITIAL_PLANTEL_PASSWORD: passwords.plantel,
    AUTH_TOKEN_TTL_MINUTES: "30",
    CORS_ORIGIN: frontendUrl,
    FILE_STORAGE_DRIVER: "local",
    FILE_STORAGE_PATH: path.join(manifest.artifacts.runDirectory, "runtime-files")
  },
  stdio: "inherit",
  windowsHide: true
});
children.push(backend);

const frontend = spawn(process.execPath, [
  viteCli,
  "--host",
  "127.0.0.1",
  "--port",
  String(frontendPort)
], {
  cwd: path.join(REPO_ROOT, "apps", "frontend"),
  env: {
    ...safeProcessEnvironment(),
    NODE_ENV: "qa-certification",
    VITE_API_BASE_URL: `${backendUrl}/api/v1`,
    VITE_API_URL: backendUrl
  },
  stdio: "inherit",
  windowsHide: true
});
children.push(frontend);

console.log(`QA frontend: ${frontendUrl}/login`);
console.log(`QA backend: ${backendUrl}/health`);
console.log(`QA database: ${target.host}:${target.port}/${target.database}`);

for (const child of children) {
  child.once("exit", (code) => {
    if (!stopping && code !== 0) {
      console.error(`QA child exited unexpectedly with code ${code}.`);
      stop(code ?? 1);
    }
  });
}

let stopping = false;
process.once("SIGINT", () => stop(0));
process.once("SIGTERM", () => stop(0));

await new Promise(() => undefined);

function stop(exitCode) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(exitCode), 500).unref();
}

function positivePort(value, fallback) {
  const port = Number(value ?? fallback);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error(`Invalid QA port: ${value}.`);
  }
  return port;
}

function assertPasswords(value) {
  for (const role of ["director", "responsable", "plantel"]) {
    if (typeof value?.[role] !== "string" || value[role].length < 16) {
      throw new Error(`Clone-only ${role} password is missing or too short.`);
    }
  }
}

function safeProcessEnvironment() {
  const allowed = [
    "COMSPEC", "HOMEDRIVE", "HOMEPATH", "LOCALAPPDATA", "PATH", "Path",
    "PATHEXT", "SYSTEMDRIVE", "SYSTEMROOT", "SystemRoot", "TEMP", "TMP",
    "USERPROFILE", "WINDIR"
  ];
  return Object.fromEntries(allowed.flatMap((key) =>
    process.env[key] === undefined ? [] : [[key, process.env[key]]]
  ));
}

function parseServeArguments(argv) {
  const parsed = {};
  const optionNames = new Map([
    ["--manifest", "manifest"],
    ["--secrets", "secrets"],
    ["--backend-port", "backendPort"],
    ["--frontend-port", "frontendPort"]
  ]);

  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const key = optionNames.get(name);
    const value = argv[index + 1];

    if (!key || !value || value.startsWith("--")) {
      throw new Error(`Invalid qa:serve option near ${name ?? "end of arguments"}.`);
    }

    parsed[key] = value;
  }

  if (!parsed.manifest) {
    throw new Error("qa:serve requires --manifest.");
  }

  return parsed;
}
