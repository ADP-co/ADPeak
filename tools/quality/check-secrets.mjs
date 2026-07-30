#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isAllowedPlaceholderConnection } from "./secret-scanner-lib.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const trackedFiles = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
  cwd: repoRoot,
  encoding: "utf8"
}).split("\0").filter(Boolean);

const sensitiveFileName = /(^|\/)(?:id_rsa|id_ed25519|service-account)\b/i;
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bAIza[0-9A-Za-z_-]{35}\b/,
  /\bgh[oprsu]_[A-Za-z0-9]{30,}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
  /\bsk-(?:live|prod)-[A-Za-z0-9_-]{16,}\b/i,
  /\bvercel_blob_rw_[A-Za-z0-9_-]{20,}\b/i,
  /"private_key"\s*:\s*"-----BEGIN PRIVATE KEY-----/i
];
const findings = [];

for (const relativePath of trackedFiles) {
  if (relativePath === "tools/quality/check-secrets.mjs") continue;

  const fileName = path.basename(relativePath).toLowerCase();
  const trackedEnvironmentFile = fileName.startsWith(".env") && !fileName.endsWith(".example");
  if (trackedEnvironmentFile || sensitiveFileName.test(relativePath)) {
    findings.push(`${relativePath}: archivo sensible versionado`);
    continue;
  }

  const absolutePath = path.join(repoRoot, relativePath);
  let buffer;
  try {
    buffer = readFileSync(absolutePath);
  } catch {
    continue;
  }
  if (buffer.includes(0)) continue;

  const content = buffer.toString("utf8");
  if (secretPatterns.some((pattern) => pattern.test(content))) {
    findings.push(`${relativePath}: patrón de secreto detectado`);
  }

  const connectionPattern = /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/([^\s:/]+):([^\s@/]+)@/gi;
  for (const match of content.matchAll(connectionPattern)) {
    if (!isAllowedPlaceholderConnection(relativePath, match[1], match[2])) {
      findings.push(`${relativePath}: conexión con credenciales literales detectada`);
      break;
    }
  }
}

if (findings.length > 0) {
  console.error("Secret scan failed:\n" + findings.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(`Secret scan passed for ${trackedFiles.length} tracked files.`);
