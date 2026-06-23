import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { fetchIndicatorHistory, type IndicatorHistoryEntry } from '../../api/catalog';

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export const IndicatorHistory = () => {
  const [history, setHistory] = useState<IndicatorHistoryEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setErrorMessage('');

    fetchIndicatorHistory()
      .then((items) => {
        if (isMounted) {
          setHistory(items);
        }
      })
      .catch(() => {
        if (isMounted) {
          setErrorMessage('No se pudo cargar el historial.');
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

  const filteredHistory = useMemo(() => {
    const normalizedSearch = normalizeSearch(activeSearch);

    if (!normalizedSearch) {
      return history;
    }

    return history.filter((item) =>
      [
        item.code,
        item.name,
        item.action,
        item.updatedBy,
        item.plantelScope,
        item.responsibleNames.join(', '),
      ].some((value) => normalizeSearch(value).includes(normalizedSearch))
    );
  }, [activeSearch, history]);

  return (
    <div className="w-full max-w-[1250px] mx-auto pt-8 pb-10">
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="font-title text-3xl font-bold text-brand-Gris_oscuro">
          Historial de indicadores
        </h1>

        <div className="flex flex-wrap items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-2 w-full max-w-xl">
            <input
              type="text"
              aria-label="Buscar historial por código, indicador, responsable o alcance"
              placeholder="Buscar por código, indicador, responsable o alcance..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && setActiveSearch(searchTerm.trim())}
              className="w-full h-9 pl-4 pr-4 rounded-full border border-brand-Gris_bajo/50 focus:outline-none focus:border-brand-Verde_principal text-sm text-brand-Gris_oscuro"
            />
            <button
              type="button"
              onClick={() => setActiveSearch(searchTerm.trim())}
              aria-label="Buscar historial"
              className="h-9 flex items-center justify-center bg-brand-Verde_oscuro text-brand-Blanco px-4 rounded-full hover:bg-brand-Verde_principal transition-colors shrink-0"
            >
              <Search size={18} />
            </button>
          </div>
        </div>

        {errorMessage && (
          <p className="text-sm font-body font-semibold text-brand-Status_rojo" role="alert">
            {errorMessage}
          </p>
        )}
      </div>

      <div className="bg-brand-Blanco rounded-lg shadow-md overflow-hidden border border-brand-Gris_bajo/20">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse text-left">
            <thead>
              <tr className="bg-brand-Gris_bajo/35 text-brand-Gris_oscuro font-title font-bold text-sm select-none border-b border-brand-Gris_bajo/20">
                <th className="py-4 px-5 w-[11%]">Código</th>
                <th className="py-4 px-5 w-[28%]">Indicador</th>
                <th className="py-4 px-5 w-[15%]">Responsable</th>
                <th className="py-4 px-5 w-[13%]">Alcance</th>
                <th className="py-4 px-5 w-[16%]">Última modificación</th>
                <th className="py-4 px-5 w-[9%]">Movimiento</th>
                <th className="py-4 px-5 w-[8%] text-center">Estado</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-brand-Gris_bajo/20 font-body text-sm text-brand-Gris_oscuro">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="py-8 px-6 text-center text-brand-Gris_oscuro/70">
                    Cargando historial...
                  </td>
                </tr>
              )}

              {!isLoading && filteredHistory.map((item) => (
                <tr key={`${item.id}-${item.updatedAt}`} className="hover:bg-brand-Gris_bajo/15 transition-colors">
                  <td className="py-4 px-5 font-mono font-medium text-brand-Gris_oscuro/80">
                    {item.code}
                  </td>
                  <td className="py-4 px-5 font-medium leading-relaxed">
                    {item.name}
                  </td>
                  <td className="py-4 px-5 text-brand-Gris_oscuro/80">
                    {item.responsibleNames.join(', ') || 'Sin asignar'}
                  </td>
                  <td className="py-4 px-5 text-brand-Gris_oscuro/80">
                    {item.plantelScope}
                  </td>
                  <td className="py-4 px-5">
                    <span className="block font-semibold">{formatDate(item.updatedAt)}</span>
                    <span className="block text-xs text-brand-Gris_oscuro/70">{item.updatedBy}</span>
                  </td>
                  <td className="py-4 px-5">
                    {item.action}
                  </td>
                  <td className="py-4 px-5 text-center">
                    <span className={`inline-flex min-w-[86px] justify-center rounded-full px-3 py-1 text-xs font-bold ${
                      item.active
                        ? 'bg-brand-Verde_principal/15 text-brand-Verde_oscuro'
                        : 'bg-brand-Status_rojo/10 text-brand-Status_rojo'
                    }`}>
                      {item.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}

              {!isLoading && filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 px-6 text-center text-brand-Gris_oscuro/70">
                    Sin movimientos para la búsqueda actual.
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
