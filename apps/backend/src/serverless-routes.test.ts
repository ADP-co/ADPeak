import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function workspaceSource(path: string) {
  return readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");
}

describe("serverless route parity", () => {
  it("routes authenticated evidence requests to the binary handler", () => {
    const router = workspaceSource("api/v1/router.ts");
    const handlers = workspaceSource("api/_lib/sigi-handlers.ts");

    expect(router).toContain("handleCaptureEvidence");
    expect(router).toContain("/^capturas\\/(\\d+)\\/evidencia$/");
    expect(handlers).toContain("export async function handleCaptureEvidence");
    expect(handlers).toContain('response.setHeader("Content-Type", evidence.tipo || "application/pdf")');
  });

  it("enforces evidence review before approval in Vercel and local runtimes", () => {
    const handlers = workspaceSource("api/_lib/sigi-handlers.ts");
    const localServer = readFileSync(new URL("./server.ts", import.meta.url), "utf8");

    expect(handlers).toContain('sigi.assertEvidenceOpenedBeforeApproval(session, draft)');
    expect(localServer).toContain('assertEvidenceOpenedBeforeApproval(session, draft)');
  });
});
