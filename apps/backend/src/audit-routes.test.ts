import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function workspaceSource(path: string) {
  return readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");
}

describe("forensic audit route parity", () => {
  const localServer = readFileSync(new URL("./server.ts", import.meta.url), "utf8");
  const handlers = workspaceSource("api/_lib/sigi-handlers.ts");
  const router = workspaceSource("api/v1/router.ts");

  it("exposes the same Director-gated audit collection in both runtimes", () => {
    expect(localServer).toContain('url.pathname === "/api/v1/auditoria"');
    expect(localServer).toContain("listAuditEvents(session)");
    expect(handlers).toContain("export async function handleAuditEvents");
    expect(handlers).toContain("sigi.listAuditEvents(session)");
    expect(router).toContain('path === "auditoria"');
    expect(router).toContain("handleAuditEvents(request, response)");
  });

  it("records save, update, submit, correction, and approval in both runtimes", () => {
    const actions = [
      "capture_saved",
      "capture_updated",
      "capture_submitted",
      "capture_correction_requested",
      "capture_approved"
    ];

    for (const action of actions) {
      expect(localServer).toContain(`action: "${action}"`);
      expect(handlers).toContain(`action: "${action}"`);
    }

    expect(localServer.match(/recordAuditEvent\(session/g)).toHaveLength(actions.length);
    expect(handlers.match(/sigi\.recordAuditEvent\(session/g)).toHaveLength(actions.length);
    expect(localServer.match(/requestId\r?\n/g)?.length ?? 0).toBeGreaterThanOrEqual(actions.length);
    expect(handlers.match(/requestId: requestIdFromRequest\(request\)/g)).toHaveLength(actions.length);
  });
});
