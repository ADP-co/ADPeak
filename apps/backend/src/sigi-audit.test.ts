import { beforeEach, describe, expect, it } from "vitest";
import {
  listAuditEvents,
  MAX_AUDIT_REQUEST_ID_LENGTH,
  recordAuditEvent,
  resetAuditEventsForTest,
  sessionFromHeaders,
  SigiForbiddenError
} from "./sigi-store.js";

describe("SIGI forensic audit", () => {
  beforeEach(() => {
    resetAuditEventsForTest();
  });

  it("allows only Directors and returns the newest event first", () => {
    const director = sessionFromHeaders({
      "x-role": "director",
      "x-user-id": "director-audit"
    });
    const responsible = sessionFromHeaders({
      "x-role": "responsable",
      "x-user-id": "responsable-audit",
      "x-responsable-id": "1"
    });

    recordAuditEvent(director, {
      action: "capture_saved",
      resourceType: "capture",
      resourceId: "41",
      status: "ok"
    });
    recordAuditEvent(director, {
      action: "capture_submitted",
      resourceType: "capture",
      resourceId: "41",
      status: "ok"
    });

    expect(listAuditEvents(director).map((event) => event.action)).toEqual([
      "capture_submitted",
      "capture_saved"
    ]);
    expect(() => listAuditEvents(responsible)).toThrow(SigiForbiddenError);
  });

  it("sanitizes sensitive keys, encoded values, and data URLs", () => {
    const director = sessionFromHeaders({
      "x-role": "director",
      "x-user-id": "director-audit"
    });
    const encodedSecret = Buffer.from("private evidence payload that must not appear in an audit response").toString("base64");
    const secrets = {
      password: "password-secret",
      passwordHash: "hash-secret",
      accessToken: "token-secret",
      cookie: "cookie-secret",
      authorization: "Bearer authorization-secret",
      storageRef: "state://private-storage-reference",
      contenidoBase64: encodedSecret
    };

    recordAuditEvent(director, {
      action: "capture_updated",
      resourceType: "capture",
      resourceId: "42",
      before: {
        safe: "visible",
        ...secrets,
        nested: [{
          preview: "data:application/pdf;base64,JVBERi0xLjQ=",
          encoded: encodedSecret,
          note: "retained"
        }]
      },
      after: secrets,
      status: "ok",
      requestId: "request-audit-sanitization"
    });

    const [event] = listAuditEvents(director);
    const serialized = JSON.stringify(event);

    expect(event.before).toEqual({
      safe: "visible",
      nested: [{
        preview: "[omitido]",
        encoded: "[omitido]",
        note: "retained"
      }]
    });
    expect(event.after).toEqual({});
    expect(serialized).not.toContain("password-secret");
    expect(serialized).not.toContain("hash-secret");
    expect(serialized).not.toContain("token-secret");
    expect(serialized).not.toContain("cookie-secret");
    expect(serialized).not.toContain("authorization-secret");
    expect(serialized).not.toContain("private-storage-reference");
    expect(serialized).not.toContain(encodedSecret);
    expect(serialized).not.toMatch(/data:application\/pdf/i);
  });

  it("bounds request IDs and replaces sensitive request IDs", () => {
    const director = sessionFromHeaders({ "x-role": "director" });
    const bounded = recordAuditEvent(director, {
      action: "capture_saved",
      resourceType: "capture",
      resourceId: "43",
      status: "ok",
      requestId: `request-${"x".repeat(MAX_AUDIT_REQUEST_ID_LENGTH * 2)}`
    });
    const replaced = recordAuditEvent(director, {
      action: "capture_updated",
      resourceType: "capture",
      resourceId: "43",
      status: "ok",
      requestId: "data:text/plain;base64,c2VjcmV0"
    });

    expect(bounded.requestId).toHaveLength(MAX_AUDIT_REQUEST_ID_LENGTH);
    expect(replaced.requestId).toMatch(/^local-/);
    expect(replaced.requestId.length).toBeLessThanOrEqual(MAX_AUDIT_REQUEST_ID_LENGTH);
  });
});
