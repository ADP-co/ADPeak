import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

type PersistedState = Record<string, unknown>;

const isTestRun = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
const configuredStateFile = process.env.SIGI_DATA_FILE || process.env.ADPEAK_DATA_FILE;
const stateFilePath = configuredStateFile
  ? path.resolve(configuredStateFile)
  : isTestRun
    ? ""
    : path.resolve(process.cwd(), "data", "sigi-state.json");

let cachedState: PersistedState = loadStateFromDisk();

export function isPersistenceEnabled() {
  return Boolean(stateFilePath);
}

export function readPersistedCollection<T>(key: string): T[] | undefined {
  const value = cachedState[key];
  return Array.isArray(value) ? value as T[] : undefined;
}

export function readPersistedValue<T>(key: string): T | undefined {
  return cachedState[key] as T | undefined;
}

export function persistState(patch: PersistedState) {
  if (!stateFilePath) {
    cachedState = { ...cachedState, ...patch };
    return;
  }

  cachedState = { ...cachedState, ...patch, updatedAt: new Date().toISOString() };
  const directory = path.dirname(stateFilePath);
  mkdirSync(directory, { recursive: true });
  const temporaryPath = `${stateFilePath}.tmp`;

  writeFileSync(temporaryPath, `${JSON.stringify(cachedState, null, 2)}\n`, "utf8");
  renameSync(temporaryPath, stateFilePath);
}

export function stateFileLocation() {
  return stateFilePath || "memory-only";
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
