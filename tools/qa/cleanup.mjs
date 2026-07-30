#!/usr/bin/env node

import path from "node:path";
import {
  assertTestEnvironment,
  displayPath,
  loadManifest,
  parseArguments,
  printDryRun,
  readEnvironmentFile,
  runCommand,
  saveManifest,
  scrubInheritedDatabaseEnvironment,
  withQaLock
} from "./lib/common.mjs";
import {
  assertManifestTarget,
  dropManifestDatabase,
  sanitizedConnection
} from "./lib/database.mjs";

scrubInheritedDatabaseEnvironment();

const HELP = `Usage: npm run qa:cleanup -- [options]

Drop only the isolated database named by the QA manifest. Cleanup validates the
generated URL fingerprint, exact source/target host and port, source/target
database separation, and the strict adpeak_qa_cert_* name format before issuing
DROP DATABASE. Backups, reports, findings, and manifests are retained.

Required environment:
  APP_ENV=test
  NODE_ENV=test

Options:
  --manifest <path>  Manifest created by qa:clone
  --dry-run           Print safety checks without reading env or connecting
  -h, --help          Show this help
`;

await runCommand(async () => {
  const options = parseArguments(process.argv.slice(2), ["--manifest"]);

  if (options.help) {
    console.log(HELP);
    return;
  }

  if (options.dryRun) {
    printDryRun("qa:cleanup", [
      "Erase inherited DATABASE_URL and PostgreSQL fallback variables",
      `Load only manifest ${displayPath(options.manifest)}`,
      "Require APP_ENV=test and NODE_ENV=test for the database mutation",
      "Validate target URL fingerprint, exact manifest host/port, and source separation",
      "Require the strict adpeak_qa_cert_YYYYMMDDtHHMMSSz_<8 hex> database name",
      "Drop only that manifest database and verify its absence",
      "Retain ignored backup, SHA, matrix, report, findings, env, and manifests"
    ]);
    return;
  }

  assertTestEnvironment();
  let manifest = await loadManifest(options.manifest);
  const outputRoot = path.dirname(manifest.artifacts.activeManifest);

  await withQaLock(outputRoot, async () => {
    manifest = await loadManifest(options.manifest);

    if (manifest.status === "cleaned") {
      console.log(`Cleanup already recorded for ${manifest.target.database}; no database command issued.`);
      return;
    }

    const environment = await readEnvironmentFile(manifest.artifacts.environment);
    if (environment.APP_ENV !== "test" || environment.NODE_ENV !== "test") {
      throw new Error("Generated QA environment is not explicitly test/test.");
    }

    const targetConnection = assertManifestTarget(manifest, environment);
    const dropped = await dropManifestDatabase(manifest, targetConnection);
    await saveManifest({
      ...manifest,
      status: "cleaned",
      cleanedAt: new Date().toISOString(),
      cleanup: {
        databaseDropped: dropped,
        artifactsRetained: true
      }
    });

    console.log(`Cleanup target: ${sanitizedConnection(targetConnection)}`);
    console.log(dropped ? "Manifest database dropped and absence verified." : "Manifest database was already absent; cleanup recorded.");
    console.log(`Artifacts retained at: ${displayPath(manifest.artifacts.runDirectory)}`);
  });
});
