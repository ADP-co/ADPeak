import { User } from 'lucide-react';

// Roles del sistema
export type UserRole = 'plantel' | 'admin' | 'responsable';

interface UserBannerProps {
  role: UserRole;
  name: string;          
  description?: string; 
  onNavigate?: (view: string) => void;
  currentView?: string;
}

// Diccionario de enlaces
const navLinksByRole: Record<UserRole, { label: string; href: string }[]> = {
  plantel: [
    { label: 'Indicadores', href: '#indicadores' },
    { label: 'Reportes', href: '#reportes' }
  ],
  admin: [
    { label: 'Análisis', href: '#analisis' },
    { label: 'Indicadores', href: '#indicadores' },
    { label: 'Reportes', href: '#reportes' },
    { label: 'Usuarios', href: '#usuarios' }
  ],
  responsable: [
    { label: 'Revisión', href: '#revision' },
    { label: 'Reportes', href: '#reportes' }
  ]
};

export const UserBanner = ({ role, name, description, onNavigate, currentView }: UserBannerProps) => {
  const currentLinks = navLinksByRole[role] || [];

  return (
    <div className="w-full h-[70px] bg-brand-Verde_oscuro text-brand-Blanco px-6 shadow-md z-40 relative">
      
      <div className="max-w-[1250px] mx-auto h-full flex items-center justify-between">
        
        {/* Lado Izquierdo: Botón de Perfil */}
        <button
          onClick={() => {
            if (onNavigate) {
              onNavigate('perfil');
            }
          }}
          className="flex items-center gap-3 h-full hover:bg-brand-Verde_oscuro/30 px-3 -ml-3 rounded-md transition-colors duration-200 cursor-pointer group text-left"
          title="Ver mi perfil y cambiar contraseña"
        >
          <div className="w-10 h-10 rounded-full border-2 border-brand-Blanco flex items-center justify-center bg-brand-Blanco/10 group-hover:bg-brand-Blanco/20 transition-colors shrink-0">
            <User size={20} strokeWidth={2.5} className="text-brand-Blanco" />
          </div>

          <div className="flex flex-col justify-center">
            <span className="font-title text-sm font-bold leading-tight underline-offset-4 group-hover:underline">
              {name}
            </span>
            {role !== 'plantel' && description && (
              <span className="font-body text-xs text-brand-Blanco/80 leading-tight mt-0.5">
                {description}
              </span>
            )}
          </div>
        </button>

        {/* Lado Derecho: Enlaces Dinámicos */}
        <div className="flex items-center gap-6 h-full">
          {currentLinks.map((link) => {
            const viewName = link.href.replace('#', '');
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
                className={`font-title text-sm font-semibold text-brand-Blanco underline-offset-4 transition-all ${isActive ? 'underline' : 'hover:underline'}`}
              >
                {link.label}
              </a>
            );
          })}
        </div>

      </div>
    </div>
  );
};