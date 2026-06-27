import { useEffect, useMemo, useState } from 'react';
import { IndicatorsTable, type Indicator, type IndicatorStatus } from './IndicatorsTable';
import { Select } from './Select';
import { useAuth } from '../../context/AuthContext';
import { catalogPlanteles } from '../../api/catalog';
import { fetchReviewCaptures, type ReviewCapture } from '../../api/capturas';
import { CAPTURE_CHANGED_EVENT } from '../../api/captureEvents';
import { fetchExportReport, type ExportReport, type ReportDataRow } from '../../api/reportes';

interface DonutCardProps {
  title: string;
  percentage: number;
  colorClass: string;
  strokeColor: string;
}

const cycleOptions = [
  { value: '2025-2026', label: '2025 - 2026' },
  { value: '2024-2025', label: '2024 - 2025' },
];

const periodByCycle: Record<string, string> = {
  '2025-2026': '2026-2',
  '2024-2025': '2025-2',
};

const DonutCard = ({ title, percentage, colorClass, strokeColor }: DonutCardProps) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-brand-Blanco rounded-lg shadow-sm border border-brand-Gris_bajo/20 p-6 flex flex-col items-center relative">
      <div className="w-full flex items-center justify-between mb-4">
        <h3 className="font-title text-brand-Gris_oscuro text-lg">{title}</h3>
        <div className={`w-4 h-4 rounded-full ${colorClass}`} />
      </div>

      <div className="relative flex items-center justify-center w-32 h-32">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="12"
            className="text-brand-Gris_bajo/30"
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

interface DashboardProps {
  onSelectIndicator?: (indicator: Indicator) => void;
  mode?: 'general' | 'responsible-review';
}

export const Dashboard = ({ onSelectIndicator, mode = 'general' }: DashboardProps) => {
  const { user } = useAuth();
  const isResponsible = user?.role === 'responsable';
  const isResponsibleReview = isResponsible && mode === 'responsible-review';
  const [selectedCycle, setSelectedCycle] = useState(cycleOptions[0].value);
  const [selectedPlantel, setSelectedPlantel] = useState('todos');
  const [report, setReport] = useState<ExportReport | null>(null);
  const [reviewCaptures, setReviewCaptures] = useState<ReviewCapture[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const plantelOptions = useMemo(
    () => [
      {
        value: 'todos',
        label: user?.role === 'responsable' ? 'Todos asignados' : 'Todos',
      },
      ...catalogPlanteles.map((plantel) => ({
        value: String(plantel.id),
        label: shortPlantelLabel(plantel.name),
      })),
    ],
    [user?.role]
  );

  useEffect(() => {
    const handleCaptureChanged = () => setRefreshToken((current) => current + 1);

    window.addEventListener(CAPTURE_CHANGED_EVENT, handleCaptureChanged);
    return () => window.removeEventListener(CAPTURE_CHANGED_EVENT, handleCaptureChanged);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const periodo = periodByCycle[selectedCycle] ?? periodByCycle['2025-2026'];

    setIsLoading(true);
    setLoadError('');

    const request = isResponsibleReview
      ? fetchReviewCaptures()
      : fetchExportReport({
          cicloEscolar: selectedCycle,
          periodo,
          plantelId: isResponsible || selectedPlantel === 'todos' ? undefined : selectedPlantel,
        });

    request
      .then((data) => {
        if (!isMounted) {
          return;
        }

        if (isResponsibleReview) {
          setReviewCaptures(data as ReviewCapture[]);
          setReport(null);
        } else {
          setReport(data as ExportReport);
          setReviewCaptures([]);
        }
      })
      .catch(() => {
        if (isMounted) {
          setReport(null);
          setReviewCaptures([]);
          setLoadError(isResponsibleReview
            ? 'No se pudo cargar la bandeja de revisión.'
            : 'No se pudo cargar la información del alcance seleccionado.');
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
  }, [isResponsible, isResponsibleReview, refreshToken, selectedCycle, selectedPlantel, user?.id]);

  const scopedIndicators = useMemo(
    () => isResponsibleReview ? reviewCaptures.map(reviewCaptureToIndicator) : reportToIndicators(report),
    [isResponsibleReview, report, reviewCaptures]
  );
  const totalRows = useMemo(
    () => report?.indicadores.flatMap((indicator) => indicator.datos).length ?? 0,
    [report]
  );

  const totalIndicators = scopedIndicators.length;
  const approvedCount = scopedIndicators.filter((indicator) => indicator.status === 'Aprobado').length;
  const pendingCount = scopedIndicators.filter((indicator) => indicator.status === 'Pendiente').length;
  const correctionCount = scopedIndicators.filter((indicator) => indicator.status === 'Corregir').length;
  const reviewCount = scopedIndicators.filter((indicator) => indicator.status === 'En revisión').length;

  const approvedPercentage = percentage(approvedCount, totalIndicators);
  const pendingPercentage = percentage(pendingCount, totalIndicators);
  const correctionPercentage = percentage(correctionCount, totalIndicators);
  const reviewPercentage = percentage(reviewCount, totalIndicators);
  const selectedCycleLabel = cycleOptions.find((option) => option.value === selectedCycle)?.label ?? selectedCycle;

  return (
    <div className="w-full max-w-[1250px] mx-auto pt-8 pb-10">
      <div className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="font-title text-3xl font-bold text-brand-Gris_oscuro">
              {isResponsibleReview ? 'Indicadores en revisión' : isResponsible ? 'Mis indicadores' : 'Progreso General'}
            </h1>
            <p className="mt-1 text-sm font-body text-brand-Gris_oscuro/70">
              {isLoading
                ? 'Actualizando alcance...'
                : isResponsible
                  ? `${totalIndicators} capturas por revisar`
                  : `${totalIndicators} indicadores y ${totalRows} registros visibles`}
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Select
              aria-label="Ciclo escolar"
              value={selectedCycle}
              onChange={(event) => setSelectedCycle(event.target.value)}
              options={cycleOptions}
              variant="outline"
              containerClassName="w-40"
            />

            {!isResponsible && (
              <Select
                aria-label="Plantel"
                value={selectedPlantel}
                onChange={(event) => setSelectedPlantel(event.target.value)}
                options={plantelOptions}
                variant="solid"
                containerClassName="w-44"
              />
            )}
          </div>
        </div>

        {loadError && (
          <p className="mb-4 text-sm font-body font-semibold text-brand-Status_rojo" role="alert">
            {loadError}
          </p>
        )}

        <div className={`grid grid-cols-1 gap-6 ${isResponsible ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
          <DonutCard
            title={isResponsible ? 'Pendientes' : 'Indicadores Aprobados'}
            percentage={isResponsible ? pendingPercentage : approvedPercentage}
            colorClass={isResponsible ? 'bg-[#fcd34d]' : 'bg-[#c2d500]'}
            strokeColor={isResponsible ? '#FFD100' : '#C1D82F'}
          />
          <DonutCard
            title={isResponsible ? 'En revisión' : 'Indicadores Pendientes'}
            percentage={isResponsible ? reviewPercentage : pendingPercentage}
            colorClass={isResponsible ? 'bg-[#0ea5e9]' : 'bg-[#fcd34d]'}
            strokeColor={isResponsible ? '#00A4E4' : '#FFD100'}
          />
          <DonutCard
            title={isResponsible ? 'Con observación' : 'Indicadores En Revisión'}
            percentage={isResponsible ? correctionPercentage : reviewPercentage}
            colorClass={isResponsible ? 'bg-[#770F00]' : 'bg-[#0ea5e9]'}
            strokeColor={isResponsible ? '#770F00' : '#00A4E4'}
          />
          {isResponsible && (
            <DonutCard
              title="Aprobados"
              percentage={approvedPercentage}
              colorClass="bg-[#c2d500]"
              strokeColor="#C1D82F"
            />
          )}
        </div>
      </div>

      <IndicatorsTable
        indicators={scopedIndicators}
        onSelectIndicator={onSelectIndicator}
        showScopeColumns={!isResponsible || isResponsibleReview}
        title={isResponsibleReview ? 'Capturas recibidas' : 'Indicadores'}
        periodLabel={`Ciclo ${selectedCycleLabel}`}
        emptyMessage={isResponsibleReview ? 'No hay capturas en revisión.' : 'No se encontraron indicadores.'}
      />
    </div>
  );
};

function reviewCaptureToIndicator(capture: ReviewCapture): Indicator {
  return {
    rowKey: `capture:${capture.captureId}`,
    code: capture.code,
    name: capture.name,
    plantelId: capture.plantelId,
    captureId: capture.captureId,
    actividadId: capture.actividadId,
    periodoId: capture.periodoId,
    status: 'En revisión',
    plantel: capture.plantel,
    supervisor: 'Responsable asignado',
    responsable: 'Responsable asignado',
    contribuidor: capture.plantel,
  };
}

function reportToIndicators(report: ExportReport | null, options: { splitByCapture?: boolean } = {}): Indicator[] {
  if (!report) {
    return [];
  }

  const rowsByIndicator = report.indicadores
    .filter((indicator) => indicator.id !== 'fuentes-oficiales-cargadas')
    .flatMap((indicator) => {
      const groupedRows = options.splitByCapture
        ? groupRowsForReview(indicator.datos)
        : [indicator.datos];

      return groupedRows.map((rows, groupIndex) => {
        const bestRow = rows.find((row) => normalizeStatus(row.estado) === 'En revisión') ?? rows[0];
        const planteles = uniqueLabels(rows.map((row) => row.plantel).filter(Boolean));
        const responsables = uniqueLabels(rows.map((row) => row.responsable).filter(Boolean));
        const code = indicator.id ?? slugCode(indicator.nombre);
        const rowKey = options.splitByCapture
          ? `${code}:${bestRow?.captureId ?? bestRow?.plantelId ?? groupIndex}`
          : code;

        return {
          rowKey,
          code,
          name: indicator.nombre,
          plantelId: bestRow?.plantelId ? Number(bestRow.plantelId) : undefined,
          captureId: bestRow?.captureId,
          actividadId: bestRow?.actividadId,
          periodoId: bestRow?.periodoId,
          status: statusFromRows(rows),
          plantel: summarizeLabels(planteles, 'planteles'),
          supervisor: summarizeLabels(responsables, 'responsables'),
          responsable: summarizeLabels(responsables, 'responsables'),
          contribuidor: summarizeLabels(planteles, 'planteles'),
        };
      });
    });

  return rowsByIndicator.sort((a, b) =>
    a.code.localeCompare(b.code, 'es', { numeric: true }) ||
    (a.plantel ?? '').localeCompare(b.plantel ?? '', 'es', { numeric: true })
  );
}

function groupRowsForReview(rows: ReportDataRow[]) {
  const grouped = new Map<string, ReportDataRow[]>();

  rows.forEach((row, index) => {
    const key = row.captureId
      ? `capture:${row.captureId}`
      : `scope:${row.plantelId ?? 'sin-plantel'}:${row.actividadId ?? index}`;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  });

  return Array.from(grouped.values());
}

function statusFromRows(rows: ReportDataRow[]): IndicatorStatus {
  if (rows.length === 0) {
    return 'Pendiente';
  }

  const statusPriority: Record<IndicatorStatus, number> = {
    Corregir: 1,
    Pendiente: 2,
    'En revisión': 3,
    Aprobado: 4,
  };
  const counts = rows.reduce<Record<IndicatorStatus, number>>((current, row) => {
    const status = normalizeStatus(row.estado);
    current[status] = (current[status] ?? 0) + 1;
    return current;
  }, {
    Corregir: 0,
    Pendiente: 0,
    'En revisión': 0,
    Aprobado: 0,
  });

  return (Object.entries(counts) as Array<[IndicatorStatus, number]>)
    .sort((a, b) => b[1] - a[1] || statusPriority[a[0]] - statusPriority[b[0]])[0][0];
}

function normalizeStatus(value: string): IndicatorStatus {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (normalized.includes('observado')) {
    return 'Corregir';
  }

  if (normalized.includes('borrador') || normalized.includes('pendiente')) {
    return 'Pendiente';
  }

  if (normalized.includes('enviado') || normalized.includes('revision')) {
    return 'En revisión';
  }

  return 'Aprobado';
}

function uniqueLabels(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]));
}

function summarizeLabels(values: string[], pluralLabel: string) {
  if (values.length === 0) {
    return 'Sin asignar';
  }

  if (values.length <= 2) {
    return values.join(', ');
  }

  return `${values.length} ${pluralLabel}`;
}

function percentage(count: number, total: number) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

function shortPlantelLabel(name: string) {
  return name
    .replace('Bachillerato en línea', 'Bach. en línea')
    .replace('Bachillerato', 'Bach.');
}

function slugCode(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
