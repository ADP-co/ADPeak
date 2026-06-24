import axios, { AxiosHeaders } from 'axios';
import { API_BASE_URL, API_REQUESTS_ENABLED, sessionHeaders } from './client';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const headers = AxiosHeaders.from(config.headers);
  Object.entries(sessionHeaders()).forEach(([key, value]) => headers.set(key, value));
  config.headers = headers;
  return config;
});

const FALLBACK_STORAGE_KEY = 'adpeak.static.captures';

export class CaptureRequestError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'CaptureRequestError';
  }
}

export type CapturePayload = {
  rows: Record<string, unknown>[];
  justificacion?: string;
  evidencia?: {
    nombre: string;
    tipo: string;
    tamanoBytes: number;
    contenidoBase64?: string;
  };
};

export type CaptureDraftRequest = {
  plantelId: number;
  indicadorId: number;
  periodoId: number;
  actividadId: number;
  responsableId?: number;
  payload: CapturePayload;
  motivoCambio?: string;
};

export type CaptureDraft = {
  id: number;
  plantelId: number;
  indicadorId: number;
  actividadId: number;
  periodoId: number;
  responsableId: number | null;
  estado: 'borrador' | 'en_revision' | 'correccion_solicitada' | 'aprobado' | 'cerrado';
  versionActual: number;
  payload: CapturePayload;
  observacion?: string | null;
  cerradoEn: string | null;
  creadoEn: string;
  actualizadoEn: string;
};

function shouldUseStaticFallback(error: unknown) {
  if (API_REQUESTS_ENABLED) {
    return false;
  }

  if (!axios.isAxiosError(error)) {
    return false;
  }

  if (!error.response) {
    return !isAbsoluteApiBaseUrl();
  }

  if (error.response.status === 405) {
    return true;
  }

  if (error.response.status !== 404) {
    return false;
  }

  const data = error.response.data;
  if (!data || typeof data !== 'object') {
    return true;
  }

  const errorCode = 'error' in data ? data.error : undefined;
  return errorCode === 'not_found';
}

function isAbsoluteApiBaseUrl() {
  return /^https?:\/\//i.test(API_BASE_URL);
}

function captureError(error: unknown, fallbackMessage: string) {
  if (!axios.isAxiosError(error)) {
    return new CaptureRequestError(fallbackMessage);
  }

  const status = error.response?.status;
  const data = error.response?.data;
  const code = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
    ? data.error
    : undefined;

  if (!error.response) {
    return new CaptureRequestError('No se pudo conectar con el sistema. Intenta de nuevo.', 'network_error');
  }

  if (code === 'capture_not_found') {
    return new CaptureRequestError('No se encontró el borrador guardado. Se buscará la captura vigente.', code, status);
  }

  if (status === 403) {
    return new CaptureRequestError('No tienes permiso para realizar esta acción.', code, status);
  }

  if (status === 400 && data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
    return new CaptureRequestError(cleanServerMessage(data.message), code, status);
  }

  if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
    return new CaptureRequestError(cleanServerMessage(data.message), code, status);
  }

  return new CaptureRequestError(fallbackMessage, code, status);
}

function cleanServerMessage(message: string) {
  return message
    .replace(/actualizacion/g, 'actualización')
    .replace(/valido/g, 'válido')
    .replace(/validas/g, 'válidas')
    .replace(/accion/g, 'acción')
    .replace(/revision/g, 'revisión')
    .replace(/observacion/g, 'observación')
    .replace(/esta/g, 'está');
}

function readFallbackCaptures() {
  if (typeof window === 'undefined') {
    return new Map<number, CaptureDraft>();
  }

  try {
    const rawValue = window.localStorage.getItem(FALLBACK_STORAGE_KEY);
    const parsedValue = rawValue ? JSON.parse(rawValue) as CaptureDraft[] : [];
    return new Map(parsedValue.map((capture) => [capture.id, capture]));
  } catch {
    return new Map<number, CaptureDraft>();
  }
}

function writeFallbackCaptures(captures: Map<number, CaptureDraft>) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(Array.from(captures.values())));
}

function buildFallbackCapture({
  id,
  request,
  payload,
  estado = 'borrador',
  versionActual = 1,
}: {
  id: number;
  request?: Partial<CaptureDraftRequest>;
  payload?: CapturePayload;
  estado?: CaptureDraft['estado'];
  versionActual?: number;
}): CaptureDraft {
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
    actualizadoEn: timestamp,
  };
}

function createFallbackDraft(request: CaptureDraftRequest) {
  const captures = readFallbackCaptures();
  const draft = buildFallbackCapture({ id: Date.now(), request });

  captures.set(draft.id, draft);
  writeFallbackCaptures(captures);
  return draft;
}

function updateFallbackDraft(captureId: number, payload: CapturePayload) {
  const captures = readFallbackCaptures();
  const currentCapture = captures.get(captureId);

  if (currentCapture && !isEditableFallbackStatus(currentCapture.estado)) {
    throw new CaptureRequestError('La captura ya fue enviada y no puede modificarse hasta que se solicite corrección.', 'capture_not_editable', 409);
  }

  const updatedCapture = {
    ...buildFallbackCapture({ id: captureId, payload }),
    ...currentCapture,
    payload,
    versionActual: (currentCapture?.versionActual ?? 1) + 1,
    actualizadoEn: new Date().toISOString(),
  };

  captures.set(captureId, updatedCapture);
  writeFallbackCaptures(captures);
  return updatedCapture;
}

function getFallbackDraft(captureId: number) {
  const draft = readFallbackCaptures().get(captureId);

  if (!draft) {
    throw new CaptureRequestError('No se encontró el borrador guardado. Se buscará la captura vigente.', 'capture_not_found', 404);
  }

  return draft;
}

function sendFallbackDraftToReview(captureId: number) {
  const captures = readFallbackCaptures();
  const currentCapture = captures.get(captureId);

  if (!currentCapture || currentCapture.payload.rows.length === 0) {
    throw new CaptureRequestError('La captura está incompleta. Vuelve a abrir el indicador y conserva todas las filas oficiales.', 'invalid_capture_payload', 400);
  }

  if (!isEditableFallbackStatus(currentCapture.estado)) {
    throw new CaptureRequestError('No se pudo enviar esta captura a revisión.', 'invalid_capture_status', 409);
  }

  const updatedCapture = {
    ...buildFallbackCapture({ id: captureId }),
    ...currentCapture,
    estado: 'en_revision' as const,
    versionActual: (currentCapture?.versionActual ?? 1) + 1,
    actualizadoEn: new Date().toISOString(),
  };

  captures.set(captureId, updatedCapture);
  writeFallbackCaptures(captures);
  return updatedCapture;
}

function requestFallbackCorrection(captureId: number, observacion: string) {
  const captures = readFallbackCaptures();
  const currentCapture = captures.get(captureId);

  if (currentCapture?.estado !== 'en_revision') {
    throw new CaptureRequestError('La captura debe estar en revisión para solicitar corrección.', 'invalid_capture_status', 409);
  }

  const updatedCapture = {
    ...buildFallbackCapture({ id: captureId }),
    ...currentCapture,
    estado: 'correccion_solicitada' as const,
    observacion,
    versionActual: (currentCapture?.versionActual ?? 1) + 1,
    actualizadoEn: new Date().toISOString(),
  };

  captures.set(captureId, updatedCapture);
  writeFallbackCaptures(captures);
  return updatedCapture;
}

function approveFallbackDraft(captureId: number) {
  const captures = readFallbackCaptures();
  const currentCapture = captures.get(captureId);

  if (currentCapture?.estado !== 'en_revision') {
    throw new CaptureRequestError('La captura debe estar en revisión para aprobarse.', 'invalid_capture_status', 409);
  }

  const updatedCapture = {
    ...buildFallbackCapture({ id: captureId }),
    ...currentCapture,
    estado: 'aprobado' as const,
    observacion: null,
    versionActual: (currentCapture?.versionActual ?? 1) + 1,
    actualizadoEn: new Date().toISOString(),
  };

  captures.set(captureId, updatedCapture);
  writeFallbackCaptures(captures);
  return updatedCapture;
}

function isEditableFallbackStatus(status: CaptureDraft['estado']) {
  return status === 'borrador' || status === 'correccion_solicitada';
}

export async function createCaptureDraft(request: CaptureDraftRequest) {
  if (!API_REQUESTS_ENABLED) {
    return createFallbackDraft(request);
  }

  try {
    const response = await api.post<CaptureDraft>('/capturas/borradores', request);
    return response.data;
  } catch (error) {
    throw captureError(error, 'No se pudo guardar el borrador.');
  }
}

export async function findCaptureDraft(request: Omit<CaptureDraftRequest, 'payload' | 'motivoCambio'>) {
  if (!API_REQUESTS_ENABLED) {
    return undefined;
  }

  try {
    const params = new URLSearchParams({
      plantelId: String(request.plantelId),
      indicadorId: String(request.indicadorId),
      actividadId: String(request.actividadId),
      periodoId: String(request.periodoId),
    });
    const response = await api.get<{ capture: CaptureDraft | null }>(`/capturas/borradores?${params.toString()}`);
    return response.data.capture;
  } catch (error) {
    if (shouldUseStaticFallback(error)) {
      return undefined;
    }

    throw captureError(error, 'No se pudo consultar la captura.');
  }
}

export async function updateCaptureDraft(
  captureId: number,
  payload: CapturePayload,
  motivoCambio = 'actualización desde frontend',
) {
  if (!API_REQUESTS_ENABLED) {
    return updateFallbackDraft(captureId, payload);
  }

  try {
    const response = await api.put<CaptureDraft>(`/capturas/${captureId}`, {
      payload,
      motivoCambio,
    }, { headers: sessionHeaders() });
    return response.data;
  } catch (error) {
    throw captureError(error, 'No se pudo actualizar el borrador.');
  }
}

export async function getCaptureDraft(captureId: number) {
  if (!API_REQUESTS_ENABLED) {
    return getFallbackDraft(captureId);
  }

  try {
    const response = await api.get<CaptureDraft>(`/capturas/${captureId}`);
    return response.data;
  } catch (error) {
    if (shouldUseStaticFallback(error)) {
      return getFallbackDraft(captureId);
    }

    throw captureError(error, 'No se pudo cargar el borrador.');
  }
}

export async function sendCaptureToReview(captureId: number) {
  if (!API_REQUESTS_ENABLED) {
    return sendFallbackDraftToReview(captureId);
  }

  try {
    const response = await api.post<CaptureDraft>(`/capturas/${captureId}/enviar-revision`);
    return response.data;
  } catch (error) {
    throw captureError(error, 'No se pudo enviar a revisión.');
  }
}

export async function requestCaptureCorrection(captureId: number, observacion: string) {
  if (!API_REQUESTS_ENABLED) {
    return requestFallbackCorrection(captureId, observacion);
  }

  try {
    const response = await api.post<CaptureDraft>(`/capturas/${captureId}/observar`, { observacion });
    return response.data;
  } catch (error) {
    throw captureError(error, 'No se pudo solicitar la corrección.');
  }
}

export async function approveCapture(captureId: number) {
  if (!API_REQUESTS_ENABLED) {
    return approveFallbackDraft(captureId);
  }

  try {
    const response = await api.post<CaptureDraft>(`/capturas/${captureId}/aprobar`);
    return response.data;
  } catch (error) {
    throw captureError(error, 'No se pudo aprobar el indicador.');
  }
}
