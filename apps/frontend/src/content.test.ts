import { describe, expect, it } from "vitest";
import { ClientConfigurationError, loadClientConfig } from "./content";

describe("loadClientConfig", () => {
  it("loads a configured API URL", () => {
    expect(loadClientConfig({ VITE_API_URL: "http://127.0.0.1:9000" })).toEqual({
      apiUrl: "http://127.0.0.1:9000"
    });
  });

  it("fails clearly when the API URL is missing", () => {
    expect(() => loadClientConfig({})).toThrow(ClientConfigurationError);
    expect(() => loadClientConfig({})).toThrow("VITE_API_URL");
  });

  it("rejects invalid API URLs", () => {
    expect(() => loadClientConfig({ VITE_API_URL: "invalid" })).toThrow(
      "VITE_API_URL debe ser una URL valida."
    );
  });
});
