import { createHash, randomBytes } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { access, mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  BASELINE,
  CLONE_PASSWORD_ENV_KEYS,
  DATABASE_PREFIX,
  DEFAULT_MANIFEST_PATH,
  EXPECTED_PASSWORD_HASH_ENV_KEYS,
  INHERITED_DATABASE_ENV_KEYS,
  MANIFEST_SCHEMA_VERSION,
  QA_OUTPUT_ROOT,
  REPO_ROOT
} from "./constants.mjs";

const registeredSecrets = new Set();

export class QaHarnessError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "QaHarnessError";
  }
}

export function scrubInheritedDatabaseEnvironment() {
  for (const key of INHERITED_DATABASE_ENV_KEYS) {
    delete process.env[key];
  }
}

export function assertTestEnvironment() {
  if (process.env.APP_ENV !== "test" || process.env.NODE_ENV !== "test") {
    throw new QaHarnessError(
      "Mutation refused: set APP_ENV=test and NODE_ENV=test explicitly in the invoking shell."
    );
  }
}

export function parseArguments(argv, allowedValueOptions = []) {
  const allowed = new Set(allowedValueOptions);
  const parsed = {
    dryRun: false,
    help: false,
    manifest: DEFAULT_MANIFEST_PATH,
    outputDir: QA_OUTPUT_ROOT
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--help" || argument === "-h") {
      parsed.help = true;
      continue;
    }

    if (argument === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }

    if (argument === "--manifest" || argument === "--output-dir") {
      if (!allowed.has(argument)) {
        throw new QaHarnessError(`Unsupported option: ${argument}`);
      }

      const value = argv[index + 1];

      if (!value || value.startsWith("--")) {
        throw new QaHarnessError(`${argument} requires a path.`);
      }

      index += 1;
      parsed[argument === "--manifest" ? "manifest" : "outputDir"] = path.resolve(value);
      continue;
    }

    throw new QaHarnessError(`Unknown option: ${argument}`);
  }

  parsed.manifest = path.resolve(parsed.manifest);
  parsed.outputDir = path.resolve(parsed.outputDir);
  return parsed;
}

export function printDryRun(command, actions) {
  console.log(`${command} dry-run`);
  for (const action of actions) {
    console.log(`- ${action}`);
  }
  console.log("No files, databases, or application state were changed.");
}

export function requiredEnvironmentValue(key) {
  const value = process.env[key];

  if (typeof value !== "string" || value.length === 0) {
    throw new QaHarnessError(`Required environment variable is missing: ${key}`);
  }

  registerSecret(value);
  return value;
}

export function readClonePasswords() {
  const passwords = Object.fromEntries(
    Object.entries(CLONE_PASSWORD_ENV_KEYS).map(([role, key]) => [role, requiredEnvironmentValue(key)])
  );
  const uniquePasswords = new Set(Object.values(passwords));

  if (uniquePasswords.size !== Object.keys(passwords).length) {
    throw new QaHarnessError("Clone passwords must be different for each role.");
  }

  for (const [role, password] of Object.entries(passwords)) {
    const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length;

    if (password.length < 12 || classes < 3) {
      throw new QaHarnessError(
        `${CLONE_PASSWORD_ENV_KEYS[role]} must contain at least 12 characters and three character classes.`
      );
    }

    if (/password|change[-_ ]?me|director2026|resp2026|plantel2026/i.test(password)) {
      throw new QaHarnessError(`${CLONE_PASSWORD_ENV_KEYS[role]} must be clone-only and non-default.`);
    }
  }

  return passwords;
}

export function hashApplicationPassword(password) {
  return createHash("sha256").update(`adpeak:${password}`).digest("hex");
}

export function expectedPasswordHashes(passwords) {
  return Object.fromEntries(
    Object.entries(passwords).map(([role, password]) => [role, hashApplicationPassword(password)])
  );
}

export function expectedHashEnvironment(hashes) {
  return Object.fromEntries(
    Object.entries(EXPECTED_PASSWORD_HASH_ENV_KEYS).map(([role, key]) => [key, hashes[role]])
  );
}

export function readExpectedPasswordHashes(environment) {
  const result = {};

  for (const [role, key] of Object.entries(EXPECTED_PASSWORD_HASH_ENV_KEYS)) {
    const value = environment[key];

    if (!/^[a-f0-9]{64}$/.test(value ?? "")) {
      throw new QaHarnessError(`Generated QA environment is missing a valid ${key}. Run qa:seed first.`);
    }

    result[role] = value;
  }

  return result;
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function randomSecret(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function registerSecret(value) {
  if (typeof value === "string" && value.length >= 4) {
    registeredSecrets.add(value);
  }
}

export function safeErrorMessage(error) {
  let message = error instanceof Error ? error.message : String(error);

  message = message.replace(/(postgres(?:ql)?:\/\/)[^@\s]+@/gi, "$1[redacted]@");
  for (const secret of registeredSecrets) {
    message = message.split(secret).join("[redacted]");
  }

  return message;
}

export async function runCommand(main) {
  try {
    await main();
  } catch (error) {
    console.error(`QA harness error: ${safeErrorMessage(error)}`);
    process.exitCode = 1;
  }
}

export async function pathExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function atomicWrite(filePath, contents, mode = 0o600) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(temporaryPath, contents, { encoding: "utf8", mode });
  await rename(temporaryPath, filePath);
}

export async function withQaLock(outputRoot, operation) {
  await mkdir(path.resolve(outputRoot), { recursive: true });
  const lockPath = path.join(path.resolve(outputRoot), ".qa-harness.lock");
  let handle;

  try {
    handle = await open(lockPath, "wx", 0o600);
    await handle.writeFile(`${JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() })}\n`, "utf8");
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new QaHarnessError(
        `QA harness lock already exists at ${lockPath}. Confirm no QA command is running before removing a stale lock.`
      );
    }
    throw error;
  }

  try {
    return await operation();
  } finally {
    await handle.close().catch(() => undefined);
    await unlink(lockPath).catch(() => undefined);
  }
}

export async function writeJson(filePath, value) {
  await atomicWrite(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export async function readJson(filePath, label = "JSON file") {
  let source;

  try {
    source = await readFile(filePath, "utf8");
  } catch (error) {
    throw new QaHarnessError(`${label} could not be read at ${filePath}.`, { cause: error });
  }

  try {
    return JSON.parse(source);
  } catch (error) {
    throw new QaHarnessError(`${label} is not valid JSON: ${filePath}.`, { cause: error });
  }
}

export async function readEnvironmentFile(filePath) {
  let source;

  try {
    source = await readFile(filePath, "utf8");
  } catch (error) {
    throw new QaHarnessError(`Generated QA environment could not be read at ${filePath}.`, { cause: error });
  }

  const environment = {};

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);

    if (!match) {
      throw new QaHarnessError(`Invalid line in generated QA environment: ${filePath}.`);
    }

    const [, key, rawValue] = match;

    try {
      environment[key] = rawValue.startsWith('"') ? JSON.parse(rawValue) : rawValue;
    } catch (error) {
      throw new QaHarnessError(`Invalid value for ${key} in generated QA environment.`, { cause: error });
    }
  }

  if (environment.QA_TARGET_DATABASE_URL) {
    registerSecret(environment.QA_TARGET_DATABASE_URL);
  }
  if (environment.QA_AUTH_SECRET) {
    registerSecret(environment.QA_AUTH_SECRET);
  }

  return environment;
}

export async function writeEnvironmentFile(filePath, values) {
  const lines = [
    "# Generated by tools/qa. Ignored by git. Do not commit or share.",
    ...Object.entries(values).map(([key, value]) => `${key}=${JSON.stringify(String(value))}`),
    ""
  ];
  await atomicWrite(filePath, lines.join("\n"));
}

export async function loadManifest(manifestPath) {
  const manifest = await readJson(path.resolve(manifestPath), "QA manifest");

  if (manifest?.schemaVersion !== MANIFEST_SCHEMA_VERSION) {
    throw new QaHarnessError("Unsupported or missing QA manifest schema version.");
  }

  if (!manifest.artifacts?.runManifest || !manifest.artifacts?.environment) {
    throw new QaHarnessError("QA manifest does not contain required artifact paths.");
  }

  validateManifestArtifactPaths(manifest);

  return manifest;
}

export async function assertNoActiveClone(activeManifestPath) {
  if (!(await pathExists(activeManifestPath))) {
    return;
  }

  const manifest = await loadManifest(activeManifestPath);

  if (manifest.status !== "cleaned") {
    throw new QaHarnessError(
      `An active QA clone is already recorded (${manifest.target?.database ?? "unknown"}). Run qa:cleanup first.`
    );
  }
}

export async function saveManifest(manifest) {
  validateManifestArtifactPaths(manifest);
  const next = {
    ...manifest,
    updatedAt: new Date().toISOString()
  };

  await writeJson(next.artifacts.runManifest, next);
  await writeJson(next.artifacts.activeManifest, next);
  return next;
}

export function createArtifactPaths(outputRoot, targetDatabase) {
  const resolvedOutputRoot = assertSafeArtifactRoot(outputRoot);
  const runDirectory = path.join(resolvedOutputRoot, "runs", targetDatabase);
  return {
    runDirectory,
    sourceBackup: path.join(runDirectory, "source-app_state.json"),
    sourceBackupSha256: path.join(runDirectory, "source-app_state.json.sha256"),
    environment: path.join(runDirectory, "qa.env"),
    runManifest: path.join(runDirectory, "manifest.json"),
    activeManifest: path.join(resolvedOutputRoot, "active-manifest.json"),
    matrix: path.join(runDirectory, "QA_MATRIX.csv"),
    report: path.join(runDirectory, "QA_REPORT.md"),
    findings: path.join(runDirectory, "QA_FINDINGS.md")
  };
}

export function createManifest({ artifacts, source, target, snapshotSha256, snapshotRows, connectionFingerprint }) {
  const now = new Date().toISOString();
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    status: "cloned",
    createdAt: now,
    updatedAt: now,
    source,
    target,
    safety: {
      databasePrefix: DATABASE_PREFIX,
      sameHostAndPort: true,
      targetConnectionFingerprint: connectionFingerprint
    },
    baseline: BASELINE,
    sourceSnapshot: {
      rows: snapshotRows,
      sha256: snapshotSha256
    },
    artifacts
  };
}

export function displayPath(filePath) {
  return path.relative(process.cwd(), filePath) || ".";
}

export function assertSafeArtifactRoot(outputRoot) {
  const resolved = path.resolve(outputRoot);

  if (resolved === path.parse(resolved).root) {
    throw new QaHarnessError("QA artifact root cannot be a filesystem root.");
  }

  const relativeToRepository = path.relative(REPO_ROOT, resolved);
  const insideRepository =
    relativeToRepository !== "" &&
    !relativeToRepository.startsWith(`..${path.sep}`) &&
    relativeToRepository !== ".." &&
    !path.isAbsolute(relativeToRepository);

  if (insideRepository && relativeToRepository.split(path.sep)[0].toLowerCase() !== "output") {
    throw new QaHarnessError("QA artifacts inside the repository must stay below the ignored output directory.");
  }

  if (resolved === REPO_ROOT) {
    throw new QaHarnessError("QA artifact root cannot be the repository root.");
  }

  return resolved;
}

function validateManifestArtifactPaths(manifest) {
  const artifacts = manifest.artifacts ?? {};
  const required = [
    "runDirectory",
    "sourceBackup",
    "sourceBackupSha256",
    "environment",
    "runManifest",
    "activeManifest",
    "matrix",
    "report",
    "findings"
  ];

  for (const key of required) {
    if (typeof artifacts[key] !== "string" || !path.isAbsolute(artifacts[key])) {
      throw new QaHarnessError(`QA manifest artifact path must be absolute: ${key}.`);
    }
  }

  const outputRoot = assertSafeArtifactRoot(path.dirname(artifacts.activeManifest));
  const runDirectory = path.resolve(artifacts.runDirectory);

  if (!isStrictDescendant(outputRoot, runDirectory)) {
    throw new QaHarnessError("QA run directory must stay inside its artifact root.");
  }

  if (path.basename(runDirectory) !== manifest.target?.database) {
    throw new QaHarnessError("QA run directory does not match the manifest target database.");
  }

  for (const key of required.filter((item) => !["runDirectory", "activeManifest"].includes(item))) {
    if (!isStrictDescendant(runDirectory, path.resolve(artifacts[key]))) {
      throw new QaHarnessError(`QA artifact path escapes the run directory: ${key}.`);
    }
  }

  if (manifest.safety?.databasePrefix !== DATABASE_PREFIX) {
    throw new QaHarnessError("QA manifest database prefix does not match the harness safety prefix.");
  }
}

function isStrictDescendant(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return Boolean(relative) && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}
