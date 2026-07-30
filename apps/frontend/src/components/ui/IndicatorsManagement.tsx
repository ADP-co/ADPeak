import { useEffect, useState } from 'react';
import { Eye, EyeOff, PlusCircle, Search, Trash2 } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { deactivateIndicator, fetchIndicators, plantelScopeLabelForIndicator, saveIndicator, type CatalogIndicator } from '../../api/catalog';

export interface IndicatorRecord {
  id: string;
  code: string;
  name: string;
  alcance: string;
  plantel?: string;
  supervisor?: string;
  responsable: string;
  contribuidor: string;
  enabled?: boolean;
}

interface IndicatorsManagementTableProps {
  onEditIndicator?: (code: string) => void;
}

function fromCatalogIndicator(indicator: CatalogIndicator): IndicatorRecord {
  return {
    id: String(indicator.id),
    code: indicator.code,
    name: indicator.name,
    alcance: plantelScopeLabelForIndicator(indicator),
    responsable: indicator.responsibleNames.join(', ') || 'Sin asignar',
    contribuidor: indicator.operationalScope === 'none'
      ? 'No aplica'
      : indicator.contributorNames.join(', ') || 'Sin asignar',
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
  const [indicators, setIndicators] = useState<IndicatorRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusKind, setStatusKind] = useState<'success' | 'error'>('success');
  const [isLoading, setIsLoading] = useState(true);
  const [indicatorToDelete, setIndicatorToDelete] = useState<IndicatorRecord | null>(null);
  const [indicatorToToggle, setIndicatorToToggle] = useState<IndicatorRecord | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchIndicators()
      .then((items) => {
        if (isMounted) {
          setIndicators(items.map(fromCatalogIndicator));
        }
      })
      .catch(() => {
        if (isMounted) {
          setStatusKind('error');
          setStatusMessage('No se pudo cargar la gestión de indicadores. Intenta nuevamente.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

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

  const confirmToggleIndicator = async () => {
    if (!indicatorToToggle) {
      return;
    }

    const indicator = indicatorToToggle;
    const nextEnabled = indicator.enabled === false;
    setStatusMessage('');

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
      setStatusKind('error');
      setStatusMessage('No se pudo actualizar el indicador. Intenta nuevamente.');
      setIndicatorToToggle(null);
      return;
    }

    setIndicators((current) =>
      current.map((item) =>
        item.id === indicator.id ? { ...item, enabled: nextEnabled } : item
      )
    );
    setStatusKind('success');
    setStatusMessage(nextEnabled ? 'Indicador habilitado.' : 'Indicador deshabilitado.');
    setIndicatorToToggle(null);
  };

  const confirmDeleteIndicator = async () => {
    if (!indicatorToDelete) {
      return;
    }

    try {
      await deactivateIndicator(Number(indicatorToDelete.id));
    } catch {
      setStatusKind('error');
      setStatusMessage('No se pudo desactivar el indicador. Intenta nuevamente.');
      setIndicatorToDelete(null);
      return;
    }

    setIndicators((current) =>
      current.map((item) =>
        item.id === indicatorToDelete.id ? { ...item, enabled: false } : item
      )
    );
    setStatusKind('success');
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
        indicator.alcance,
        indicator.responsable,
        indicator.contribuidor,
      ].some((value) => normalizeSearch(value).includes(normalizedSearch));
    })
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

  return (
    <div className="w-full max-w-[1250px] mx-auto pt-8 pb-10">
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="font-title text-3xl font-bold text-brand-Gris_oscuro">
          Gestión de Indicadores
        </h1>

        <div className="flex flex-wrap items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-2 w-full max-w-xl">
            <input
              type="text"
              aria-label="Filtro de indicadores por código, nombre, alcance, responsable o contribuidor"
              placeholder="Buscar por código, nombre, alcance, responsable o contribuidor..."
              value={searchTerm}
              onChange={(event) => {
                const value = event.target.value;
                setSearchTerm(value);
                if (!value.trim()) {
                  setActiveSearch('');
                }
              }}
              onKeyDown={(event) => event.key === 'Enter' && setActiveSearch(searchTerm.trim())}
              className="h-11 w-full rounded-full border border-brand-Gris_bajo/50 px-4 text-sm text-brand-Gris_oscuro focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal"
            />
            <button
              type="button"
              onClick={() => setActiveSearch(searchTerm.trim())}
              aria-label="Buscar indicadores"
              className="flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-brand-Verde_oscuro px-4 text-brand-Blanco transition-colors hover:bg-brand-Verde_principal focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal focus-visible:ring-offset-2"
            >
              <Search size={18} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleAddIndicator}
            aria-label="Agregar indicador"
            className="flex min-h-11 items-center gap-2 rounded-full bg-brand-Verde_oscuro px-5 text-sm font-bold text-brand-Blanco transition-colors hover:bg-brand-Verde_principal focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal focus-visible:ring-offset-2"
          >
            Agregar
            <PlusCircle size={18} strokeWidth={2.5} />
          </button>
        </div>

        {statusMessage && (
          <p
            className={`rounded-md border px-3 py-2 text-sm font-body font-semibold ${
              statusKind === 'error'
                ? 'border-brand-Status_rojo/30 bg-brand-Status_rojo/10 text-brand-Status_rojo'
                : 'border-brand-Verde_principal/30 bg-brand-Verde_principal/10 text-brand-Verde_oscuro'
            }`}
            role={statusKind === 'error' ? 'alert' : 'status'}
            aria-live={statusKind === 'error' ? 'assertive' : 'polite'}
          >
            {statusMessage}
          </p>
        )}
      </div>

      <div className="bg-brand-Blanco rounded-lg shadow-md overflow-hidden border border-brand-Gris_bajo/20">
        <div className="space-y-3 p-3 sm:hidden" aria-label="Lista de indicadores configurables">
          {isLoading && (
            <p className="px-3 py-8 text-center text-sm text-brand-Gris_oscuro/70" role="status">
              Cargando indicadores...
            </p>
          )}
          {!isLoading && filteredIndicators.map((indicator) => (
            <article
              key={`mobile-${indicator.id}`}
              className={`rounded-lg border border-brand-Gris_bajo/30 bg-brand-Blanco p-4 shadow-sm ${
                indicator.enabled === false ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-mono text-sm font-bold text-brand-Verde_oscuro">{indicator.code}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  indicator.enabled === false
                    ? 'bg-brand-Status_rojo/10 text-brand-Status_rojo'
                    : 'bg-brand-Verde_principal/15 text-brand-Verde_oscuro'
                }`}>
                  {indicator.enabled === false ? 'Inactivo' : 'Activo'}
                </span>
              </div>
              <h2 className="mt-3 font-title text-base font-bold leading-snug text-brand-Gris_oscuro">
                {indicator.name}
              </h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className="font-bold text-brand-Gris_oscuro">Alcance</dt>
                  <dd className="mt-0.5 break-words text-brand-Gris_oscuro/75">{indicator.alcance}</dd>
                </div>
                <div>
                  <dt className="font-bold text-brand-Gris_oscuro">Contribuidor</dt>
                  <dd className="mt-0.5 break-words text-brand-Gris_oscuro/75">{indicator.contribuidor}</dd>
                </div>
                <div>
                  <dt className="font-bold text-brand-Gris_oscuro">Responsable</dt>
                  <dd className="mt-0.5 break-words text-brand-Gris_oscuro/75">{indicator.responsable}</dd>
                </div>
              </dl>
              <div className="mt-4 grid grid-cols-[minmax(0,1fr)_44px_44px] gap-2">
                <button
                  type="button"
                  onClick={() => handleEditIndicator(indicator)}
                  className="min-h-11 rounded-full border border-brand-Verde_oscuro px-4 text-sm font-bold text-brand-Verde_oscuro transition-colors hover:bg-brand-Verde_oscuro hover:text-brand-Blanco focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal"
                >
                  Configurar
                </button>
                <button
                  type="button"
                  onClick={() => setIndicatorToToggle(indicator)}
                  aria-label={indicator.enabled === false ? `Habilitar indicador ${indicator.code}` : `Deshabilitar indicador ${indicator.code}`}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full text-brand-Verde_oscuro hover:bg-brand-Status_amarillo/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal"
                >
                  {indicator.enabled === false ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                <button
                  type="button"
                  onClick={() => setIndicatorToDelete(indicator)}
                  aria-label={`Desactivar indicador ${indicator.code}`}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full text-brand-Verde_oscuro hover:bg-brand-Status_rojo/10 hover:text-brand-Status_rojo focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </article>
          ))}
          {!isLoading && filteredIndicators.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-brand-Gris_oscuro/70">
              Sin resultados para la búsqueda actual.
            </p>
          )}
        </div>
        <div className="hidden w-full overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal focus-visible:ring-inset sm:block" role="region" aria-label="Lista de indicadores configurables" tabIndex={0}>
          <table className="w-full min-w-[1120px] border-collapse text-center">
            <caption className="sr-only">Indicadores, alcance, responsables y acciones de configuración</caption>
            <thead>
              <tr className="bg-brand-Gris_bajo/35 text-brand-Gris_oscuro font-title font-bold text-sm select-none border-b border-brand-Gris_bajo/20">
                <th className="py-4 px-5 w-[12%]">Código</th>
                <th className="py-4 px-5 w-[30%] text-left">Nombre</th>
                <th className="py-4 px-5 w-[16%]">Alcance</th>
                <th className="py-4 px-5 w-[14%]">Contribuidor</th>
                <th className="py-4 px-5 w-[14%]">Responsable</th>
                <th className="py-4 px-5 w-[14%]">Acciones</th>
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
                  <td className="py-4 px-5 text-center font-mono font-medium text-brand-Gris_oscuro/80">
                    {indicator.code}
                  </td>
                  <td className="py-4 px-5 font-medium leading-relaxed text-left">
                    {indicator.name}
                  </td>
                  <td className="py-4 px-5 font-medium text-brand-Gris_oscuro/80">
                    {indicator.alcance}
                  </td>
                  <td className="py-4 px-5 font-medium text-brand-Gris_oscuro/80">
                    {indicator.contribuidor}
                  </td>
                  <td className="py-4 px-5 font-medium text-brand-Gris_oscuro/80">
                    {indicator.responsable}
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleEditIndicator(indicator)}
                        aria-label={`Configurar indicador ${indicator.code}`}
                        className="min-h-11 w-[120px] rounded-full border border-brand-Verde_oscuro px-6 py-1 text-sm font-bold text-brand-Verde_oscuro transition-colors hover:bg-brand-Verde_oscuro hover:text-brand-Blanco focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal focus-visible:ring-offset-2"
                      >
                        Configurar
                      </button>
                      <button
                        type="button"
                        onClick={() => setIndicatorToToggle(indicator)}
                        aria-label={indicator.enabled === false ? `Habilitar indicador ${indicator.code}` : `Deshabilitar indicador ${indicator.code}`}
                        className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-brand-Verde_oscuro transition-colors hover:bg-brand-Status_amarillo/20 hover:text-brand-Gris_oscuro focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal"
                      >
                        {indicator.enabled === false ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIndicatorToDelete(indicator)}
                        aria-label={`Desactivar indicador ${indicator.code}`}
                        className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-brand-Verde_oscuro transition-colors hover:bg-brand-Status_rojo/10 hover:text-brand-Status_rojo focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredIndicators.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 px-6 text-center text-brand-Gris_oscuro/70">
                    Sin resultados para la búsqueda actual.
                  </td>
                </tr>
              )}
              {isLoading && (
                <tr>
                  <td colSpan={6} className="py-8 px-6 text-center text-brand-Gris_oscuro/70" role="status">
                    Cargando indicadores...
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
        message={`¿Deseas desactivar el indicador ${indicatorToDelete?.code}? Se conservará su historial.`}
        onConfirm={confirmDeleteIndicator}
        onCancel={() => setIndicatorToDelete(null)}
        confirmText="Desactivar"
      />
      <ConfirmModal
        isOpen={!!indicatorToToggle}
        title={indicatorToToggle?.enabled === false ? 'Habilitar indicador' : 'Deshabilitar indicador'}
        message={`¿Deseas ${indicatorToToggle?.enabled === false ? 'habilitar' : 'deshabilitar'} el indicador ${indicatorToToggle?.code}?`}
        onConfirm={confirmToggleIndicator}
        onCancel={() => setIndicatorToToggle(null)}
        confirmText={indicatorToToggle?.enabled === false ? 'Habilitar' : 'Deshabilitar'}
        isDestructive={indicatorToToggle?.enabled !== false}
      />
    </div>
  );
};
