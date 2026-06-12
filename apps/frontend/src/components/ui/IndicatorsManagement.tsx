import { useEffect, useState } from 'react';
import { Eye, EyeOff, PlusCircle, Search, Trash2 } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { deactivateIndicator, fetchIndicators, saveIndicator, type CatalogIndicator } from '../../api/catalog';

export interface IndicatorRecord {
  id: string;
  code: string;
  name: string;
  plantel?: string;
  supervisor?: string;
  responsable: string;
  contribuidor: string;
  enabled?: boolean;
}

interface IndicatorsManagementTableProps {
  onEditIndicator?: (code: string) => void;
}

const initialIndicators: IndicatorRecord[] = [
  { id: '1', code: '1.0.0.0.2', name: 'Porcentaje de titulacion por cohorte de educacion media superior', responsable: 'Usuario08', contribuidor: 'Planteles', enabled: true },
  { id: '2', code: '1.1.0.0.1', name: 'Porcentaje de cobertura en educacion media superior', responsable: 'Usuario08', contribuidor: 'Planteles', enabled: true },
  { id: '3', code: '1.1.0.0.2', name: 'Porcentaje de cobertura en educacion media superior', responsable: 'Usuario08', contribuidor: 'Usuario08', enabled: true },
  { id: '4', code: '1.1.1.0.1', name: 'Porcentaje de aceptacion en educacion media superior', responsable: 'Usuario08', contribuidor: 'Planteles', enabled: true },
  { id: '5', code: '1.1.1.1.1', name: 'Porcentaje de programas educativos de educacion media superior nuevos', responsable: 'Usuario08', contribuidor: 'Planteles', enabled: true },
  { id: '6', code: '1.1.2.0.1', name: 'Porcentaje retencion escolar de educacion media superior', responsable: 'Usuario08', contribuidor: 'Usuario08', enabled: true },
  { id: '7', code: '1.1.2.0.3', name: 'Tasa de abandono escolar de educacion media superior', responsable: 'Usuario08', contribuidor: 'Planteles', enabled: true },
  { id: '8', code: '1.1.2.1.1', name: 'Porcentaje de estudiantes de educacion media superior atendidos en el programa', responsable: 'Usuario08', contribuidor: 'Planteles', enabled: true },
  { id: '9', code: '1.1.2.1.3', name: 'Porcentaje de estudiantes con participacion de padres o tutores', responsable: 'Usuario08', contribuidor: 'Planteles', enabled: true },
  { id: '10', code: '1.1.2.1.4', name: 'Porcentaje de estudiantes atendidos en los servicios de salud', responsable: 'Usuario08', contribuidor: 'Usuario08', enabled: true },
  { id: '11', code: '1.1.2.2.1', name: 'Porcentaje de estudiantes atendidos en acciones de reforzamiento', responsable: 'Usuario08', contribuidor: 'Planteles', enabled: true },
];

function fromCatalogIndicator(indicator: CatalogIndicator): IndicatorRecord {
  return {
    id: String(indicator.id),
    code: indicator.code,
    name: indicator.name,
    responsable: indicator.responsibleNames.join(', ') || 'Sin asignar',
    contribuidor: indicator.contributorNames.join(', ') || 'Planteles',
    enabled: indicator.active,
  };
}

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export const IndicatorsManagementTable = ({ onEditIndicator }: IndicatorsManagementTableProps) => {
  const [indicators, setIndicators] = useState<IndicatorRecord[]>(initialIndicators);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [indicatorToDelete, setIndicatorToDelete] = useState<IndicatorRecord | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchIndicators()
      .then((items) => {
        if (isMounted) {
          setIndicators(items.map(fromCatalogIndicator));
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddIndicator = () => {
    const nextNumber = indicators.length + 1;
    onEditIndicator?.(`TMP-${nextNumber}`);
  };

  const handleEditIndicator = (indicator: IndicatorRecord) => {
    setStatusMessage('');
    onEditIndicator?.(indicator.code);
  };

  const handleToggleEnable = async (indicator: IndicatorRecord) => {
    const nextEnabled = indicator.enabled === false;

    try {
      if (nextEnabled) {
        await saveIndicator({
          id: Number(indicator.id),
          code: indicator.code,
          name: indicator.name,
          responsibleNames: indicator.responsable.split(',').map((item) => item.trim()).filter(Boolean),
          contributorNames: indicator.contribuidor.split(',').map((item) => item.trim()).filter(Boolean),
          active: true,
        });
      } else {
        await deactivateIndicator(Number(indicator.id));
      }
    } catch {
      // El fallback local mantiene la pantalla funcional si no hay API publica.
    }

    setIndicators((current) =>
      current.map((item) =>
        item.id === indicator.id ? { ...item, enabled: nextEnabled } : item
      )
    );
    setStatusMessage(nextEnabled ? 'Indicador habilitado.' : 'Indicador deshabilitado.');
  };

  const confirmDeleteIndicator = async () => {
    if (!indicatorToDelete) {
      return;
    }

    try {
      await deactivateIndicator(Number(indicatorToDelete.id));
    } catch {
      // Fallback local.
    }

    setIndicators((current) =>
      current.map((item) =>
        item.id === indicatorToDelete.id ? { ...item, enabled: false } : item
      )
    );
    setStatusMessage('Indicador desactivado.');
    setIndicatorToDelete(null);
  };

  const normalizedSearch = normalizeSearch(activeSearch);
  const filteredIndicators = indicators
    .filter((indicator) => {
      if (!normalizedSearch) {
        return true;
      }

      return [
        indicator.code,
        indicator.name,
        indicator.responsable,
        indicator.contribuidor,
        indicator.enabled === false ? 'deshabilitado' : 'habilitado',
      ].some((value) => normalizeSearch(value).includes(normalizedSearch));
    })
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

  return (
    <div className="w-full max-w-[1250px] mx-auto pt-8 pb-10">
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="font-title text-3xl font-bold text-brand-Gris_oscuro">
          Gestion de Indicadores
        </h1>

        <div className="flex flex-wrap items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-2 w-full max-w-xl">
            <input
              type="text"
              aria-label="Filtro de indicadores por codigo, nombre, responsable, contribuidor o estado"
              placeholder="Buscar por codigo, nombre, responsable, contribuidor o estado..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && setActiveSearch(searchTerm.trim())}
              className="w-full h-9 pl-4 pr-4 rounded-full border border-brand-Gris_bajo/50 focus:outline-none focus:border-brand-Verde_principal text-sm text-brand-Gris_oscuro"
            />
            <button
              type="button"
              onClick={() => setActiveSearch(searchTerm.trim())}
              aria-label="Buscar indicadores"
              className="h-9 flex items-center justify-center bg-brand-Verde_oscuro text-brand-Blanco px-4 rounded-full hover:bg-brand-Verde_principal transition-colors shrink-0"
            >
              <Search size={18} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleAddIndicator}
            aria-label="Agregar indicador"
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

      <div className="bg-brand-Blanco rounded-lg shadow-md overflow-hidden border border-brand-Gris_bajo/20">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-center">
            <thead>
              <tr className="bg-brand-Gris_bajo/35 text-brand-Gris_oscuro font-title font-bold text-sm select-none border-b border-brand-Gris_bajo/20">
                <th className="py-4 px-6 w-[15%]">Codigo</th>
                <th className="py-4 px-6 w-[35%] text-left">Nombre</th>
                <th className="py-4 px-6 w-[20%]">Contribuidor</th>
                <th className="py-4 px-6 w-[15%]">Responsable</th>
                <th className="py-4 px-6 w-[15%]">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-brand-Gris_bajo/20 font-body text-sm text-brand-Gris_oscuro">
              {filteredIndicators.map((indicator) => (
                <tr
                  key={indicator.id}
                  className={`hover:bg-brand-Gris_bajo/15 transition-colors duration-150 ease-in-out ${
                    indicator.enabled === false ? 'opacity-60' : ''
                  }`}
                >
                  <td className="py-4 px-6 text-center font-mono font-medium text-brand-Gris_oscuro/80">
                    {indicator.code}
                  </td>
                  <td className="py-4 px-6 font-medium leading-relaxed text-left">
                    {indicator.name}
                  </td>
                  <td className="py-4 px-6 font-medium text-brand-Gris_oscuro/80">
                    {indicator.contribuidor}
                  </td>
                  <td className="py-4 px-6 font-medium text-brand-Gris_oscuro/80">
                    {indicator.responsable}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleEditIndicator(indicator)}
                        aria-label={`Configurar indicador ${indicator.code}`}
                        className="px-6 py-1 rounded-full border border-brand-Verde_oscuro text-brand-Verde_oscuro font-bold text-sm hover:bg-brand-Verde_oscuro hover:text-brand-Blanco transition-colors w-[120px]"
                      >
                        Configurar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleEnable(indicator)}
                        aria-label={indicator.enabled === false ? `Habilitar indicador ${indicator.code}` : `Deshabilitar indicador ${indicator.code}`}
                        className="text-brand-Verde_oscuro hover:text-brand-Status_amarillo transition-colors p-1 rounded-md hover:bg-brand-Status_amarillo/10 cursor-pointer"
                      >
                        {indicator.enabled === false ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIndicatorToDelete(indicator)}
                        aria-label={`Desactivar indicador ${indicator.code}`}
                        className="text-brand-Verde_oscuro hover:text-brand-Status_rojo transition-colors p-1 rounded-md hover:bg-brand-Status_rojo/10 cursor-pointer"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredIndicators.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 px-6 text-center text-brand-Gris_oscuro/70">
                    Sin resultados para la busqueda actual.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!indicatorToDelete}
        title="Desactivar indicador"
        message={`Deseas desactivar el indicador ${indicatorToDelete?.code}? Se conservara su historial.`}
        onConfirm={confirmDeleteIndicator}
        onCancel={() => setIndicatorToDelete(null)}
        confirmText="Desactivar"
      />
    </div>
  );
};
