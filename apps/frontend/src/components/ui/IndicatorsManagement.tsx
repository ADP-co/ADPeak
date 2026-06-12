import { useState } from 'react';
import { Search, PlusCircle, Trash2, Eye, EyeOff } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

// Tipado de datos para la gestión de indicadores
export interface IndicatorRecord {
  id: string;
  code: string;
  name: string;
  responsable: string;
  contribuidor: string;
  enabled?: boolean;
}

interface IndicatorsManagementTableProps {
  onEditIndicator?: (code: string) => void;
}

export const IndicatorsManagementTable = ({ onEditIndicator }: IndicatorsManagementTableProps) => {
  // Datos de prueba
  const [indicators, setIndicators] = useState<IndicatorRecord[]>([
    { id: '1', code: '1.1.0.0.1', name: 'Porcentaje de cobertura en educación media superior', responsable: 'Usuario08', contribuidor: 'Planteles', enabled: true },
    { id: '2', code: '1.0.0.0.2', name: 'Porcentaje de titulación por cohorte de educación media superior', responsable: 'Usuario08', contribuidor: 'Planteles', enabled: true },
    { id: '3', code: '1.1.0.0.2', name: 'Porcentaje de cobertura en educación media superior', responsable: 'Usuario08', contribuidor: 'Usuario08', enabled: true },
    { id: '4', code: '1.1.1.0.1', name: 'Porcentaje de aceptación en educación media superior', responsable: 'Usuario08', contribuidor: 'Planteles', enabled: true },
    { id: '5', code: '1.1.1.1.1', name: 'Porcentaje de programas educativos de educación media superior nuevos', responsable: 'Usuario08', contribuidor: 'Planteles', enabled: true },
    { id: '6', code: '1.1.2.0.1', name: 'Porcentaje retención escolar de educación media superior', responsable: 'Usuario08', contribuidor: 'Usuario08', enabled: true },
    { id: '7', code: '1.1.2.0.3', name: 'Tasa de abandono escolar de educación media superior', responsable: 'Usuario08', contribuidor: 'Planteles', enabled: true },
    { id: '8', code: '1.1.2.1.1', name: 'Porcentaje de estudiantes de educación media superior atendidos en el Programa', responsable: 'Usuario08', contribuidor: 'Planteles', enabled: true },
    { id: '9', code: '1.1.2.1.3', name: 'Porcentaje de estudiantes que sus padres, madres o tutores legales participan', responsable: 'Usuario08', contribuidor: 'Planteles', enabled: true },
    { id: '10', code: '1.1.2.1.4', name: 'Porcentaje de estudiantes atendidos en los servicios de salud', responsable: 'Usuario08', contribuidor: 'Usuario08', enabled: true },
    { id: '11', code: '1.1.2.2.1', name: 'Porcentaje de estudiantes atendidos en acciones de reforzamiento', responsable: 'Usuario08', contribuidor: 'Planteles', enabled: true },
  ]);

  // Estados para la búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [indicatorToDelete, setIndicatorToDelete] = useState<IndicatorRecord | null>(null);

  const handleAddIndicator = () => {
    const nextNumber = indicators.length + 1;
    const newCode = `TMP-${nextNumber}`;
    
    // Navega directamente a la vista de configuración con el nuevo código
    onEditIndicator?.(newCode);
  };

  const handleEditIndicator = (indicator: IndicatorRecord) => {
    setStatusMessage(`Abriendo configuración de ${indicator.code}.`);
    onEditIndicator?.(indicator.code);
  };

  const handleToggleEnable = (indicator: IndicatorRecord) => {
    setIndicators((current) =>
      current.map((item) =>
        item.id === indicator.id ? { ...item, enabled: item.enabled !== false ? false : true } : item
      )
    );
    setStatusMessage(`Indicador ${indicator.code} ${indicator.enabled !== false ? 'deshabilitado' : 'habilitado'}.`);
  };

  const handleDeleteIndicator = (indicator: IndicatorRecord) => {
    setIndicatorToDelete(indicator);
  };

  const confirmDeleteIndicator = () => {
    if (!indicatorToDelete) return;
    setIndicators((current) => current.filter((item) => item.id !== indicatorToDelete.id));
    setStatusMessage(`Indicador ${indicatorToDelete.code} eliminado de la vista.`);
    setIndicatorToDelete(null);
  };

  // Filtramos y ordenamos los indicadores por código de menor a mayor
  const filteredIndicators = indicators
    .filter((indicator) =>
      indicator.code.toLowerCase().includes(activeSearch.toLowerCase()) ||
      indicator.name.toLowerCase().includes(activeSearch.toLowerCase()) ||
      indicator.responsable.toLowerCase().includes(activeSearch.toLowerCase()) ||
      indicator.contribuidor.toLowerCase().includes(activeSearch.toLowerCase())
    )
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

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
              placeholder="Buscar por código, nombre, responsable o contribuidor..."
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
            onClick={handleAddIndicator}
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

      {/* Tabla de Gestión de Indicadores */}
      <div className="bg-brand-Blanco rounded-lg shadow-md overflow-hidden border border-brand-Gris_bajo/20">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-center">

            {/* Cabecera */}
            <thead>
              <tr className="bg-brand-Gris_bajo/35 text-brand-Gris_oscuro font-title font-bold text-sm select-none border-b border-brand-Gris_bajo/20">
                <th className="py-4 px-6 w-[15%]">Código</th>
                <th className="py-4 px-6 w-[35%] text-left">Nombre</th>
                <th className="py-4 px-6 w-[20%] text-center">Contribuidor</th>
                <th className="py-4 px-6 w-[15%]">Responsable</th>
                <th className="py-4 px-6 w-[15%]">Acciones</th>
              </tr>
            </thead>

            {/* Cuerpo */}
            <tbody className="divide-y divide-brand-Gris_bajo/20 font-body text-sm text-brand-Gris_oscuro">
              {filteredIndicators.map((indicator) => (
                <tr
                  key={indicator.id}
                  className={`hover:bg-brand-Gris_bajo/15 transition-colors duration-150 ease-in-out ${indicator.enabled === false ? 'opacity-50' : ''}`}
                >
                  {/* Columna Código */}
                  <td className="py-4 px-6 text-center font-mono font-medium text-brand-Gris_oscuro/80">{indicator.code}</td>

                  {/* Columna Nombre */}
                  <td className="py-4 px-6 font-medium leading-relaxed pr-8 text-left">{indicator.name}</td>

                  {/* Columna Contribuidor */}
                  <td className="py-4 px-6 font-medium text-brand-Gris_oscuro/80 text-center">{indicator.contribuidor}</td>

                  {/* Columna Responsable */}
                  <td className="py-4 px-6 font-medium text-brand-Gris_oscuro/80">{indicator.responsable}</td>

                  {/* Columna Acciones */}
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => handleEditIndicator(indicator)}
                        className="px-6 py-1 rounded-full border border-brand-Verde_oscuro text-brand-Verde_oscuro font-bold text-sm hover:bg-brand-Verde_oscuro hover:text-brand-Blanco transition-colors w-[120px]"
                      >
                        Configurar
                      </button>
                      <button
                        onClick={() => handleToggleEnable(indicator)}
                        className={`transition-colors p-1 rounded-md cursor-pointer ${
                          indicator.enabled !== false
                            ? 'text-brand-Verde_oscuro hover:text-brand-Gris_oscuro hover:bg-brand-Gris_bajo/20'
                            : 'text-brand-Gris_oscuro/40 hover:text-brand-Verde_oscuro hover:bg-brand-Verde_oscuro/10'
                        }`}
                        title={indicator.enabled !== false ? "Deshabilitar indicador" : "Habilitar indicador"}
                      >
                        {indicator.enabled !== false ? <Eye size={20} /> : <EyeOff size={20} />}
                      </button>
                      <button
                        onClick={() => handleDeleteIndicator(indicator)}
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

      {/* Modal de Confirmación para Eliminar */}
      <ConfirmModal
        isOpen={!!indicatorToDelete}
        title="Eliminar Indicador"
        message={`¿Está seguro de que desea eliminar el indicador ${indicatorToDelete?.code}? Esta acción no se puede deshacer.`}
        onConfirm={confirmDeleteIndicator}
        onCancel={() => setIndicatorToDelete(null)}
        confirmText="Eliminar"
      />
    </div>
  );
};
