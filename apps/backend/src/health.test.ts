import { describe, expect, it } from "vitest";
import { healthPayload } from "./health.js";

describe("healthPayload", () => {
  it("returns a stable service health shape", () => {
    const payload = healthPayload(new Date("2026-05-13T00:00:00.000Z"));

    expect(payload).toEqual({
      service: "sigi-poa-api",
      status: "ok",
      timestamp: "2026-05-13T00:00:00.000Z"
    });
  });
});
