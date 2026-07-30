import { describe, expect, it } from "vitest";
import {
  createSerializedWriter,
  persistState,
  readPersistedValue
} from "./state-store.js";

describe("serialized state writer", () => {
  it("never lets an older snapshot finish after a newer snapshot", async () => {
    const completions: Array<() => void> = [];
    const started: number[] = [];
    const finished: number[] = [];
    const writer = createSerializedWriter<{ version: number }>(async (snapshot) => {
      started.push(snapshot.version);
      await new Promise<void>((resolve) => completions.push(resolve));
      finished.push(snapshot.version);
    });

    const first = writer.enqueue({ version: 1 });
    const second = writer.enqueue({ version: 2 });

    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(started).toEqual([1]);

    completions.shift()?.();
    await first;
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(started).toEqual([1, 2]);

    completions.shift()?.();
    await second;
    await writer.flush();
    expect(finished).toEqual([1, 2]);
  });

  it("continues with the next snapshot after a failed write", async () => {
    const written: number[] = [];
    const writer = createSerializedWriter<{ version: number }>(async (snapshot) => {
      if (snapshot.version === 1) {
        throw new Error("temporary failure");
      }
      written.push(snapshot.version);
    });

    await expect(writer.enqueue({ version: 1 })).rejects.toThrow("temporary failure");
    await expect(writer.enqueue({ version: 2 })).resolves.toBeUndefined();
    expect(written).toEqual([2]);
  });

  it("clears file-backed evidence blobs with an official factory reset", () => {
    persistState({ captureEvidenceBlobs: { "state://evidence": "cGRm" } });
    persistState({
      captureDrafts: [],
      officialFactoryResetVersion: "test-reset"
    });

    expect(readPersistedValue("captureEvidenceBlobs")).toEqual({});
  });

  it("clears evidence blobs when a new catalog version resets captures", () => {
    persistState({ captureEvidenceBlobs: { "state://orphaned-evidence": "cGRm" } });
    persistState({
      captureDrafts: [],
      catalogImportVersion: "test-catalog-version"
    });

    expect(readPersistedValue("captureEvidenceBlobs")).toEqual({});
  });
});
