import { useState } from 'react';
import { Search, PlusCircle, Trash2, Lock, Unlock } from 'lucide-react';

// Tipado de datos para los usuarios
export type SystemRole = 'Administrador' | 'Responsable' | 'Plantel';

export interface UserRecord {
  id: string;
  name: string;
  role: SystemRole;
  plantel: string;
  indicadores: string;
  isBlocked?: boolean;
}

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export const UsersTable = () => {
  // Datos de prueba basados
  const [users, setUsers] = useState<UserRecord[]>([
    { id: '1', name: 'Director', role: 'Administrador', plantel: '-', indicadores: '-' },
    { id: '2', name: 'Subdirector', role: 'Administrador', plantel: '-', indicadores: '-' },
    { id: '3', name: 'Angél Ordóñez', role: 'Responsable', plantel: '-', indicadores: '1.1.0.0.1' },
    { id: '4', name: 'Usuario', role: 'Responsable', plantel: '-', indicadores: '1.0.0.0.2' },
    { id: '5', name: 'Usuario', role: 'Responsable', plantel: '-', indicadores: '1.1.2.0.1' },
    { id: '6', name: 'Usuario', role: 'Plantel', plantel: 'Bach. 16', indicadores: '-' },
    { id: '7', name: 'Usuario', role: 'Plantel', plantel: 'Bach. 33', indicadores: '-' },
  ]);

  // Estados para la búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const handleAddUser = () => {
    const nextNumber = users.reduce((max, user) => {
      const match = user.plantel.match(/\d+/);
      return match ? Math.max(max, Number(match[0])) : max;
    }, 0) + 1;
    const newUser: UserRecord = {
      id: `local-${Date.now()}`,
      name: `Usuario ${nextNumber}`,
      role: 'Plantel',
      plantel: `Bach. ${nextNumber}`,
      indicadores: '-',
    };

    setUsers((current) => [newUser, ...current]);
    setSearchTerm('');
    setActiveSearch('');
    setStatusMessage(`${newUser.name} agregado a la gestion local.`);
  };

  const handleEditUser = (id: string) => {
    const target = users.find((user) => user.id === id);

    if (!target) {
      return;
    }

    if (target.isBlocked) {
      setStatusMessage('Desbloquea el usuario antes de modificarlo.');
      return;
    }

    if (target.role === 'Administrador') {
      setStatusMessage('Los administradores no tienen plantel ni indicadores asignados.');
      return;
    }

    setUsers((current) =>
      current.map((user) =>
        user.id === id
          ? user.role === 'Responsable'
            ? {
                ...user,
                indicadores: user.indicadores === '-' ? '1.0.0.0.2' : user.indicadores,
              }
            : {
                ...user,
                plantel: user.plantel === '-' ? 'Bach. 16' : user.plantel,
                indicadores: '-',
              }
          : user
      )
    );
    setStatusMessage(
      target.role === 'Responsable'
        ? 'Asignacion de indicadores verificada para responsable.'
        : 'Asignacion de plantel verificada para usuario plantel.'
    );
  };

  const handleDeleteUser = (user: UserRecord) => {
    setUsers((current) => current.filter((item) => item.id !== user.id));
    setStatusMessage(`${user.name} eliminado de la vista.`);
  };

  // Función para bloquear o desbloquear un usuario
  const toggleBlockUser = (id: string) => {
    const target = users.find((user) => user.id === id);

    setUsers((current) => current.map(user =>
      user.id === id ? { ...user, isBlocked: !user.isBlocked } : user
    ));
    setStatusMessage(target?.isBlocked ? 'Usuario desbloqueado.' : 'Usuario bloqueado.');
  };

  // Filtrar usuarios por nombre, rol, plantel, indicadores o estado
  const normalizedSearch = normalizeSearch(activeSearch);
  const filteredUsers = users.filter((user) => {
    if (!normalizedSearch) {
      return true;
    }

    return [
      user.name,
      user.role,
      user.plantel,
      user.indicadores,
      user.isBlocked ? 'bloqueado' : 'activo',
    ].some((value) => normalizeSearch(value).includes(normalizedSearch));
  });

  return (
    <div className="w-full max-w-[1250px] mx-auto pt-8 pb-10">

      {/* Encabezado y filtros */}
      <div className="flex flex-col gap-4 mb-6">

        {/* Título */}
        <h1 className="font-title text-3xl font-bold text-brand-Gris_oscuro">
          Gestión de Usuarios
        </h1>

        {/* Controles */}
        <div className="flex flex-wrap items-center justify-between gap-4 w-full">

          {/* Barra de Búsqueda */}
          <div className="flex items-center gap-2 w-full max-w-xl">
            <input
              type="text"
              aria-label="Filtro de usuarios por nombre, rol, plantel, indicador o estado"
              placeholder="Buscar por nombre, rol, plantel, indicador o estado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setActiveSearch(searchTerm.trim())}
              className="w-full h-9 pl-4 pr-4 rounded-full border border-brand-Gris_bajo/50 focus:outline-none focus:border-brand-Verde_principal text-sm text-brand-Gris_oscuro"
            />
            <button
              type="button"
              onClick={() => setActiveSearch(searchTerm.trim())}
              aria-label="Buscar usuarios"
              className="h-9 flex items-center justify-center bg-brand-Verde_oscuro text-brand-Blanco px-4 rounded-full hover:bg-brand-Verde_principal transition-colors shrink-0"
            >
              <Search size={18} />
            </button>
          </div>

          {/* Botón Agregar */}
          <button
            type="button"
            onClick={handleAddUser}
            aria-label="Agregar usuario"
            className="h-9 flex items-center gap-2 bg-brand-Verde_oscuro text-brand-Blanco px-5 rounded-full font-bold text-sm hover:bg-brand-Verde_principal transition-colors"
          >
            Agregar
            <PlusCircle size={18} strokeWidth={2.5} />
          </button>
        </div>

        {statusMessage && (
          <p className="text-sm font-body font-semibold text-brand-Verde_oscuro" role="status">
            {statusMessage}
          </p>
        )}

      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-brand-Blanco rounded-lg shadow-md overflow-hidden border border-brand-Gris_bajo/20">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-center">

            {/* Cabecera */}
            <thead>
              <tr className="bg-brand-Gris_bajo/35 text-brand-Gris_oscuro font-title font-bold text-sm select-none border-b border-brand-Gris_bajo/20">
                <th className="py-4 px-6 w-[18%]">Usuario</th>
                <th className="py-4 px-6 w-[17%]">Rol</th>
                <th className="py-4 px-6 w-[17%]">Plantel</th>
                <th className="py-4 px-6 w-[20%]">Indicadores</th>
                <th className="py-4 px-6 w-[13%]">Estado</th>
                <th className="py-4 px-6 w-[15%]">Acciones</th>
              </tr>
            </thead>

            {/* Cuerpo */}
            <tbody className="divide-y divide-brand-Gris_bajo/20 font-body text-sm text-brand-Gris_oscuro">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-brand-Gris_bajo/15 transition-colors duration-150 ease-in-out"
                >
                  <td className="py-4 px-6 font-medium leading-relaxed pr-8 text-brand-Gris_oscuro">{user.name}</td>
                  <td className="py-4 px-6 font-medium leading-relaxed pr-8 text-brand-Gris_oscuro/80">{user.role}</td>
                  <td className="py-4 px-6 font-medium text-brand-Verde_oscuro">{user.plantel}</td>
                  <td className="py-4 px-6 text-center font-mono font-medium text-brand-Gris_oscuro/80">{user.indicadores}</td>
                  <td className="py-4 px-6">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${user.isBlocked ? 'bg-brand-Status_rojo/10 text-brand-Status_rojo' : 'bg-brand-Status_verde/20 text-brand-Verde_oscuro'}`}>
                      {user.isBlocked ? 'Bloqueado' : 'Activo'}
                    </span>
                  </td>

                  {/* Botones de Acción */}
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleEditUser(user.id)}
                        disabled={user.isBlocked}
                        aria-label={`Modificar usuario ${user.name}`}
                        className="px-6 py-1 rounded-full border border-brand-Verde_oscuro text-brand-Verde_oscuro font-bold text-sm hover:bg-brand-Verde_oscuro hover:text-brand-Blanco transition-colors w-[120px] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-brand-Verde_oscuro"
                      >
                        Modificar
                      </button>

                      {/* Controles restringidos: Administradores no tienen botón de eliminar ni bloquear */}
                      {user.role !== 'Administrador' && (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleBlockUser(user.id)}
                            aria-label={user.isBlocked ? `Desbloquear usuario ${user.name}` : `Bloquear usuario ${user.name}`}
                            className={`transition-colors p-1 rounded-md cursor-pointer ${user.isBlocked ? 'text-brand-Status_rojo hover:bg-brand-Status_rojo/10' : 'text-brand-Verde_oscuro hover:text-brand-Status_amarillo hover:bg-brand-Status_amarillo/10'}`}
                            title={user.isBlocked ? "Desbloquear usuario" : "Bloquear usuario"}
                          >
                            {user.isBlocked ? <Lock size={20} /> : <Unlock size={20} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            aria-label={`Eliminar usuario ${user.name}`}
                            className="text-brand-Verde_oscuro hover:text-brand-Status_rojo transition-colors p-1 rounded-md hover:bg-brand-Status_rojo/10 cursor-pointer"
                            title="Eliminar usuario"
                          >
                            <Trash2 size={20} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 px-6 text-center text-brand-Gris_oscuro/70">
                    Sin resultados para la busqueda actual.
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      </div>

    </div>
  );
};
