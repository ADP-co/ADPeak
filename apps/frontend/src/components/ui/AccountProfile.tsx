import { useId, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, User } from 'lucide-react';
import { updatePassword } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { Button } from './Button';

interface PasswordFieldProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
}

const PasswordField = ({
  label,
  placeholder = 'Escribe aquí',
  value,
  onChange,
  autoComplete,
}: PasswordFieldProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = useId();

  return (
    <div className="flex w-full flex-col gap-1">
      <label htmlFor={inputId} className="font-title text-sm font-bold text-brand-Gris_oscuro">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={showPassword ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="h-10 w-full rounded-md border border-brand-Gris_bajo/50 bg-brand-Blanco pl-3 pr-12 font-body text-sm text-brand-Gris_oscuro transition-colors focus:border-brand-Verde_oscuro focus:outline-none focus:ring-1 focus:ring-brand-Verde_oscuro"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? `Ocultar ${label}` : `Mostrar ${label}`}
          className="absolute right-1 top-1/2 -translate-y-1/2 cursor-pointer p-2 text-brand-Gris_oscuro transition-colors hover:text-brand-Verde_oscuro"
        >
          {showPassword ? <Eye size={20} strokeWidth={2} /> : <EyeOff size={20} strokeWidth={2} />}
        </button>
      </div>
    </div>
  );
};

interface AccountProfileProps {
  onBack?: () => void;
}

export const AccountProfile = ({ onBack }: AccountProfileProps) => {
  const { user } = useAuth();
  const [saveMessage, setSaveMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handleSavePassword = async () => {
    setSaveMessage('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Completa los tres campos de contraseña.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('La confirmación no coincide con la nueva contraseña.');
      return;
    }

    try {
      setIsSavingPassword(true);
      await updatePassword(currentPassword, newPassword, confirmPassword);
      setPasswordError('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSaveMessage('Contraseña actualizada.');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'No se pudo actualizar la contraseña.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[900px] pb-10 pt-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-title text-3xl font-bold text-brand-Gris_oscuro">Cuenta</h1>
        <button
          type="button"
          onClick={onBack}
          aria-label="Regresar"
          className="cursor-pointer rounded-full p-2 text-brand-Verde_oscuro transition-colors hover:bg-brand-Verde_oscuro/10"
          title="Regresar"
        >
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex flex-col gap-10 rounded-lg border border-brand-Gris_bajo/20 bg-brand-Blanco p-8 shadow-md md:flex-row md:p-10">
        <div className="flex flex-col items-center justify-center border-brand-Gris_bajo/20 md:w-[35%] md:border-r md:pr-10">
          <div className="mb-6 flex h-36 w-36 items-center justify-center rounded-full bg-brand-Gris_bajo/10 text-brand-Verde_oscuro">
            <User size={80} strokeWidth={2} />
          </div>
          <h2 className="text-center font-title text-xl font-bold text-brand-Gris_oscuro">
            {user?.name || 'Nombre de Usuario'}
          </h2>
          <p className="mt-1 text-center font-body text-base text-brand-Gris_oscuro/70">
            {user?.description || 'Descripción'}
          </p>
        </div>

        <div className="flex flex-1 flex-col gap-6">
          <div className="flex w-full flex-col gap-1">
            <label className="font-title text-sm font-bold text-brand-Gris_oscuro">Usuario</label>
            <div className="flex h-10 w-full items-center rounded-md bg-brand-Verde_principal/15 px-3">
              <span className="font-body text-sm font-bold text-brand-Verde_oscuro">
                {user?.username || user?.name || 'Nombre de Usuario'}
              </span>
            </div>
          </div>

          <div className="mt-2 flex flex-col gap-5">
            <PasswordField
              label="Contraseña"
              placeholder="Escribe tu contraseña actual"
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
            />
            <PasswordField
              label="Nueva Contraseña"
              placeholder="Escribe la nueva contraseña"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
            />
            <PasswordField
              label="Confirmar Nueva Contraseña"
              placeholder="Repite la nueva contraseña"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />
            {passwordError && (
              <p className="text-xs font-semibold text-brand-Status_rojo">{passwordError}</p>
            )}
          </div>

          {saveMessage && (
            <p className="text-right font-body text-sm font-semibold text-brand-Verde_oscuro">{saveMessage}</p>
          )}

          <div className="mt-4 flex justify-end">
            <Button
              variant="primary"
              onClick={() => void handleSavePassword()}
              disabled={isSavingPassword}
              className="px-8 py-2.5 text-sm"
            >
              {isSavingPassword ? 'Guardando' : 'Guardar Contraseña'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
