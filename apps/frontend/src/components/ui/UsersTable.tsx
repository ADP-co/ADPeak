import { Search, PlusCircle, Trash2 } from 'lucide-react';
import { Select } from './Select';

// 1. Tipado de datos para los usuarios
export type SystemRole = 'Administrador' | 'Responsable' | 'Plantel';

export interface UserRecord {
  id: string;
  name: string;
  role: SystemRole;
  plantel: string;
  indicadores: string;
}

export const UsersTable = () => {
  // 2. Datos de prueba basados exactamente en tu diseño
  const DatosUsuarios: UserRecord[] = [
    { id: '1', name: 'Director', role: 'Administrador', plantel: '-', indicadores: '-' },
    { id: '2', name: 'Subdirector', role: 'Administrador', plantel: '-', indicadores: '-' },
    { id: '3', name: 'Angél Ordóñez', role: 'Responsable', plantel: '-', indicadores: '1.1.0.0.1' },
    { id: '4', name: 'Usuario', role: 'Responsable', plantel: '-', indicadores: '1.0.0.0.2' },
    { id: '5', name: 'Usuario', role: 'Responsable', plantel: '-', indicadores: '1.1.2.0.1' },
    { id: '6', name: 'Usuario', role: 'Plantel', plantel: 'Bach. 16', indicadores: '-' },
    { id: '7', name: 'Usuario', role: 'Plantel', plantel: 'Bach. 33', indicadores: '-' },
  ];

  return (
    <div className="w-full max-w-[1250px] mx-auto pt-8 pb-10">
      
      {/* Encabezado y filtros */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        
        {/* Título */}
        <h1 className="font-title text-3xl font-bold text-brand-Gris_oscuro shrink-0">
          Gestión de Usuarios
        </h1>

        {/* Controles de la derecha */}
        <div className="flex items-center gap-4 flex-1 justify-end">
          
          {/* Barra de Búsqueda */}
          <div className="relative w-full max-w-sm">
            <input 
              type="text" 
              placeholder="Buscar" 
              className="w-full h-9 pl-4 pr-10 rounded-full border border-brand-Gris_bajo/50 focus:outline-none focus:border-brand-Verde_principal text-sm text-brand-Gris_oscuro"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-Verde_oscuro" size={18} />
          </div>

          {/* Filtro Ordenar Por */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-brand-Gris_oscuro whitespace-nowrap font-body font-semibold">Ordenar por</span>
            <Select 
              options={[
                { value: 'rol', label: 'Rol' },
                { value: 'nombre', label: 'Nombre' },
                { value: 'plantel', label: 'Plantel' }
              ]}
              containerClassName="w-32"
              className="rounded-full"
            />
          </div>

          {/* Botón Agregar */}
          <button className="h-9 flex items-center gap-2 bg-brand-Verde_oscuro text-brand-Blanco px-5 rounded-full font-bold text-sm hover:bg-brand-Verde_principal transition-colors">
            Agregar
            <PlusCircle size={18} strokeWidth={2.5} />
          </button>
        </div>

      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-brand-Blanco rounded-lg shadow-md overflow-hidden border border-brand-Gris_bajo/20">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-center">
            
            {/* Cabecera */}
            <thead>
              <tr className="bg-brand-Gris_bajo/35 text-brand-Gris_oscuro font-title font-bold text-sm select-none border-b border-brand-Gris_bajo/20">
                <th className="py-4 px-6 w-[20%]">Usuario</th>
                <th className="py-4 px-6 w-[20%]">Rol</th>
                <th className="py-4 px-6 w-[20%]">Plantel</th>
                <th className="py-4 px-6 w-[20%]">Indicadores</th>
                <th className="py-4 px-6 w-[20%]">Acciones</th>
              </tr>
            </thead>

            {/* Cuerpo */}
            <tbody className="divide-y divide-brand-Gris_bajo/20 font-body text-sm text-brand-Gris_oscuro">
              {DatosUsuarios.map((user) => (
                <tr 
                  key={user.id} 
                  className="hover:bg-brand-Gris_bajo/15 transition-colors duration-150 ease-in-out"
                >
                  <td className="py-4 px-6 font-medium leading-relaxed pr-8 text-brand-Gris_oscuro">{user.name}</td>
                  <td className="py-4 px-6 font-medium leading-relaxed pr-8 text-brand-Gris_oscuro/80">{user.role}</td>
                  <td className="py-4 px-6 font-medium text-brand-Verde_oscuro">{user.plantel}</td>
                  <td className="py-4 px-6 text-center font-mono font-medium text-brand-Gris_oscuro/80">{user.indicadores}</td>
                  
                  {/* Botones de Acción */}
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center gap-3">
                      <button className="px-6 py-1 rounded-full border border-brand-Verde_oscuro text-brand-Verde_oscuro font-bold text-sm hover:bg-brand-Verde_oscuro hover:text-brand-Blanco transition-colors w-[120px]">
                        Modificar
                      </button>
                      <button 
                        className="text-brand-Verde_oscuro hover:text-brand-Status_rojo transition-colors p-1 rounded-md hover:bg-brand-Status_rojo/10 cursor-pointer"
                        title="Eliminar usuario"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      </div>

    </div>
  );
};