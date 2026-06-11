import { useState, useEffect } from 'react';
import { Button } from './Button';
import { Select } from './Select';

// Estados posibles de los Indicadores
export type IndicatorStatus = 'Corregir' | 'Pendiente' | 'En revisión' | 'Aprobado';

// Estructura de datos que requiere cada fila de la tabla
export interface Indicator {
  code: string;
  name: string;
  status: IndicatorStatus;
}

interface IndicatorsTableProps {
  indicators: Indicator[];
  onSelectIndicator?: (code: string) => void;
}

export const IndicatorsTable = ({ indicators, onSelectIndicator }: IndicatorsTableProps) => {
  
  const [filter, setFilter] = useState<string>('todos');

  // Estados para simular la carga del periodo
  const [dateOptions, setDateOptions] = useState<{value: string, label: string}[]>([{ value: '', label: 'Cargando...' }]);
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 600));
        const mockDates = [
          { value: '2024-2025', label: '2024 - 2025' },
          { value: '2025-2026', label: '2025 - 2026' }
        ];
        mockDates.sort((a, b) => b.value.localeCompare(a.value));
        setDateOptions(mockDates);
        setSelectedDate(mockDates[0].value);
      } catch (error) {
        console.error("Error al cargar los filtros:", error);
      }
    };
    fetchFilters();
  }, []);

  // Mapeo de estilos para los Badges de Estatus
  const statusStyles = {
    'Corregir': 'bg-brand-Status_rojo text-brand-Blanco',
    'Pendiente': 'bg-brand-Status_amarillo text-brand-Gris_oscuro',
    'En revisión': 'bg-brand-Status_azul text-brand-Blanco',
    'Aprobado': 'bg-brand-Status_verde text-brand-Gris_oscuro',
  };

  // Función para determinar el texto del botón de acción según el estatus
  const getActionLabel = (status: IndicatorStatus) => {
    if (status === 'Corregir') return 'Modificar Datos';
    if (status === 'Pendiente') return 'Nueva Captura';
    return 'Ver Datos'; // Para En revisión y Aprobado
  };

  // Mapeo de prioridad para ordenar por estatus cuando el filtro es "todos"
  const statusPriority: Record<IndicatorStatus, number> = {
    'Corregir': 1,
    'Pendiente': 2,
    'En revisión': 3,
    'Aprobado': 4,
  };

  // Filtramos los indicadores según el valor seleccionado en el Select
  const filteredIndicators = indicators
    .filter((indicator) => {
      if (filter === 'todos') return true;
      if (filter === 'aprobado') return indicator.status === 'Aprobado';
      if (filter === 'revision') return indicator.status === 'En revisión';
      if (filter === 'pendiente') return indicator.status === 'Pendiente';
      if (filter === 'corregir') return indicator.status === 'Corregir';
      return true;
    })
    .sort((a, b) => {
      if (filter === 'todos') {
        return statusPriority[a.status] - statusPriority[b.status];
      } else {
        return a.code.localeCompare(b.code, undefined, { numeric: true });
      }
    });

  return (
    <div className="w-full max-w-[1250px] mx-auto mb-10">
      
      {/* Controles de Filtro */}
        <div className="flex items-center justify-between gap-4 pb-4 pt-8">
          <h1 className="font-title text-3xl font-bold text-brand-Gris_oscuro shrink-0 select-none">
            Indicadores
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-brand-Gris_oscuro font-bold font-accent whitespace-nowrap">Filtrar por</span>
            <Select 
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'aprobado', label: 'Aprobado' },
                { value: 'revision', label: 'En revisión' },
                { value: 'pendiente', label: 'Pendiente' },
                { value: 'corregir', label: 'Corregir' }
              ]}
              variant="outline"
              containerClassName="w-40"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Tarjeta blanca contenedora de la tabla */}
        <div className="bg-brand-Blanco rounded-lg shadow-md overflow-hidden border border-brand-Gris_bajo/20">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left">
            
            {/* Cabecera de la tabla con fondo gris claro al 35% de opacidad */}
            <thead>
              <tr className="bg-brand-Gris_bajo/35 text-brand-Gris_oscuro font-title font-bold text-sm select-none">
                <th className="py-4 px-6 w-[15%] text-center">Código</th>
                <th className="py-4 px-6 w-[50%]">Nombre</th>
                <th className="py-4 px-6 w-[15%] text-center">Estatus</th>
                <th className="py-4 px-6 w-[20%] text-center">Acción</th>
              </tr>
            </thead>

            {/* Cuerpo de la tabla */}
            <tbody className="divide-y divide-brand-Gris_bajo/20 font-body text-sm text-brand-Gris_oscuro">
              {filteredIndicators.map((indicator) => (
                <tr 
                  key={indicator.code} 
                  className="hover:bg-brand-Gris_bajo/15 transition-colors duration-150 ease-in-out group"
                >
                  {/* Código del Indicador */}
                  <td className="py-4 px-6 text-center font-mono font-medium text-brand-Gris_oscuro/80">
                    {indicator.code}
                  </td>
                  
                  {/* Nombre del Indicador */}
                  <td className="py-4 px-6 font-medium leading-relaxed pr-8">
                    {indicator.name}
                  </td>
                  
                  {/* Estatus (Badge estilizado) */}
                  <td className="py-4 px-6 text-center whitespace-nowrap">
                    <span className={`inline-block px-4 py-1 text-xs font-bold font-accent rounded-full shadow-xs tracking-wide min-w-[100px] ${statusStyles[indicator.status]}`}>
                      {indicator.status}
                    </span>
                  </td>
                  
                  {/* Acción (Button atómico) */}
                  <td className="py-4 px-6 text-center whitespace-nowrap">
                    <Button 
                      variant="secondary"
                      onClick={() => onSelectIndicator && onSelectIndicator(indicator.code)}
                      className="w-[135px] text-xs py-1.5 px-4">
                      {getActionLabel(indicator.status)}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      </div>

      {/* Footer del Período */}
      <div className="mt-4 text-center">
        <span className="font-accent text-xs font-semibold text-brand-Gris_oscuro/60">
          Periodo {dateOptions.find(d => d.value === selectedDate)?.label || selectedDate}
        </span>
      </div>
    </div>
  );
};