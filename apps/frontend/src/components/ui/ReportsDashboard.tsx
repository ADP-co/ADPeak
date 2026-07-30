import { useState, useEffect } from 'react';
import { Select } from './Select';
import { Button } from './Button';
import {
  countReportRows,
  fetchExportReport,
  reportExportBlockReason,
  reportToCsv,
  reportToPdfBlob,
  type ExportReport,
  type ReportDataRow,
} from '../../api/reportes';
import { useAuth } from '../../context/AuthContext';
import { useLiveCaptureRefresh } from '../../hooks/useLiveCaptureRefresh';

// Tarjeta de Gráfica de Dona
interface DonutCardProps {
  title: string;
  percentage: number;
  colorClass: string;
  strokeColor: string;
}

const DonutCard = ({ title, percentage, colorClass, strokeColor }: DonutCardProps) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-brand-Blanco rounded-lg shadow-sm border border-brand-Gris_bajo/20 p-6 flex flex-col items-center relative">
      <div className="w-full flex items-center justify-between mb-4">
        <h3 className="font-title text-brand-Gris_oscuro text-lg">{title}</h3>
        <div className={`w-4 h-4 rounded-full ${colorClass}`}></div>
      </div>

      <div className="relative flex items-center justify-center w-32 h-32">
        <svg
          className="w-full h-full transform -rotate-90"
          viewBox="0 0 100 100"
          role="img"
          aria-label={`${title}: ${percentage}%`}
        >
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="12"
            className="text-brand-Gris_bajo/20"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth="12"
            strokeLinecap="butt"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <span className="absolute font-accent font-bold text-sm text-brand-Gris_oscuro">
          {percentage}%
        </span>
      </div>
    </div>
  );
};

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function reportItemExportBlockMessage(report: ExportReport | null) {
  if (!report) {
    return '';
  }

  const reason = reportExportBlockReason(report);
  return reason ? `No exportable: ${reason}` : '';
}

function downloadErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return 'No se pudo descargar el reporte.';
  }

  if (error.message.includes('requieren correcci')) {
    return 'No exportable: corrige los registros pendientes antes de generar el archivo.';
  }

  if (error.message.includes('requiere correcci')) {
    return 'No exportable: corrige el registro pendiente antes de generar el archivo.';
  }

  if (error.message.includes('No hay registros capturados')) {
    return 'No exportable: no hay registros capturados para el alcance seleccionado.';
  }

  return error.message;
}

// Tipado para la tabla de planteles
type PlantelStatus = 'Completo' | 'En Revisión' | 'En Progreso' | 'Rezagado';

interface PlantelProgressRecord {
  id: string;
  plantel: string;
  plantelId: string;
  indicatorId?: string;
  kind?: 'plantel' | 'indicador';
  periodos: string[];
  recordCount?: number;
  percentage: number;
  status: PlantelStatus;
}

const periodOptions = [
  { value: '2026-2', label: '2026-2', cicloEscolar: '2025-2026' },
  { value: '2026-1', label: '2026-1', cicloEscolar: '2025-2026' },
  { value: '2025-2', label: '2025-2', cicloEscolar: '2024-2025' },
];

function buildPlantelProgress(report: ExportReport, selectedPeriod: string): PlantelProgressRecord[] {
  const grouped = new Map<string, ReportDataRow[]>();

  report.indicadores.forEach((indicator) => {
    indicator.datos.forEach((row) => {
      const plantel = row.plantel ?? report.identidadReporte.nombre;
      const plantelId = row.plantelId ?? plantel;
      const key = `${plantelId}:${plantel}`;
      grouped.set(key, [...(grouped.get(key) ?? []), row]);
    });
  });

  return Array.from(grouped.entries()).map(([key, rows]) => {
    const [, plantel] = key.split(':');
    const plantelId = rows.find((row) => row.plantelId)?.plantelId ?? key;
    const percentage = Math.round(
      rows.reduce((total, row) => total + parseProgress(row.avance), 0) / Math.max(rows.length, 1)
    );

    return {
      id: `plantel-${plantelId}`,
      plantel,
      plantelId: String(plantelId),
      kind: 'plantel',
      periodos: [selectedPeriod],
      recordCount: rows.length,
      percentage,
      status: statusForRows(rows, percentage),
    };
  });
}

function buildIndicatorProgress(report: ExportReport, selectedPeriod: string): PlantelProgressRecord[] {
  return report.indicadores.map((indicator) => {
    const rows = indicator.datos;
    const percentage = Math.round(
      rows.reduce((total, row) => total + parseProgress(row.avance), 0) / Math.max(rows.length, 1)
    );
    const indicatorId = indicator.id ?? slugify(indicator.nombre);

    return {
      id: `indicador-${indicatorId}`,
      indicatorId,
      kind: 'indicador',
      plantel: indicator.nombre,
      plantelId: '',
      periodos: [selectedPeriod],
      recordCount: rows.length,
      percentage,
      status: statusForRows(rows, percentage),
    };
  });
}

function scopedReportForProgressItem(report: ExportReport, item: PlantelProgressRecord): ExportReport {
  const indicadores = report.indicadores
    .map((indicator) => {
      const indicatorId = indicator.id ?? slugify(indicator.nombre);
      const datos = item.kind === 'indicador'
        ? indicatorId === item.indicatorId
          ? indicator.datos
          : []
        : indicator.datos.filter((row) => {
            const rowPlantelId = row.plantelId ? String(row.plantelId) : '';
            const rowPlantel = row.plantel ?? '';

            return rowPlantelId === String(item.plantelId) || rowPlantel === item.plantel;
          });

      return {
        ...indicator,
        datos,
      };
    })
    .filter((indicator) => indicator.datos.length > 0);

  return {
    ...report,
    indicadores,
  };
}

function parseProgress(value: string) {
  const number = Number(String(value).replace('%', '').trim());
  return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : 0;
}

function statusForRows(rows: ReportDataRow[], percentage: number): PlantelStatus {
  const statuses = rows.map((row) => normalizeStatus(row.estado));

  if (statuses.length > 0 && statuses.every((status) => status === 'aprobado')) {
    return 'Completo';
  }

  if (statuses.some((status) => status === 'observado') || rows.some((row) => normalizeStatus(row.vencimiento ?? '') === 'atrasado')) {
    return 'Rezagado';
  }

  if (statuses.some((status) => status.includes('enviado') || status.includes('revision'))) {
    return 'En Revisión';
  }

  return percentage > 0 ? 'En Progreso' : 'Rezagado';
}

function normalizeStatus(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function reportStatusFilter(value: string) {
  return value === 'todos' ? undefined : value;
}

// Pantalla Principal de Reportes
export const ReportsDashboard = () => {
  const { user } = useAuth();
  const isResponsible = user?.role === 'responsable';
  const isPlantel = user?.role === 'plantel';
  const isScopedReport = isResponsible || isPlantel;

  const [dateOptions] = useState(periodOptions);
  const [selectedDate, setSelectedDate] = useState(periodOptions[0].value);
  const [refreshToken, setRefreshToken] = useState(0);
  const [report, setReport] = useState<ExportReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Estado para el filtrado
  const [filterBy, setFilterBy] = useState('todos');
  const [reportMessage, setReportMessage] = useState('');
  const [reportMessageKind, setReportMessageKind] = useState<'info' | 'success' | 'error'>('info');
  const [generatingDocumentId, setGeneratingDocumentId] = useState<string | null>(null);

  useLiveCaptureRefresh(
    () => setRefreshToken((current) => current + 1),
    { enabled: Boolean(user) },
  );

  useEffect(() => {
    let isMounted = true;
    const selectedOption = dateOptions.find((option) => option.value === selectedDate) ?? dateOptions[0];

    setIsLoadingReport(true);
    setLoadError('');

    fetchExportReport({
      cicloEscolar: selectedOption.cicloEscolar,
      periodo: selectedOption.value,
      tipo: user?.role === 'admin' ? 'avance' : 'detalle',
    })
      .then((nextReport) => {
        if (isMounted) {
          setReport(nextReport);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setReport(null);
          setLoadError(error instanceof Error ? error.message : 'No se pudo cargar la información de reportes.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingReport(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [dateOptions, refreshToken, selectedDate, user?.role]);

  const loadReport = async (item: PlantelProgressRecord): Promise<ExportReport> => {
    setReportMessageKind('info');
    setReportMessage(`Preparando ${item.plantel}...`);
    const selectedOption = dateOptions.find((option) => option.value === selectedDate) ?? dateOptions[0];

    try {
      const report = await fetchExportReport({
        cicloEscolar: selectedOption.cicloEscolar,
        periodo: selectedOption.value,
        tipo: 'detalle',
        plantelId: item.kind === 'plantel' ? item.plantelId : undefined,
        estado: reportStatusFilter(filterBy),
      });
      const scopedReport = item.kind === 'indicador'
        ? {
            ...report,
            indicadores: report.indicadores.filter((indicator) =>
              (indicator.id ?? slugify(indicator.nombre)) === item.indicatorId
            ),
          }
        : report;

      return scopedReport;
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error(`No se pudo preparar la descarga de ${item.plantel}.`);
    }
  };

  const downloadDocument = (blob: Blob, filename: string) => {
    if (blob.size === 0) {
      throw new Error('El reporte no contiene datos para descargar.');
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);

    if (typeof link.download === 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      link.click();
    }

    window.setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(url);
    }, 4000);
  };

  const handleGenerateCsv = async (item: PlantelProgressRecord) => {
    try {
      setGeneratingDocumentId(`${item.id}:csv`);
      const report = await loadReport(item);
      const csv = reportToCsv(report);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const recordCount = countReportRows(report);

      downloadDocument(blob, `reporte-${slugify(item.plantel)}-${selectedDate}.csv`);
      setReportMessageKind('success');
      setReportMessage(`Archivo CSV generado: ${recordCount} registros.`);
    } catch (error) {
      setReportMessageKind('error');
      setReportMessage(downloadErrorMessage(error));
    } finally {
      setGeneratingDocumentId(null);
    }
  };

  const handleGeneratePdf = async (item: PlantelProgressRecord) => {
    try {
      setGeneratingDocumentId(`${item.id}:pdf`);
      const report = await loadReport(item);
      const pdf = await reportToPdfBlob(report);
      const recordCount = countReportRows(report);

      downloadDocument(pdf, `reporte-${slugify(item.plantel)}-${selectedDate}.pdf`);
      setReportMessageKind('success');
      setReportMessage(`Archivo PDF generado: ${recordCount} registros.`);
    } catch (error) {
      setReportMessageKind('error');
      setReportMessage(downloadErrorMessage(error));
    } finally {
      setGeneratingDocumentId(null);
    }
  };

  const plantelesFromReport = report
    ? isScopedReport
      ? buildIndicatorProgress(report, selectedDate)
      : buildPlantelProgress(report, selectedDate)
    : [];
  const plantelRows = plantelesFromReport.length > 0 ? plantelesFromReport : [];

  // Filtramos por progreso y siempre ordenamos alfabéticamente/numéricamente por plantel
  const visiblePlanteles = plantelRows.filter((item) => !selectedDate || item.periodos.includes(selectedDate));
  const processedPlanteles = visiblePlanteles
    .filter((item) => filterBy === 'todos' || item.status === filterBy)
    .sort((a, b) => a.plantel.localeCompare(b.plantel, undefined, { numeric: true }));

  // Cálculo automático para las gráficas
  const totalPlanteles = visiblePlanteles.length;
  const completosCount = visiblePlanteles.filter(p => p.status === 'Completo').length;
  // La gráfica de "Pendientes" incluye 'En Progreso' (> 15%) y 'En Revisión' (100% pero sin completar)
  const pendientesCount = visiblePlanteles.filter(p => p.status === 'En Progreso' || p.status === 'En Revisión').length;
  const rezagadosCount = visiblePlanteles.filter(p => p.status === 'Rezagado').length;

  const completosPercentage = totalPlanteles > 0 ? Math.round((completosCount / totalPlanteles) * 100) : 0;
  const pendientesPercentage = totalPlanteles > 0 ? Math.round((pendientesCount / totalPlanteles) * 100) : 0;
  const rezagadosPercentage = totalPlanteles > 0 ? Math.round((rezagadosCount / totalPlanteles) * 100) : 0;

  // Función interna para dibujar la barra
  const renderProgressBar = (item: PlantelProgressRecord) => {
    let bgColor = '';
    let fillColor = '';
    let textColor = '';
    let textDisplay = '';

    // Asignación dinámica de colores según el estatus
    switch (item.status) {
      case 'Completo':
        bgColor = 'bg-brand-Status_verde/30';
        fillColor = 'bg-brand-Status_verde';
        textColor = 'text-brand-Gris_oscuro';
        textDisplay = 'Completo';
        break;
      case 'En Revisión':
        bgColor = 'bg-brand-Status_azul/30';
        fillColor = 'bg-brand-Status_azul';
        textColor = 'text-brand-Blanco';
        textDisplay = 'En Revisión';
        break;
      case 'En Progreso':
        bgColor = 'bg-brand-Status_amarillo/30';
        fillColor = 'bg-brand-Status_amarillo';
        textColor = 'text-brand-Gris_oscuro';
        textDisplay = `${item.percentage}%`;
        break;
      case 'Rezagado':
        bgColor = 'bg-brand-Status_rojo/30';
        fillColor = 'bg-brand-Status_rojo';
        textColor = 'text-brand-Blanco';
        textDisplay = `${item.percentage}%`;
        break;
    }

    return (
      <div
        className={`relative w-full h-6 rounded-full overflow-hidden ${bgColor}`}
        role="progressbar"
        aria-label={`Progreso de ${item.plantel}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={item.percentage}
      >
        {/* Relleno que crece según el porcentaje */}
        <div
          className={`absolute top-0 left-0 h-full rounded-full ${fillColor} transition-all duration-1000 ease-out`}
          style={{ width: `${item.percentage}%` }}
        ></div>
        {/* Texto centrado que flota sobre el relleno */}
        <div className={`absolute inset-0 flex items-center justify-center font-bold text-xs font-accent drop-shadow-sm ${textColor}`}>
          {textDisplay}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[1250px] mx-auto pt-8 pb-4">

      {/* Título y Gráficas */}
      <div className="mb-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between mb-4">
          <h1 className="font-title text-3xl font-bold text-brand-Gris_oscuro">
            {isResponsible ? 'Reportes de mis indicadores' : isPlantel ? 'Reportes de mi plantel' : 'Reportes Dinámicos'}
          </h1>
          <div className="flex w-full gap-4 sm:w-auto">
            <Select
              id="reports-period-filter"
              aria-label="Periodo del reporte"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              options={dateOptions}
              variant="outline"
              containerClassName="w-full sm:w-40"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <DonutCard
            title={isScopedReport ? 'Indicadores aprobados' : 'Bachilleratos Completos'}
            percentage={completosPercentage}
            colorClass="bg-[#C1D82F]"
            strokeColor="#C1D82F"
          />
          <DonutCard
            title={isScopedReport ? 'Indicadores pendientes' : 'Bachilleratos Pendientes'}
            percentage={pendientesPercentage}
            colorClass="bg-[#FFD100]"
            strokeColor="#FFD100"
          />
          <DonutCard
            title={isScopedReport ? 'Con observación' : 'Bachilleratos Rezagados'}
            percentage={rezagadosPercentage}
            colorClass="bg-[#770F00]"
            strokeColor="#770F00"
          />
        </div>
      </div>

      {/* Tabla de Progreso */}
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between mb-4">
          <h2 className="font-title text-3xl font-bold text-brand-Gris_oscuro">
            {isScopedReport ? 'Información capturada' : 'Progreso de los Planteles'}
          </h2>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <label htmlFor="reports-status-filter" className="text-xs text-brand-Gris_oscuro font-bold font-accent">Filtrar por</label>
            <Select
              id="reports-status-filter"
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'Completo', label: isScopedReport ? 'Aprobado' : 'Completo' },
                { value: 'En Revisión', label: 'En Revisión' },
                { value: 'En Progreso', label: isScopedReport ? 'Pendiente' : 'En Progreso' },
                { value: 'Rezagado', label: isScopedReport ? 'Con observación' : 'Rezagado' }
              ]}
              variant="solid"
              containerClassName="min-w-0 flex-1 sm:w-40 sm:flex-none"
            />
          </div>
        </div>

        {reportMessage && (
          <p
            className={`mb-4 rounded-md border px-3 py-2 text-sm font-body font-semibold ${
              reportMessageKind === 'error'
                ? 'border-brand-Status_rojo/30 bg-brand-Status_rojo/10 text-brand-Status_rojo'
                : reportMessageKind === 'success'
                  ? 'border-brand-Verde_principal/30 bg-brand-Verde_principal/10 text-brand-Verde_oscuro'
                  : 'border-brand-Status_azul/30 bg-brand-Status_azul/10 text-brand-Gris_oscuro'
            }`}
            role={reportMessageKind === 'error' ? 'alert' : 'status'}
            aria-live={reportMessageKind === 'error' ? 'assertive' : 'polite'}
          >
            {reportMessage}
          </p>
        )}

        {loadError && (
          <p className="mb-4 text-sm font-body font-semibold text-brand-Status_rojo" role="alert">
            {loadError}
          </p>
        )}

        {isLoadingReport && (
          <p className="mb-4 text-sm font-body font-semibold text-brand-Gris_oscuro/70" role="status" aria-live="polite">
            Actualizando reportes...
          </p>
        )}

        <div className="space-y-3 sm:hidden" aria-label="Reportes disponibles">
          {processedPlanteles.map((item) => {
            const scopedReport = report ? scopedReportForProgressItem(report, item) : null;
            const exportBlockMessage = reportItemExportBlockMessage(scopedReport);
            const exportDisabled = Boolean(exportBlockMessage);

            return (
              <article key={`mobile-${item.id}`} className="rounded-lg border border-brand-Gris_bajo/30 bg-brand-Blanco p-4 shadow-sm">
                <h3 className="font-title text-base font-bold leading-snug text-brand-Gris_oscuro">{item.plantel}</h3>
                <div className="mt-3">
                  {isScopedReport ? (
                    <div className="flex items-baseline justify-between gap-3 rounded-md bg-brand-Gris_bajo/10 px-3 py-2">
                      <span className="font-body text-sm text-brand-Gris_oscuro/70">Registros capturados</span>
                      <span className="font-title text-lg font-bold text-brand-Verde_oscuro">{item.recordCount ?? 0}</span>
                    </div>
                  ) : renderProgressBar(item)}
                </div>
                <p className="mt-2 text-xs font-semibold text-brand-Gris_oscuro/70">{item.status}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => handleGenerateCsv(item)}
                    disabled={generatingDocumentId === `${item.id}:csv` || exportDisabled}
                    className="min-h-11 w-full px-3 py-2 text-sm disabled:cursor-not-allowed"
                  >
                    {generatingDocumentId === `${item.id}:csv` ? 'Generando' : 'CSV'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleGeneratePdf(item)}
                    disabled={generatingDocumentId === `${item.id}:pdf` || exportDisabled}
                    className="min-h-11 w-full px-3 py-2 text-sm disabled:cursor-not-allowed"
                  >
                    {generatingDocumentId === `${item.id}:pdf` ? 'Generando' : 'PDF'}
                  </Button>
                </div>
                {exportBlockMessage && (
                  <p className="mt-3 text-sm font-semibold text-brand-Status_rojo">{exportBlockMessage}</p>
                )}
              </article>
            );
          })}
          {processedPlanteles.length === 0 && (
            <p className="rounded-lg border border-brand-Gris_bajo/30 bg-brand-Blanco px-4 py-8 text-center text-sm text-brand-Gris_oscuro/60">
              No hay registros para el periodo seleccionado.
            </p>
          )}
        </div>

        <div className="hidden bg-brand-Blanco rounded-lg shadow-md border border-brand-Gris_bajo/20 overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal focus-visible:ring-inset sm:block" role="region" aria-label="Reportes disponibles" tabIndex={0}>
          <table className="w-full min-w-[720px] border-collapse text-center">
            <caption className="sr-only">Reportes disponibles y acciones de descarga</caption>

            <thead>
              <tr className="bg-brand-Gris_bajo/35 text-brand-Gris_oscuro font-title font-bold text-sm select-none border-b border-brand-Gris_bajo/20">
                <th className="py-4 px-6 w-[20%] text-left">{isScopedReport ? 'Indicador' : 'Plantel'}</th>
                <th className="py-4 px-6 w-[55%]">{isScopedReport ? 'Registros capturados' : 'Progreso'}</th>
                <th className="py-4 px-6 w-[25%]">Documentos</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-brand-Gris_bajo/20 font-body text-sm text-brand-Gris_oscuro">
              {processedPlanteles.map((item) => {
                const scopedReport = report ? scopedReportForProgressItem(report, item) : null;
                const exportBlockMessage = reportItemExportBlockMessage(scopedReport);
                const exportDisabled = Boolean(exportBlockMessage);

                return (
                <tr key={item.id} className="hover:bg-brand-Gris_bajo/10 transition-colors">

                  {/* Nombre del Plantel */}
                  <td className="py-4 px-6 text-left font-medium text-brand-Gris_oscuro/90">
                    {item.plantel}
                  </td>

                  {/* Barra Mágica */}
                  <td className="py-4 px-6">
                    {isScopedReport ? (
                      <div className="flex flex-col items-center justify-center gap-1">
                        <span className="font-title text-lg font-bold text-brand-Verde_oscuro">
                          {item.recordCount ?? 0}
                        </span>
                        <span className="font-body text-xs text-brand-Gris_oscuro/70">
                          {item.status}
                        </span>
                      </div>
                    ) : renderProgressBar(item)}
                  </td>

                  {/* Botones de documentos */}
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => handleGenerateCsv(item)}
                        disabled={generatingDocumentId === `${item.id}:csv` || exportDisabled}
                        aria-label={exportDisabled ? `${exportBlockMessage} ${item.plantel}` : `Descargar CSV para ${item.plantel}`}
                        title={exportBlockMessage || `Descargar CSV para ${item.plantel}`}
                        className="w-[104px] text-xs py-1.5 px-3 disabled:cursor-not-allowed"
                      >
                        {generatingDocumentId === `${item.id}:csv` ? 'Generando' : 'CSV'}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleGeneratePdf(item)}
                        disabled={generatingDocumentId === `${item.id}:pdf` || exportDisabled}
                        aria-label={exportDisabled ? `${exportBlockMessage} ${item.plantel}` : `Descargar PDF para ${item.plantel}`}
                        title={exportBlockMessage || `Descargar PDF para ${item.plantel}`}
                        className="w-[104px] text-xs py-1.5 px-3 disabled:cursor-not-allowed"
                      >
                        {generatingDocumentId === `${item.id}:pdf` ? 'Generando' : 'PDF'}
                      </Button>
                    </div>
                    {exportBlockMessage && (
                      <p className="mt-2 text-center font-body text-xs font-semibold text-brand-Status_rojo">
                        {exportBlockMessage}
                      </p>
                    )}
                  </td>

                </tr>
                );
              })}
              {processedPlanteles.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 px-6 text-center text-brand-Gris_oscuro/60">
                    No hay registros para el periodo seleccionado.
                  </td>
                </tr>
              )}
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
