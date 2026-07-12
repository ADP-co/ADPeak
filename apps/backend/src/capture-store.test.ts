import { beforeEach, describe, expect, it } from "vitest";
import {
  createCaptureDraft,
  CaptureVersionConflictError,
  approveCapture,
  findCaptureDraftByScope,
  getCaptureDraft,
  isCaptureDraftRequest,
  requestCaptureCorrection,
  resetCaptureDraftsForTest,
  sendCaptureToReview,
  updateCaptureDraft
} from "./capture-store.js";

describe("capture store", () => {
  beforeEach(() => {
    resetCaptureDraftsForTest();
  });

  it("creates, updates and sends a capture draft to review", () => {
    const draft = createCaptureDraft({
      plantelId: 1,
      indicadorId: 1,
      actividadId: 1,
      periodoId: 1,
      responsableId: 2,
      payload: {
        rows: [{ plantel: "Bachillerato 16", egresados_mujeres: 12 }]
      }
    });

    expect(draft).toMatchObject({
      id: 1,
      estado: "borrador",
      versionActual: 1,
      responsableId: 2
    });

    const updated = updateCaptureDraft(1, {
      rows: [{ plantel: "Bachillerato 16", egresados_mujeres: 14 }]
    });

    expect(updated).toMatchObject({
      id: 1,
      estado: "borrador",
      versionActual: 2,
      payload: {
        rows: [{ plantel: "Bachillerato 16", egresados_mujeres: 14 }]
      }
    });

    const reviewed = sendCaptureToReview(1);

    expect(reviewed).toMatchObject({
      id: 1,
      estado: "en_revision",
      versionActual: 3
    });
    expect(getCaptureDraft(1)?.estado).toBe("en_revision");

    const observed = requestCaptureCorrection(1, "Corregir evidencia");

    expect(observed).toMatchObject({
      estado: "correccion_solicitada",
      observacion: "Corregir evidencia",
      versionActual: 4
    });

    expect(approveCapture(1)).toBeUndefined();

    const reviewedAgain = sendCaptureToReview(1);
    expect(reviewedAgain).toMatchObject({
      estado: "en_revision",
      versionActual: 5
    });

    const approved = approveCapture(1);

    expect(approved).toMatchObject({
      estado: "aprobado",
      observacion: null,
      versionActual: 6
    });
  });

  it("validates the request shape expected by the final frontend", () => {
    expect(
      isCaptureDraftRequest({
        plantelId: 1,
        indicadorId: 1,
        actividadId: 1,
        periodoId: 1,
        payload: { rows: [] }
      })
    ).toBe(true);

    expect(
      isCaptureDraftRequest({
        plantelId: 0,
        indicadorId: 1,
        actividadId: 1,
        periodoId: 1,
        payload: { rows: [] }
      })
    ).toBe(true);

    expect(
      isCaptureDraftRequest({
        plantelId: -1,
        indicadorId: 1,
        actividadId: 1,
        periodoId: 1,
        payload: { rows: [] }
      })
    ).toBe(false);
  });

  it("reuses the same draft for the same plantel indicator period and activity", () => {
    const firstDraft = createCaptureDraft({
      plantelId: 1,
      indicadorId: 1,
      actividadId: 1,
      periodoId: 1,
      payload: { rows: [{ avance: 25 }] }
    });
    const secondDraft = createCaptureDraft({
      plantelId: 1,
      indicadorId: 1,
      actividadId: 1,
      periodoId: 1,
      payload: { rows: [{ avance: 80 }] }
    });

    expect(secondDraft.id).toBe(firstDraft.id);
    expect(secondDraft.versionActual).toBe(2);
    expect(findCaptureDraftByScope({
      plantelId: 1,
      indicadorId: 1,
      actividadId: 1,
      periodoId: 1
    })?.payload.rows).toEqual([{ avance: 80 }]);
  });

  it("does not modify a capture while it is under review", () => {
    const draft = createCaptureDraft({
      plantelId: 1,
      indicadorId: 1,
      actividadId: 1,
      periodoId: 1,
      payload: { rows: [{ avance: 25 }] }
    });

    sendCaptureToReview(draft.id);

    expect(updateCaptureDraft(draft.id, { rows: [{ avance: 99 }] })).toBeUndefined();
    const repeatedCreate = createCaptureDraft({
      plantelId: 1,
      indicadorId: 1,
      actividadId: 1,
      periodoId: 1,
      payload: { rows: [{ avance: 100 }] }
    });

    expect(repeatedCreate.payload.rows).toEqual([{ avance: 25 }]);
    expect(getCaptureDraft(draft.id)?.payload.rows).toEqual([{ avance: 25 }]);
  });

  it("rejects stale updates and stale state transitions", () => {
    const draft = createCaptureDraft({
      plantelId: 1,
      indicadorId: 1,
      actividadId: 1,
      periodoId: 1,
      payload: { rows: [{ avance: 25 }] }
    });
    const updated = updateCaptureDraft(draft.id, { rows: [{ avance: 50 }] }, {
      expectedVersion: draft.versionActual
    });

    expect(updated?.versionActual).toBe(2);
    expect(() => updateCaptureDraft(draft.id, { rows: [{ avance: 80 }] }, {
      expectedVersion: draft.versionActual
    })).toThrow(CaptureVersionConflictError);
    expect(getCaptureDraft(draft.id)?.payload.rows).toEqual([{ avance: 50 }]);

    expect(() => sendCaptureToReview(draft.id, undefined, draft.versionActual)).toThrow(
      CaptureVersionConflictError
    );
    const reviewed = sendCaptureToReview(draft.id, undefined, updated?.versionActual);
    expect(reviewed?.estado).toBe("en_revision");

    expect(() => requestCaptureCorrection(draft.id, "Corregir datos", updated?.versionActual)).toThrow(
      CaptureVersionConflictError
    );
    expect(() => approveCapture(draft.id, updated?.versionActual)).toThrow(
      CaptureVersionConflictError
    );
  });

  it("persists a stable hash and storage reference for evidence files", () => {
    const content = Buffer.from("%PDF-1.4\n% evidence metadata\n", "utf8").toString("base64");
    const draft = createCaptureDraft({
      plantelId: 1,
      indicadorId: 1,
      actividadId: 1,
      periodoId: 1,
      payload: {
        rows: [{ avance: 25 }],
        evidencia: {
          nombre: "evidencia.pdf",
          tipo: "application/pdf",
          tamanoBytes: 30,
          contenidoBase64: content
        }
      }
    });

    expect(draft.payload.evidencia?.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(draft.payload.evidencia?.storageRef).toBe(
      `state://captures/${draft.id}/evidence/${draft.payload.evidencia?.sha256}`
    );

    const updated = updateCaptureDraft(draft.id, draft.payload);
    expect(updated?.payload.evidencia?.sha256).toBe(draft.payload.evidencia?.sha256);
    expect(updated?.payload.evidencia?.storageRef).toBe(draft.payload.evidencia?.storageRef);
  });
});
