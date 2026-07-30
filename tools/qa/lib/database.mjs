import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import {
  DATABASE_PREFIX,
  REPO_ROOT
} from "./constants.mjs";
import {
  QaHarnessError,
  registerSecret,
  sha256
} from "./common.mjs";

const backendRequire = createRequire(path.join(REPO_ROOT, "apps", "backend", "package.json"));
const { Client } = backendRequire("pg");
const SAFE_TARGET_PATTERN = /^adpeak_qa_cert_\d{8}t\d{6}z_[a-f0-9]{8}$/;
const ROUTING_QUERY_PARAMETERS = new Set([
  "database",
  "dbname",
  "host",
  "hostaddr",
  "passfile",
  "password",
  "port",
  "service",
  "servicefile",
  "user"
]);

export function parsePostgresUrl(rawValue, label, { source = false } = {}) {
  registerSecret(rawValue);
  let url;

  try {
    url = new URL(rawValue);
  } catch (error) {
    throw new QaHarnessError(`${label} must be a valid PostgreSQL URL.`, { cause: error });
  }

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new QaHarnessError(`${label} must use postgres:// or postgresql://.`);
  }

  if (!url.username || !url.hostname) {
    throw new QaHarnessError(`${label} must include an explicit user and host.`);
  }

  const database = databaseName(url);

  for (const key of url.searchParams.keys()) {
    if (ROUTING_QUERY_PARAMETERS.has(key.toLowerCase())) {
      throw new QaHarnessError(`${label} cannot override connection routing through query parameter ${key}.`);
    }
  }

  if (!database || database.includes("/")) {
    throw new QaHarnessError(`${label} must identify exactly one database.`);
  }

  if (source && database.startsWith(DATABASE_PREFIX)) {
    throw new QaHarnessError(`${label} cannot point at a QA certification database.`);
  }

  const sslMode = url.searchParams.get("sslmode")?.toLowerCase();
  const sslFlag = url.searchParams.get("ssl")?.toLowerCase();

  if (
    !isLoopbackHost(url.hostname) &&
    (["allow", "disable", "prefer"].includes(sslMode ?? "") || sslFlag === "false")
  ) {
    throw new QaHarnessError(`${label} must require TLS for a remote PostgreSQL server.`);
  }

  return {
    url,
    database,
    host: normalizeHost(url.hostname),
    port: url.port || "5432"
  };
}

export function databaseName(url) {
  return decodeURIComponent(url.pathname.replace(/^\//, ""));
}

export function withDatabase(url, database) {
  const next = new URL(url.toString());
  next.pathname = `/${database}`;
  return next;
}

export function targetConnectionFromSource(sourceConnection, targetDatabase) {
  assertSafeTargetName(targetDatabase);
  const targetUrl = withDatabase(sourceConnection.url, targetDatabase);
  return parsePostgresUrl(targetUrl.toString(), "Generated QA target URL");
}

export function connectionFingerprint(url) {
  return sha256(new URL(url.toString()).toString());
}

export function generateTargetDatabaseName(now = new Date(), suffix = cryptoSafeSuffix()) {
  const timestamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z").toLowerCase();
  const name = `${DATABASE_PREFIX}${timestamp}_${suffix}`;
  assertSafeTargetName(name);
  return name;
}

export function assertSafeTargetName(database) {
  if (!SAFE_TARGET_PATTERN.test(database)) {
    throw new QaHarnessError(
      `Unsafe QA database name: expected ${DATABASE_PREFIX}YYYYMMDDtHHMMSSz_<8 hex>.`
    );
  }
}

export function sanitizedConnection(connection) {
  return `${connection.host}:${connection.port}/${connection.database}`;
}

export function assertManifestTarget(manifest, environment) {
  const rawTargetUrl = environment.QA_TARGET_DATABASE_URL;

  if (!rawTargetUrl) {
    throw new QaHarnessError("Generated QA environment is missing QA_TARGET_DATABASE_URL.");
  }

  const target = parsePostgresUrl(rawTargetUrl, "QA_TARGET_DATABASE_URL");
  assertSafeTargetName(target.database);

  const expected = manifest.target;
  const source = manifest.source;

  if (
    target.database !== expected.database ||
    target.host !== normalizeHost(expected.host) ||
    target.port !== String(expected.port)
  ) {
    throw new QaHarnessError("Target URL does not match the database identity recorded in the manifest.");
  }

  if (target.host !== normalizeHost(source.host) || target.port !== String(source.port)) {
    throw new QaHarnessError("Target and source are not on the same manifest host and port.");
  }

  if (target.database === source.database) {
    throw new QaHarnessError("Target database must differ from the source database.");
  }

  if (connectionFingerprint(target.url) !== manifest.safety?.targetConnectionFingerprint) {
    throw new QaHarnessError("Target connection fingerprint does not match the manifest.");
  }

  return target;
}

export async function readSourceAppState(sourceConnection) {
  return withClient(sourceConnection.url, "adpeak-qa-clone-readonly", async (client) => {
    await client.query("begin transaction isolation level repeatable read read only");

    try {
      const readOnly = await client.query("show transaction_read_only");

      if (readOnly.rows[0]?.transaction_read_only !== "on") {
        throw new QaHarnessError("Source transaction did not enter read-only mode.");
      }

      const identityResult = await client.query(
        "select current_database() as database, current_user as username, inet_server_addr()::text as server_address"
      );
      const identity = identityResult.rows[0];

      if (identity?.database !== sourceConnection.database) {
        throw new QaHarnessError("Connected source database does not match QA_SOURCE_DATABASE_URL.");
      }

      const tableResult = await client.query("select to_regclass('public.app_state')::text as table_name");

      if (!["app_state", "public.app_state"].includes(tableResult.rows[0]?.table_name)) {
        throw new QaHarnessError("Source database does not contain public.app_state.");
      }

      const stateResult = await client.query(
        "select key, value, updated_at from public.app_state order by key"
      );
      const evidenceTable = await client.query("select to_regclass('public.app_evidence')::text as table_name");
      const evidenceResult = ["app_evidence", "public.app_evidence"].includes(evidenceTable.rows[0]?.table_name)
        ? await client.query(
            "select storage_ref, encode(content, 'base64') as content_base64, size_bytes, updated_at from public.app_evidence order by storage_ref"
          )
        : { rows: [] };
      await client.query("commit");

      return {
        identity,
        rows: stateResult.rows.map(normalizeStateRow),
        evidenceRows: evidenceResult.rows.map(normalizeEvidenceRow)
      };
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    }
  });
}

export async function createDatabaseAndCopyState(sourceConnection, targetConnection, rows, evidenceRows = []) {
  await withClient(sourceConnection.url, "adpeak-qa-clone-control", async (client) => {
    await assertCurrentDatabase(client, sourceConnection.database);
    const existing = await client.query("select 1 from pg_database where datname = $1", [targetConnection.database]);

    if (existing.rowCount !== 0) {
      throw new QaHarnessError("Generated QA database already exists; refusing to reuse it.");
    }

    await client.query(`create database ${quoteTargetIdentifier(targetConnection.database)}`);
  });

  try {
    await withClient(targetConnection.url, "adpeak-qa-clone-copy", async (client) => {
      await assertCurrentDatabase(client, targetConnection.database);
      await client.query("begin");

      try {
        await client.query(`
          create table public.app_state (
            key text primary key,
            value jsonb not null,
            updated_at timestamptz not null default now()
          )
        `);
        await client.query("create index app_state_updated_at_idx on public.app_state (updated_at desc)");
        await client.query(`
          create table public.app_evidence (
            storage_ref text primary key,
            content bytea not null,
            size_bytes integer not null,
            updated_at timestamptz not null default now()
          )
        `);

        for (const row of rows) {
          await client.query(
            "insert into public.app_state (key, value, updated_at) values ($1, $2::jsonb, $3::timestamptz)",
            [row.key, JSON.stringify(row.value), row.updatedAt]
          );
        }

        for (const row of evidenceRows) {
          const content = Buffer.from(row.contentBase64, "base64");

          if (content.length !== row.sizeBytes) {
            throw new QaHarnessError(`Evidence backup size mismatch for ${row.storageRef}.`);
          }

          await client.query(
            "insert into public.app_evidence (storage_ref, content, size_bytes, updated_at) values ($1, $2, $3, $4::timestamptz)",
            [row.storageRef, content, row.sizeBytes, row.updatedAt]
          );
        }

        await client.query("commit");
      } catch (error) {
        await client.query("rollback").catch(() => undefined);
        throw error;
      }
    });
  } catch (error) {
    await dropDatabase(sourceConnection, targetConnection.database).catch(() => undefined);
    throw error;
  }
}

export async function readTargetAppState(targetConnection) {
  return withClient(targetConnection.url, "adpeak-qa-cert-readonly", async (client) => {
    await client.query("begin transaction isolation level repeatable read read only");

    try {
      await assertCurrentDatabase(client, targetConnection.database);
      const readOnly = await client.query("show transaction_read_only");
      const stateResult = await client.query(
        "select key, value, updated_at from public.app_state order by key"
      );
      const evidenceResult = await client.query(
        "select storage_ref, encode(content, 'base64') as content_base64, size_bytes, updated_at from public.app_evidence order by storage_ref"
      );
      await client.query("commit");
      return {
        readOnly: readOnly.rows[0]?.transaction_read_only === "on",
        rows: stateResult.rows.map(normalizeStateRow),
        evidenceRows: evidenceResult.rows.map(normalizeEvidenceRow)
      };
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    }
  });
}

export async function replaceTargetAppState(targetConnection, rows, evidenceRows = []) {
  await withClient(targetConnection.url, "adpeak-qa-seed", async (client) => {
    await assertCurrentDatabase(client, targetConnection.database);
    await client.query("begin");

    try {
      await client.query("lock table public.app_state in exclusive mode");
      await client.query("lock table public.app_evidence in exclusive mode");
      await client.query("delete from public.app_state");
      await client.query("delete from public.app_evidence");

      for (const row of rows) {
        await client.query(
          "insert into public.app_state (key, value, updated_at) values ($1, $2::jsonb, $3::timestamptz)",
          [row.key, JSON.stringify(row.value), row.updatedAt]
        );
      }

      for (const row of evidenceRows) {
        const content = Buffer.from(row.contentBase64, "base64");

        if (content.length !== row.sizeBytes) {
          throw new QaHarnessError(`Evidence restore size mismatch for ${row.storageRef}.`);
        }

        await client.query(
          "insert into public.app_evidence (storage_ref, content, size_bytes, updated_at) values ($1, $2, $3, $4::timestamptz)",
          [row.storageRef, content, row.sizeBytes, row.updatedAt]
        );
      }

      await client.query("commit");
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    }
  });
}

export async function dropManifestDatabase(manifest, targetConnection) {
  assertSafeTargetName(targetConnection.database);
  const adminConnection = parsePostgresUrl(
    withDatabase(targetConnection.url, manifest.source.database).toString(),
    "Derived cleanup control URL"
  );

  if (
    adminConnection.host !== normalizeHost(manifest.source.host) ||
    adminConnection.port !== String(manifest.source.port) ||
    adminConnection.database !== manifest.source.database
  ) {
    throw new QaHarnessError("Cleanup control connection does not match the manifest source identity.");
  }

  return dropDatabase(adminConnection, targetConnection.database);
}

async function dropDatabase(adminConnection, targetDatabase) {
  assertSafeTargetName(targetDatabase);
  return withClient(adminConnection.url, "adpeak-qa-cleanup", async (client) => {
    await assertCurrentDatabase(client, adminConnection.database);
    const existing = await client.query("select 1 from pg_database where datname = $1", [targetDatabase]);

    if (existing.rowCount === 0) {
      return false;
    }

    const versionResult = await client.query("show server_version_num");
    const version = Number(versionResult.rows[0]?.server_version_num ?? 0);

    if (version >= 130000) {
      await client.query(`drop database ${quoteTargetIdentifier(targetDatabase)} with (force)`);
    } else {
      await client.query(
        "select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()",
        [targetDatabase]
      );
      await client.query(`drop database ${quoteTargetIdentifier(targetDatabase)}`);
    }

    const verification = await client.query("select 1 from pg_database where datname = $1", [targetDatabase]);

    if (verification.rowCount !== 0) {
      throw new QaHarnessError("QA database still exists after cleanup.");
    }

    return true;
  });
}

async function withClient(url, applicationName, operation) {
  const connectionUrl = new URL(url);
  connectionUrl.searchParams.delete("sslmode");
  connectionUrl.searchParams.delete("uselibpqcompat");
  const options = {
    connectionString: connectionUrl.toString(),
    application_name: applicationName,
    connectionTimeoutMillis: 15_000,
    query_timeout: 60_000,
    statement_timeout: 60_000
  };

  options.ssl = isLoopbackHost(url.hostname)
    ? false
    : { rejectUnauthorized: true };

  const client = new Client(options);
  await client.connect();

  try {
    return await operation(client);
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function assertCurrentDatabase(client, expectedDatabase) {
  const result = await client.query("select current_database() as database");

  if (result.rows[0]?.database !== expectedDatabase) {
    throw new QaHarnessError(`Connected database does not match the expected manifest database.`);
  }
}

function normalizeStateRow(row) {
  return {
    key: row.key,
    value: row.value,
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function normalizeEvidenceRow(row) {
  return {
    storageRef: row.storage_ref,
    contentBase64: row.content_base64,
    sizeBytes: Number(row.size_bytes),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function quoteTargetIdentifier(identifier) {
  assertSafeTargetName(identifier);
  return `"${identifier}"`;
}

function normalizeHost(host) {
  return String(host).replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
}

function isLoopbackHost(host) {
  return /^(localhost|127(?:\.\d{1,3}){3}|::1)$/i.test(normalizeHost(host));
}

function cryptoSafeSuffix() {
  return randomBytes(4).toString("hex");
}
