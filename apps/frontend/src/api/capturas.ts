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

function apiUnavailableCaptureError() {
  return new CaptureRequestError('No se pudo conectar con el sistema. Intenta de nuevo.', 'api_unavailable');
}

export async function createCaptureDraft(request: CaptureDraftRequest) {
  if (!API_REQUESTS_ENABLED) {
    throw apiUnavailableCaptureError();
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
    throw captureError(error, 'No se pudo consultar la captura.');
  }
}

export async function updateCaptureDraft(
  captureId: number,
  payload: CapturePayload,
  motivoCambio = 'actualización desde frontend',
) {
  if (!API_REQUESTS_ENABLED) {
    throw apiUnavailableCaptureError();
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
    throw apiUnavailableCaptureError();
  }

  try {
    const response = await api.get<CaptureDraft>(`/capturas/${captureId}`);
    return response.data;
  } catch (error) {
    throw captureError(error, 'No se pudo cargar el borrador.');
  }
}

export async function sendCaptureToReview(captureId: number) {
  if (!API_REQUESTS_ENABLED) {
    throw apiUnavailableCaptureError();
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
    throw apiUnavailableCaptureError();
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
    throw apiUnavailableCaptureError();
  }

  try {
    const response = await api.post<CaptureDraft>(`/capturas/${captureId}/aprobar`);
    return response.data;
  } catch (error) {
    throw captureError(error, 'No se pudo aprobar el indicador.');
  }
}
