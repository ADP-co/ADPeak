import { beforeEach, describe, expect, it } from "vitest";
import {
  createCaptureDraft,
  approveCapture,
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

    const approved = approveCapture(1);

    expect(approved).toMatchObject({
      estado: "aprobado",
      observacion: null,
      versionActual: 5
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
    ).toBe(false);
  });
});
