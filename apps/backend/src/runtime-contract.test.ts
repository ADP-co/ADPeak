import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("production runtime contract", () => {
  it("pins the Vercel runtime to the certified Node.js major", () => {
    const packageJsonPath = path.resolve(process.cwd(), "..", "..", "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      engines?: { node?: string };
    };

    expect(packageJson.engines?.node).toBe("22.x");
  });

  it("excludes certification artifacts and secrets from Vercel uploads", () => {
    const ignorePath = path.resolve(process.cwd(), "..", "..", ".vercelignore");
    const patterns = readFileSync(ignorePath, "utf8").split(/\r?\n/);

    expect(patterns).toContain(".env*");
    expect(patterns).toContain("output/");
    expect(patterns).toContain(".playwright-cli/");
    expect(patterns).toContain("docs/project/qa-runs/");
  });
});
