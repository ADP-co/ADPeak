import { describe, expect, it } from 'vitest';
import { notificationTargetPath, type SigiNotification } from './notificaciones';

function notification(overrides: Partial<SigiNotification> = {}): SigiNotification {
  return {
    id: 11,
    rolDestino: 'director',
    usuarioDestino: 'director-1',
    indicadorId: 15,
    indicadorCodigo: '2.1.4.1.2',
    indicadorNombre: 'Indicador de prueba',
    captureId: 6,
    plantelId: 17,
    plantel: 'Bachillerato 15',
    estado: 'en_revision',
    eventType: 'capture_submitted',
    mensaje: 'Nueva captura en revisión de Bachillerato 15: 2.1.4.1.2.',
    createdAt: '2026-07-09T19:03:06.000Z',
    readAt: null,
    actorUserId: 'plantel-17',
    actorRole: 'plantel',
    ...overrides,
  };
}

describe('notificationTargetPath', () => {
  it('opens the exact capture and plantel from a review notification', () => {
    expect(notificationTargetPath(notification(), 'admin')).toBe(
      '/indicadores/captura/2.1.4.1.2?captureId=6&source=notification&plantelId=17'
    );
  });

  it('returns responsible reviewers to their review queue', () => {
    expect(notificationTargetPath(notification(), 'responsable')).toBe(
      '/indicadores/captura/2.1.4.1.2?captureId=6&source=revision&plantelId=17'
    );
  });

  it('keeps assignment notifications on the accessible indicator list', () => {
    expect(notificationTargetPath(notification({
      captureId: undefined,
      plantelId: undefined,
      eventType: 'assignment_changed',
    }), 'responsable')).toBe('/indicadores');
  });
});
