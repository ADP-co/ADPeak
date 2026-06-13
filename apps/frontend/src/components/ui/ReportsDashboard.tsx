import { useState, useEffect } from 'react';
import { Select } from './Select';
import { Button } from './Button';
import {
  countReportRows,
  fetchExportReport,
  reportToCsv,
  reportToPdfBlob,
  type ExportReport,
} from '../../api/reportes';
import {
  fallbackOfficialSources,
  fetchOfficialSources,
  type OfficialSourcesPayload,
} from '../../api/officialData';

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
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
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

function buildFallbackReport(
  item: PlantelProgressRecord,
  selectedDate: string,
  officialSources: OfficialSourcesPayload
): ExportReport {
  const fechaGeneracion = new Date().toISOString().slice(0, 10);
  const officialIndicator = item.plantelId === '1'
    ? {
        nombre: 'Fuentes oficiales cargadas',
        descripcion: 'Inventario agregado del paquete oficial recibido.',
        datos: officialSources.evidenceGroups.map((group, index) => ({
          id: `fuente-oficial-${index + 1}`,
          actividad: group.category,
          responsable: officialSources.summary.plantel,
          estado: 'Aprobado',
          avance: '100%',
          plantel: officialSources.summary.plantel,
          plantelId: '1',
          periodo: selectedDate,
          ciclo: '2025-2026',
          meta: group.fileCount,
          evidencias: group.fileCount,
          vencimiento: 'en_tiempo',
        })),
      }
    : undefined;

  return {
    tipoReporte: 'plantel',
    periodo: selectedDate || '2026-A',
    cicloEscolar: '2025-2026',
    fechaGeneracion,
    identidadReporte: {
      tipo: 'Plantel',
      nombre: item.plantel,
    },
    indicadores: [
      {
        nombre: 'Porcentaje de titulación por cohorte del NMS',
        descripcion: 'Registros capturados por programa educativo del plantel.',
        datos: [
          {
            id: `${item.id}-titulacion-ap`,
            actividad: 'Captura de egresados titulados',
            responsable: 'Responsable académico',
            estado: item.status,
            avance: `${item.percentage}%`,
            plantel: item.plantel,
            periodo: selectedDate,
            ciclo: 'POA 2026',
            meta: 100,
            evidencias: item.status === 'Rezagado' ? 0 : 1,
            vencimiento: item.status === 'Rezagado' ? 'atrasado' : 'en_tiempo',
          },
          {
            id: `${item.id}-matricula-ap`,
            actividad: 'Validación de matrícula de primer ingreso',
            responsable: 'Coordinación de planeación',
            estado: item.status,
            avance: `${Math.max(item.percentage - 10, 0)}%`,
            plantel: item.plantel,
            periodo: selectedDate,
            ciclo: 'POA 2026',
            meta: 100,
            evidencias: item.status === 'Completo' ? 2 : 1,
            vencimiento: item.status === 'Rezagado' ? 'atrasado' : 'en_tiempo',
          },
        ],
      },
      {
        nombre: 'Seguimiento de evidencias POA',
        descripcion: 'Detalle de evidencias asociadas al avance reportado.',
        datos: [
          {
            id: `${item.id}-evidencia-poa`,
            actividad: 'Revisión documental de evidencias',
            responsable: 'Responsable de indicador',
            estado: item.status,
            avance: `${item.percentage}%`,
            plantel: item.plantel,
            periodo: selectedDate,
            ciclo: 'POA 2026',
            meta: 100,
            evidencias: item.status === 'Completo' ? 3 : 1,
            vencimiento: item.status === 'Rezagado' ? 'atrasado' : 'en_tiempo',
          },
        ],
      },
      ...(officialIndicator ? [officialIndicator] : []),
    ],
  };
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Tipado para la tabla de planteles
type PlantelStatus = 'Completo' | 'En Revisión' | 'En Progreso' | 'Rezagado';

interface PlantelProgressRecord {
  id: string;
  plantel: string;
  plantelId: string;
  periodos: string[];
  percentage: number;
  status: PlantelStatus;
}

const periodOptions = [
  { value: '2026-2', label: '2026-2' },
  { value: '2026-1', label: '2026-1' },
];

// Pantalla Principal de Reportes
export const ReportsDashboard = () => {

  // Estados para simular la carga del backend
  const [dateOptions, setDateOptions] = useState<{value: string, label: string}[]>(periodOptions);
  const [selectedDate, setSelectedDate] = useState(periodOptions[0].value);

  // Estado para el filtrado
  const [filterBy, setFilterBy] = useState('todos');
  const [reportMessage, setReportMessage] = useState('');
  const [generatingDocumentId, setGeneratingDocumentId] = useState<string | null>(null);
  const [officialSources, setOfficialSources] = useState<OfficialSourcesPayload>(fallbackOfficialSources);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 600));
        const mockDates = periodOptions;
        // Ordenar fechas de la más actual a la más antigua
        setDateOptions(mockDates);
        setSelectedDate((current) => current || mockDates[0].value);
      } catch (error) {
        console.error("Error al cargar los filtros:", error);
      }
    };
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchOfficialSources().then(setOfficialSources);
  }, []);

  // Datos de avance disponibles para la entrega actual.
  const mockPlanteles: PlantelProgressRecord[] = [
    {
      id: 'bach-16',
      plantel: officialSources.summary.plantel,
      plantelId: '1',
      periodos: ['2026-1', '2026-2'],
      percentage: 100,
      status: 'Completo',
    },
    { id: 'bach-4', plantel: 'Bachillerato 4', plantelId: '2', periodos: ['2026-1'], percentage: 80, status: 'Completo' },
    { id: 'bach-1', plantel: 'Bachillerato 1', plantelId: '3', periodos: ['2026-2'], percentage: 48, status: 'En Revisión' },
    { id: 'bach-33', plantel: 'Bachillerato 33', plantelId: '4', periodos: ['2026-2'], percentage: 20, status: 'Rezagado' },
  ];

  const loadReport = async (item: PlantelProgressRecord): Promise<ExportReport> => {
    setReportMessage(`Preparando ${item.plantel}...`);

    try {
      const report = await fetchExportReport({
        cicloEscolar: '2025-2026',
        periodo: selectedDate,
        plantelId: item.plantelId,
      });

      if (countReportRows(report) === 0) {
        throw new Error(`No hay registros para ${item.plantel}.`);
      }

      return report;
    } catch {
      setReportMessage(`Preparando informacion disponible para ${item.plantel}.`);
      return buildFallbackReport(item, selectedDate, officialSources);
    }
  };

  const downloadDocument = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleGenerateCsv = async (item: PlantelProgressRecord) => {
    setGeneratingDocumentId(`${item.id}:csv`);
    const report = await loadReport(item);
    const csv = reportToCsv(report);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const recordCount = countReportRows(report);

    downloadDocument(blob, `reporte-${slugify(item.plantel)}-${selectedDate}.csv`);
    setGeneratingDocumentId(null);
    setReportMessage(`Listo: ${recordCount} registros de ${item.plantel}.`);
  };

  const handleGeneratePdf = async (item: PlantelProgressRecord) => {
    setGeneratingDocumentId(`${item.id}:pdf`);
    const report = await loadReport(item);
    const pdf = await reportToPdfBlob(report);
    const recordCount = countReportRows(report);

    downloadDocument(pdf, `reporte-${slugify(item.plantel)}-${selectedDate}.pdf`);
    setGeneratingDocumentId(null);
    setReportMessage(`Listo: ${recordCount} registros de ${item.plantel}.`);
  };

  // Filtramos por progreso y siempre ordenamos alfabéticamente/numéricamente por plantel
  const visiblePlanteles = mockPlanteles.filter((item) => !selectedDate || item.periodos.includes(selectedDate));
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
      <div className={`relative w-full h-6 rounded-full overflow-hidden ${bgColor}`}>
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
        <div className="flex flex-wrap items-center justify-between mb-4">
          <h1 className="font-title text-3xl font-bold text-brand-Gris_oscuro">
            Reportes Dinámicos
          </h1>
          <div className="flex gap-4">
            <Select
              id="reports-period-filter"
              aria-label="Periodo del reporte"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              options={dateOptions}
              variant="outline"
              containerClassName="w-36"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DonutCard
            title="Bachilleratos Completos"
            percentage={completosPercentage}
            colorClass="bg-[#C1D82F]"
            strokeColor="#C1D82F"
          />
          <DonutCard
            title="Bachilleratos Pendientes"
            percentage={pendientesPercentage}
            colorClass="bg-[#FFD100]"
            strokeColor="#FFD100"
          />
          <DonutCard
            title="Bachilleratos Rezagados"
            percentage={rezagadosPercentage}
            colorClass="bg-[#770F00]"
            strokeColor="#770F00"
          />
        </div>
      </div>

      {/* Tabla de Progreso */}
      <div>
        <div className="flex flex-wrap items-center justify-between mb-4">
          <h2 className="font-title text-3xl font-bold text-brand-Gris_oscuro">
            Progreso de los Planteles
          </h2>
          <div className="flex items-center gap-2">
            <label htmlFor="reports-status-filter" className="text-xs text-brand-Gris_oscuro font-bold font-accent">Filtrar por</label>
            <Select
              id="reports-status-filter"
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'Completo', label: 'Completo' },
                { value: 'En Revisión', label: 'En Revisión' },
                { value: 'En Progreso', label: 'En Progreso' },
                { value: 'Rezagado', label: 'Rezagado' }
              ]}
              variant="solid"
              containerClassName="w-36"
            />
          </div>
        </div>

        {reportMessage && (
          <p className="mb-4 text-sm font-body font-semibold text-brand-Verde_oscuro">
            {reportMessage}
          </p>
        )}

        <div className="bg-brand-Blanco rounded-lg shadow-md border border-brand-Gris_bajo/20 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-center">

            <thead>
              <tr className="bg-brand-Gris_bajo/35 text-brand-Gris_oscuro font-title font-bold text-sm select-none border-b border-brand-Gris_bajo/20">
                <th className="py-4 px-6 w-[20%] text-left">Plantel</th>
                <th className="py-4 px-6 w-[55%]">Progreso</th>
                <th className="py-4 px-6 w-[25%]">Documentos</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-brand-Gris_bajo/20 font-body text-sm text-brand-Gris_oscuro">
              {processedPlanteles.map((item) => (
                <tr key={item.id} className="hover:bg-brand-Gris_bajo/10 transition-colors">

                  {/* Nombre del Plantel */}
                  <td className="py-4 px-6 text-left font-medium text-brand-Gris_oscuro/90">
                    {item.plantel}
                  </td>

                  {/* Barra Mágica */}
                  <td className="py-4 px-6">
                    {renderProgressBar(item)}
                  </td>

                  {/* Botones de documentos */}
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => handleGenerateCsv(item)}
                        disabled={generatingDocumentId === `${item.id}:csv`}
                        aria-label={`Descargar CSV para ${item.plantel}`}
                        className="w-[104px] text-xs py-1.5 px-3"
                      >
                        {generatingDocumentId === `${item.id}:csv` ? 'Generando' : 'CSV'}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleGeneratePdf(item)}
                        disabled={generatingDocumentId === `${item.id}:pdf`}
                        aria-label={`Descargar PDF para ${item.plantel}`}
                        className="w-[104px] text-xs py-1.5 px-3"
                      >
                        {generatingDocumentId === `${item.id}:pdf` ? 'Generando' : 'PDF'}
                      </Button>
                    </div>
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
