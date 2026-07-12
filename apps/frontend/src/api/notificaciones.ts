import { API_REQUESTS_ENABLED, apiJson } from './client';

export type SigiNotification = {
  id: number;
  rolDestino: 'director' | 'responsable' | 'plantel';
  usuarioDestino: string;
  indicadorId: number;
  indicadorCodigo: string;
  indicadorNombre: string;
  captureId?: number;
  plantelId?: number;
  plantel?: string;
  estado?: 'borrador' | 'en_revision' | 'correccion_solicitada' | 'aprobado' | 'cerrado';
  eventType?: 'capture_submitted' | 'capture_resubmitted' | 'correction_requested' | 'capture_approved' | 'assignment_changed';
  idempotencyKey?: string;
  mensaje: string;
  createdAt: string;
  readAt: string | null;
  actorUserId: string;
  actorRole: 'director' | 'responsable' | 'plantel';
};

export async function fetchNotifications() {
  if (!API_REQUESTS_ENABLED) {
    return [];
  }

  const response = await apiJson<{ notifications: SigiNotification[] }>('/notificaciones');
  return response.notifications;
}

export async function markNotificationRead(id: number) {
  if (!API_REQUESTS_ENABLED) {
    return undefined;
  }

  return apiJson<SigiNotification>(`/notificaciones/${id}/leida`, { method: 'PATCH' });
}
