import { ArrowRight, Bell, User } from 'lucide-react';
import type { SigiNotification } from '../../api/notificaciones';

// Roles del sistema
export type UserRole = 'plantel' | 'admin' | 'responsable';

interface UserBannerProps {
  role: UserRole;
  name: string;
  description?: string;
  onNavigate?: (view: string) => void;
  currentView?: string;
  notifications?: SigiNotification[];
  onReadNotification?: (id: number) => void;
  onOpenNotification?: (notification: SigiNotification) => void;
}

// Diccionario de enlaces
const navLinksByRole: Record<UserRole, { label: string; href: string }[]> = {
  plantel: [
    { label: 'Indicadores', href: '/indicadores' },
    { label: 'Historial', href: '/historial' },
    { label: 'Reportes', href: '/reportes' }
  ],
  admin: [
    { label: 'Análisis', href: '/analisis' },
    { label: 'Indicadores', href: '/indicadores' },
    { label: 'Historial', href: '/historial' },
    { label: 'Reportes', href: '/reportes' },
    { label: 'Usuarios', href: '/usuarios' }
  ],
  responsable: [
    { label: 'Mis indicadores', href: '/indicadores' },
    { label: 'En revisión', href: '/revision' },
    { label: 'Historial', href: '/historial' },
    { label: 'Reportes', href: '/reportes' }
  ]
};

export const UserBanner = ({
  role,
  name,
  description,
  onNavigate,
  currentView,
  notifications = [],
  onReadNotification,
  onOpenNotification,
}: UserBannerProps) => {
  const currentLinks = navLinksByRole[role] || [];
  const unreadNotifications = notifications.filter((notification) => !notification.readAt);
  const unreadCount = unreadNotifications.length;
  const recentNotifications = unreadNotifications.slice(0, 5);

  return (
    <div className="w-full min-h-[70px] bg-brand-Verde_oscuro text-brand-Blanco px-4 sm:px-6 shadow-md z-40 relative">

      <div className="max-w-[1250px] mx-auto min-h-[70px] py-2 flex flex-wrap items-center justify-between gap-3">

        {/* Lado Izquierdo: Botón de Perfil */}
        <button
          onClick={() => {
            if (onNavigate) {
              onNavigate('perfil');
            }
          }}
          className="flex items-center gap-3 h-full hover:bg-brand-Verde_oscuro/30 px-3 -ml-3 rounded-md transition-colors duration-200 cursor-pointer group text-left"
          aria-label={`Abrir perfil de ${name}`}
          title="Ver mi perfil y cambiar contraseña"
        >
          <div className="w-10 h-10 rounded-full border-2 border-brand-Blanco flex items-center justify-center bg-brand-Blanco/10 group-hover:bg-brand-Blanco/20 transition-colors shrink-0">
            <User size={20} strokeWidth={2.5} className="text-brand-Blanco" />
          </div>

          <div className="flex flex-col justify-center">
            <span className="font-title text-sm font-bold leading-tight underline-offset-4 group-hover:underline">
              {name}
            </span>
            {description && (
              <span className="font-body text-xs text-brand-Blanco/80 leading-tight mt-0.5">
                {description}
              </span>
            )}
          </div>
        </button>

        {/* Lado Derecho: Enlaces Dinámicos */}
        <nav className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2 min-h-10" aria-label="Navegación principal">
          {currentLinks.map((link) => {
            const viewName = link.href.replace('/', '');
            let isActive = currentView === viewName;

            // Caso especial: si estamos en el formulario de un indicador, la sección 'Indicadores' debe aparecer activa.
            if (viewName === 'indicadores' && currentView === 'indicator-form') {
              isActive = true;
            }

            return (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault();
                    onNavigate(viewName);
                  }
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`min-h-10 flex items-center font-title text-sm font-semibold text-brand-Blanco underline-offset-4 transition-all ${isActive ? 'underline' : 'hover:underline'}`}
              >
                {link.label}
              </a>
            );
          })}
          <details className="relative">
            <summary className="list-none min-h-10 flex items-center gap-1 cursor-pointer rounded-md px-2 hover:bg-brand-Blanco/10" aria-label="Notificaciones">
              <Bell size={18} aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="min-w-5 rounded-full bg-brand-Status_rojo px-1.5 py-0.5 text-center text-[10px] font-bold text-brand-Blanco">
                  {unreadCount}
                </span>
              )}
            </summary>
            <div className="absolute right-0 top-11 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-md border border-brand-Gris_bajo/30 bg-brand-Blanco p-3 text-brand-Gris_oscuro shadow-lg">
              <p className="mb-2 font-title text-sm font-bold">Notificaciones</p>
              {recentNotifications.length === 0 ? (
                <p className="font-body text-xs text-brand-Gris_oscuro/70">Sin novedades.</p>
              ) : (
                <ul className="space-y-2">
                  {recentNotifications.map((notification) => (
                    <li key={notification.id} className="rounded border border-brand-Gris_bajo/30 p-2 transition-colors hover:border-brand-Verde_oscuro/50 hover:bg-brand-Fondo">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.currentTarget.closest('details')?.removeAttribute('open');
                          onOpenNotification?.(notification);
                        }}
                        disabled={!onOpenNotification}
                        className="group w-full text-left disabled:cursor-default"
                        aria-label={`Abrir notificación: ${notification.mensaje}`}
                      >
                        <p className="font-body text-xs leading-snug">{notification.mensaje}</p>
                        <span className="mt-1 inline-flex items-center gap-1 font-accent text-[10px] font-bold text-brand-Verde_oscuro group-hover:underline">
                          {notification.captureId ? 'Ver captura' : 'Ver indicadores'}
                          <ArrowRight size={12} aria-hidden="true" />
                        </span>
                      </button>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="font-accent text-[10px] text-brand-Gris_oscuro/60">
                          {new Date(notification.createdAt).toLocaleString('es-MX')}
                        </span>
                        {!notification.readAt && (
                          <button
                            type="button"
                            onClick={() => onReadNotification?.(notification.id)}
                            className="font-accent text-[10px] font-bold text-brand-Verde_oscuro underline-offset-2 hover:underline"
                          >
                            Marcar leída
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        </nav>

      </div>
    </div>
  );
};
