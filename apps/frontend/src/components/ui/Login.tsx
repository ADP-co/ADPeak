import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from './Button';
import { Input } from './Input';
import UDCBanner from '../../assets/Ucol_Banner.jpg';
import LogoUdec from '../../assets/logo-udec-blanco.svg';
import MediaSuperiorLogo from '../../assets/MediaSuperior_Blanco.png';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'admin' | 'plantel' | 'responsable'>('admin');

  useEffect(() => {
    const normalizedUsername = username.trim().toLowerCase();

    if (normalizedUsername.includes('plantel') || normalizedUsername.includes('bach')) {
      setRole('plantel');
      return;
    }

    if (normalizedUsername.includes('responsable')) {
      setRole('responsable');
      return;
    }

    if (normalizedUsername.includes('admin') || normalizedUsername.includes('director')) {
      setRole('admin');
    }
  }, [username]);

  const roleProfiles = {
    admin: {
      description: 'Administrador',
      redirectTo: '/analisis'
    },
    plantel: {
      description: 'Plantel',
      redirectTo: '/indicadores'
    },
    responsable: {
      description: 'Responsable de indicador',
      redirectTo: '/revision'
    },
  } as const;
  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    const selectedProfile = roleProfiles[role];

    login({
      id: '1',
      name: username || 'Prueba',
      role,
      description: selectedProfile.description
    });
    navigate(selectedProfile.redirectTo);
  };

  return (
    <div
      className="min-h-screen flex flex-col p-6 md:p-10 relative"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${UDCBanner})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Cabecera superior con Logo y Título */}
      <div className="w-full flex flex-col gap-6 md:gap-8">
        {/* Contenedor de los Logos */}
        <div className="w-full flex items-center justify-between">
          <img
            src={LogoUdec}
            alt="Logo UdeC"
            className="h-14 md:h-18 w-auto drop-shadow-md shrink-0"
          />
          <img
            src={MediaSuperiorLogo}
            alt="Media Superior"
            className="h-6 md:h-10 w-auto drop-shadow-md shrink-0"
          />
        </div>
        {/* Título principal */}
        <div className="w-full flex justify-center">
          <h1 className="font-title text-3xl md:text-4xl lg:text-5xl text-brand-Blanco font-bold text-center drop-shadow-lg leading-tight max-w-4xl">
            Sistema Interno de Gestión de Indicadores
          </h1>
        </div>
      </div>

      {/* Tarjeta de Inicio de Sesión */}
      <div className="flex-1 flex items-center justify-center w-full mt-10 md:mt-16">
        <div className="max-w-md w-full bg-brand-Blanco rounded-lg shadow-xl p-8 border border-brand-Gris_bajo/20">
          <h2 className="text-2xl font-title font-bold text-brand-Gris_oscuro mb-6 text-center">
          Iniciar Sesión
        </h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Usuario"
            placeholder="Ingrese su usuario..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="Ingrese su contraseña..."
          />
          <Button type="submit" className="w-full mt-4">
            Ingresar
          </Button>
        </form>
      </div>
    </div>
    </div>
  );
};
