import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

type DemoModule = {
  authenticateDemoUser: (email: string, accessCode: string) => unknown;
  demoDatasetPayload: () => {
    progress: unknown[];
  };
  demoEnabled: (environment?: NodeJS.ProcessEnv) => boolean;
  demoReportCsv: () => string;
  demoReportPayload: () => {
    indicadores: unknown[];
  };
  demoRoleFlows: () => Record<string, unknown>;
  demoStatusPayload: () => {
    users: unknown[];
  };
  publicDemoUsers: () => unknown[];
  runDemoAction: (role: "plantel", action: "capture_submit") => unknown;
};

let demo: DemoModule;

const originalAppEnv = process.env.APP_ENV;
const originalVercel = process.env.VERCEL;

beforeAll(async () => {
  const moduleUrl = new URL("../../../api/_lib/demo.ts", import.meta.url).href;
  demo = (await import(/* @vite-ignore */ moduleUrl)) as DemoModule;
});

afterEach(() => {
  restoreEnvironment("APP_ENV", originalAppEnv);
  restoreEnvironment("VERCEL", originalVercel);
});

describe("Vercel demo privacy", () => {
  it("keeps local demo data available without exposing access codes", () => {
    delete process.env.APP_ENV;
    delete process.env.VERCEL;

    const publicResponses = [
      demo.publicDemoUsers(),
      demo.demoStatusPayload(),
      demo.demoDatasetPayload(),
      demo.demoRoleFlows(),
      demo.runDemoAction("plantel", "capture_submit"),
      demo.demoReportPayload(),
      demo.demoReportCsv(),
      demo.authenticateDemoUser("admin.demo@adpeak.local", "demo-admin"),
    ];

    expect(demo.demoEnabled()).toBe(true);
    expect(demo.publicDemoUsers()).not.toHaveLength(0);
    expect(demo.authenticateDemoUser("admin.demo@adpeak.local", "demo-admin")).toBeDefined();
    expect(JSON.stringify(publicResponses)).not.toContain("accessCode");
  });

  it.each([
    { APP_ENV: "production", VERCEL: undefined },
    { APP_ENV: "preview", VERCEL: "1" },
  ])("disables demo data and authentication in hosted environments", (environment) => {
    setEnvironment("APP_ENV", environment.APP_ENV);
    setEnvironment("VERCEL", environment.VERCEL);

    expect(demo.demoEnabled()).toBe(false);
    expect(demo.publicDemoUsers()).toEqual([]);
    expect(demo.demoStatusPayload().users).toEqual([]);
    expect(demo.demoDatasetPayload().progress).toEqual([]);
    expect(demo.demoRoleFlows()).toEqual({});
    expect(demo.runDemoAction("plantel", "capture_submit")).toBeUndefined();
    expect(demo.demoReportPayload().indicadores).toEqual([]);
    expect(demo.demoReportCsv()).not.toContain("avance-001");
    expect(
      demo.authenticateDemoUser("admin.demo@adpeak.local", "demo-admin")
    ).toBeUndefined();
  });

  it("routes every public /demo path to the disabled endpoint on Vercel", () => {
    const vercelConfig = JSON.parse(
      readFileSync(new URL("../../../vercel.json", import.meta.url), "utf8")
    ) as { rewrites?: Array<{ source?: string; destination?: string }> };
    const demoRewrite = vercelConfig.rewrites?.find((rewrite) => rewrite.source === "/demo/(.*)");

    expect(demoRewrite?.destination).toBe("/api/demo-endpoint?endpoint=disabled");

    const endpointSource = readFileSync(
      new URL("../../../api/demo-endpoint.ts", import.meta.url),
      "utf8"
    );
    expect(endpointSource).toContain("if (!demoEnabled())");
  });
});

function setEnvironment(key: "APP_ENV" | "VERCEL", value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

function restoreEnvironment(key: "APP_ENV" | "VERCEL", value: string | undefined) {
  setEnvironment(key, value);
}
