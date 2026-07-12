import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function workspaceSource(path: string) {
  return readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");
}

describe("serverless route parity", () => {
  it("routes authenticated evidence requests with hardened PDF responses in both runtimes", () => {
    const router = workspaceSource("api/v1/router.ts");
    const handlers = workspaceSource("api/_lib/sigi-handlers.ts");
    const localServer = readFileSync(new URL("./server.ts", import.meta.url), "utf8");

    expect(router).toContain("handleCaptureEvidence");
    expect(router).toContain("/^capturas\\/(\\d+)\\/evidencia$/");
    expect(handlers).toContain("export async function handleCaptureEvidence");
    expect(handlers).toContain('response.setHeader("Content-Type", "application/pdf")');
    expect(handlers).toContain('response.setHeader("X-Content-Type-Options", "nosniff")');
    expect(handlers).toContain('response.setHeader("Cache-Control", "private, no-store")');
    expect(handlers).toContain('response.setHeader("Content-Security-Policy", "sandbox; default-src \'none\'")');
    expect(localServer).toContain('"Content-Type": "application/pdf"');
    expect(localServer).toContain('"X-Content-Type-Options": "nosniff"');
    expect(localServer).toContain('"Cache-Control": "private, no-store"');
    expect(localServer).toContain('"Content-Security-Policy": "sandbox; default-src \'none\'"');
    expect(handlers).not.toContain("evidence.tipo");
    expect(localServer).not.toContain("evidence.tipo");
  });

  it("enforces evidence review before approval in Vercel and local runtimes", () => {
    const handlers = workspaceSource("api/_lib/sigi-handlers.ts");
    const localServer = readFileSync(new URL("./server.ts", import.meta.url), "utf8");

    expect(handlers).toContain('sigi.assertEvidenceOpenedBeforeApproval(session, draft)');
    expect(localServer).toContain('assertEvidenceOpenedBeforeApproval(session, draft)');
  });

  it("routes the Director-only audit feed in Vercel and the local server", () => {
    const router = workspaceSource("api/v1/router.ts");
    const handlers = workspaceSource("api/_lib/sigi-handlers.ts");
    const localServer = readFileSync(new URL("./server.ts", import.meta.url), "utf8");

    expect(router).toContain("handleAuditEvents");
    expect(router).toContain('path === "auditoria"');
    expect(handlers).toContain("export async function handleAuditEvents");
    expect(handlers).toContain("sigi.listAuditEvents(session)");
    expect(localServer).toContain('url.pathname === "/api/v1/auditoria"');
    expect(localServer).toContain("listAuditEvents(session)");
  });

  it("records every capture lifecycle mutation in Vercel and local runtimes", () => {
    const handlers = workspaceSource("api/_lib/sigi-handlers.ts");
    const localServer = readFileSync(new URL("./server.ts", import.meta.url), "utf8");
    const actions = [
      "capture_saved",
      "capture_updated",
      "capture_submitted",
      "capture_correction_requested",
      "capture_approved"
    ];

    actions.forEach((action) => {
      expect(handlers).toContain(`action: "${action}"`);
      expect(localServer).toContain(`action: "${action}"`);
    });

    expect(handlers).toContain("before: existingDraft");
    expect(handlers).toContain("before: draft");
    expect(handlers).toContain("requestId: requestIdFromRequest(request)");
  });
});
