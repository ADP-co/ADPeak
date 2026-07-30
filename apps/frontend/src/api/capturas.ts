import axios, { AxiosHeaders } from 'axios';
import { API_BASE_URL, API_REQUESTS_ENABLED, authenticatedFetch, sessionHeaders } from './client';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
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
    sha256?: string;
    storageRef?: string;
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
  expectedVersion?: number;
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

export type ReviewCapture = {
  captureId: number;
  indicadorId: number;
  code: string;
  name: string;
  plantelId: number;
  plantel: string;
  periodoId: number;
  actividadId: number;
  responsableId: number | null;
  estado: 'en_revision';
  actualizadoEn: string;
  allowedActions: Array<'view' | 'open_evidence' | 'request_correction' | 'approve'>;
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

export async function fetchReviewCaptures() {
  if (!API_REQUESTS_ENABLED) {
    throw apiUnavailableCaptureError();
  }

  try {
    const response = await api.get<{ captures: ReviewCapture[] }>('/capturas/en-revision');
    return response.data.captures;
  } catch (error) {
    throw captureError(error, 'No se pudo cargar la bandeja de revisión.');
  }
}

export async function updateCaptureDraft(
  captureId: number,
  payload: CapturePayload,
  motivoCambio = 'actualización desde frontend',
  expectedVersion?: number,
) {
  if (!API_REQUESTS_ENABLED) {
    throw apiUnavailableCaptureError();
  }

  try {
    const response = await api.put<CaptureDraft>(`/capturas/${captureId}`, {
      payload,
      motivoCambio,
      expectedVersion,
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

export async function sendCaptureToReview(captureId: number, expectedVersion?: number) {
  if (!API_REQUESTS_ENABLED) {
    throw apiUnavailableCaptureError();
  }

  try {
    const response = await api.post<CaptureDraft>(`/capturas/${captureId}/enviar-revision`, { expectedVersion });
    return response.data;
  } catch (error) {
    throw captureError(error, 'No se pudo enviar a revisión.');
  }
}

export async function requestCaptureCorrection(captureId: number, observacion: string, expectedVersion?: number) {
  if (!API_REQUESTS_ENABLED) {
    throw apiUnavailableCaptureError();
  }

  try {
    const response = await api.post<CaptureDraft>(`/capturas/${captureId}/observar`, { observacion, expectedVersion });
    return response.data;
  } catch (error) {
    throw captureError(error, 'No se pudo solicitar la corrección.');
  }
}

export async function approveCapture(captureId: number, expectedVersion?: number) {
  if (!API_REQUESTS_ENABLED) {
    throw apiUnavailableCaptureError();
  }

  try {
    const response = await api.post<CaptureDraft>(`/capturas/${captureId}/aprobar`, { expectedVersion });
    return response.data;
  } catch (error) {
    throw captureError(error, 'No se pudo aprobar el indicador.');
  }
}

export async function fetchCaptureEvidence(captureId: number) {
  if (!API_REQUESTS_ENABLED) {
    throw apiUnavailableCaptureError();
  }

  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/capturas/${captureId}/evidencia`, {
      headers: sessionHeaders(),
    });

    if (!response.ok) {
      let message = 'No se pudo abrir la evidencia.';

      try {
        const payload = await response.json() as { message?: unknown };
        if (typeof payload.message === 'string' && payload.message.trim()) {
          message = cleanServerMessage(payload.message);
        }
      } catch {
        // Non-JSON evidence errors keep the safe fallback.
      }

      throw new CaptureRequestError(message, undefined, response.status);
    }

    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition') ?? '';
    const match = disposition.match(/filename="([^"]+)"/i);
    const filename = match?.[1] ?? `evidencia-${captureId}.pdf`;

    if (blob.size === 0) {
      throw new CaptureRequestError('La evidencia no contiene archivo descargable.');
    }

    return { blob, filename };
  } catch (error) {
    if (error instanceof CaptureRequestError) {
      throw error;
    }

    throw new CaptureRequestError('No se pudo abrir la evidencia.');
  }
}
