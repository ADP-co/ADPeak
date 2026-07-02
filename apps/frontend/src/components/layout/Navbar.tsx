import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LogoUdec from '../../assets/logo-udec.svg';

export const Navbar = () => {
  const { logout } = useAuth();
  const handleLogout = () => {
    if (window.confirm('¿Deseas cerrar la sesión actual?')) {
      logout();
    }
  };

  return (
    // Fondo
    <header className="w-full h-[60px] bg-brand-Blanco border-b border-brand-Gris_bajo/30 z-50 sticky top-0 shadow-xs px-6">

      {/* Este contenedor interno que limita el contenido a 1250px y lo centra */}
      <div className="max-w-[1250px] mx-auto h-full flex items-center justify-between relative">

        {/* Extremo Izquierdo: Logo */}
        <div className="flex items-center h-full py-2">
          <img
            src={LogoUdec}
            alt="Universidad de Colima"
            className="h-full w-auto object-contain"
          />
        </div>

        {/* Centro: Siglas del Sistema */}
        <div className="absolute left-1/2 -translate-x-1/2 text-center">
          <span className="font-title font-bold text-brand-Gris_oscuro text-base tracking-wider md:text-lg">
            SIGI-POA
          </span>
        </div>

        {/* Extremo Derecho: Botón de Cerrar Sesión */}
        <div className="flex items-center">
          <button
            onClick={handleLogout}
            className="min-h-11 min-w-11 p-2 text-brand-Gris_oscuro hover:text-brand-Status_rojo transition-colors duration-200 rounded-md hover:bg-brand-Fondo cursor-pointer flex items-center justify-center"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut size={22} strokeWidth={2} />
          </button>
        </div>

      </div>
    </header>
  );
};
