import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LogoUdec from '../../assets/logo-udec.svg';
import { useModalFocusTrap } from '../ui/ConfirmModal';

export const Navbar = () => {
  const { logout } = useAuth();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const closeLogoutDialog = () => setIsLogoutDialogOpen(false);
  const { dialogRef, initialFocusRef } = useModalFocusTrap(
    isLogoutDialogOpen,
    closeLogoutDialog
  );

  return (
    <>
      <header className="w-full h-[60px] bg-brand-Blanco border-b border-brand-Gris_bajo/30 z-50 sticky top-0 shadow-xs px-6">
        <div className="max-w-[1250px] mx-auto h-full flex items-center justify-between relative">
          <div className="flex items-center h-full py-2">
            <img
              src={LogoUdec}
              alt="Universidad de Colima"
              className="h-full w-auto object-contain"
            />
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 text-center">
            <span className="font-title font-bold text-brand-Gris_oscuro text-base tracking-wider md:text-lg">
              SIGI-POA
            </span>
          </div>

          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setIsLogoutDialogOpen(true)}
              className="min-h-12 min-w-[132px] px-4 py-2 text-brand-Gris_oscuro hover:text-brand-Status_rojo transition-colors duration-200 rounded-md hover:bg-brand-Fondo cursor-pointer flex items-center justify-center gap-2 font-accent text-sm font-bold"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut size={22} strokeWidth={2} />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </header>

      {isLogoutDialogOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          role="presentation"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            tabIndex={-1}
            className="w-full max-w-sm rounded-lg border border-brand-Gris_bajo/25 bg-brand-Blanco p-6 shadow-xl"
          >
            <h2 id="logout-dialog-title" className="font-title text-xl font-bold text-brand-Gris_oscuro">
              Cerrar sesión
            </h2>
            <p className="mt-3 font-body text-sm text-brand-Gris_oscuro/75">
              ¿Deseas cerrar la sesión actual?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                ref={initialFocusRef}
                type="button"
                onClick={closeLogoutDialog}
                className="min-h-11 rounded-md border border-brand-Gris_bajo px-5 py-2 font-accent text-sm font-bold text-brand-Gris_oscuro hover:bg-brand-Fondo"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  closeLogoutDialog();
                  logout();
                }}
                className="min-h-11 rounded-md bg-brand-Verde_oscuro px-5 py-2 font-accent text-sm font-bold text-brand-Blanco hover:bg-brand-Verde_principal"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
