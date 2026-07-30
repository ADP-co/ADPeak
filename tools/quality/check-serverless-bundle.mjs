import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const require = createRequire(import.meta.url);
const workspaceRoot = fileURLToPath(new URL("../../", import.meta.url));
const entries = [
  "api/health.ts",
  "api/demo-endpoint.ts",
  "api/v1/router.ts"
];
const temporaryDirectory = await mkdtemp(join(tmpdir(), "adpeak-serverless-"));

try {
  await assertNoStaticBackendImports(join(workspaceRoot, "api"));

  for (const entry of entries) {
    const outputFile = join(temporaryDirectory, `${basename(entry, ".ts")}.cjs`);

    await build({
      absWorkingDir: workspaceRoot,
      entryPoints: [entry],
      outfile: outputFile,
      bundle: true,
      format: "cjs",
      platform: "node",
      target: "node22",
      logLevel: "silent"
    });

    const route = require(outputFile);

    if (typeof route.default !== "function") {
      throw new Error(`${entry} no exporta un handler serverless predeterminado.`);
    }
  }

  console.log(`Serverless bundle verification passed (${entries.length} handlers).`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

async function assertNoStaticBackendImports(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      await assertNoStaticBackendImports(path);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".ts")) {
      continue;
    }

    const source = await readFile(path, "utf8");

    if (/\bfrom\s+["'][^"']*apps\/backend\/src\/[^"']+["']/.test(source)) {
      throw new Error(`${path} usa un import estatico hacia el paquete ESM del backend.`);
    }
  }
}
