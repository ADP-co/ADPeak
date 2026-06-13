import { useEffect, useMemo, useState } from 'react';
import { IndicatorsTable, type Indicator, type IndicatorStatus } from './IndicatorsTable';
import { Select } from './Select';
import { useAuth } from '../../context/AuthContext';
import { catalogPlanteles } from '../../api/catalog';
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
  onSelectIndicator?: (code: string) => void;
}

export const Dashboard = ({ onSelectIndicator }: DashboardProps) => {
  const { user } = useAuth();
  const [selectedCycle, setSelectedCycle] = useState(cycleOptions[0].value);
  const [selectedPlantel, setSelectedPlantel] = useState('todos');
  const [report, setReport] = useState<ExportReport | null>(null);
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
    let isMounted = true;
    const periodo = periodByCycle[selectedCycle] ?? periodByCycle['2025-2026'];

    setIsLoading(true);
    setLoadError('');

    fetchExportReport({
      cicloEscolar: selectedCycle,
      periodo,
      plantelId: selectedPlantel === 'todos' ? undefined : selectedPlantel,
    })
      .then((nextReport) => {
        if (isMounted) {
          setReport(nextReport);
        }
      })
      .catch(() => {
        if (isMounted) {
          setReport(null);
          setLoadError('No se pudo cargar la información del alcance seleccionado.');
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
  }, [selectedCycle, selectedPlantel, user?.id]);

  const scopedIndicators = useMemo(() => reportToIndicators(report), [report]);
  const totalRows = useMemo(
    () => report?.indicadores.flatMap((indicator) => indicator.datos).length ?? 0,
    [report]
  );

  const totalIndicators = scopedIndicators.length;
  const approvedCount = scopedIndicators.filter((indicator) => indicator.status === 'Aprobado').length;
  const pendingCount = scopedIndicators.filter((indicator) => indicator.status === 'Pendiente' || indicator.status === 'Corregir').length;
  const reviewCount = scopedIndicators.filter((indicator) => indicator.status === 'En revisión').length;

  const approvedPercentage = percentage(approvedCount, totalIndicators);
  const pendingPercentage = percentage(pendingCount, totalIndicators);
  const reviewPercentage = percentage(reviewCount, totalIndicators);
  const selectedCycleLabel = cycleOptions.find((option) => option.value === selectedCycle)?.label ?? selectedCycle;

  return (
    <div className="w-full max-w-[1250px] mx-auto pt-8 pb-10">
      <div className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="font-title text-3xl font-bold text-brand-Gris_oscuro">
              Progreso General
            </h1>
            <p className="mt-1 text-sm font-body text-brand-Gris_oscuro/70">
              {isLoading
                ? 'Actualizando alcance...'
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

            <Select
              aria-label="Plantel"
              value={selectedPlantel}
              onChange={(event) => setSelectedPlantel(event.target.value)}
              options={plantelOptions}
              variant="solid"
              containerClassName="w-44"
            />
          </div>
        </div>

        {loadError && (
          <p className="mb-4 text-sm font-body font-semibold text-brand-Status_rojo" role="alert">
            {loadError}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DonutCard
            title="Indicadores Aprobados"
            percentage={approvedPercentage}
            colorClass="bg-[#c2d500]"
            strokeColor="#C1D82F"
          />
          <DonutCard
            title="Indicadores Pendientes"
            percentage={pendingPercentage}
            colorClass="bg-[#fcd34d]"
            strokeColor="#FFD100"
          />
          <DonutCard
            title="Indicadores En Revisión"
            percentage={reviewPercentage}
            colorClass="bg-[#0ea5e9]"
            strokeColor="#00A4E4"
          />
        </div>
      </div>

      <IndicatorsTable
        indicators={scopedIndicators}
        onSelectIndicator={onSelectIndicator}
        showScopeColumns
        periodLabel={`Ciclo ${selectedCycleLabel}`}
      />
    </div>
  );
};

function reportToIndicators(report: ExportReport | null): Indicator[] {
  if (!report) {
    return [];
  }

  return report.indicadores
    .filter((indicator) => indicator.id !== 'fuentes-oficiales-cargadas')
    .map((indicator) => {
      const rows = indicator.datos;
      const planteles = uniqueLabels(rows.map((row) => row.plantel).filter(Boolean));
      const responsables = uniqueLabels(rows.map((row) => row.responsable).filter(Boolean));

      return {
        code: indicator.id ?? slugCode(indicator.nombre),
        name: indicator.nombre,
        status: statusFromRows(rows),
        plantel: summarizeLabels(planteles, 'planteles'),
        supervisor: summarizeLabels(responsables, 'responsables'),
        responsable: summarizeLabels(responsables, 'responsables'),
        contribuidor: summarizeLabels(planteles, 'planteles'),
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code, 'es', { numeric: true }));
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
