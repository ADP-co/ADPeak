import path from "node:path";
import { fileURLToPath } from "node:url";

const libraryDirectory = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(libraryDirectory, "..", "..", "..");
export const QA_OUTPUT_ROOT = path.join(REPO_ROOT, "output", "qa-certification");
export const DEFAULT_MANIFEST_PATH = path.join(QA_OUTPUT_ROOT, "active-manifest.json");
export const DATABASE_PREFIX = "adpeak_qa_cert_";
export const MANIFEST_SCHEMA_VERSION = 1;

export const BASELINE = Object.freeze({
  accounts: 56,
  indicators: 14,
  roles: Object.freeze({
    director: 1,
    responsable: 18,
    plantel: 37
  })
});

export const INHERITED_DATABASE_ENV_KEYS = Object.freeze([
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "PGDATABASE",
  "PGHOST",
  "PGPASSWORD",
  "PGPORT",
  "PGUSER"
]);

export const CLONE_PASSWORD_ENV_KEYS = Object.freeze({
  director: "QA_CLONE_DIRECTOR_PASSWORD",
  responsable: "QA_CLONE_RESPONSABLE_PASSWORD",
  plantel: "QA_CLONE_PLANTEL_PASSWORD"
});

export const EXPECTED_PASSWORD_HASH_ENV_KEYS = Object.freeze({
  director: "QA_EXPECTED_DIRECTOR_PASSWORD_HASH",
  responsable: "QA_EXPECTED_RESPONSABLE_PASSWORD_HASH",
  plantel: "QA_EXPECTED_PLANTEL_PASSWORD_HASH"
});
