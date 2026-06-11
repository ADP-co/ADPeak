import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LogoUdec from '../../assets/logo-udec.svg';

export const Navbar = () => {
  const { logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <>
      {/* Fondo */}
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
            onClick={() => setShowLogoutConfirm(true)}
            className="p-2 text-brand-Gris_oscuro hover:text-brand-Status_rojo transition-colors duration-200 rounded-md hover:bg-brand-Fondo cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut size={22} strokeWidth={2} />
          </button>
        </div>

      </div>
    </header>

      {/* Modal de Confirmación de Cierre de Sesión */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-Gris_oscuro/60 backdrop-blur-sm p-4">
          <div className="bg-brand-Blanco rounded-lg shadow-xl p-6 w-full max-w-sm border border-brand-Gris_bajo/20">
            <h2 className="text-xl font-title font-bold text-brand-Gris_oscuro mb-2 text-center">
              Cerrar Sesión
            </h2>
            <p className="text-brand-Gris_oscuro/80 text-sm font-body text-center mb-6">
              ¿Estás seguro de que deseas salir del sistema?
            </p>
            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-5 py-2 rounded-md border border-brand-Gris_bajo/50 text-brand-Gris_oscuro text-sm font-bold hover:bg-brand-Gris_bajo/10 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="px-5 py-2 rounded-md bg-brand-Status_rojo text-brand-Blanco text-sm font-bold hover:bg-brand-Status_rojo/90 transition-colors cursor-pointer"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
