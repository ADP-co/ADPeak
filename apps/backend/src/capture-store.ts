import { createHash } from "node:crypto";
import {
  persistState,
  readPersistedCollection,
  readPersistedValue
} from "./state-store.js";

export type CapturePayload = {
  rows: Record<string, unknown>[];
  justificacion?: string;
  evidencia?: {
    nombre: string;
    tipo: string;
    tamanoBytes: number;
    contenidoBase64?: string;
    sha256?: string;
    storageRef?: string;
  };
};

export type CaptureDraft = {
  id: number;
  plantelId: number;
  indicadorId: number;
  actividadId: number;
  periodoId: number;
  responsableId: number | null;
  estado: "borrador" | "en_revision" | "correccion_solicitada" | "aprobado" | "cerrado";
  versionActual: number;
  payload: CapturePayload;
  observacion: string | null;
  submittedByUserId?: string | null;
  submittedByRole?: "director" | "responsable" | "plantel" | null;
  cerradoEn: string | null;
  creadoEn: string;
  actualizadoEn: string;
};

export type CaptureDraftRequest = {
  plantelId: number;
  indicadorId: number;
  actividadId: number;
  periodoId: number;
  responsableId?: number;
  payload: CapturePayload;
  motivoCambio?: string;
  expectedVersion?: number;
};

export class CaptureVersionConflictError extends Error {
  statusCode = 409;
  code = "capture_version_conflict";

  constructor(public readonly currentVersion: number) {
    super("La captura cambió en otra sesión. Recarga antes de guardar de nuevo.");
    this.name = "CaptureVersionConflictError";
  }
}

const captureDrafts = new Map<number, CaptureDraft>();
let nextCaptureId = 1;

reloadCaptureDraftsFromState();

function nowIso() {
  return new Date().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

export function isCaptureDraftRequest(value: unknown): value is CaptureDraftRequest {
  if (!isRecord(value) || !isRecord(value.payload) || !Array.isArray(value.payload.rows)) {
    return false;
  }

  return (
    isNonNegativeInteger(value.plantelId) &&
    isPositiveInteger(value.indicadorId) &&
    isPositiveInteger(value.actividadId) &&
    isPositiveInteger(value.periodoId) &&
    (value.responsableId === undefined || isPositiveInteger(value.responsableId)) &&
    (value.expectedVersion === undefined || isPositiveInteger(value.expectedVersion))
  );
}

export function isCapturePayload(value: unknown): value is CapturePayload {
  return isRecord(value) && Array.isArray(value.rows);
}

export function resetCaptureDraftsForTest() {
  captureDrafts.clear();
  nextCaptureId = 1;
}

export function resetCaptureDraftsToInitialState() {
  captureDrafts.clear();
  nextCaptureId = 1;
}

export function reloadCaptureDraftsFromState() {
  const persistedCaptureDrafts = readPersistedCollection<CaptureDraft>("captureDrafts") ?? [];
  captureDrafts.clear();

  for (const capture of persistedCaptureDrafts) {
    captureDrafts.set(capture.id, {
      ...capture,
      payload: withEvidenceMetadata(capture.payload, capture.id)
    });
  }

  nextCaptureId = readPersistedValue<number>("nextCaptureId") ??
    Math.max(0, ...Array.from(captureDrafts.keys())) + 1;
}

export function createCaptureDraft(request: CaptureDraftRequest): CaptureDraft {
  const existingDraft = findCaptureDraftByScope(request);

  if (existingDraft) {
    if (!isEditableDraft(existingDraft)) {
      return existingDraft;
    }

    assertExpectedVersion(existingDraft, request.expectedVersion);

    const updatedDraft: CaptureDraft = {
      ...existingDraft,
      estado: existingDraft.estado === "cerrado" ? "borrador" : existingDraft.estado,
      payload: withEvidenceMetadata(request.payload, existingDraft.id),
      responsableId: request.responsableId ?? existingDraft.responsableId,
      observacion: null,
      submittedByUserId: existingDraft.submittedByUserId ?? null,
      submittedByRole: existingDraft.submittedByRole ?? null,
      versionActual: existingDraft.versionActual + 1,
      actualizadoEn: nowIso()
    };

    captureDrafts.set(updatedDraft.id, updatedDraft);
    persistCaptureState();
    return updatedDraft;
  }

  const timestamp = nowIso();
  const draft: CaptureDraft = {
    id: nextCaptureId,
    plantelId: request.plantelId,
    indicadorId: request.indicadorId,
    actividadId: request.actividadId,
    periodoId: request.periodoId,
    responsableId: request.responsableId ?? null,
    estado: "borrador",
    versionActual: 1,
    payload: withEvidenceMetadata(request.payload, nextCaptureId),
    observacion: null,
    submittedByUserId: null,
    submittedByRole: null,
    cerradoEn: null,
    creadoEn: timestamp,
    actualizadoEn: timestamp
  };

  nextCaptureId += 1;
  captureDrafts.set(draft.id, draft);
  persistCaptureState();
  return draft;
}

export function getCaptureDraft(captureId: number) {
  return captureDrafts.get(captureId);
}

export function findCaptureDraftByScope(scope: {
  plantelId: number;
  indicadorId: number;
  actividadId: number;
  periodoId: number;
}) {
  return Array.from(captureDrafts.values())
    .filter((draft) =>
      draft.plantelId === scope.plantelId &&
      draft.indicadorId === scope.indicadorId &&
      draft.actividadId === scope.actividadId &&
      draft.periodoId === scope.periodoId &&
      draft.estado !== "cerrado"
    )
    .sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn))[0];
}

export function listCaptureDrafts() {
  return Array.from(captureDrafts.values())
    .sort((a, b) => a.id - b.id);
}

export function updateCaptureDraft(
  captureId: number,
  payload: CapturePayload,
  options: { allowReviewStatus?: boolean; expectedVersion?: number } = {}
) {
  const draft = captureDrafts.get(captureId);

  if (!draft) {
    return undefined;
  }

  const canUpdateReviewDraft = options.allowReviewStatus && draft.estado === "en_revision";

  if (!isEditableDraft(draft) && !canUpdateReviewDraft) {
    return undefined;
  }

  assertExpectedVersion(draft, options.expectedVersion);

  const updatedDraft: CaptureDraft = {
    ...draft,
    payload: withEvidenceMetadata(payload, captureId),
    observacion: null,
    versionActual: draft.versionActual + 1,
    actualizadoEn: nowIso()
  };

  captureDrafts.set(captureId, updatedDraft);
  persistCaptureState();
  return updatedDraft;
}

export function sendCaptureToReview(
  captureId: number,
  submittedBy?: { userId: string; role: CaptureDraft["submittedByRole"] },
  expectedVersion?: number
) {
  const draft = captureDrafts.get(captureId);

  if (!draft) {
    return undefined;
  }

  if (!isEditableDraft(draft)) {
    return undefined;
  }

  assertExpectedVersion(draft, expectedVersion);

  const updatedDraft: CaptureDraft = {
    ...draft,
    estado: "en_revision",
    submittedByUserId: submittedBy?.userId ?? draft.submittedByUserId ?? null,
    submittedByRole: submittedBy?.role ?? draft.submittedByRole ?? null,
    versionActual: draft.versionActual + 1,
    actualizadoEn: nowIso()
  };

  captureDrafts.set(captureId, updatedDraft);
  persistCaptureState();
  return updatedDraft;
}

export function requestCaptureCorrection(captureId: number, observacion: string, expectedVersion?: number) {
  const draft = captureDrafts.get(captureId);

  if (!draft) {
    return undefined;
  }

  if (draft.estado !== "en_revision") {
    return undefined;
  }

  assertExpectedVersion(draft, expectedVersion);

  const updatedDraft: CaptureDraft = {
    ...draft,
    estado: "correccion_solicitada",
    observacion,
    versionActual: draft.versionActual + 1,
    actualizadoEn: nowIso()
  };

  captureDrafts.set(captureId, updatedDraft);
  persistCaptureState();
  return updatedDraft;
}

export function approveCapture(captureId: number, expectedVersion?: number) {
  const draft = captureDrafts.get(captureId);

  if (!draft) {
    return undefined;
  }

  if (draft.estado !== "en_revision") {
    return undefined;
  }

  assertExpectedVersion(draft, expectedVersion);

  const updatedDraft: CaptureDraft = {
    ...draft,
    estado: "aprobado",
    observacion: null,
    versionActual: draft.versionActual + 1,
    actualizadoEn: nowIso()
  };

  captureDrafts.set(captureId, updatedDraft);
  persistCaptureState();
  return updatedDraft;
}

function persistCaptureState() {
  persistState({
    captureDrafts: Array.from(captureDrafts.values()),
    nextCaptureId
  });
}

function isEditableDraft(draft: CaptureDraft) {
  return draft.estado === "borrador" || draft.estado === "correccion_solicitada";
}

function assertExpectedVersion(draft: CaptureDraft, expectedVersion?: number) {
  if (expectedVersion !== undefined && draft.versionActual !== expectedVersion) {
    throw new CaptureVersionConflictError(draft.versionActual);
  }
}

function withEvidenceMetadata(payload: CapturePayload, captureId: number): CapturePayload {
  const evidence = payload.evidencia;

  if (!evidence) {
    return payload;
  }

  const content = evidence.contenidoBase64
    ? Buffer.from(evidence.contenidoBase64, "base64")
    : undefined;
  const sha256 = evidence.sha256 ?? (
    content?.length ? createHash("sha256").update(content).digest("hex") : undefined
  );

  return {
    ...payload,
    evidencia: {
      ...evidence,
      sha256,
      storageRef: evidence.storageRef ?? (
        sha256 ? `state://captures/${captureId}/evidence/${sha256}` : undefined
      )
    }
  };
}
