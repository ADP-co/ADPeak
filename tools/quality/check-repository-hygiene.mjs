#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const trackedFiles = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: repoRoot, encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const indexedFiles = execFileSync("git", ["ls-files", "-s"], { cwd: repoRoot, encoding: "utf8" });
const blockedSegments = new Set(["node_modules", "dist", "build", "coverage", "output", ".vercel", ".playwright-cli"]);
const blockedSuffixes = new Set([".7z", ".dll", ".docx", ".exe", ".msi", ".pdf", ".rar", ".tar", ".tgz", ".xls", ".xlsx", ".zip"]);
const textSuffixes = new Set([".css", ".html", ".js", ".json", ".md", ".mjs", ".py", ".sql", ".ts", ".tsx", ".yaml", ".yml"]);
const mojibakePattern = /Ã|Â|â(?:€|€™|€œ|€œ)|�/;
const findings = [];
const caseInsensitivePaths = new Map();

if (/^120000\s/m.test(indexedFiles)) {
  findings.push("El repositorio contiene enlaces simbólicos; la entrega debe usar únicamente archivos regulares.");
}

for (const relativePath of trackedFiles) {
  const normalized = relativePath.replaceAll("\\", "/");
  const parts = normalized.split("/");
  const extension = path.extname(normalized).toLowerCase();
  const lowerPath = normalized.toLowerCase();

  if (normalized.includes("\\") || normalized.startsWith("/") || parts.includes("..")) {
    findings.push(`${relativePath}: ruta no portable o insegura`);
  }
  if (parts.some((part) => blockedSegments.has(part))) {
    findings.push(`${relativePath}: salida temporal o dependencia versionada`);
  }
  if (blockedSuffixes.has(extension)) {
    findings.push(`${relativePath}: binario o documento privado no permitido en código fuente`);
  }
  if (path.basename(lowerPath).startsWith(".env") && !lowerPath.endsWith(".example")) {
    findings.push(`${relativePath}: archivo de ambiente sensible versionado`);
  }

  const prior = caseInsensitivePaths.get(lowerPath);
  if (prior && prior !== normalized) {
    findings.push(`${relativePath}: colisión de mayúsculas/minúsculas con ${prior}`);
  }
  caseInsensitivePaths.set(lowerPath, normalized);

  const absolutePath = path.join(repoRoot, relativePath);
  if (!existsSync(absolutePath)) {
    continue;
  }
  const size = statSync(absolutePath).size;
  if (size > 5_000_000) {
    findings.push(`${relativePath}: archivo mayor a 5 MB no apto para el repositorio fuente`);
  }

  const isIntentionalEncodingTest = /\.test\.[cm]?[jt]sx?$/.test(lowerPath) ||
    lowerPath.endsWith("tools/import-official-data.test.py") ||
    lowerPath.endsWith("apps/backend/src/text-normalization.ts") ||
    lowerPath.endsWith("tools/quality/check-repository-hygiene.mjs");
  if (textSuffixes.has(extension) && !isIntentionalEncodingTest && size <= 5_000_000) {
    const content = readFileSync(absolutePath, "utf8");
    if (mojibakePattern.test(content)) {
      findings.push(`${relativePath}: texto con codificación dañada`);
    }
  }
}

if (findings.length > 0) {
  console.error("Repository hygiene check failed:\n" + findings.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(`Repository hygiene check passed for ${trackedFiles.length} tracked files.`);
