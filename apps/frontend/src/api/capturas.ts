import axios, { AxiosHeaders } from 'axios';
import { API_BASE_URL, sessionHeaders } from './client';

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

export type CapturePayload = {
  rows: Record<string, unknown>[];
  justificacion?: string;
  evidencia?: {
    nombre: string;
    tipo: string;
    tamanoBytes: number;
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
  cerradoEn: string | null;
  creadoEn: string;
  actualizadoEn: string;
};

function shouldUseStaticFallback(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  return !error.response || [404, 405].includes(error.response.status);
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
  return readFallbackCaptures().get(captureId) ?? buildFallbackCapture({ id: captureId });
}

function sendFallbackDraftToReview(captureId: number) {
  const captures = readFallbackCaptures();
  const currentCapture = captures.get(captureId);
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

export async function createCaptureDraft(request: CaptureDraftRequest) {
  try {
    const response = await api.post<CaptureDraft>('/capturas/borradores', request);
    return response.data;
  } catch (error) {
    if (shouldUseStaticFallback(error)) {
      return createFallbackDraft(request);
    }

    throw error;
  }
}

export async function updateCaptureDraft(
  captureId: number,
  payload: CapturePayload,
  motivoCambio = 'actualizacion desde frontend',
) {
  try {
    const response = await api.put<CaptureDraft>(`/capturas/${captureId}`, {
      payload,
      motivoCambio,
    }, { headers: sessionHeaders() });
    return response.data;
  } catch (error) {
    if (shouldUseStaticFallback(error)) {
      return updateFallbackDraft(captureId, payload);
    }

    throw error;
  }
}

export async function getCaptureDraft(captureId: number) {
  try {
    const response = await api.get<CaptureDraft>(`/capturas/${captureId}`);
    return response.data;
  } catch (error) {
    if (shouldUseStaticFallback(error)) {
      return getFallbackDraft(captureId);
    }

    throw error;
  }
}

export async function sendCaptureToReview(captureId: number) {
  try {
    const response = await api.post<CaptureDraft>(`/capturas/${captureId}/enviar-revision`);
    return response.data;
  } catch (error) {
    if (shouldUseStaticFallback(error)) {
      return sendFallbackDraftToReview(captureId);
    }

    throw error;
  }
}
