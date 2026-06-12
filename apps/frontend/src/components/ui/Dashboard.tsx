import { useState, useEffect } from 'react';
import {IndicatorsTable} from './IndicatorsTable';
import type { Indicator } from './IndicatorsTable';
import { Select } from './Select';

// Tarjeta de Gráfica de Dona ---
interface DonutCardProps {
  title: string;
  percentage: number;
  colorClass: string;
  strokeColor: string;
}

// Componente de dona de progreso
const DonutCard = ({ title, percentage, colorClass, strokeColor }: DonutCardProps) => {
  // Matemáticas para el SVG circular
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-brand-Blanco rounded-lg shadow-sm border border-brand-Gris_bajo/20 p-6 flex flex-col items-center relative">
      {/* Título y puntito de color */}
      <div className="w-full flex items-center justify-between mb-4">
        <h3 className="font-title text-brand-Gris_oscuro text-lg">{title}</h3>
        <div className={`w-4 h-4 rounded-full ${colorClass}`}></div>
      </div>

      {/* Gráfica de Dona SVG */}
      <div className="relative flex items-center justify-center w-32 h-32">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Círculo de fondo */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="12"
            className="text-brand-Gris_bajo/30"
          />
          {/* Círculo de progreso */}
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
        {/* Porcentaje en el centro */}
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

// Pantalla Principal del Dashboard ---
export const Dashboard = ({ onSelectIndicator }: DashboardProps) => {
  // Estados para almacenar las opciones de los filtros que vendrán del backend
  const [dateOptions, setDateOptions] = useState<{value: string, label: string}[]>([{ value: '', label: 'Cargando...' }]);
  const [plantelOptions, setPlantelOptions] = useState<{value: string, label: string}[]>([{ value: '', label: 'Cargando...' }]);

  // Estados para almacenar los valores actualmente seleccionados
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedPlantel, setSelectedPlantel] = useState('');

  // Efecto para simular la carga asíncrona desde el backend
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        // TODO: Reemplazar este delay y los mocks con llamadas reales a la API cuando esté listo
        // Ejemplo: const responseFechas = await axios.get('/api/fechas');

        // Simulación de retraso de red
        await new Promise(resolve => setTimeout(resolve, 600));

        // Datos Mockeados (simulando respuesta de backend)
        const mockDates = [
          { value: '2024-2025', label: '2024 - 2025' },
          { value: '2025-2026', label: '2025 - 2026' }
        ];

        // Ordenar fechas de la más actual a la más antigua
        mockDates.sort((a, b) => b.value.localeCompare(a.value));

        const mockPlanteles = [
          { value: 'todos', label: 'Todos' },
          ...Array.from({ length: 37 }, (_, i) => ({ value: `Bach${i + 1}`, label: `Bach. ${i + 1}` }))
        ];

        // Cargar estados con los datos
        setDateOptions(mockDates);
        setPlantelOptions(mockPlanteles);

        // Seleccionar el primer valor por defecto
        setSelectedDate(mockDates[0].value);
        setSelectedPlantel(mockPlanteles[0].value);
      } catch (error) {
        console.error("Error al cargar los filtros:", error);
      }
    };

    fetchFilters();
  }, []);

  // Datos simulados idénticos a tu imagen
  const DataIndicators: Indicator[] = [
    { code: '1.0.0.0.2', name: 'Porcentaje de titulación por cohorte del NMS', status: 'Pendiente' },
    { code: '1.1.0.0.1', name: 'Porcentaje de cobertura en educación media superior', status: 'En revisión' },
    { code: '1.1.1.0.1', name: 'Porcentaje de aceptación en educación media superior', status: 'En revisión' },
    { code: '1.1.1.1.1', name: 'Porcentaje de programas educativos de educación media superior nuevos', status: 'En revisión' },
    { code: '1.1.2.0.1', name: 'Porcentaje retención escolar de educación media superior', status: 'En revisión' },
    { code: '1.1.2.0.3', name: 'Tasa de abandono escolar de educación media superior', status: 'Corregir' },
    { code: '1.1.2.1.1', name: 'Porcentaje de estudiantes de educación media superior', status: 'Corregir' },
    { code: '1.1.2.1.3', name: 'Porcentaje de estudiantes de educación media superior que sus padres', status: 'Pendiente' },
    { code: '1.1.2.1.4', name: 'Porcentaje de estudiantes atendidos en los servicios de salud integral.', status: 'Pendiente' },
    { code: '1.1.2.2.1.', name: 'Porcentaje de estudiantes atendidos en acciones de reforzamiento', status: 'Pendiente' },
    { code: '1.1.2.2.5', name: 'Número de programas educativos de media superior', status: 'Aprobado' },
    { code: '1.1.2.2.8', name: 'Porcentaje de estudiantes certificados en el dominio de unal engua extranjera', status: 'Aprobado' },
  ];

  const statusSequence: Indicator['status'][] = ['Corregir', 'Pendiente', 'En revisión', 'Aprobado'];
  const selectedPlantelLabel = plantelOptions.find((option) => option.value === selectedPlantel)?.label ?? 'Todos';
  const visiblePlantel = selectedPlantel && selectedPlantel !== 'todos' ? selectedPlantelLabel : 'Todos los planteles';
  const scopedIndicators = DataIndicators.map((indicator, index) => {
    const plantelNumber = Number(selectedPlantel.replace(/\D/g, '')) || 0;
    const dateOffset = selectedDate === '2024-2025' ? 1 : 0;
    const scopedStatus = selectedPlantel && selectedPlantel !== 'todos'
      ? statusSequence[(index + plantelNumber + dateOffset) % statusSequence.length]
      : indicator.status;

    return {
      ...indicator,
      plantel: visiblePlantel,
      supervisor: 'Supervisor DGEMS',
      responsable: 'Usuario08',
      contribuidor: visiblePlantel,
      status: scopedStatus,
    };
  });

  // Cálculo automático de porcentajes
  const totalIndicators = scopedIndicators.length;
  const approvedCount = scopedIndicators.filter((i) => i.status === 'Aprobado').length;
  const pendingCount = scopedIndicators.filter((i) => i.status === 'Pendiente' || i.status === 'Corregir').length;
  const reviewCount = scopedIndicators.filter((i) => i.status === 'En revisión').length;

  const approvedPercentage = totalIndicators > 0 ? Math.round((approvedCount / totalIndicators) * 100) : 0;
  const pendingPercentage = totalIndicators > 0 ? Math.round((pendingCount / totalIndicators) * 100) : 0;
  const reviewPercentage = totalIndicators > 0 ? Math.round((reviewCount / totalIndicators) * 100) : 0;

  return (
    <div className="w-full max-w-[1250px] mx-auto pt-8 pb-10">

      {/* SECCIÓN 1: Tarjetas de Progreso General */}
      <div className="mb-10">
        <div className="flex flex-wrap items-center justify-between mb-4">
          <h1 className="font-title text-3xl font-bold text-brand-Gris_oscuro">
            Progreso General
          </h1>

          <div className="flex gap-4">

            {/* Filtro: Fecha */}
            <Select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              options={dateOptions}
              variant="outline"
              containerClassName="w-36"
            />

            {/* Filtro: Planteles */}
            <Select
              value={selectedPlantel}
              onChange={(e) => setSelectedPlantel(e.target.value)}
              options={plantelOptions}
              variant="solid"
              containerClassName="w-36"
            />

          </div>
        </div>

        {/* Grid de Donas */}
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

      {/*Tabla de Indicadores */}
      <IndicatorsTable indicators={scopedIndicators} onSelectIndicator={onSelectIndicator} showScopeColumns={false} />

    </div>
  );
};
