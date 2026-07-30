import { createHash } from "node:crypto";
import {
  deleteEvidenceBlob,
  persistEvidenceBlob,
  persistState,
  readEvidenceBlob,
  readPersistedCollection,
  readPersistedValue
} from "./state-store.js";
import { normalizeUserFacingText } from "./text-normalization.js";

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
    storageVerified?: true;
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
const verifiedEvidenceByCapture = new Map<number, string>();
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

export function withTrustedEvidence(payload: CapturePayload, existingDraft?: CaptureDraft): CapturePayload {
  const submittedEvidence = payload.evidencia;

  if (submittedEvidence?.contenidoBase64) {
    const {
      sha256: _sha256,
      storageRef: _storageRef,
      storageVerified: _storageVerified,
      ...newEvidence
    } = submittedEvidence;
    return { ...payload, evidencia: newEvidence };
  }

  return {
    ...payload,
    evidencia: existingDraft?.payload.evidencia
  };
}

export function resetCaptureDraftsForTest() {
  captureDrafts.clear();
  verifiedEvidenceByCapture.clear();
  nextCaptureId = 1;
}

export function resetCaptureDraftsToInitialState() {
  captureDrafts.clear();
  verifiedEvidenceByCapture.clear();
  nextCaptureId = 1;
}

export function reloadCaptureDraftsFromState() {
  const persistedCaptureDrafts = readPersistedCollection<CaptureDraft>("captureDrafts") ?? [];
  captureDrafts.clear();
  verifiedEvidenceByCapture.clear();

  for (const capture of persistedCaptureDrafts) {
    captureDrafts.set(capture.id, {
      ...capture,
      payload: withEvidenceMetadata(capture.payload, capture.id, capture.payload.evidencia),
      observacion: capture.observacion ? normalizeUserFacingText(capture.observacion) : null
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
      payload: withEvidenceMetadata(request.payload, existingDraft.id, existingDraft.payload.evidencia),
      responsableId: request.responsableId ?? existingDraft.responsableId,
      observacion: null,
      submittedByUserId: existingDraft.submittedByUserId ?? null,
      submittedByRole: existingDraft.submittedByRole ?? null,
      versionActual: existingDraft.versionActual + 1,
      actualizadoEn: nowIso()
    };

    captureDrafts.set(updatedDraft.id, updatedDraft);
    verifiedEvidenceByCapture.delete(updatedDraft.id);
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

export async function externalizeCaptureEvidence(captureId: number, previousStorageRef?: string) {
  const draft = captureDrafts.get(captureId);
  const evidence = draft?.payload.evidencia;

  if (!draft || !evidence?.contenidoBase64 || !evidence.storageRef) {
    return draft;
  }

  const content = Buffer.from(evidence.contenidoBase64, "base64");
  await persistEvidenceBlob(evidence.storageRef, content);
  const { contenidoBase64: _content, ...storedEvidence } = evidence;
  const latestDraft = captureDrafts.get(captureId);

  if (
    !latestDraft ||
    latestDraft.payload.evidencia?.storageRef !== evidence.storageRef ||
    latestDraft.payload.evidencia?.sha256 !== evidence.sha256
  ) {
    await deleteEvidenceBlob(evidence.storageRef);
    return latestDraft;
  }

  const updatedDraft: CaptureDraft = {
    ...latestDraft,
    payload: {
      ...latestDraft.payload,
      evidencia: { ...storedEvidence, storageVerified: true }
    }
  };

  captureDrafts.set(captureId, updatedDraft);
  persistCaptureState();

  if (previousStorageRef && previousStorageRef !== evidence.storageRef) {
    await deleteEvidenceBlob(previousStorageRef);
  }

  return updatedDraft;
}

export async function readCaptureEvidenceContent(draft: CaptureDraft) {
  const evidence = draft.payload.evidencia;

  if (!evidence) {
    return undefined;
  }

  const content = evidence.contenidoBase64
    ? Buffer.from(evidence.contenidoBase64, "base64")
    : evidence.storageRef
      ? await readEvidenceBlob(evidence.storageRef)
      : undefined;

  if (!content) {
    return undefined;
  }

  assertEvidenceIntegrity(evidence, content);

  if (evidence.contenidoBase64 && evidence.storageRef) {
    await externalizeCaptureEvidence(draft.id);
  }

  return content;
}

export async function assertCaptureEvidenceAvailable(draft: CaptureDraft) {
  if (!draft.payload.evidencia) {
    verifiedEvidenceByCapture.delete(draft.id);
    return;
  }

  const content = await readCaptureEvidenceContent(draft);

  if (!content) {
    throw new CaptureEvidenceIntegrityError("La evidencia no está disponible. Solicita que el plantel reenvíe el archivo.");
  }

  const currentDraft = captureDrafts.get(draft.id);

  if (!currentDraft || currentDraft.versionActual !== draft.versionActual || !currentDraft.payload.evidencia) {
    verifiedEvidenceByCapture.delete(draft.id);
    throw new CaptureEvidenceIntegrityError("La captura cambió mientras se verificaba la evidencia. Recarga antes de aprobar.");
  }

  verifiedEvidenceByCapture.set(draft.id, evidenceVerificationKey(currentDraft));
}

export class CaptureEvidenceIntegrityError extends Error {
  statusCode = 422;
  code = "evidence_unavailable";

  constructor(message: string) {
    super(message);
    this.name = "CaptureEvidenceIntegrityError";
  }
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
    payload: withEvidenceMetadata(payload, captureId, draft.payload.evidencia),
    observacion: null,
    versionActual: draft.versionActual + 1,
    actualizadoEn: nowIso()
  };

  captureDrafts.set(captureId, updatedDraft);
  verifiedEvidenceByCapture.delete(captureId);
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
  verifiedEvidenceByCapture.delete(captureId);
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
    observacion: normalizeUserFacingText(observacion),
    versionActual: draft.versionActual + 1,
    actualizadoEn: nowIso()
  };

  captureDrafts.set(captureId, updatedDraft);
  verifiedEvidenceByCapture.delete(captureId);
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

  const evidenceKey = draft.payload.evidencia?.storageVerified === true
    ? evidenceVerificationKey(draft)
    : undefined;

  if (evidenceKey && verifiedEvidenceByCapture.get(captureId) !== evidenceKey) {
    throw new CaptureEvidenceIntegrityError("Verifica la evidencia almacenada antes de aprobar la captura.");
  }

  const updatedDraft: CaptureDraft = {
    ...draft,
    estado: "aprobado",
    observacion: null,
    versionActual: draft.versionActual + 1,
    actualizadoEn: nowIso()
  };

  captureDrafts.set(captureId, updatedDraft);
  verifiedEvidenceByCapture.delete(captureId);
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

function withEvidenceMetadata(
  payload: CapturePayload,
  captureId: number,
  existingEvidence?: CapturePayload["evidencia"]
): CapturePayload {
  const reusesExistingEvidence = Boolean(payload.evidencia && payload.evidencia === existingEvidence);
  const normalizedPayload = normalizeCapturePayload(payload);
  const evidence = normalizedPayload.evidencia;

  if (!evidence) {
    return normalizedPayload;
  }

  const content = evidence.contenidoBase64
    ? Buffer.from(evidence.contenidoBase64, "base64")
    : undefined;

  if (!content?.length && evidence.storageVerified === true && !reusesExistingEvidence) {
    throw new CaptureEvidenceIntegrityError("La evidencia almacenada no puede reutilizarse sin una referencia verificada.");
  }

  const sha256 = content?.length
    ? createHash("sha256").update(content).digest("hex")
    : reusesExistingEvidence
      ? evidence.sha256
      : undefined;

  return {
    ...normalizedPayload,
    evidencia: {
      ...evidence,
      sha256,
      storageVerified: !content?.length && reusesExistingEvidence
        ? evidence.storageVerified
        : undefined,
      storageRef: content?.length && sha256
        ? `state://captures/${captureId}/evidence/${sha256}`
        : reusesExistingEvidence
          ? evidence.storageRef
          : undefined
    }
  };
}

function evidenceVerificationKey(draft: CaptureDraft) {
  const evidence = draft.payload.evidencia;

  if (!evidence) {
    return "";
  }

  return [
    draft.versionActual,
    evidence.storageRef ?? "",
    evidence.sha256 ?? "",
    evidence.tamanoBytes
  ].join(":");
}

function assertEvidenceIntegrity(evidence: NonNullable<CapturePayload["evidencia"]>, content: Buffer) {
  const actualHash = createHash("sha256").update(content).digest("hex");

  if (!evidence.sha256 || actualHash !== evidence.sha256.toLowerCase()) {
    throw new CaptureEvidenceIntegrityError("La evidencia está dañada o no coincide con el archivo registrado.");
  }

  if (content.length !== evidence.tamanoBytes) {
    throw new CaptureEvidenceIntegrityError("El tamaño de la evidencia no coincide con el archivo registrado.");
  }

  if (content.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new CaptureEvidenceIntegrityError("La evidencia almacenada no contiene un PDF válido.");
  }

  const trailer = content.subarray(Math.max(0, content.length - 2048)).toString("latin1");

  if (!trailer.includes("%%EOF")) {
    throw new CaptureEvidenceIntegrityError("La evidencia PDF está incompleta o dañada.");
  }
}

function normalizeCapturePayload(payload: CapturePayload): CapturePayload {
  return {
    ...payload,
    rows: payload.rows.map((row) => Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        typeof value === "string" ? normalizeUserFacingText(value) : value
      ])
    )),
    justificacion: payload.justificacion
      ? normalizeUserFacingText(payload.justificacion)
      : payload.justificacion,
    evidencia: payload.evidencia
      ? {
          ...payload.evidencia,
          nombre: normalizeUserFacingText(payload.evidencia.nombre)
        }
      : undefined
  };
}
