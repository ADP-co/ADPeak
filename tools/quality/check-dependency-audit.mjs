#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const acceptedAdvisories = new Set(["GHSA-qwww-vcr4-c8h2"]);
const acceptedPackages = new Set(["react-router", "react-router-dom"]);
const reviewDeadline = new Date("2026-10-31T23:59:59Z");
const audit = process.platform === "win32"
  ? spawnSync("cmd.exe", ["/d", "/s", "/c", "npm.cmd audit --json"], { cwd: repoRoot, encoding: "utf8" })
  : spawnSync("npm", ["audit", "--json"], { cwd: repoRoot, encoding: "utf8" });
const auditOutput = audit.stdout ?? "";

if (!auditOutput.trim()) {
  console.error(audit.stderr || "npm audit no devolvió un reporte JSON.");
  process.exit(1);
}

const report = JSON.parse(auditOutput);
const vulnerabilities = Object.values(report.vulnerabilities ?? {});
const blocking = vulnerabilities.filter((item) => ["high", "critical"].includes(item.severity));

if (blocking.length === 0) {
  console.log("Dependency audit passed with no high or critical findings.");
  process.exit(0);
}

const advisoryIds = new Set();
for (const vulnerability of blocking) {
  for (const via of vulnerability.via ?? []) {
    if (typeof via === "object" && typeof via.url === "string") {
      advisoryIds.add(via.url.split("/").pop());
    }
  }
}

const packageNames = new Set(blocking.map((item) => item.name));
const unexpectedAdvisory = [...advisoryIds].find((id) => !acceptedAdvisories.has(id));
const unexpectedPackage = [...packageNames].find((name) => !acceptedPackages.has(name));
if (unexpectedAdvisory || unexpectedPackage || new Date() > reviewDeadline) {
  console.error("Dependency audit found an unapproved or expired high-severity exception.");
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync(path.join(repoRoot, "apps/frontend/package.json"), "utf8"));
const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
const frameworkPackages = Object.keys(dependencies).filter((name) => name.startsWith("@react-router/"));
if (frameworkPackages.length > 0) {
  console.error(`The accepted React Router RSC exception is invalid because framework packages are installed: ${frameworkPackages.join(", ")}`);
  process.exit(1);
}

const sourceFiles = execFileSync("git", ["ls-files", "apps/frontend/src"], { cwd: repoRoot, encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean);
const rscPattern = /from\s+["']react-router\/(?:rsc|dom\/server)|@react-router\/(?:dev|node|serve)/;
for (const relativePath of sourceFiles) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (existsSync(absolutePath) && rscPattern.test(readFileSync(absolutePath, "utf8"))) {
    console.error(`React Router server/RSC usage invalidates the accepted exception: ${relativePath}`);
    process.exit(1);
  }
}

console.log(
  "Dependency audit passed with a time-bounded exception for GHSA-qwww-vcr4-c8h2: " +
  "ADPeak uses React Router only as a client-side declarative SPA and does not enable RSC or Server Actions."
);
