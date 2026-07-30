import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { UserBanner } from './UserBanner';

describe('UserBanner accessibility', () => {
  it('names the notification control and exposes a direct capture action', () => {
    const markup = renderToStaticMarkup(
      <UserBanner
        role="admin"
        name="Directora de prueba"
        currentView="indicadores"
        onNavigate={() => undefined}
        onOpenNotification={() => undefined}
        notifications={[{
          id: 7,
          rolDestino: 'director',
          usuarioDestino: 'director',
          indicadorId: 2,
          indicadorCodigo: '1.0.0.0.2',
          indicadorNombre: 'Porcentaje de titulación',
          captureId: 15,
          estado: 'en_revision',
          mensaje: 'Nueva captura en revisión',
          createdAt: '2026-07-22T12:00:00.000Z',
          readAt: null,
          actorUserId: 'bach16',
          actorRole: 'plantel',
        }]}
      />
    );

    expect(markup).toContain('aria-label="Notificaciones, 1 sin leer"');
    expect(markup).toContain('aria-label="Abrir notificación: Nueva captura en revisión"');
    expect(markup).toContain('Ver captura');
    expect(markup).toContain('aria-current="page"');
  });
});
