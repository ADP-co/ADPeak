import { useState } from 'react';
import { Search, PlusCircle, Trash2, Lock, Unlock, X } from 'lucide-react';

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

// Opciones de prueba para los selects en el modal
const MOCK_PLANTELES = ['-', ...Array.from({ length: 37 }, (_, i) => `Bach. ${i + 1}`)];
const MOCK_INDICADORES = [
  '-',
  '1.0.0.0.2',
  '1.1.0.0.1',
  '1.1.1.0.1',
  '1.1.1.1.1',
  '1.1.2.0.1',
  '1.1.2.0.3',
  '1.1.2.1.1',
  '1.1.2.1.3',
  '1.1.2.1.4',
  '1.1.2.2.1',
  '1.1.2.2.5',
  '1.1.2.2.8',
];

export const UsersTable = () => {
  // Datos de prueba basados
  const [users, setUsers] = useState<UserRecord[]>([
    { id: '1', name: 'Director', role: 'Administrador', plantel: '-', indicadores: '-' },
    { id: '2', name: 'Subdirector', role: 'Administrador', plantel: '-', indicadores: '-' },
    { id: '3', name: 'Angél Ordóñez', role: 'Responsable', plantel: '-', indicadores: '1.1.0.0.1' },
    { id: '4', name: 'Usuario', role: 'Responsable', plantel: '-', indicadores: '1.0.0.0.2' },
    { id: '5', name: 'Usuario', role: 'Responsable', plantel: '-', indicadores: '1.1.2.0.1' },
    { id: '6', name: 'Bach. 16', role: 'Plantel', plantel: 'Bach. 16', indicadores: '-' },
    { id: '7', name: 'Bach. 33', role: 'Plantel', plantel: 'Bach. 33', indicadores: '-' },
  ]);

  // Estados para la búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

  const handleAddUser = () => {
    const newUser: UserRecord = {
      id: `local-${Date.now()}`,
      name: '',
      role: 'Plantel',
      plantel: '-',
      indicadores: '-',
    };

    setEditingUser(newUser);
    setStatusMessage('');
  };

  const handleEditUser = (user: UserRecord) => {
    setEditingUser(user);
    setStatusMessage('');
  };

  const saveEditedUser = () => {
    if (!editingUser) return;
    
    const isNew = !users.some((u) => u.id === editingUser.id);
    setUsers((current) => {
      if (isNew) {
        return [...current, editingUser];
      }
      return current.map((user) => (user.id === editingUser.id ? editingUser : user));
    });
    
    setEditingUser(null);
    setStatusMessage(`Usuario ${editingUser.name || 'nuevo'} ${isNew ? 'agregado' : 'actualizado'} correctamente.`);
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

  // Mapa de prioridades para el ordenamiento de roles
  const rolePriority: Record<SystemRole, number> = {
    'Administrador': 1,
    'Responsable': 2,
    'Plantel': 3,
  };

  // Filtrar usuarios por nombre, rol o plantel
  const filteredUsers = users
    .filter((user) =>
      user.name.toLowerCase().includes(activeSearch.toLowerCase()) ||
      user.role.toLowerCase().includes(activeSearch.toLowerCase()) ||
      user.plantel.toLowerCase().includes(activeSearch.toLowerCase())
    )
    .sort((a, b) => {
      if (rolePriority[a.role] !== rolePriority[b.role]) {
        return rolePriority[a.role] - rolePriority[b.role];
      }
      return a.plantel.localeCompare(b.plantel, undefined, { numeric: true });
    });

  const isCreatingUser = editingUser && !users.some((u) => u.id === editingUser.id);

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
              placeholder="Buscar por nombre, rol o plantel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setActiveSearch(searchTerm)}
              className="w-full h-9 pl-4 pr-4 rounded-full border border-brand-Gris_bajo/50 focus:outline-none focus:border-brand-Verde_principal text-sm text-brand-Gris_oscuro"
            />
            <button
              onClick={() => setActiveSearch(searchTerm)}
              className="h-9 flex items-center justify-center bg-brand-Verde_oscuro text-brand-Blanco px-4 rounded-full hover:bg-brand-Verde_principal transition-colors shrink-0"
            >
              <Search size={18} />
            </button>
          </div>

          {/* Botón Agregar */}
          <button
            onClick={handleAddUser}
            className="h-9 flex items-center gap-2 bg-brand-Verde_oscuro text-brand-Blanco px-5 rounded-full font-bold text-sm hover:bg-brand-Verde_principal transition-colors"
          >
            Agregar
            <PlusCircle size={18} strokeWidth={2.5} />
          </button>
        </div>

        {statusMessage && (
          <p className="text-sm font-body font-semibold text-brand-Verde_oscuro">
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
                 <th className="py-4 px-6 w-[25%]">Usuario</th>
                <th className="py-4 px-6 w-[25%]">Rol</th>
                <th className="py-4 px-6 w-[25%]">Indicadores</th>
                <th className="py-4 px-6 w-[25%]">Acciones</th>
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
                  <td className="py-4 px-6 text-center font-mono font-medium text-brand-Gris_oscuro/80">
                    {user.indicadores === '-' || !user.indicadores ? (
                      '-'
                    ) : (
                      <div className="flex flex-col gap-1 items-center justify-center">
                        {user.indicadores.split(',').map(i => i.trim()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map((ind, idx) => (
                          <span key={idx} className="bg-brand-Gris_bajo/10 px-2 py-0.5 rounded text-xs">
                            {ind}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Botones de Acción */}
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="px-6 py-1 rounded-full border border-brand-Verde_oscuro text-brand-Verde_oscuro font-bold text-sm hover:bg-brand-Verde_oscuro hover:text-brand-Blanco transition-colors w-[120px]"
                      >
                        Modificar
                      </button>

                      {/* Controles restringidos: Administradores no tienen botón de eliminar ni bloquear */}
                      {user.role !== 'Administrador' && (
                        <>
                          <button
                            onClick={() => toggleBlockUser(user.id)}
                            className={`transition-colors p-1 rounded-md cursor-pointer ${user.isBlocked ? 'text-brand-Status_rojo hover:bg-brand-Status_rojo/10' : 'text-brand-Verde_oscuro hover:text-brand-Status_amarillo hover:bg-brand-Status_amarillo/10'}`}
                            title={user.isBlocked ? "Desbloquear usuario" : "Bloquear usuario"}
                          >
                            {user.isBlocked ? <Lock size={20} /> : <Unlock size={20} />}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
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
            </tbody>

          </table>
        </div>
      </div>

      {/* Modal de Edición de Usuario */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-Gris_oscuro/60 backdrop-blur-sm p-4">
          <div className="bg-brand-Blanco rounded-lg shadow-xl p-6 w-full max-w-md border border-brand-Gris_bajo/20">
            <h2 className="text-xl font-title font-bold text-brand-Gris_oscuro mb-6">
              {isCreatingUser ? 'Agregar Usuario' : 'Modificar Usuario'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-brand-Gris_oscuro font-body mb-1">Nombre</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  disabled={editingUser.role === 'Plantel'}
                  placeholder={editingUser.role === 'Plantel' ? 'El nombre se asigna automáticamente' : ''}
                  className="w-full h-10 rounded-md border border-brand-Gris_bajo/50 px-3 text-sm text-brand-Gris_oscuro outline-none focus:border-brand-Verde_principal focus:ring-1 focus:ring-brand-Verde_principal bg-brand-Blanco disabled:bg-brand-Gris_bajo/10 disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-brand-Gris_oscuro font-body mb-1">Rol</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => {
                    const newRole = e.target.value as SystemRole;
                    const newPlantel = newRole === 'Plantel' ? editingUser.plantel : '-';
                    setEditingUser({ 
                      ...editingUser, 
                      role: newRole,
                      plantel: newPlantel,
                      indicadores: newRole === 'Responsable' ? editingUser.indicadores : '-',
                      name: newRole === 'Plantel' 
                        ? (newPlantel === '-' ? '' : newPlantel) 
                        : (editingUser.role === 'Plantel' ? '' : editingUser.name)
                    });
                  }}
                  className="w-full h-10 rounded-md border border-brand-Gris_bajo/50 px-3 text-sm text-brand-Gris_oscuro outline-none focus:border-brand-Verde_principal focus:ring-1 focus:ring-brand-Verde_principal bg-brand-Blanco"
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Responsable">Responsable</option>
                  <option value="Plantel">Plantel</option>
                </select>
              </div>
              {editingUser.role === 'Plantel' && (
                <div>
                  <label className="block text-sm font-semibold text-brand-Gris_oscuro font-body mb-1">Plantel</label>
                  <select
                    value={editingUser.plantel}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingUser({ 
                        ...editingUser, 
                        plantel: val,
                        name: val === '-' ? '' : val
                      });
                    }}
                    className="w-full h-10 rounded-md border border-brand-Gris_bajo/50 px-3 text-sm text-brand-Gris_oscuro outline-none focus:border-brand-Verde_principal focus:ring-1 focus:ring-brand-Verde_principal bg-brand-Blanco"
                  >
                    {MOCK_PLANTELES.map(plantel => (
                      <option key={plantel} value={plantel}>{plantel === '-' ? 'Sin asignar (-)' : plantel}</option>
                    ))}
                  </select>
                </div>
              )}
              {editingUser.role === 'Responsable' && (
                <div>
                  <label className="block text-sm font-semibold text-brand-Gris_oscuro font-body mb-1">Indicadores Asignados</label>
                  {(() => {
                    const assignedList = editingUser.indicadores === '-' || !editingUser.indicadores 
                      ? [] 
                      : editingUser.indicadores.split(',').map(i => i.trim()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                    
                    return (
                      <>
                        <select
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val && !assignedList.includes(val)) {
                              const newList = [...assignedList, val].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                              setEditingUser({ ...editingUser, indicadores: newList.join(', ') });
                            }
                          }}
                          className="w-full h-10 rounded-md border border-brand-Gris_bajo/50 px-3 text-sm text-brand-Gris_oscuro outline-none focus:border-brand-Verde_principal focus:ring-1 focus:ring-brand-Verde_principal bg-brand-Blanco mb-3"
                        >
                          <option value="" disabled hidden>Seleccione para agregar...</option>
                          {MOCK_INDICADORES.filter(ind => ind !== '-' && !assignedList.includes(ind)).map(indicador => (
                            <option key={indicador} value={indicador}>{indicador}</option>
                          ))}
                        </select>
                        
                        <div className="flex flex-wrap gap-2 p-3 bg-brand-Gris_bajo/5 rounded-md border border-brand-Gris_bajo/20 min-h-[50px] items-center">
                          {assignedList.length > 0 ? (
                            assignedList.map(indicador => (
                              <span key={indicador} className="flex items-center gap-1.5 bg-brand-Verde_oscuro text-brand-Blanco px-2.5 py-1 rounded-full text-xs font-accent font-semibold shadow-sm">
                                {indicador}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newList = assignedList.filter(ind => ind !== indicador);
                                    setEditingUser({ ...editingUser, indicadores: newList.length > 0 ? newList.join(', ') : '-' });
                                  }}
                                  className="hover:text-brand-Status_rojo transition-colors p-0.5 rounded-full hover:bg-brand-Blanco/20 cursor-pointer"
                                >
                                  <X size={12} strokeWidth={3} />
                                </button>
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-brand-Gris_oscuro/50 font-body italic w-full text-center">Sin indicadores asignados</span>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setEditingUser(null)}
                className="px-5 py-2 rounded-md border border-brand-Gris_bajo/50 text-brand-Gris_oscuro text-sm font-bold hover:bg-brand-Gris_bajo/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveEditedUser}
                disabled={!editingUser.name.trim()}
                className="px-5 py-2 rounded-md bg-brand-Verde_oscuro text-brand-Blanco text-sm font-bold hover:bg-brand-Verde_principal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
