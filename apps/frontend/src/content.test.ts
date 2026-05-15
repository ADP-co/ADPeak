import { describe, expect, it } from "vitest";
import { DEFAULT_API_URL, resolveApiUrl } from "./content";

describe("resolveApiUrl", () => {
  it("uses the configured API URL when it is present", () => {
    expect(resolveApiUrl("http://127.0.0.1:9000")).toBe("http://127.0.0.1:9000");
  });

  it("falls back to the local backend URL", () => {
    expect(resolveApiUrl("")).toBe(DEFAULT_API_URL);
    expect(resolveApiUrl(undefined)).toBe(DEFAULT_API_URL);
  });
});
