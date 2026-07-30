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
      <header className="sticky top-0 z-50 h-16 w-full border-b border-brand-Gris_bajo/30 bg-brand-Blanco px-3 shadow-xs sm:px-6">
        <div className="relative mx-auto flex h-full max-w-[1250px] items-center justify-between gap-3">
          <div className="flex h-full min-w-0 items-center py-2">
            <img
              src={LogoUdec}
              alt="Universidad de Colima"
              className="h-full w-auto max-w-[132px] object-contain sm:max-w-[190px]"
            />
          </div>

          <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 text-center sm:block">
            <span className="font-title font-bold text-brand-Gris_oscuro text-base tracking-wider md:text-lg">
              SIGI-POA
            </span>
          </div>

          <div className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => setIsLogoutDialogOpen(true)}
              className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-2 font-accent text-sm font-bold text-brand-Gris_oscuro transition-colors duration-200 hover:bg-brand-Fondo hover:text-brand-Status_rojo focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal focus-visible:ring-offset-2 sm:min-w-[112px] sm:px-4"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut size={22} strokeWidth={2} />
              <span className="hidden sm:inline">Salir</span>
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
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                ref={initialFocusRef}
                type="button"
                onClick={closeLogoutDialog}
                className="min-h-11 rounded-md border border-brand-Gris_bajo px-5 py-2 font-accent text-sm font-bold text-brand-Gris_oscuro hover:bg-brand-Fondo focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal focus-visible:ring-offset-2"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  closeLogoutDialog();
                  logout();
                }}
                className="min-h-11 rounded-md bg-brand-Verde_oscuro px-5 py-2 font-accent text-sm font-bold text-brand-Blanco hover:bg-brand-Verde_principal focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal focus-visible:ring-offset-2"
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
