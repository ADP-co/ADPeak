import { useState } from 'react';
import { Search, PlusCircle, Trash2 } from 'lucide-react';

// Tipado de datos para la gestión de indicadores
export interface IndicatorRecord {
  id: string;
  code: string;
  name: string;
  responsable: string;
}

export const IndicatorsManagementTable = () => {
  // Datos de prueba
  const DataIndicators: IndicatorRecord[] = [
    { id: '1', code: '1.1.0.0.1', name: 'Porcentaje de cobertura en educación media superior', responsable: 'Usuario08' },
    { id: '2', code: '1.0.0.0.2', name: 'Porcentaje de titulación por cohorte de educación media superior', responsable: 'Usuario08' },
    { id: '3', code: '1.1.0.0.2', name: 'Porcentaje de cobertura en educación media superior', responsable: 'Usuario08' },
    { id: '4', code: '1.1.1.0.1', name: 'Porcentaje de aceptación en educación media superior', responsable: 'Usuario08' },
    { id: '5', code: '1.1.1.1.1', name: 'Porcentaje de programas educativos de educación media superior nuevos', responsable: 'Usuario08' },
    { id: '6', code: '1.1.2.0.1', name: 'Porcentaje retención escolar de educación media superior', responsable: 'Usuario08' },
    { id: '7', code: '1.1.2.0.3', name: 'Tasa de abandono escolar de educación media superior', responsable: 'Usuario08' },
    { id: '8', code: '1.1.2.1.1', name: 'Porcentaje de estudiantes de educación media superior atendidos en el Programa', responsable: 'Usuario08' },
    { id: '9', code: '1.1.2.1.3', name: 'Porcentaje de estudiantes que sus padres, madres o tutores legales participan', responsable: 'Usuario08' },
    { id: '10', code: '1.1.2.1.4', name: 'Porcentaje de estudiantes atendidos en los servicios de salud', responsable: 'Usuario08' },
    { id: '11', code: '1.1.2.2.1', name: 'Porcentaje de estudiantes atendidos en acciones de reforzamiento', responsable: 'Usuario08' },
  ];

  // Estados para la búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  // Filtramos los indicadores por código, nombre o responsable
  const filteredIndicators = DataIndicators.filter((indicator) => 
    indicator.code.toLowerCase().includes(activeSearch.toLowerCase()) || 
    indicator.name.toLowerCase().includes(activeSearch.toLowerCase()) ||
    indicator.responsable.toLowerCase().includes(activeSearch.toLowerCase())
  );

  return (
    <div className="w-full max-w-[1250px] mx-auto pt-8 pb-10">
      
      {/* Encabezado */}
      <div className="flex flex-col gap-4 mb-6">
        
        {/* Título */}
        <h1 className="font-title text-3xl font-bold text-brand-Gris_oscuro">
          Gestión de Indicadores
        </h1>

        {/* Controles */}
        <div className="flex flex-wrap items-center justify-between gap-4 w-full">
          
          {/* Barra de Búsqueda */}
          <div className="flex items-center gap-2 w-full max-w-xl">
            <input 
              type="text" 
              placeholder="Buscar por código, nombre o responsable..." 
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
          <button className="h-9 flex items-center gap-2 bg-brand-Verde_oscuro text-brand-Blanco px-5 rounded-full font-bold text-sm hover:bg-brand-Verde_principal transition-colors">
            Agregar
            <PlusCircle size={18} strokeWidth={2.5} />
          </button>
        </div>

      </div>

      {/* Tabla de Gestión de Indicadores */}
      <div className="bg-brand-Blanco rounded-lg shadow-md overflow-hidden border border-brand-Gris_bajo/20">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-center">
            
            {/* Cabecera */}
            <thead>
              <tr className="bg-brand-Gris_bajo/35 text-brand-Gris_oscuro font-title font-bold text-sm select-none border-b border-brand-Gris_bajo/20">
                <th className="py-4 px-6 w-[15%]">Código</th>
                <th className="py-4 px-6 w-[50%] text-left">Nombre</th>
                <th className="py-4 px-6 w-[20%]">Responsable</th>
                <th className="py-4 px-6 w-[15%]">Acciones</th>
              </tr>
            </thead>

            {/* Cuerpo */}
            <tbody className="divide-y divide-brand-Gris_bajo/20 font-body text-sm text-brand-Gris_oscuro">
              {filteredIndicators.map((indicator) => (
                <tr 
                  key={indicator.id} 
                  className="hover:bg-brand-Gris_bajo/15 transition-colors duration-150 ease-in-out"
                >
                  {/* Columna Código */}
                  <td className="py-4 px-6 text-center font-mono font-medium text-brand-Gris_oscuro/80">{indicator.code}</td>
                  
                  {/* Columna Nombre */}
                  <td className="py-4 px-6 font-medium leading-relaxed pr-8 text-left">{indicator.name}</td>
                  
                  {/* Columna Responsable */}
                  <td className="py-4 px-6 font-medium text-brand-Gris_oscuro/80">{indicator.responsable}</td>
                  
                  {/* Columna Acciones */}
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center gap-3">
                      <button className="px-6 py-1 rounded-full border border-brand-Verde_oscuro text-brand-Verde_oscuro font-bold text-sm hover:bg-brand-Verde_oscuro hover:text-brand-Blanco transition-colors w-[120px]">
                        Modificar
                      </button>
                      <button 
                        className="text-brand-Verde_oscuro hover:text-brand-Status_rojo transition-colors p-1 rounded-md hover:bg-brand-Status_rojo/10 cursor-pointer"
                        title="Eliminar indicador"
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