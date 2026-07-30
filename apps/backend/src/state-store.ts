/// <reference types="node" />

import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { PoolClient } from "pg";
import { loadLocalEnv } from "./config.js";
import { databasePoolConfig } from "./database-config.js";

type PersistedState = Record<string, unknown>;

const isTestRun =
  process.env.NODE_ENV === "test" ||
  process.env.VITEST === "true" ||
  process.env.VITEST_WORKER_ID !== undefined ||
  process.env.npm_lifecycle_event === "test";

if (!isTestRun) {
  loadLocalEnv();
}

const databaseUrl = !isTestRun ? readDatabaseUrl() : undefined;
const configuredStateFile = process.env.SIGI_DATA_FILE || process.env.ADPEAK_DATA_FILE;
const stateFilePath = configuredStateFile
  ? path.resolve(configuredStateFile)
  : isTestRun
    ? ""
    : databaseUrl
      ? ""
    : process.env.VERCEL
      ? path.join(os.tmpdir(), "adpeak", "sigi-state.json")
      : path.resolve(process.cwd(), "data", "sigi-state.json");

let cachedState: PersistedState = loadStateFromDisk();
let pool: import("pg").Pool | undefined;
let hydratedFromDatabase = false;
let hydratePromise: Promise<void> | undefined;
let pendingDatabaseWrite: Promise<void> | undefined;
const databaseWriter = createSerializedWriter(writeStateToDatabase);
type MutationContext = { client: PoolClient; pendingWrite: Promise<void> };
const mutationContext = new AsyncLocalStorage<MutationContext>();

export function isPersistenceEnabled() {
  return Boolean(stateFilePath || databaseUrl);
}

export function isPersistedStateHydrated() {
  return !databaseUrl || hydratedFromDatabase;
}

export function readPersistedCollection<T>(key: string): T[] | undefined {
  const value = cachedState[key];
  return Array.isArray(value) ? value as T[] : undefined;
}

export function readPersistedValue<T>(key: string): T | undefined {
  return cachedState[key] as T | undefined;
}

export function persistState(patch: PersistedState) {
  const persistedPatch = {
    ...patch,
    ...(clearsEvidenceForPatch(patch) ? { captureEvidenceBlobs: {} } : {}),
    updatedAt: new Date().toISOString()
  };
  cachedState = { ...cachedState, ...persistedPatch };

  const context = mutationContext.getStore();

  if (context) {
    const snapshot = clonePersistedState(persistedPatch);
    context.pendingWrite = context.pendingWrite.then(() => writeStatePatch(context.client, snapshot));
  }

  if (databaseUrl && !context) {
    pendingDatabaseWrite = databaseWriter.enqueue(clonePersistedState(cachedState)).catch((error) => {
      console.error("state_store_database_write_error", safeErrorMessage(error));

      if (!stateFilePath) {
        throw error;
      }
    });
  }

  if (!stateFilePath) {
    return;
  }

  const directory = path.dirname(stateFilePath);
  mkdirSync(directory, { recursive: true });
  const temporaryPath = `${stateFilePath}.tmp`;

  writeFileSync(temporaryPath, `${JSON.stringify(cachedState, null, 2)}\n`, "utf8");
  renameSync(temporaryPath, stateFilePath);
}

export async function hydrateState(options: { force?: boolean } = {}) {
  const context = mutationContext.getStore();

  if (context) {
    const state = await readStateFromDatabase(context.client);
    cachedState = { ...cachedState, ...state };
    hydratedFromDatabase = true;
    return;
  }

  if (!databaseUrl || (hydratedFromDatabase && !options.force)) {
    return;
  }

  if (!options.force && hydratePromise) {
    await hydratePromise;
    return;
  }

  const nextHydration = readStateFromDatabase()
    .then((state) => {
      cachedState = { ...cachedState, ...state };
      hydratedFromDatabase = true;
    })
    .catch((error) => {
      console.error("state_store_hydration_error", safeErrorMessage(error));
      hydratedFromDatabase = true;
    });

  if (!options.force) {
    hydratePromise = nextHydration;
  }

  await nextHydration;
}

export async function flushPersistedState() {
  const context = mutationContext.getStore();

  if (context) {
    await context.pendingWrite;
    return;
  }

  if (pendingDatabaseWrite) {
    await pendingDatabaseWrite;
  }
}

export async function persistEvidenceBlob(storageRef: string, content: Buffer) {
  if (!storageRef || content.length === 0) {
    throw new Error("Evidence storage requires a reference and non-empty content.");
  }

  const expectedHash = storageRef.match(/\/([a-f0-9]{64})$/i)?.[1]?.toLowerCase();
  const actualHash = createHash("sha256").update(content).digest("hex");

  if (!expectedHash || expectedHash !== actualHash) {
    throw new Error("Evidence storage reference does not match the content checksum.");
  }

  if (databaseUrl) {
    const context = mutationContext.getStore();
    const queryable = context?.client ?? await getPool();
    await ensureEvidenceTable(queryable);
    await queryable.query(
      `insert into app_evidence (storage_ref, content, size_bytes, updated_at)
       values ($1, $2, $3, now())
       on conflict (storage_ref) do update
       set content = excluded.content, size_bytes = excluded.size_bytes, updated_at = now()`,
      [storageRef, content, content.length]
    );
    return;
  }

  const blobs = readPersistedValue<Record<string, string>>("captureEvidenceBlobs") ?? {};
  persistState({
    captureEvidenceBlobs: {
      ...blobs,
      [storageRef]: content.toString("base64")
    }
  });
}

export async function deleteEvidenceBlob(storageRef: string) {
  if (!storageRef) {
    return;
  }

  if (databaseUrl) {
    const context = mutationContext.getStore();
    const queryable = context?.client ?? await getPool();
    await ensureEvidenceTable(queryable);
    await queryable.query("delete from app_evidence where storage_ref = $1", [storageRef]);
    return;
  }

  const blobs = { ...(readPersistedValue<Record<string, string>>("captureEvidenceBlobs") ?? {}) };
  delete blobs[storageRef];
  persistState({ captureEvidenceBlobs: blobs });
}

export async function readEvidenceBlob(storageRef: string) {
  if (!storageRef) {
    return undefined;
  }

  if (databaseUrl) {
    const context = mutationContext.getStore();
    const queryable = context?.client ?? await getPool();
    await ensureEvidenceTable(queryable);
    const result = await queryable.query<{ content: Buffer }>(
      "select content from app_evidence where storage_ref = $1",
      [storageRef]
    );
    const content = result.rows[0]?.content;
    return content ? Buffer.from(content) : undefined;
  }

  const encoded = (readPersistedValue<Record<string, string>>("captureEvidenceBlobs") ?? {})[storageRef];
  return encoded ? Buffer.from(encoded, "base64") : undefined;
}

export async function withPersistedStateMutation<T>(operation: () => Promise<T>): Promise<T> {
  if (!databaseUrl) {
    return operation();
  }

  const pool = await getPool();
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext('adpeak:app_state:mutation'))");
    const state = await readStateFromDatabase(client);
    cachedState = { ...cachedState, ...state };
    hydratedFromDatabase = true;

    const result = await mutationContext.run(
      { client, pendingWrite: Promise.resolve() },
      async () => {
        const value = await operation();
        await flushPersistedState();
        return value;
      }
    );

    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export function createSerializedWriter<T>(write: (snapshot: T) => Promise<void>) {
  let queue = Promise.resolve();

  return {
    enqueue(snapshot: T) {
      const task = queue
        .catch(() => undefined)
        .then(() => write(snapshot));

      queue = task;
      return task;
    },
    flush() {
      return queue;
    }
  };
}

export function stateFileLocation() {
  return databaseUrl ? "postgres:app_state" : stateFilePath || "memory-only";
}

function readDatabaseUrl() {
  return (
    process.env.ADPEAK_RECOVERY_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING
  );
}

function loadStateFromDisk(): PersistedState {
  if (!stateFilePath || !existsSync(stateFilePath)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(stateFilePath, "utf8")) as PersistedState;
  } catch {
    return {};
  }
}

async function readStateFromDatabase(client?: Queryable): Promise<PersistedState> {
  const queryable = client ?? await getPool();
  await ensureStateTable(queryable);
  const result = await queryable.query<{ key: string; value: unknown }>(
    "select key, value from app_state"
  );

  return Object.fromEntries(result.rows.map((row) => [row.key, row.value]));
}

async function writeStateToDatabase(state: PersistedState) {
  const client = await getPool();
  await ensureStateTable(client);
  await writeStatePatch(client, state);
}

async function writeStatePatch(client: Queryable, patch: PersistedState) {
  if (clearsEvidenceForPatch(patch)) {
    await ensureEvidenceTable(client);
    await client.query("delete from app_evidence");
  }

  await Promise.all(
    Object.entries(patch).map(([key, value]) =>
      client.query(
        `insert into app_state (key, value, updated_at)
         values ($1, $2::jsonb, now())
         on conflict (key) do update set value = excluded.value, updated_at = now()`,
        [key, JSON.stringify(value)]
      )
    )
  );
}

type Queryable = Pick<import("pg").Pool | PoolClient, "query">;

async function ensureStateTable(client: Queryable) {
  await client.query(`
    create table if not exists app_state (
      key text primary key,
      value jsonb not null,
      updated_at timestamptz not null default now()
    )
  `);
}

async function getPool() {
  if (!databaseUrl) {
    throw new Error("Database URL is not configured.");
  }

  const { Pool } = await import("pg");
  pool ??= new Pool(databasePoolConfig(databaseUrl));

  return pool;
}

function safeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown";
}

function clearsEvidenceForPatch(patch: PersistedState) {
  return Array.isArray(patch.captureDrafts) &&
    patch.captureDrafts.length === 0 &&
    (
      typeof patch.officialFactoryResetVersion === "string" ||
      typeof patch.catalogImportVersion === "string" ||
      typeof patch.officialCatalogImportVersion === "string"
    );
}

async function ensureEvidenceTable(client: Queryable) {
  await client.query(`
    create table if not exists app_evidence (
      storage_ref text primary key,
      content bytea not null,
      size_bytes integer not null check (size_bytes > 0),
      updated_at timestamptz not null default now()
    )
  `);
}

function clonePersistedState(state: PersistedState): PersistedState {
  return JSON.parse(JSON.stringify(state)) as PersistedState;
}
