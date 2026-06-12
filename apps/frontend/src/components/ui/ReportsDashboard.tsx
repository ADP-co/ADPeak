import { useState, useEffect } from 'react';
import { Select } from './Select';
import { Button } from './Button';
import {
  countReportRows,
  fetchExportReport,
  reportToCsv,
  type ExportReport,
} from '../../api/reportes';

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

function buildFallbackReport(item: PlantelProgressRecord, selectedDate: string): ExportReport {
  const fechaGeneracion = new Date().toISOString().slice(0, 10);

  return {
    tipoReporte: 'plantel',
    periodo: selectedDate || '2026-A',
    cicloEscolar: selectedDate || '2025-2026',
    fechaGeneracion,
    identidadReporte: {
      tipo: 'Plantel',
      nombre: item.plantel,
    },
    indicadores: [
      {
        nombre: 'Porcentaje de titulacion por cohorte del NMS',
        descripcion: 'Registros capturados por programa educativo del plantel.',
        datos: [
          {
            id: `${item.id}-titulacion-ap`,
            actividad: 'Captura de egresados titulados',
            responsable: 'Responsable academico',
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
            actividad: 'Validacion de matricula de primer ingreso',
            responsable: 'Coordinacion de planeacion',
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
            actividad: 'Revision documental de evidencias',
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
  percentage: number;
  status: PlantelStatus;
}

// Pantalla Principal de Reportes
export const ReportsDashboard = () => {

  // Estados para simular la carga del backend
  const [dateOptions, setDateOptions] = useState<{value: string, label: string}[]>([{ value: '', label: 'Cargando...' }]);
  const [selectedDate, setSelectedDate] = useState('');

  // Estado para el filtrado
  const [filterBy, setFilterBy] = useState('todos');
  const [reportMessage, setReportMessage] = useState('');
  const [generatingPlantelId, setGeneratingPlantelId] = useState<string | null>(null);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 600));
        const mockDates = [
          { value: '2024-2025', label: '2024 - 2025' },
          { value: '2025-2026', label: '2025 - 2026' }
        ];
        // Ordenar fechas de la más actual a la más antigua
        mockDates.sort((a, b) => b.value.localeCompare(a.value));
        setDateOptions(mockDates);
        setSelectedDate(mockDates[0].value);
      } catch (error) {
        console.error("Error al cargar los filtros:", error);
      }
    };
    fetchFilters();
  }, []);

  // Datos simulados extraídos
  const mockPlanteles: PlantelProgressRecord[] = [
    { id: '1', plantel: 'Bach. 16', percentage: 100, status: 'Completo' },
    { id: '2', plantel: 'Bach. 1', percentage: 100, status: 'Completo' },
    { id: '3', plantel: 'Bach. 2', percentage: 100, status: 'Completo' },
    { id: '4', plantel: 'Bach. 3', percentage: 100, status: 'Completo' },
    { id: '5', plantel: 'Bach. 4', percentage: 100, status: 'En Revisión' },
    { id: '6', plantel: 'Bach. 5', percentage: 100, status: 'En Revisión' },
    { id: '7', plantel: 'Bach. 6', percentage: 90, status: 'En Progreso' },
    { id: '8', plantel: 'Bach. 7', percentage: 85, status: 'En Progreso' },
    { id: '9', plantel: 'Bach. 8', percentage: 65, status: 'En Progreso' },
    { id: '10', plantel: 'Bach. 9', percentage: 5, status: 'Rezagado' },
    { id: '11', plantel: 'Bach. 10', percentage: 0, status: 'Rezagado' },
  ];

  const handleGenerateReport = async (item: PlantelProgressRecord) => {
    setGeneratingPlantelId(item.id);
    setReportMessage(`Generando reporte detallado para ${item.plantel}...`);

    let report: ExportReport;

    try {
      report = await fetchExportReport({
        cicloEscolar: selectedDate,
        periodo: selectedDate,
        plantel: item.plantel,
      });

      if (countReportRows(report) === 0) {
        report = buildFallbackReport(item, selectedDate);
      }
    } catch {
      report = buildFallbackReport(item, selectedDate);
    }

    const csv = reportToCsv(report);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const recordCount = countReportRows(report);

    link.href = url;
    link.download = `reporte-${slugify(item.plantel)}-${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setGeneratingPlantelId(null);
    setReportMessage(`Reporte generado para ${item.plantel}: ${recordCount} registros exportados.`);
  };

  // Filtramos por progreso y siempre ordenamos alfabéticamente/numéricamente por plantel
  const processedPlanteles = mockPlanteles
    .filter((item) => filterBy === 'todos' || item.status === filterBy)
    .sort((a, b) => a.plantel.localeCompare(b.plantel, undefined, { numeric: true }));

  // Cálculo automático para las gráficas
  const totalPlanteles = mockPlanteles.length;
  const completosCount = mockPlanteles.filter(p => p.status === 'Completo').length;
  // La gráfica de "Pendientes" incluye 'En Progreso' (> 15%) y 'En Revisión' (100% pero sin completar)
  const pendientesCount = mockPlanteles.filter(p => p.status === 'En Progreso' || p.status === 'En Revisión').length;
  const rezagadosCount = mockPlanteles.filter(p => p.status === 'Rezagado').length;

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
            <span className="text-xs text-brand-Gris_oscuro font-bold font-accent">Filtrar por</span>
            <Select
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

        <div className="bg-brand-Blanco rounded-lg shadow-md overflow-hidden border border-brand-Gris_bajo/20">
          <table className="w-full border-collapse text-center">

            <thead>
              <tr className="bg-brand-Gris_bajo/35 text-brand-Gris_oscuro font-title font-bold text-sm select-none border-b border-brand-Gris_bajo/20">
                <th className="py-4 px-6 w-[20%] text-left">Plantel</th>
                <th className="py-4 px-6 w-[55%]">Progreso</th>
                <th className="py-4 px-6 w-[25%]">Acción</th>
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

                  {/* Botón de Acción */}
                  <td className="py-4 px-6">
                    <Button
                      variant="secondary"
                      onClick={() => handleGenerateReport(item)}
                      disabled={generatingPlantelId === item.id}
                      className="w-[160px] text-xs py-1.5 px-4"
                    >
                      {generatingPlantelId === item.id ? 'Generando...' : 'Generar Reporte'}
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
