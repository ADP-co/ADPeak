#!/usr/bin/env node

import path from "node:path";
import {
  assertTestEnvironment,
  displayPath,
  expectedHashEnvironment,
  expectedPasswordHashes,
  loadManifest,
  parseArguments,
  printDryRun,
  readClonePasswords,
  readEnvironmentFile,
  runCommand,
  saveManifest,
  scrubInheritedDatabaseEnvironment,
  withQaLock,
  writeEnvironmentFile
} from "./lib/common.mjs";
import {
  assertManifestTarget,
  readTargetAppState,
  replaceTargetAppState,
  sanitizedConnection
} from "./lib/database.mjs";
import {
  sanitizeCloneStateRows,
  validateCertificationRows
} from "./lib/state.mjs";
import { withTestBackend } from "./lib/runtime.mjs";

scrubInheritedDatabaseEnvironment();

const HELP = `Usage: npm run qa:seed -- [options]

Sanitize only the manifest-bound isolated database. The command enforces the
56-account and generated official indicator baseline, strips visible QA/TMP/FMT state,
reactivates the baseline, synchronizes assignments, and replaces passwords with
clone-only values supplied through required environment variables.

Required environment:
  APP_ENV=test
  NODE_ENV=test
  QA_CLONE_DIRECTOR_PASSWORD=<strong unique clone password>
  QA_CLONE_RESPONSABLE_PASSWORD=<strong unique clone password>
  QA_CLONE_PLANTEL_PASSWORD=<strong unique clone password>

Options:
  --manifest <path>  Manifest created by qa:clone
  --dry-run           Print guarded operations without reading env or connecting
  -h, --help          Show this help
`;

await runCommand(async () => {
  const options = parseArguments(process.argv.slice(2), ["--manifest"]);

  if (options.help) {
    console.log(HELP);
    return;
  }

  if (options.dryRun) {
    printDryRun("qa:seed", [
      "Erase inherited DATABASE_URL and PostgreSQL fallback variables",
      "Require both test environment guards and three strong clone-only role passwords",
      `Load and validate manifest ${displayPath(options.manifest)}`,
      "Read the manifest target, sanitize visible state, and validate 56 accounts plus the generated indicator baseline",
      "Replace target public.app_state and clear target public.app_evidence in one transaction, then verify the committed baseline",
      "Store only expected password hashes in the ignored QA environment; never log passwords"
    ]);
    return;
  }

  assertTestEnvironment();
  let manifest = await loadManifest(options.manifest);
  const outputRoot = path.dirname(manifest.artifacts.activeManifest);

  await withQaLock(outputRoot, async () => {
    manifest = await loadManifest(options.manifest);
    if (!["cloned", "seeded", "certified", "findings"].includes(manifest.status)) {
      throw new Error("qa:seed requires a completed clone. Clean up interrupted or already-cleaned manifests first.");
    }

    const environment = await readEnvironmentFile(manifest.artifacts.environment);
    assertGeneratedTestEnvironment(environment);
    const targetConnection = assertManifestTarget(manifest, environment);
    const passwords = readClonePasswords();
    const hashes = expectedPasswordHashes(passwords);

    await withTestBackend({
      authSecret: environment.QA_AUTH_SECRET,
      artifactDirectory: manifest.artifacts.runDirectory,
      databaseUrl: targetConnection.url.toString(),
      initialPasswords: passwords,
      factoryResetVersion: `qa-seed-${manifest.target.database}-${Date.now()}`
    }, async (runtime) => {
      const login = await runtime.request("/api/v1/auth/login", {
        method: "POST",
        body: {
          username: "director",
          password: passwords.director
        }
      });

      if (login.status !== 200) {
        throw new Error(`Factory seed readiness login failed with HTTP ${login.status}.`);
      }
    });

    const current = await readTargetAppState(targetConnection);
    const sanitized = await sanitizeCloneStateRows(current.rows, hashes);

    await replaceTargetAppState(targetConnection, sanitized.rows, []);
    const committed = await readTargetAppState(targetConnection);
    await validateCertificationRows(committed.rows, hashes);

    const nextEnvironment = {
      ...environment,
      ...expectedHashEnvironment(hashes)
    };
    await writeEnvironmentFile(manifest.artifacts.environment, nextEnvironment);

    await saveManifest({
      ...manifest,
      status: "seeded",
      seededAt: new Date().toISOString(),
      seed: sanitized.summary,
      certification: undefined
    });

    console.log(`Seeded isolated database: ${sanitizedConnection(targetConnection)}`);
    console.log(`Official accounts: ${sanitized.summary.users}`);
    console.log(`Official indicators: ${sanitized.summary.indicators}`);
    console.log(`Removed non-baseline users: ${sanitized.summary.removedUsers}`);
    console.log(`Removed non-baseline indicators: ${sanitized.summary.removedIndicators}`);
  });
});

function assertGeneratedTestEnvironment(environment) {
  if (environment.APP_ENV !== "test" || environment.NODE_ENV !== "test") {
    throw new Error("Generated QA environment is not explicitly test/test.");
  }
}
