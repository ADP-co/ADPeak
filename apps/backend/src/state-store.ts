/// <reference types="node" />

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadLocalEnv } from "./config.js";

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

export function isPersistenceEnabled() {
  return Boolean(stateFilePath || databaseUrl);
}

export function readPersistedCollection<T>(key: string): T[] | undefined {
  const value = cachedState[key];
  return Array.isArray(value) ? value as T[] : undefined;
}

export function readPersistedValue<T>(key: string): T | undefined {
  return cachedState[key] as T | undefined;
}

export function persistState(patch: PersistedState) {
  cachedState = { ...cachedState, ...patch, updatedAt: new Date().toISOString() };

  if (databaseUrl) {
    pendingDatabaseWrite = writeStateToDatabase(cachedState).catch((error) => {
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
  if (pendingDatabaseWrite) {
    await pendingDatabaseWrite;
  }
}

export function stateFileLocation() {
  return databaseUrl ? "postgres:app_state" : stateFilePath || "memory-only";
}

function readDatabaseUrl() {
  return (
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

async function readStateFromDatabase(): Promise<PersistedState> {
  const client = await getPool();
  await ensureStateTable(client);
  const result = await client.query<{ key: string; value: unknown }>(
    "select key, value from app_state"
  );

  return Object.fromEntries(result.rows.map((row) => [row.key, row.value]));
}

async function writeStateToDatabase(state: PersistedState) {
  const client = await getPool();
  await ensureStateTable(client);
  await Promise.all(
    Object.entries(state).map(([key, value]) =>
      client.query(
        `insert into app_state (key, value, updated_at)
         values ($1, $2::jsonb, now())
         on conflict (key) do update set value = excluded.value, updated_at = now()`,
        [key, JSON.stringify(value)]
      )
    )
  );
}

async function ensureStateTable(client: import("pg").Pool) {
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
  pool ??= new Pool({
    connectionString: databaseUrl,
    ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: false } : undefined
  });

  return pool;
}

function shouldUseSsl(url: string) {
  return !/localhost|127\.0\.0\.1/i.test(url);
}

function safeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown";
}
