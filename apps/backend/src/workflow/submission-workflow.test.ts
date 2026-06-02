import { describe, expect, it } from "vitest";
import {
  autosaveDraft,
  createDraftSubmission,
  currentVersion,
  transitionSubmission,
  WorkflowError
} from "./submission-workflow.js";

describe("SCRUM-43 submission workflow", () => {
  it("crea borrador con version vigente y auditoria JSON", () => {
    const result = createDraftSubmission("sub-1", { avance: 10 });

    expect(result.submission).toMatchObject({
      id: "sub-1",
      status: "draft",
      currentVersionNumber: 1
    });
    expect(currentVersion(result.submission)).toMatchObject({
      versionNumber: 1,
      isCurrent: true,
      capturedValues: { avance: 10 }
    });
    expect(result.audit).toMatchObject({
      fieldName: "captured_values",
      previousValue: null,
      newValue: { avance: 10 },
      versionNumber: 1
    });
  });

  it("autoguarda sin sobrescritura silenciosa incrementando version", () => {
    const draft = createDraftSubmission("sub-1", { avance: 10 }).submission;
    const autosaved = autosaveDraft(draft, { avance: 45 });

    expect(autosaved.submission.currentVersionNumber).toBe(2);
    expect(autosaved.submission.versions).toHaveLength(2);
    expect(autosaved.submission.versions[0]).toMatchObject({ versionNumber: 1, isCurrent: false });
    expect(currentVersion(autosaved.submission)).toMatchObject({
      versionNumber: 2,
      capturedValues: { avance: 45 }
    });
    expect(autosaved.audit).toMatchObject({
      previousValue: { avance: 10 },
      newValue: { avance: 45 },
      versionNumber: 2
    });
  });

  it("aplica transiciones validas y rechaza las invalidas", () => {
    const draft = createDraftSubmission("sub-1", { avance: 10 }).submission;
    const submitted = transitionSubmission(draft, "submitted", "plantel").submission;
    const inReview = transitionSubmission(submitted, "in_review", "responsable").submission;

    expect(inReview.status).toBe("in_review");
    expect(() => transitionSubmission(inReview, "correction", "responsable")).toThrow(WorkflowError);
    expect(() => transitionSubmission(inReview, "closed", "plantel")).toThrow(WorkflowError);

    const correction = transitionSubmission(inReview, "correction", "responsable", "Falta evidencia").submission;
    expect(correction.status).toBe("correction");
  });

  it("bloquea modificaciones cuando la captura esta cerrada", () => {
    const draft = createDraftSubmission("sub-1", { avance: 100 }).submission;
    const submitted = transitionSubmission(draft, "submitted", "admin").submission;
    const inReview = transitionSubmission(submitted, "in_review", "admin").submission;
    const approved = transitionSubmission(inReview, "approved", "admin").submission;
    const closed = transitionSubmission(approved, "closed", "admin").submission;

    expect(() => autosaveDraft(closed, { avance: 90 })).toThrow("No se puede sobrescribir");
    expect(() => transitionSubmission(closed, "correction", "admin", "Cambio tardio")).toThrow("cerrada");
  });
});
