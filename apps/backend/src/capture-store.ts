export type CapturePayload = {
  rows: Record<string, unknown>[];
  justificacion?: string;
  evidencia?: {
    nombre: string;
    tipo: string;
    tamanoBytes: number;
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
};

const captureDrafts = new Map<number, CaptureDraft>();
let nextCaptureId = 1;

function nowIso() {
  return new Date().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

export function isCaptureDraftRequest(value: unknown): value is CaptureDraftRequest {
  if (!isRecord(value) || !isRecord(value.payload) || !Array.isArray(value.payload.rows)) {
    return false;
  }

  return (
    isPositiveInteger(value.plantelId) &&
    isPositiveInteger(value.indicadorId) &&
    isPositiveInteger(value.actividadId) &&
    isPositiveInteger(value.periodoId) &&
    (value.responsableId === undefined || isPositiveInteger(value.responsableId))
  );
}

export function isCapturePayload(value: unknown): value is CapturePayload {
  return isRecord(value) && Array.isArray(value.rows);
}

export function resetCaptureDraftsForTest() {
  captureDrafts.clear();
  nextCaptureId = 1;
}

export function createCaptureDraft(request: CaptureDraftRequest): CaptureDraft {
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
    payload: request.payload,
    cerradoEn: null,
    creadoEn: timestamp,
    actualizadoEn: timestamp
  };

  nextCaptureId += 1;
  captureDrafts.set(draft.id, draft);
  return draft;
}

export function getCaptureDraft(captureId: number) {
  return captureDrafts.get(captureId);
}

export function updateCaptureDraft(captureId: number, payload: CapturePayload) {
  const draft = captureDrafts.get(captureId);

  if (!draft) {
    return undefined;
  }

  const updatedDraft: CaptureDraft = {
    ...draft,
    payload,
    versionActual: draft.versionActual + 1,
    actualizadoEn: nowIso()
  };

  captureDrafts.set(captureId, updatedDraft);
  return updatedDraft;
}

export function sendCaptureToReview(captureId: number) {
  const draft = captureDrafts.get(captureId);

  if (!draft) {
    return undefined;
  }

  const updatedDraft: CaptureDraft = {
    ...draft,
    estado: "en_revision",
    versionActual: draft.versionActual + 1,
    actualizadoEn: nowIso()
  };

  captureDrafts.set(captureId, updatedDraft);
  return updatedDraft;
}
