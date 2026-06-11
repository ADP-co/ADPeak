import axios from 'axios';

const configuredApiUrl =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : undefined);

const API_BASE_URL = configuredApiUrl ?? 'http://127.0.0.1:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'x-user-id': import.meta.env.VITE_USER_ID ?? '3',
    'x-role': import.meta.env.VITE_ROLE ?? 'plantel',
    'x-plantel-id': import.meta.env.VITE_PLANTEL_ID ?? '1',
    'x-responsable-id': import.meta.env.VITE_RESPONSABLE_ID ?? '2',
  },
});

export type CapturePayload = {
  rows: Record<string, unknown>[];
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

export async function createCaptureDraft(request: CaptureDraftRequest) {
  const response = await api.post<CaptureDraft>('/capturas/borradores', request);
  return response.data;
}

export async function updateCaptureDraft(
  captureId: number,
  payload: CapturePayload,
  motivoCambio = 'actualizacion desde frontend',
) {
  const response = await api.put<CaptureDraft>(`/capturas/${captureId}`, {
    payload,
    motivoCambio,
  });
  return response.data;
}

export async function getCaptureDraft(captureId: number) {
  const response = await api.get<CaptureDraft>(`/capturas/${captureId}`);
  return response.data;
}

export async function sendCaptureToReview(captureId: number) {
  const response = await api.post<CaptureDraft>(`/capturas/${captureId}/enviar-revision`);
  return response.data;
}
