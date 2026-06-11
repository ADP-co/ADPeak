import { isRecord, positiveInteger } from "./http";

export type CapturePayload = {
  rows: Record<string, unknown>[];
};

export type CaptureDraftRequest = {
  plantelId: number;
  indicadorId: number;
  actividadId: number;
  periodoId: number;
  responsableId?: number;
  payload: CapturePayload;
};

export function isCaptureDraftRequest(value: unknown): value is CaptureDraftRequest {
  if (!isRecord(value) || !isRecord(value.payload) || !Array.isArray(value.payload.rows)) {
    return false;
  }

  return (
    positiveInteger(value.plantelId) &&
    positiveInteger(value.indicadorId) &&
    positiveInteger(value.actividadId) &&
    positiveInteger(value.periodoId) &&
    (value.responsableId === undefined || positiveInteger(value.responsableId))
  );
}

export function isCapturePayload(value: unknown): value is CapturePayload {
  return isRecord(value) && Array.isArray(value.rows);
}

export function buildCaptureDraft({
  id,
  request,
  payload,
  estado = "borrador",
  versionActual = 1
}: {
  id: number;
  request?: Partial<CaptureDraftRequest>;
  payload?: CapturePayload;
  estado?: "borrador" | "en_revision" | "correccion_solicitada" | "aprobado" | "cerrado";
  versionActual?: number;
}) {
  const timestamp = new Date().toISOString();

  return {
    id,
    plantelId: request?.plantelId ?? 1,
    indicadorId: request?.indicadorId ?? 1,
    actividadId: request?.actividadId ?? 1,
    periodoId: request?.periodoId ?? 1,
    responsableId: request?.responsableId ?? 2,
    estado,
    versionActual,
    payload: payload ?? request?.payload ?? { rows: [] },
    cerradoEn: null,
    creadoEn: timestamp,
    actualizadoEn: timestamp
  };
}

export function nextCaptureId() {
  return Math.floor(Date.now() / 1000);
}
