import { Fragment, useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import {
  fetchAuditEvents,
  fetchIndicatorHistory,
  type AuditEvent,
  type IndicatorHistoryEntry,
} from '../../api/catalog';
import { useAuth } from '../../context/AuthContext';

type HistoryView = 'indicators' | 'audit';

export function historyViewForKey(current: HistoryView, key: string): HistoryView | null {
  if (key === 'Home') return 'indicators';
  if (key === 'End') return 'audit';
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    return current === 'indicators' ? 'audit' : 'indicators';
  }
  return null;
}

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

export function isDirectorAuditRole(role?: string) {
  return role === 'admin' || role === 'director';
}

export function safeAuditJson(value: unknown) {
  const seen = new WeakSet<object>();

  try {
    const json = JSON.stringify(value, (key, nestedValue) => {
      if (key && isSensitiveAuditDisplayKey(key)) {
        return undefined;
      }

      if (typeof nestedValue === 'string' && isSensitiveAuditDisplayString(nestedValue)) {
        return '[omitido]';
      }

      if (typeof nestedValue === 'object' && nestedValue !== null) {
        if (seen.has(nestedValue)) {
          return '[omitido]';
        }

        seen.add(nestedValue);
      }

      return nestedValue;
    }, 2);

    return json ?? 'Sin datos';
  } catch {
    return 'No se pudo representar el detalle.';
  }
}

function isSensitiveAuditDisplayKey(key: string) {
  const normalized = normalizeSearch(key).replace(/[^a-z0-9]/g, '');

  return [
    'password',
    'passwd',
    'contrasena',
    'credential',
    'secret',
    'hash',
    'sha',
    'token',
    'cookie',
    'authorization',
    'storageref',
    'base64',
  ].some((term) => normalized.includes(term));
}

function isSensitiveAuditDisplayString(value: string) {
  const trimmed = value.trim();

  if (/^data:/i.test(trimmed) || /^(?:bearer|basic)\s+\S+/i.test(trimmed)) {
    return true;
  }

  if (/^[a-f0-9]{32,}$/i.test(trimmed)) {
    return true;
  }

  if (/^[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/.test(trimmed)) {
    return true;
  }

  const compact = trimmed.replace(/\s+/g, '');
  return compact.length >= 24 &&
    compact.length % 4 === 0 &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(compact) &&
    (compact.length >= 64 || /[=+/]/.test(compact));
}

function formatAuditValue(value: unknown) {
  return safeAuditJson(value);
}

function readableAuditLabel(value: string) {
  const label = value.replace(/_/g, ' ').trim();
  return label ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : 'Sin acción';
}

function resourceLabel(value: AuditEvent['resourceType']) {
  const labels: Record<AuditEvent['resourceType'], string> = {
    auth: 'Autenticación',
    capture: 'Captura',
    indicator: 'Indicador',
    report: 'Reporte',
    user: 'Usuario',
  };

  return labels[value];
}

function roleLabel(value: AuditEvent['role']) {
  const labels: Record<AuditEvent['role'], string> = {
    director: 'Director',
    plantel: 'Plantel',
    responsable: 'Responsable',
  };

  return labels[value];
}

function statusLabel(value: AuditEvent['status']) {
  if (value === 'ok') {
    return 'Correcto';
  }

  return value === 'rejected' ? 'Rechazado' : 'Error';
}

export const IndicatorHistory = () => {
  const { user } = useAuth();
  const isDirector = user?.role === 'admin' || isDirectorAuditRole(user?.role);
  const [activeView, setActiveView] = useState<HistoryView>('indicators');
  const [history, setHistory] = useState<IndicatorHistoryEntry[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [expandedAuditIds, setExpandedAuditIds] = useState<Set<number>>(() => new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [auditError, setAuditError] = useState('');

  useEffect(() => {
    let isMounted = true;

    setIsHistoryLoading(true);
    setHistoryError('');

    fetchIndicatorHistory()
      .then((items) => {
        if (isMounted) {
          setHistory(items);
        }
      })
      .catch(() => {
        if (isMounted) {
          setHistoryError('No se pudo cargar el historial.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsHistoryLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isDirector) {
      setAuditEvents([]);
      setExpandedAuditIds(new Set());
      setActiveView('indicators');
      setIsAuditLoading(false);
      setAuditError('');
      return undefined;
    }

    let isMounted = true;

    setIsAuditLoading(true);
    setAuditError('');

    fetchAuditEvents()
      .then((items) => {
        if (isMounted) {
          setAuditEvents(items);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAuditError('No se pudo cargar la auditoría.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsAuditLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isDirector]);

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

  const filteredAuditEvents = useMemo(() => {
    const normalizedSearch = normalizeSearch(activeSearch);

    if (!normalizedSearch) {
      return auditEvents;
    }

    return auditEvents.filter((event) =>
      [
        event.action,
        event.resourceType,
        event.resourceId,
        event.status,
        event.requestId,
        event.userId,
        event.role,
      ].some((value) => normalizeSearch(value).includes(normalizedSearch))
    );
  }, [activeSearch, auditEvents]);

  const selectView = (view: HistoryView) => {
    setActiveView(view);
    setSearchTerm('');
    setActiveSearch('');
  };

  const handleViewKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, current: HistoryView) => {
    const nextView = historyViewForKey(current, event.key);
    if (!nextView) return;

    event.preventDefault();
    selectView(nextView);
    window.requestAnimationFrame(() => document.getElementById(`history-tab-${nextView}`)?.focus());
  };

  const toggleAuditDetails = (id: number) => {
    setExpandedAuditIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const isAuditView = isDirector && activeView === 'audit';
  const errorMessage = isAuditView ? auditError : historyError;
  const searchPlaceholder = isAuditView
    ? 'Buscar por acción, recurso, usuario o request ID...'
    : 'Buscar por código, indicador, responsable o alcance...';

  return (
    <div className="w-full max-w-[1250px] mx-auto pt-8 pb-10">
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="font-title text-3xl font-bold text-brand-Gris_oscuro">
          {isAuditView ? 'Auditoría forense' : 'Historial de indicadores'}
        </h1>

        {isDirector && (
          <div className="flex border-b border-brand-Gris_bajo/40" role="tablist" aria-label="Vistas del historial">
            <button
              id="history-tab-indicators"
              type="button"
              role="tab"
              aria-selected={activeView === 'indicators'}
              aria-controls="history-panel-indicators"
              tabIndex={activeView === 'indicators' ? 0 : -1}
              onClick={() => selectView('indicators')}
              onKeyDown={(event) => handleViewKeyDown(event, 'indicators')}
              className={`min-h-11 rounded-t-md px-4 py-2.5 text-sm font-title font-bold border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal focus-visible:ring-inset ${
                activeView === 'indicators'
                  ? 'border-brand-Verde_oscuro text-brand-Verde_oscuro'
                  : 'border-transparent text-brand-Gris_oscuro/70 hover:text-brand-Gris_oscuro'
              }`}
            >
              Indicadores
            </button>
            <button
              id="history-tab-audit"
              type="button"
              role="tab"
              aria-selected={activeView === 'audit'}
              aria-controls="history-panel-audit"
              tabIndex={activeView === 'audit' ? 0 : -1}
              onClick={() => selectView('audit')}
              onKeyDown={(event) => handleViewKeyDown(event, 'audit')}
              className={`min-h-11 rounded-t-md px-4 py-2.5 text-sm font-title font-bold border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal focus-visible:ring-inset ${
                activeView === 'audit'
                  ? 'border-brand-Verde_oscuro text-brand-Verde_oscuro'
                  : 'border-transparent text-brand-Gris_oscuro/70 hover:text-brand-Gris_oscuro'
              }`}
            >
              Auditoría
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-2 w-full max-w-xl">
            <input
              type="text"
              aria-label={isAuditView ? 'Buscar eventos de auditoría' : 'Buscar historial de indicadores'}
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && setActiveSearch(searchTerm.trim())}
              className="h-11 w-full rounded-full border border-brand-Gris_bajo/50 px-4 text-sm text-brand-Gris_oscuro focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal"
            />
            <button
              type="button"
              onClick={() => setActiveSearch(searchTerm.trim())}
              aria-label={isAuditView ? 'Buscar auditoría' : 'Buscar historial'}
              title="Buscar"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-Verde_oscuro text-brand-Blanco transition-colors hover:bg-brand-Verde_principal focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal focus-visible:ring-offset-2"
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

      {isAuditView ? (
        <div id="history-panel-audit" role="tabpanel" aria-labelledby="history-tab-audit" className="bg-brand-Blanco rounded-lg shadow-md overflow-hidden border border-brand-Gris_bajo/20">
          <div className="w-full overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal focus-visible:ring-inset" role="region" aria-label="Eventos de auditoría" tabIndex={0}>
            <table className="w-full min-w-[1120px] border-collapse text-left">
              <caption className="sr-only">Eventos de auditoría, actor, acción, recurso y estado</caption>
              <thead>
                <tr className="bg-brand-Gris_bajo/35 text-brand-Gris_oscuro font-title font-bold text-sm select-none border-b border-brand-Gris_bajo/20">
                  <th className="py-4 px-4 w-[16%]">Fecha</th>
                  <th className="py-4 px-4 w-[14%]">Actor</th>
                  <th className="py-4 px-4 w-[17%]">Acción</th>
                  <th className="py-4 px-4 w-[12%]">Recurso</th>
                  <th className="py-4 px-4 w-[9%]">ID</th>
                  <th className="py-4 px-4 w-[10%]">Estado</th>
                  <th className="py-4 px-4 w-[18%]">Request ID</th>
                  <th className="py-4 px-4 w-12" aria-label="Detalle" />
                </tr>
              </thead>

              <tbody className="divide-y divide-brand-Gris_bajo/20 font-body text-sm text-brand-Gris_oscuro">
                {isAuditLoading && (
                  <tr>
                    <td colSpan={8} className="py-8 px-6 text-center text-brand-Gris_oscuro/70">
                      Cargando auditoría...
                    </td>
                  </tr>
                )}

                {!isAuditLoading && filteredAuditEvents.map((event) => {
                  const isExpanded = expandedAuditIds.has(event.id);

                  return (
                    <Fragment key={event.id}>
                      <tr className="hover:bg-brand-Gris_bajo/15 transition-colors">
                        <td className="py-4 px-4 font-semibold">{formatDate(event.createdAt)}</td>
                        <td className="py-4 px-4">
                          <span className="block font-semibold break-words">{event.userId}</span>
                          <span className="block text-xs text-brand-Gris_oscuro/65">{roleLabel(event.role)}</span>
                        </td>
                        <td className="py-4 px-4 font-medium">{readableAuditLabel(event.action)}</td>
                        <td className="py-4 px-4">{resourceLabel(event.resourceType)}</td>
                        <td className="py-4 px-4 font-mono text-xs break-all">{event.resourceId}</td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex min-w-[82px] justify-center rounded-full px-2.5 py-1 text-xs font-bold ${
                            event.status === 'ok'
                              ? 'bg-brand-Verde_principal/15 text-brand-Verde_oscuro'
                              : 'bg-brand-Status_rojo/10 text-brand-Status_rojo'
                          }`}>
                            {statusLabel(event.status)}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-mono text-xs break-all">{event.requestId}</td>
                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => toggleAuditDetails(event.id)}
                            aria-label={`${isExpanded ? 'Ocultar' : 'Mostrar'} cambios del evento ${event.id}`}
                            aria-expanded={isExpanded}
                            title={isExpanded ? 'Ocultar cambios' : 'Mostrar cambios'}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-brand-Verde_oscuro hover:bg-brand-Verde_principal/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal"
                          >
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-brand-Gris_bajo/10">
                          <td colSpan={8} className="px-5 py-5">
                            <div className="grid gap-5 md:grid-cols-2">
                              <section className="min-w-0 md:border-r md:border-brand-Gris_bajo/30 md:pr-5">
                                <h2 className="mb-2 font-title text-sm font-bold text-brand-Gris_oscuro">Antes</h2>
                                <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-brand-Gris_oscuro/85">
                                  {formatAuditValue(event.before)}
                                </pre>
                              </section>
                              <section className="min-w-0">
                                <h2 className="mb-2 font-title text-sm font-bold text-brand-Gris_oscuro">Después</h2>
                                <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-brand-Gris_oscuro/85">
                                  {formatAuditValue(event.after)}
                                </pre>
                              </section>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}

                {!isAuditLoading && filteredAuditEvents.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 px-6 text-center text-brand-Gris_oscuro/70">
                      Sin eventos para la búsqueda actual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div id="history-panel-indicators" role="tabpanel" aria-labelledby="history-tab-indicators" className="bg-brand-Blanco rounded-lg shadow-md overflow-hidden border border-brand-Gris_bajo/20">
          <div className="w-full overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal focus-visible:ring-inset" role="region" aria-label="Historial de indicadores" tabIndex={0}>
            <table className="w-full min-w-[1120px] border-collapse text-left">
              <caption className="sr-only">Historial de cambios en indicadores</caption>
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
                {isHistoryLoading && (
                  <tr>
                    <td colSpan={7} className="py-8 px-6 text-center text-brand-Gris_oscuro/70">
                      Cargando historial...
                    </td>
                  </tr>
                )}

                {!isHistoryLoading && filteredHistory.map((item) => (
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

                {!isHistoryLoading && filteredHistory.length === 0 && (
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
      )}
    </div>
  );
};
