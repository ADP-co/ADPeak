import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDir = path.resolve(process.cwd(), "migrations");
const migrationSql = readdirSync(migrationsDir)
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort()
  .map((fileName) => readFileSync(path.join(migrationsDir, fileName), "utf8"))
  .join("\n")
  .toLowerCase();

const requiredTables = [
  "users",
  "roles",
  "planteles",
  "operational_years",
  "indicators",
  "activities",
  "periods",
  "assignments",
  "submissions",
  "submission_versions",
  "evidence_files",
  "reviews",
  "audit_logs"
];

describe("initial SIGI-POA migrations", () => {
  it("creates every table required by SCRUM-41", () => {
    for (const table of requiredTables) {
      expect(migrationSql).toContain(`create table if not exists ${table}`);
    }
  });

  it("declares primary keys, foreign keys, indexes and soft-delete columns", () => {
    expect((migrationSql.match(/primary key/g) ?? []).length).toBeGreaterThanOrEqual(requiredTables.length);
    expect((migrationSql.match(/references /g) ?? []).length).toBeGreaterThanOrEqual(20);
    expect((migrationSql.match(/create index if not exists/g) ?? []).length).toBeGreaterThanOrEqual(15);
    expect((migrationSql.match(/deleted_at/g) ?? []).length).toBeGreaterThanOrEqual(requiredTables.length);
    expect((migrationSql.match(/active boolean not null default true/g) ?? []).length).toBeGreaterThanOrEqual(8);
  });

  it("models evidence metadata without storing binary files in Git or the database row", () => {
    expect(migrationSql).toContain("create table if not exists evidence_files");
    expect(migrationSql).toContain("original_file_name");
    expect(migrationSql).toContain("storage_provider");
    expect(migrationSql).toContain("storage_key");
    expect(migrationSql).toContain("mime_type");
    expect(migrationSql).toContain("byte_size");
    expect(migrationSql).toContain("checksum_sha256");
    expect(migrationSql).toContain("metadata jsonb");
    expect(migrationSql).not.toContain(" bytea");
    expect(migrationSql).not.toContain(" blob");
  });

  it("models the audit trail with JSON previous and new values plus version metadata", () => {
    expect(migrationSql).toContain("create table if not exists audit_logs");
    expect(migrationSql).toContain("actor_user_id");
    expect(migrationSql).toContain("event_type");
    expect(migrationSql).toContain("entity_type");
    expect(migrationSql).toContain("field_name");
    expect(migrationSql).toContain("previous_value jsonb");
    expect(migrationSql).toContain("new_value jsonb");
    expect(migrationSql).toContain("change_set jsonb");
    expect(migrationSql).toContain("version_number");
  });

  it("adds workflow and import safeguards required by SCRUM-42 and SCRUM-43", () => {
    expect(migrationSql).toContain("create table if not exists submission_status_transitions");
    expect(migrationSql).toContain("create table if not exists import_runs");
    expect(migrationSql).toContain("submission_versions_one_current");
    expect(migrationSql).toContain("assignments_unique_user_indicator_responsibility");
    expect(migrationSql).toContain("drop column if exists public_url");
  });
});
