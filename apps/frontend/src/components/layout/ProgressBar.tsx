interface ProgressBarProps {
  totalIndicators: number;
  completedIndicators: number;
}

export const ProgressBar = ({ totalIndicators, completedIndicators }: ProgressBarProps) => {
  // Calculamos el porcentaje
  const porcentaje = totalIndicators > 0
    ? Math.min(Math.max((completedIndicators / totalIndicators) * 100, 0), 100)
    : 0;

  // Redondeamos para tener un número entero
  const PorcentajeFinal = Math.round(porcentaje);

  return (
    <div className="w-full max-w-[1250px] mx-auto pt-8 pb-4 flex items-center gap-4">
      <div
        className="h-6 w-full bg-brand-Verde_principal/20 rounded-full overflow-hidden relative drop-shadow-sm"
        title={`Progreso: ${completedIndicators} de ${totalIndicators} indicadores`}
        role="progressbar"
        aria-label="Progreso de indicadores"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={PorcentajeFinal}
      >
        {/* Barra de Progreso Activa*/}
        <div
          className="h-full bg-brand-Verde_principal transition-all duration-500 ease-out"
          style={{ width: `${porcentaje}%` }}
        />

        {/* Texto centrado sobre la barra */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="font-accent text-xs font-bold text-brand-Gris_oscuro drop-shadow-md">
            {PorcentajeFinal}%
          </span>
        </div>
      </div>

    </div>
  );
};
