#!/usr/bin/env node

import {
  assertNoActiveClone,
  assertSafeArtifactRoot,
  assertTestEnvironment,
  atomicWrite,
  createArtifactPaths,
  createManifest,
  displayPath,
  parseArguments,
  printDryRun,
  randomSecret,
  requiredEnvironmentValue,
  runCommand,
  saveManifest,
  scrubInheritedDatabaseEnvironment,
  sha256,
  withQaLock,
  writeEnvironmentFile
} from "./lib/common.mjs";
import {
  assertManifestTarget,
  connectionFingerprint,
  createDatabaseAndCopyState,
  dropManifestDatabase,
  generateTargetDatabaseName,
  parsePostgresUrl,
  readSourceAppState,
  sanitizedConnection,
  targetConnectionFromSource
} from "./lib/database.mjs";

scrubInheritedDatabaseEnvironment();

const HELP = `Usage: npm run qa:clone -- [options]

Read public.app_state through an explicit read-only source transaction, create an
isolated adpeak_qa_cert_* database on the same PostgreSQL host and port, and write
an ignored source backup, SHA-256 file, manifest, and QA environment.

Required environment:
  APP_ENV=test
  NODE_ENV=test
  QA_SOURCE_DATABASE_URL=postgresql://.../source_database

Optional environment:
  QA_ALLOWED_DATABASE_HOSTS=host-a.example,host-b.example

Options:
  --output-dir <path>  Artifact root (default: output/qa-certification)
  --dry-run            Print guarded operations without reading env or connecting
  -h, --help           Show this help
`;

await runCommand(async () => {
  const options = parseArguments(process.argv.slice(2), ["--output-dir"]);

  if (options.help) {
    console.log(HELP);
    return;
  }

  if (options.dryRun) {
    printDryRun("qa:clone", [
      "Erase inherited DATABASE_URL and PostgreSQL fallback variables",
      "Require APP_ENV=test, NODE_ENV=test, and explicit QA_SOURCE_DATABASE_URL for a real run",
      "Read source public.app_state inside a repeatable-read, read-only transaction",
      "Write an ignored JSON backup and SHA-256 digest",
      "Create a unique adpeak_qa_cert_* database on the identical source host and port",
      "Copy only public.app_state and write a secret-bearing ignored QA environment",
      `Record the active manifest below ${displayPath(options.outputDir)}`
    ]);
    return;
  }

  assertTestEnvironment();
  const outputRoot = assertSafeArtifactRoot(options.outputDir);

  await withQaLock(outputRoot, async () => {
    const targetDatabase = generateTargetDatabaseName();
    const artifacts = createArtifactPaths(outputRoot, targetDatabase);
    await assertNoActiveClone(artifacts.activeManifest);

    const sourceConnection = parsePostgresUrl(
      requiredEnvironmentValue("QA_SOURCE_DATABASE_URL"),
      "QA_SOURCE_DATABASE_URL",
      { source: true }
    );
    assertAllowedHost(sourceConnection.host);
    const targetConnection = targetConnectionFromSource(sourceConnection, targetDatabase);

    const snapshot = await readSourceAppState(sourceConnection);
    const capturedAt = new Date().toISOString();
    const backup = `${JSON.stringify({
      format: "adpeak-qa-app-state-backup-v1",
      capturedAt,
      source: {
        host: sourceConnection.host,
        port: sourceConnection.port,
        database: sourceConnection.database,
        serverAddress: snapshot.identity.server_address ?? null
      },
      rows: snapshot.rows
    }, null, 2)}\n`;
    const backupSha256 = sha256(backup);

    await atomicWrite(artifacts.sourceBackup, backup);
    await atomicWrite(
      artifacts.sourceBackupSha256,
      `${backupSha256}  ${artifacts.sourceBackup.split(/[\\/]/).at(-1)}\n`
    );

    const environment = {
      APP_ENV: "test",
      NODE_ENV: "test",
      QA_TARGET_DATABASE_URL: targetConnection.url.toString(),
      QA_AUTH_SECRET: randomSecret()
    };
    await writeEnvironmentFile(artifacts.environment, environment);

    const manifest = createManifest({
      artifacts,
      source: {
        host: sourceConnection.host,
        port: sourceConnection.port,
        database: sourceConnection.database,
        serverAddress: snapshot.identity.server_address ?? null
      },
      target: {
        host: targetConnection.host,
        port: targetConnection.port,
        database: targetConnection.database
      },
      snapshotSha256: backupSha256,
      snapshotRows: snapshot.rows.length,
      connectionFingerprint: connectionFingerprint(targetConnection.url)
    });

    const creatingManifest = { ...manifest, status: "creating" };
    await saveManifest(creatingManifest);

    try {
      await createDatabaseAndCopyState(sourceConnection, targetConnection, snapshot.rows);
      await saveManifest(manifest);
    } catch (error) {
      try {
        const cleanupTarget = assertManifestTarget(creatingManifest, environment);
        const dropped = await dropManifestDatabase(creatingManifest, cleanupTarget);
        await saveManifest({
          ...creatingManifest,
          status: "cleaned",
          cleanedAt: new Date().toISOString(),
          cleanup: { databaseDropped: dropped, artifactsRetained: true, afterCloneFailure: true }
        });
      } catch {
        // Leave the recoverable "creating" manifest in place for explicit qa:cleanup.
      }
      throw error;
    }

    console.log(`Source read-only snapshot: ${sanitizedConnection(sourceConnection)} (${snapshot.rows.length} rows)`);
    console.log(`Isolated QA database: ${sanitizedConnection(targetConnection)}`);
    console.log(`Backup SHA-256: ${backupSha256}`);
    console.log(`Manifest: ${displayPath(artifacts.activeManifest)}`);
  });
});

function assertAllowedHost(sourceHost) {
  const rawAllowedHosts = process.env.QA_ALLOWED_DATABASE_HOSTS;

  if (!rawAllowedHosts) {
    return;
  }

  const allowedHosts = rawAllowedHosts
    .split(",")
    .map((host) => host.trim().replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase())
    .filter(Boolean);

  if (!allowedHosts.includes(sourceHost)) {
    throw new Error("QA_SOURCE_DATABASE_URL host is not present in QA_ALLOWED_DATABASE_HOSTS.");
  }
}
