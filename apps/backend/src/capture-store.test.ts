import { beforeEach, describe, expect, it } from "vitest";
import {
  assertCaptureEvidenceAvailable,
  createCaptureDraft,
  CaptureEvidenceIntegrityError,
  CaptureVersionConflictError,
  approveCapture,
  externalizeCaptureEvidence,
  findCaptureDraftByScope,
  getCaptureDraft,
  isCaptureDraftRequest,
  readCaptureEvidenceContent,
  requestCaptureCorrection,
  resetCaptureDraftsForTest,
  sendCaptureToReview,
  updateCaptureDraft,
  withTrustedEvidence
} from "./capture-store.js";
import { persistEvidenceBlob } from "./state-store.js";

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

  it("repairs damaged accents in persisted user-facing capture text", () => {
    const draft = createCaptureDraft({
      plantelId: 1,
      indicadorId: 1,
      actividadId: 1,
      periodoId: 1,
      payload: {
        rows: [{ descripcion: "EducaciÃ³n y gesti?n" }],
        justificacion: "Informaci?n num?rica",
        evidencia: {
          nombre: "titulaci?n.pdf",
          tipo: "application/pdf",
          tamanoBytes: 20,
          contenidoBase64: Buffer.from("%PDF-1.4\n", "utf8").toString("base64")
        }
      }
    });

    expect(draft.payload).toMatchObject({
      rows: [{ descripcion: "Educación y gestión" }],
      justificacion: "Información numérica",
      evidencia: { nombre: "titulación.pdf" }
    });

    const reviewed = sendCaptureToReview(draft.id);
    const observed = requestCaptureCorrection(
      draft.id,
      "Requiere corregir valores num?ricos antes de exportar.",
      reviewed?.versionActual
    );

    expect(observed?.observacion).toBe("Requiere corregir valores numéricos antes de exportar.");
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

  it("externalizes evidence with verified metadata and reads it back intact", async () => {
    const content = Buffer.from("%PDF-1.4\n% verified evidence\n%%EOF", "utf8");
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
          tamanoBytes: content.length,
          contenidoBase64: content.toString("base64")
        }
      }
    });

    const stored = await externalizeCaptureEvidence(draft.id);

    expect(stored?.payload.evidencia).toMatchObject({ storageVerified: true });
    expect(stored?.payload.evidencia).not.toHaveProperty("contenidoBase64");
    await expect(readCaptureEvidenceContent(stored!)).resolves.toEqual(content);
  });

  it("does not trust client-supplied evidence references", () => {
    const forged = withTrustedEvidence({
      rows: [],
      evidencia: {
        nombre: "forged.pdf",
        tipo: "application/pdf",
        tamanoBytes: 100,
        sha256: "a".repeat(64),
        storageRef: `state://captures/1/evidence/${"a".repeat(64)}`,
        storageVerified: true
      }
    });

    expect(forged.evidencia).toBeUndefined();
  });

  it("rejects verified evidence metadata that did not come from the stored draft", () => {
    const hash = "a".repeat(64);

    expect(() => createCaptureDraft({
      plantelId: 1,
      indicadorId: 1,
      actividadId: 1,
      periodoId: 1,
      payload: {
        rows: [],
        evidencia: {
          nombre: "forged.pdf",
          tipo: "application/pdf",
          tamanoBytes: 100,
          sha256: hash,
          storageRef: `state://captures/1/evidence/${hash}`,
          storageVerified: true
        }
      }
    })).toThrow(CaptureEvidenceIntegrityError);
  });

  it("preserves an existing verified reference through the trusted adapter", async () => {
    const content = Buffer.from("%PDF-1.4\n% reusable evidence\n%%EOF", "utf8");
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
          tamanoBytes: content.length,
          contenidoBase64: content.toString("base64")
        }
      }
    });
    const stored = await externalizeCaptureEvidence(draft.id);
    const trustedPayload = withTrustedEvidence({ rows: [{ avance: 50 }] }, stored);
    const updated = updateCaptureDraft(draft.id, trustedPayload);

    expect(updated?.payload.evidencia).toMatchObject({
      storageRef: stored?.payload.evidencia?.storageRef,
      storageVerified: true
    });
    await expect(readCaptureEvidenceContent(updated!)).resolves.toEqual(content);
  });

  it("requires domain verification of the current evidence before approval", async () => {
    const content = Buffer.from("%PDF-1.4\n% approval evidence\n%%EOF", "utf8");
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
          tamanoBytes: content.length,
          contenidoBase64: content.toString("base64")
        }
      }
    });
    const stored = await externalizeCaptureEvidence(draft.id);
    const reviewed = sendCaptureToReview(stored!.id, undefined, stored!.versionActual)!;

    expect(() => approveCapture(reviewed.id, reviewed.versionActual)).toThrow(CaptureEvidenceIntegrityError);

    await expect(assertCaptureEvidenceAvailable(reviewed)).resolves.toBeUndefined();
    expect(approveCapture(reviewed.id, reviewed.versionActual)).toMatchObject({
      estado: "aprobado",
      versionActual: reviewed.versionActual + 1
    });
  });

  it("rejects a blob whose checksum does not match its storage reference", async () => {
    await expect(persistEvidenceBlob(
      `state://captures/1/evidence/${"a".repeat(64)}`,
      Buffer.from("different content")
    )).rejects.toThrow("checksum");
  });
});
