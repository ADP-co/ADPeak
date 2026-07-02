import { useEffect, useState } from 'react';
import { KeyRound, Lock, PlusCircle, Search, Trash2, Unlock, X } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { catalogPlanteles, deactivateUser, fetchUsers, resetUserPassword, saveUser, type CatalogUser } from '../../api/catalog';
import { officialCatalogRows } from '../../catalog/officialCatalog.generated';

export type SystemRole = 'Administrador' | 'Responsable' | 'Plantel';

export interface UserRecord {
  id: string;
  username?: string;
  name: string;
  role: SystemRole;
  plantel: string;
  indicadores: string;
  plantelId?: number;
  responsableId?: number;
  isBlocked?: boolean;
  password?: string;
}

const KNOWN_PLANTELES = catalogPlanteles.map((plantel) => ({
  id: plantel.id,
  label: shortPlantelLabel(plantel.name),
  name: plantel.name,
}));
const MOCK_PLANTELES = ['-', ...KNOWN_PLANTELES.map((plantel) => plantel.label)];
const MOCK_INDICADORES = officialCatalogRows
  .filter((indicator) => indicator.classification === 'operational' && indicator.visible)
  .map((indicator) => indicator.code);

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function splitIndicators(value: string) {
  return value === '-' || !value
    ? []
    : value.split(',').map((indicator) => indicator.trim()).filter(Boolean);
}

function shortPlantelLabel(name: string) {
  const numericName = name.match(/\d+/)?.[0];
  return numericName ? `Bach. ${numericName}` : name;
}

const rolePriority: Record<SystemRole, number> = {
  Administrador: 1,
  Responsable: 2,
  Plantel: 3,
};

function roleFromCatalog(role: CatalogUser['role']): SystemRole {
  if (role === 'director') {
    return 'Administrador';
  }

  if (role === 'responsable') {
    return 'Responsable';
  }

  return 'Plantel';
}

function roleToCatalog(role: SystemRole): CatalogUser['role'] {
  if (role === 'Administrador') {
    return 'director';
  }

  if (role === 'Responsable') {
    return 'responsable';
  }

  return 'plantel';
}

function plantelLabelFromId(id?: number) {
  if (!id) {
    return '-';
  }

  return KNOWN_PLANTELES.find((plantel) => plantel.id === id)?.label ?? `Bach. ${id}`;
}

function plantelIdFromLabel(label: string) {
  if (!label || label === '-') {
    return undefined;
  }

  const knownPlantel = KNOWN_PLANTELES.find((plantel) => plantel.label === label);
  if (knownPlantel) {
    return knownPlantel.id;
  }

  const numericId = Number(label.match(/\d+/)?.[0]);
  return Number.isInteger(numericId) && numericId > 0 ? numericId : undefined;
}

function plantelDisplayNameFromLabel(label: string) {
  if (!label || label === '-') {
    return '';
  }

  return KNOWN_PLANTELES.find((plantel) => plantel.label === label)?.name ?? label;
}

function fromCatalogUser(user: CatalogUser): UserRecord {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: roleFromCatalog(user.role),
    plantel: plantelLabelFromId(user.plantelId),
    indicadores: user.indicatorCodes.length > 0 ? user.indicatorCodes.join(', ') : '-',
    plantelId: user.plantelId,
    responsableId: user.responsableId,
    isBlocked: !user.active,
  };
}

function isStatusError(message: string) {
  const normalized = normalizeSearch(message);
  return [
    'no se',
    'define',
    'completa',
    'solo',
    'desbloquea',
    'contrasena',
    'contraseña',
    'error'
  ].some((token) => normalized.includes(token));
}

export const UsersTable = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserRecord | null>(null);
  const [userToToggleBlock, setUserToToggleBlock] = useState<UserRecord | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<UserRecord | null>(null);
  const [passwordResetForm, setPasswordResetForm] = useState({ password: '', confirmPassword: '' });

  useEffect(() => {
    let isMounted = true;

    setIsLoadingUsers(true);
    fetchUsers()
      .then((items) => {
        if (isMounted) {
          setUsers(items.map(fromCatalogUser));
        }
      })
      .catch((error) => {
        if (isMounted) {
          setStatusMessage(error instanceof Error ? error.message : 'No se pudieron cargar los usuarios.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingUsers(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddUser = () => {
    setEditingUser({
      id: `local-${Date.now()}`,
      name: '',
      role: 'Responsable',
      plantel: '-',
      indicadores: '-',
      responsableId: undefined,
      password: '',
    });
    setStatusMessage('');
  };

  const handleEditUser = (user: UserRecord) => {
    if (user.isBlocked) {
      setStatusMessage('Desbloquea el usuario antes de modificarlo.');
      return;
    }

    setEditingUser(user);
    setStatusMessage('');
  };

  const saveEditedUser = async () => {
    if (!editingUser) {
      return;
    }

    const normalizedUser: UserRecord = {
      ...editingUser,
      name: editingUser.role === 'Plantel' ? plantelDisplayNameFromLabel(editingUser.plantel) : editingUser.name.trim(),
      plantel: editingUser.role === 'Plantel' ? editingUser.plantel : '-',
      plantelId: editingUser.role === 'Plantel' ? plantelIdFromLabel(editingUser.plantel) : undefined,
      indicadores: editingUser.role === 'Responsable' ? editingUser.indicadores : '-',
    };

    if (!normalizedUser.name || normalizedUser.name === '-') {
      setStatusMessage('Completa el nombre o plantel del usuario antes de guardar.');
      return;
    }

    const isDuplicatedAdmin = normalizedUser.role === 'Administrador' &&
      users.some((user) => user.role === 'Administrador' && user.id !== normalizedUser.id);

    if (isDuplicatedAdmin) {
      setStatusMessage('Solo puede existir un administrador.');
      return;
    }

    const isNew = !users.some((user) => user.id === normalizedUser.id);
    const initialPassword = normalizedUser.password?.trim() ?? '';

    if (isNew && normalizedUser.role === 'Responsable' && initialPassword.length < 8) {
      setStatusMessage('Define una contraseña inicial de al menos 8 caracteres.');
      return;
    }

    try {
      const saved = await saveUser({
        id: normalizedUser.id.startsWith('local-') ? undefined : normalizedUser.id,
        name: normalizedUser.name,
        role: roleToCatalog(normalizedUser.role),
        plantelId: normalizedUser.role === 'Plantel' ? normalizedUser.plantelId : undefined,
        responsableId: normalizedUser.role === 'Responsable' ? normalizedUser.responsableId : undefined,
        indicatorCodes: splitIndicators(normalizedUser.indicadores),
        active: !normalizedUser.isBlocked,
        password: isNew ? initialPassword : undefined,
      });
      const savedRecord = fromCatalogUser(saved);

      setUsers((current) =>
        isNew
          ? [savedRecord, ...current]
          : current.map((user) => (user.id === normalizedUser.id ? savedRecord : user))
      );
      setEditingUser(null);
      setStatusMessage(isNew ? `Usuario agregado: ${savedRecord.username ?? savedRecord.name}.` : 'Usuario actualizado.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'No se pudo guardar el usuario.');
      return;
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) {
      return;
    }

    try {
      const updated = await deactivateUser(userToDelete.id);

      if (!updated) {
        setStatusMessage('No se encontró el usuario.');
        setUserToDelete(null);
        return;
      }

      const updatedRecord = fromCatalogUser(updated);
      setUsers((current) => current.map((item) => (item.id === userToDelete.id ? updatedRecord : item)));
      setStatusMessage('Usuario desactivado.');
      setUserToDelete(null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'No se pudo desactivar el usuario.');
      setUserToDelete(null);
      return;
    }
  };

  const confirmToggleBlockUser = async () => {
    if (!userToToggleBlock) {
      return;
    }

    try {
      let saved: CatalogUser | undefined;

      if (userToToggleBlock.isBlocked) {
        saved = await saveUser({
          id: userToToggleBlock.id,
          name: userToToggleBlock.name,
          role: roleToCatalog(userToToggleBlock.role),
          plantelId: userToToggleBlock.role === 'Plantel' ? plantelIdFromLabel(userToToggleBlock.plantel) : undefined,
          responsableId: userToToggleBlock.role === 'Responsable' ? userToToggleBlock.responsableId : undefined,
          indicatorCodes: splitIndicators(userToToggleBlock.indicadores),
          active: true,
        });
      } else {
        saved = await deactivateUser(userToToggleBlock.id);
      }

      if (!saved) {
        setStatusMessage('No se encontró el usuario.');
        setUserToToggleBlock(null);
        return;
      }

      const savedRecord = fromCatalogUser(saved);
      setUsers((current) =>
        current.map((user) => (user.id === userToToggleBlock.id ? savedRecord : user))
      );
      setStatusMessage(userToToggleBlock.isBlocked ? 'Usuario desbloqueado.' : 'Usuario bloqueado.');
      setUserToToggleBlock(null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'No se pudo actualizar el usuario.');
      setUserToToggleBlock(null);
      return;
    }
  };

  const openPasswordReset = (user: UserRecord) => {
    setUserToResetPassword(user);
    setPasswordResetForm({ password: '', confirmPassword: '' });
    setStatusMessage('');
  };

  const confirmPasswordReset = async () => {
    if (!userToResetPassword) {
      return;
    }

    if (passwordResetForm.password.length < 8) {
      setStatusMessage('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (passwordResetForm.password !== passwordResetForm.confirmPassword) {
      setStatusMessage('La confirmación no coincide con la nueva contraseña.');
      return;
    }

    try {
      const updated = await resetUserPassword(
        userToResetPassword.id,
        passwordResetForm.password,
        passwordResetForm.confirmPassword
      );
      const updatedRecord = fromCatalogUser(updated);

      setUsers((current) =>
        current.map((user) => (user.id === userToResetPassword.id ? updatedRecord : user))
      );
      setUserToResetPassword(null);
      setPasswordResetForm({ password: '', confirmPassword: '' });
      setStatusMessage('Contraseña actualizada.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'No se pudo actualizar la contraseña.');
    }
  };

  const normalizedSearch = normalizeSearch(activeSearch);
  const filteredUsers = users
    .filter((user) => {
      if (!normalizedSearch) {
        return true;
      }

      return [
        user.name,
        user.username ?? '',
        user.role,
        user.plantel,
        user.indicadores,
        user.isBlocked ? 'bloqueado' : 'activo',
      ].some((value) => normalizeSearch(value).includes(normalizedSearch));
    })
    .sort((a, b) => {
      if (rolePriority[a.role] !== rolePriority[b.role]) {
        return rolePriority[a.role] - rolePriority[b.role];
      }

      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });

  const isCreatingUser = editingUser ? !users.some((user) => user.id === editingUser.id) : false;
  const statusIsError = isStatusError(statusMessage);

  return (
    <div className="w-full max-w-[1250px] mx-auto pt-8 pb-10">
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="font-title text-3xl font-bold text-brand-Gris_oscuro">
          Gestión de Usuarios
        </h1>

        <div className="flex flex-wrap items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-2 w-full max-w-xl">
            <input
              type="text"
              aria-label="Filtro de usuarios por nombre, rol, plantel o indicador"
              placeholder="Buscar por nombre, rol, plantel o indicador..."
              value={searchTerm}
              onChange={(event) => {
                const value = event.target.value;
                setSearchTerm(value);
                if (!value.trim()) {
                  setActiveSearch('');
                }
              }}
              onKeyDown={(event) => event.key === 'Enter' && setActiveSearch(searchTerm.trim())}
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
          <p className={`text-sm font-body font-semibold ${statusIsError ? 'text-brand-Status_rojo' : 'text-brand-Verde_oscuro'}`} role="status">
            {statusMessage}
          </p>
        )}
      </div>

      <div className="bg-brand-Blanco rounded-lg shadow-md overflow-hidden border border-brand-Gris_bajo/20">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-center">
            <thead>
              <tr className="bg-brand-Gris_bajo/35 text-brand-Gris_oscuro font-title font-bold text-sm select-none border-b border-brand-Gris_bajo/20">
                <th className="py-4 px-6 w-[25%]">Usuario</th>
                <th className="py-4 px-6 w-[25%]">Rol</th>
                <th className="py-4 px-6 w-[25%]">Indicadores</th>
                <th className="py-4 px-6 w-[25%]">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-brand-Gris_bajo/20 font-body text-sm text-brand-Gris_oscuro">
              {isLoadingUsers && (
                <tr>
                  <td colSpan={4} className="py-8 px-6 text-center text-brand-Gris_oscuro/70">
                    Cargando usuarios...
                  </td>
                </tr>
              )}
              {!isLoadingUsers && filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className={`hover:bg-brand-Gris_bajo/15 transition-colors duration-150 ease-in-out ${
                    user.isBlocked ? 'opacity-60' : ''
                  }`}
                >
                  <td className="py-4 px-6 font-medium leading-relaxed text-brand-Gris_oscuro">
                    <div className="flex flex-col items-center gap-0.5">
                      <span>{user.name}</span>
                      {user.username && (
                        <span className="text-xs font-mono text-brand-Gris_oscuro/60">{user.username}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6 font-medium leading-relaxed text-brand-Gris_oscuro/80">
                    {user.role}
                  </td>
                  <td className="py-4 px-6 text-center font-mono font-medium text-brand-Gris_oscuro/80">
                    {splitIndicators(user.indicadores).length === 0 ? (
                      '-'
                    ) : (
                      <div className="flex flex-wrap gap-1 justify-center">
                        {splitIndicators(user.indicadores)
                          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
                          .map((indicator) => (
                            <span key={indicator} className="bg-brand-Gris_bajo/10 px-2 py-0.5 rounded text-xs">
                              {indicator}
                            </span>
                          ))}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleEditUser(user)}
                        disabled={user.isBlocked}
                        aria-label={`Modificar usuario ${user.name}`}
                        className="px-5 py-1 rounded-full border border-brand-Verde_oscuro text-brand-Verde_oscuro font-bold text-sm hover:bg-brand-Verde_oscuro hover:text-brand-Blanco transition-colors w-[112px] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-brand-Verde_oscuro"
                      >
                        Modificar
                      </button>

                      {user.role !== 'Administrador' && (
                        <>
                          <button
                            type="button"
                            onClick={() => openPasswordReset(user)}
                            aria-label={`Restablecer contraseña de ${user.name}`}
                            className="text-brand-Verde_oscuro hover:text-brand-Verde_principal transition-colors p-1 rounded-md hover:bg-brand-Verde_principal/10 cursor-pointer"
                          >
                            <KeyRound size={20} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setUserToToggleBlock(user)}
                            aria-label={user.isBlocked ? `Desbloquear usuario ${user.name}` : `Bloquear usuario ${user.name}`}
                            className={`transition-colors p-1 rounded-md cursor-pointer ${
                              user.isBlocked
                                ? 'text-brand-Status_rojo hover:bg-brand-Status_rojo/10'
                                : 'text-brand-Verde_oscuro hover:text-brand-Status_amarillo hover:bg-brand-Status_amarillo/10'
                            }`}
                          >
                            {user.isBlocked ? <Lock size={20} /> : <Unlock size={20} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setUserToDelete(user)}
                            aria-label={`Eliminar usuario ${user.name}`}
                            className="text-brand-Verde_oscuro hover:text-brand-Status_rojo transition-colors p-1 rounded-md hover:bg-brand-Status_rojo/10 cursor-pointer"
                          >
                            <Trash2 size={20} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoadingUsers && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 px-6 text-center text-brand-Gris_oscuro/70">
                    Sin resultados para la búsqueda actual.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-Gris_oscuro/60 backdrop-blur-sm p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-editor-title"
            className="bg-brand-Blanco rounded-lg shadow-xl p-6 w-full max-w-md border border-brand-Gris_bajo/20"
          >
            <h2 id="user-editor-title" className="text-xl font-title font-bold text-brand-Gris_oscuro mb-6">
              {isCreatingUser ? 'Agregar usuario' : 'Modificar usuario'}
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="user-editor-name" className="block text-sm font-semibold text-brand-Gris_oscuro font-body">
                  Nombre
                </label>
                <input
                  id="user-editor-name"
                  type="text"
                  value={editingUser.name}
                  onChange={(event) => setEditingUser({ ...editingUser, name: event.target.value })}
                  disabled={editingUser.role === 'Plantel'}
                  placeholder={editingUser.role === 'Plantel' ? 'Se asigna desde el plantel' : 'Nombre del usuario'}
                  className="mt-1 w-full h-10 rounded-md border border-brand-Gris_bajo/50 px-3 text-sm text-brand-Gris_oscuro outline-none focus:border-brand-Verde_principal focus:ring-1 focus:ring-brand-Verde_principal bg-brand-Blanco disabled:bg-brand-Gris_bajo/10 disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>

              {isCreatingUser && editingUser.role === 'Responsable' && (
                <div>
                  <label htmlFor="user-editor-password" className="block text-sm font-semibold text-brand-Gris_oscuro font-body">
                    Contraseña inicial
                  </label>
                  <input
                    id="user-editor-password"
                    type="password"
                    value={editingUser.password ?? ''}
                    onChange={(event) => setEditingUser({ ...editingUser, password: event.target.value })}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    className="mt-1 w-full h-10 rounded-md border border-brand-Gris_bajo/50 px-3 text-sm text-brand-Gris_oscuro outline-none focus:border-brand-Verde_principal focus:ring-1 focus:ring-brand-Verde_principal bg-brand-Blanco"
                  />
                </div>
              )}

              {!isCreatingUser && (
                <div>
                  <label htmlFor="user-editor-role" className="block text-sm font-semibold text-brand-Gris_oscuro font-body">
                    Rol
                  </label>
                  <select
                    id="user-editor-role"
                    value={editingUser.role}
                    disabled
                    onChange={(event) => {
                      const role = event.target.value as SystemRole;
                      setEditingUser({
                        ...editingUser,
                        role,
                        plantel: role === 'Plantel' ? editingUser.plantel : '-',
                        plantelId: role === 'Plantel' ? plantelIdFromLabel(editingUser.plantel) : undefined,
                        responsableId: role === 'Responsable' ? editingUser.responsableId : undefined,
                        indicadores: role === 'Responsable' ? editingUser.indicadores : '-',
                        name: role === 'Plantel' ? plantelDisplayNameFromLabel(editingUser.plantel) : editingUser.name,
                      });
                    }}
                    className="mt-1 w-full h-10 rounded-md border border-brand-Gris_bajo/50 px-3 text-sm text-brand-Gris_oscuro outline-none focus:border-brand-Verde_principal focus:ring-1 focus:ring-brand-Verde_principal bg-brand-Blanco disabled:bg-brand-Gris_bajo/10 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {editingUser.role === 'Administrador' && (
                      <option value="Administrador">Administrador</option>
                    )}
                    <option value="Responsable">Responsable</option>
                    <option value="Plantel">Plantel</option>
                  </select>
                </div>
              )}

              {editingUser.role === 'Plantel' && (
                <div>
                  <label htmlFor="user-editor-campus" className="block text-sm font-semibold text-brand-Gris_oscuro font-body">
                    Plantel
                  </label>
                  <select
                    id="user-editor-campus"
                    value={editingUser.plantel}
                    disabled
                    onChange={(event) => {
                      const plantel = event.target.value;
                      setEditingUser({
                        ...editingUser,
                        plantel,
                        plantelId: plantelIdFromLabel(plantel),
                        name: plantelDisplayNameFromLabel(plantel),
                      });
                    }}
                    className="mt-1 w-full h-10 rounded-md border border-brand-Gris_bajo/50 px-3 text-sm text-brand-Gris_oscuro outline-none focus:border-brand-Verde_principal focus:ring-1 focus:ring-brand-Verde_principal bg-brand-Blanco disabled:bg-brand-Gris_bajo/10 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {MOCK_PLANTELES.map((plantel) => (
                      <option key={plantel} value={plantel}>{plantel === '-' ? 'Sin asignar' : plantel}</option>
                    ))}
                  </select>
                </div>
              )}

              {editingUser.role === 'Responsable' && (
                <div>
                  <label htmlFor="user-indicator-select" className="block text-sm font-semibold text-brand-Gris_oscuro font-body mb-1">
                    Indicadores asignados
                  </label>
                  <select
                    id="user-indicator-select"
                    value=""
                    onChange={(event) => {
                      const selected = event.target.value;
                      const assigned = splitIndicators(editingUser.indicadores);

                      if (selected && !assigned.includes(selected)) {
                        const next = [...assigned, selected].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                        setEditingUser({ ...editingUser, indicadores: next.join(', ') });
                      }
                    }}
                    className="w-full h-10 rounded-md border border-brand-Gris_bajo/50 px-3 text-sm text-brand-Gris_oscuro outline-none focus:border-brand-Verde_principal focus:ring-1 focus:ring-brand-Verde_principal bg-brand-Blanco mb-3"
                  >
                    <option value="" disabled hidden>Seleccione para agregar...</option>
                    {MOCK_INDICADORES
                      .filter((indicator) => !splitIndicators(editingUser.indicadores).includes(indicator))
                      .map((indicator) => (
                        <option key={indicator} value={indicator}>{indicator}</option>
                      ))}
                  </select>

                  <div className="flex flex-wrap gap-2 p-3 bg-brand-Gris_bajo/5 rounded-md border border-brand-Gris_bajo/20 min-h-[50px] items-center">
                    {splitIndicators(editingUser.indicadores).length > 0 ? (
                      splitIndicators(editingUser.indicadores).map((indicator) => (
                        <span key={indicator} className="flex items-center gap-1.5 bg-brand-Verde_oscuro text-brand-Blanco px-2.5 py-1 rounded-full text-xs font-accent font-semibold shadow-sm">
                          {indicator}
                          <button
                            type="button"
                            onClick={() => {
                              const next = splitIndicators(editingUser.indicadores).filter((item) => item !== indicator);
                              setEditingUser({ ...editingUser, indicadores: next.length > 0 ? next.join(', ') : '-' });
                            }}
                            className="hover:text-brand-Status_rojo transition-colors p-0.5 rounded-full hover:bg-brand-Blanco/20 cursor-pointer"
                            aria-label={`Quitar indicador ${indicator}`}
                          >
                            <X size={12} strokeWidth={3} />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-brand-Gris_oscuro/50 font-body italic w-full text-center">
                        Sin indicadores asignados
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-5 py-2 rounded-md border border-brand-Gris_bajo/50 text-brand-Gris_oscuro text-sm font-bold hover:bg-brand-Gris_bajo/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveEditedUser}
                className="px-5 py-2 rounded-md bg-brand-Verde_oscuro text-brand-Blanco text-sm font-bold hover:bg-brand-Verde_principal transition-colors"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {userToResetPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-Gris_oscuro/60 backdrop-blur-sm p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-reset-title"
            className="bg-brand-Blanco rounded-lg shadow-xl p-6 w-full max-w-md border border-brand-Gris_bajo/20"
          >
            <h2 id="password-reset-title" className="text-xl font-title font-bold text-brand-Gris_oscuro mb-2">
              Restablecer contraseña
            </h2>
            <p className="text-sm text-brand-Gris_oscuro/70 mb-6">
              {userToResetPassword.name}
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="reset-password" className="block text-sm font-semibold text-brand-Gris_oscuro font-body">
                  Nueva contraseña
                </label>
                <input
                  id="reset-password"
                  type="password"
                  value={passwordResetForm.password}
                  onChange={(event) => setPasswordResetForm({ ...passwordResetForm, password: event.target.value })}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  className="mt-1 w-full h-10 rounded-md border border-brand-Gris_bajo/50 px-3 text-sm text-brand-Gris_oscuro outline-none focus:border-brand-Verde_principal focus:ring-1 focus:ring-brand-Verde_principal bg-brand-Blanco"
                />
              </div>

              <div>
                <label htmlFor="reset-password-confirm" className="block text-sm font-semibold text-brand-Gris_oscuro font-body">
                  Confirmar contraseña
                </label>
                <input
                  id="reset-password-confirm"
                  type="password"
                  value={passwordResetForm.confirmPassword}
                  onChange={(event) => setPasswordResetForm({ ...passwordResetForm, confirmPassword: event.target.value })}
                  placeholder="Repite la nueva contraseña"
                  autoComplete="new-password"
                  className="mt-1 w-full h-10 rounded-md border border-brand-Gris_bajo/50 px-3 text-sm text-brand-Gris_oscuro outline-none focus:border-brand-Verde_principal focus:ring-1 focus:ring-brand-Verde_principal bg-brand-Blanco"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={() => {
                  setUserToResetPassword(null);
                  setPasswordResetForm({ password: '', confirmPassword: '' });
                }}
                className="px-5 py-2 rounded-md border border-brand-Gris_bajo/50 text-brand-Gris_oscuro text-sm font-bold hover:bg-brand-Gris_bajo/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmPasswordReset}
                className="px-5 py-2 rounded-md bg-brand-Verde_oscuro text-brand-Blanco text-sm font-bold hover:bg-brand-Verde_principal transition-colors"
              >
                Actualizar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!userToDelete}
        title="Desactivar usuario"
        message={`¿Deseas desactivar al usuario ${userToDelete?.name}? Se conservará su historial.`}
        onConfirm={confirmDeleteUser}
        onCancel={() => setUserToDelete(null)}
        confirmText="Desactivar"
      />

      <ConfirmModal
        isOpen={!!userToToggleBlock}
        title={userToToggleBlock?.isBlocked ? 'Desbloquear usuario' : 'Bloquear usuario'}
        message={`¿Deseas ${userToToggleBlock?.isBlocked ? 'desbloquear' : 'bloquear'} al usuario ${userToToggleBlock?.name}?`}
        onConfirm={confirmToggleBlockUser}
        onCancel={() => setUserToToggleBlock(null)}
        confirmText={userToToggleBlock?.isBlocked ? 'Desbloquear' : 'Bloquear'}
        isDestructive={!userToToggleBlock?.isBlocked}
      />
    </div>
  );
};
