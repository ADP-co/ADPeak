import { useId, useState } from 'react';
import { ArrowLeft, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from './Button';

interface PasswordFieldProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  error?: string;
}

const PasswordField = ({
  label,
  placeholder = 'Escribe aquí',
  value,
  onChange,
  autoComplete,
  error,
}: PasswordFieldProps) => {
  // Estado para alternar entre texto visible y oculto
  const [showPassword, setShowPassword] = useState(false);
  const inputId = useId();

  return (
    <div className="flex flex-col gap-1 w-full">
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
          className="w-full h-10 pl-3 pr-12 rounded-md border border-brand-Gris_bajo/50 focus:outline-none focus:border-brand-Verde_oscuro focus:ring-1 focus:ring-brand-Verde_oscuro font-body text-sm text-brand-Gris_oscuro bg-brand-Blanco transition-colors"
        />
        {/* Botón del ojito posicionado de forma absoluta a la derecha */}
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? `Ocultar ${label}` : `Mostrar ${label}`}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-brand-Gris_oscuro hover:text-brand-Verde_oscuro transition-colors cursor-pointer"
        >
          {showPassword ? <Eye size={20} strokeWidth={2} /> : <EyeOff size={20} strokeWidth={2} />}
        </button>
      </div>
      {error && (
        <span className="text-xs font-body font-semibold text-brand-Status_rojo">
          {error}
        </span>
      )}
    </div>
  );
};

// --- PANTALLA PRINCIPAL DE PERFIL ---
interface AccountProfileProps {
  onBack?: () => void; // Función para regresar a la pantalla anterior
}

export const AccountProfile = ({ onBack }: AccountProfileProps) => {
  // Extraemos los datos del usuario logeado desde el AuthContext
  const { user } = useAuth();
  const [saveMessage, setSaveMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSavePassword = () => {
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

    setPasswordError('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSaveMessage('Contraseña actualizada.');
  };

  return (
    <div className="w-full max-w-[900px] mx-auto pt-8 pb-10">

      {/* Cabecera: Título y Botón de Regresar */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-title text-3xl font-bold text-brand-Gris_oscuro">
          Cuenta
        </h1>
        <button
          type="button"
          onClick={onBack}
          aria-label="Regresar"
          className="text-brand-Verde_oscuro hover:bg-brand-Verde_oscuro/10 p-2 rounded-full transition-colors cursor-pointer"
          title="Regresar"
        >
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
      </div>

      {/* Tarjeta Principal Blanca */}
      <div className="bg-brand-Blanco rounded-lg shadow-md border border-brand-Gris_bajo/20 p-8 md:p-10 flex flex-col md:flex-row gap-10">

        {/* --- LADO IZQUIERDO: Identidad del Usuario --- */}
        <div className="flex flex-col items-center justify-center md:w-[35%] md:border-r border-brand-Gris_bajo/20 md:pr-10">

          {/* Avatar (Círculo con icono) */}
          <div className="w-36 h-36 rounded-full flex items-center justify-center bg-brand-Gris_bajo/10 text-brand-Verde_oscuro mb-6">
            <User size={80} strokeWidth={2} />
          </div>

          {/* Nombre extraído del Contexto */}
          <h2 className="font-title text-xl font-bold text-brand-Gris_oscuro text-center">
            {user?.name || 'Nombre de Usuario'}
          </h2>

          {/* Descripción/Rol extraído del Contexto */}
          <p className="font-body text-base text-brand-Gris_oscuro/70 text-center mt-1">
            {user?.description || 'Descripción'}
          </p>
        </div>

        {/* --- LADO DERECHO: Formulario de Seguridad --- */}
        <div className="flex-1 flex flex-col gap-6">

          {/* Campo Especial de Usuario (Solo Lectura) */}
          <div className="flex flex-col gap-1 w-full">
            <label className="font-title text-sm font-bold text-brand-Gris_oscuro">
              Usuario
            </label>
            <div className="w-full h-10 px-3 rounded-md bg-brand-Verde_principal/15 flex items-center">
              <span className="font-body text-sm font-bold text-brand-Verde_oscuro">
                {user?.username || user?.name || 'Nombre de Usuario'}
              </span>
            </div>
          </div>

          {/* Bloque de Contraseñas usando el Micro-componente */}
          <div className="flex flex-col gap-5 mt-2">
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
              error={passwordError && newPassword !== confirmPassword ? passwordError : undefined}
            />
            <PasswordField
              label="Confirmar Nueva Contraseña"
              placeholder="Repite la nueva contraseña"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />
            {passwordError && newPassword === confirmPassword && (
              <p className="text-xs font-body font-semibold text-brand-Status_rojo">
                {passwordError}
              </p>
            )}
          </div>

          {/* Botón de Guardar */}
          {saveMessage && (
            <p className="text-sm font-body font-semibold text-brand-Verde_oscuro text-right">
              {saveMessage}
            </p>
          )}

          <div className="mt-4 flex justify-end">
            <Button variant="primary" onClick={handleSavePassword} className="text-sm px-8 py-2.5">
              Guardar Contraseña
            </Button>
          </div>

        </div>

      </div>
    </div>
  );
};
