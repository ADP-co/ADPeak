import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, GripVertical, PlusCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { saveIndicator } from '../../api/catalog';

type ColumnType = 'readonly' | 'number' | 'text' | 'calculated';

interface ConfigColumn {
  id: string;
  label: string;
  type: ColumnType;
}

const mockUsers = ['Usuario08', 'Usuario4', 'Usuario5', 'Supervisor', 'Revisor 1', 'Revisor 2'];

export const IndicatorConfigForm = ({ onBack }: { onBack?: () => void }) => {
  const { code } = useParams();
  const navigate = useNavigate();
  const isNew = code?.startsWith('TMP-');
  const [indicatorName, setIndicatorName] = useState(isNew ? '' : 'Nombre del indicador');
  const [responsables, setResponsables] = useState<string[]>(['']);
  const [contributorType, setContributorType] = useState<'planteles' | 'responsables'>('planteles');
  const [contributors, setContributors] = useState<string[]>(['']);
  const [columns, setColumns] = useState<ConfigColumn[]>(
    isNew
      ? []
      : [
          { id: '1', label: 'Delegacion', type: 'readonly' },
          { id: '2', label: 'Plantel', type: 'readonly' },
          { id: '3', label: 'Programa Educativo', type: 'readonly' },
          { id: '4', label: 'Hombres', type: 'number' },
          { id: '5', label: 'Mujeres', type: 'number' },
        ]
  );

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    navigate('/indicadores');
  };

  const handleAddColumn = () => {
    setColumns((current) => [
      ...current,
      { id: `local-${Date.now()}`, label: 'Nueva columna', type: 'number' },
    ]);
  };

  const handleChangeColumn = (id: string, field: keyof ConfigColumn, value: string) => {
    setColumns((current) =>
      current.map((column) =>
        column.id === id ? { ...column, [field]: value as ConfigColumn[keyof ConfigColumn] } : column
      )
    );
  };

  const handleSave = async () => {
    try {
      await saveIndicator({
        code: isNew ? undefined : code,
        name: indicatorName,
        description: indicatorName,
        responsibleNames: responsables.filter(Boolean),
        contributorNames: contributorType === 'planteles' ? ['Planteles'] : contributors.filter(Boolean),
        activities: columns.length > 0 ? ['Captura configurada'] : ['Actividad general'],
        active: true,
      });
      toast.success('Configuracion guardada');
      handleBack();
    } catch {
      toast.error('No se pudo guardar');
    }
  };

  return (
    <div className="w-full max-w-[1000px] mx-auto bg-brand-Blanco rounded-lg shadow-md border border-brand-Gris_bajo/20 p-6">
      <div className="flex items-start justify-between mb-8">
        <div>
          <span className="text-sm font-accent text-brand-Gris_oscuro/60 font-bold tracking-wider">
            {isNew ? 'NUEVO INDICADOR' : 'CONFIGURACION DE INDICADOR'}
          </span>
          <h1 className="font-title text-2xl font-bold text-brand-Gris_oscuro mt-1">
            {code}
          </h1>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={handleBack}
          className="flex items-center gap-2 text-xs py-1.5 px-4 border-transparent"
        >
          <ArrowLeft size={18} strokeWidth={2.5} />
          Volver
        </Button>
      </div>

      <div className="space-y-6">
        <Input
          label="Nombre del indicador"
          value={indicatorName}
          placeholder="Ej. Porcentaje de titulacion por cohorte..."
          onChange={(event) => setIndicatorName(event.target.value)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border border-brand-Gris_bajo/40 rounded-lg bg-brand-Gris_bajo/5">
          <div>
            <label htmlFor="indicator-responsible-0" className="block text-sm font-bold font-accent text-brand-Gris_oscuro mb-1">
              Responsables generales
            </label>
            <p className="text-xs text-brand-Gris_oscuro/60 mb-3">Usuarios encargados de revisar y aprobar.</p>
            <div className="space-y-3">
              {responsables.map((responsable, index) => (
                <div key={index} className="flex items-center gap-2">
                  <select
                    id={`indicator-responsible-${index}`}
                    value={responsable}
                    onChange={(event) => {
                      const next = [...responsables];
                      next[index] = event.target.value;
                      setResponsables(next);
                    }}
                    className="w-full h-10 rounded-md border border-brand-Gris_bajo/50 px-3 text-sm text-brand-Gris_oscuro font-body bg-brand-Blanco outline-none focus:border-brand-Verde_principal focus:ring-1 focus:ring-brand-Verde_principal"
                  >
                    <option value="">Seleccione un usuario...</option>
                    {mockUsers.map((user) => (
                      <option key={user} value={user}>{user}</option>
                    ))}
                  </select>
                  {responsables.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setResponsables((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      className="p-2 text-brand-Gris_oscuro/40 hover:text-brand-Status_rojo transition-colors rounded-md hover:bg-brand-Status_rojo/10 flex-shrink-0"
                      aria-label={`Eliminar responsable ${index + 1}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setResponsables((current) => [...current, ''])}
                className="text-xs font-bold text-brand-Verde_principal flex items-center gap-1.5 hover:underline mt-1"
              >
                <PlusCircle size={14} /> Agregar responsable
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="indicator-contributor-type" className="block text-sm font-bold font-accent text-brand-Gris_oscuro mb-1">
              Contribuidor
            </label>
            <p className="text-xs text-brand-Gris_oscuro/60 mb-3">Quien debe capturar este indicador.</p>
            <select
              id="indicator-contributor-type"
              value={contributorType}
              onChange={(event) => setContributorType(event.target.value as 'planteles' | 'responsables')}
              className="w-full h-10 rounded-md border border-brand-Gris_bajo/50 px-3 text-sm text-brand-Gris_oscuro font-body bg-brand-Blanco outline-none focus:border-brand-Verde_principal focus:ring-1 focus:ring-brand-Verde_principal"
            >
              <option value="planteles">Planteles</option>
              <option value="responsables">Responsables especificos</option>
            </select>

            {contributorType === 'responsables' && (
              <div className="space-y-3 mt-4">
                {contributors.map((contributor, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      aria-label={`Contribuidor ${index + 1}`}
                      value={contributor}
                      onChange={(event) => {
                        const next = [...contributors];
                        next[index] = event.target.value;
                        setContributors(next);
                      }}
                      className="w-full h-10 rounded-md border border-brand-Gris_bajo/50 px-3 text-sm text-brand-Gris_oscuro font-body bg-brand-Blanco outline-none focus:border-brand-Verde_principal focus:ring-1 focus:ring-brand-Verde_principal"
                    >
                      <option value="">Seleccione un usuario...</option>
                      {mockUsers.map((user) => (
                        <option key={user} value={user}>{user}</option>
                      ))}
                    </select>
                    {contributors.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setContributors((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        className="p-2 text-brand-Gris_oscuro/40 hover:text-brand-Status_rojo transition-colors rounded-md hover:bg-brand-Status_rojo/10 flex-shrink-0"
                        aria-label={`Eliminar contribuidor ${index + 1}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setContributors((current) => [...current, ''])}
                  className="text-xs font-bold text-brand-Verde_principal flex items-center gap-1.5 hover:underline mt-1"
                >
                  <PlusCircle size={14} /> Agregar contribuidor
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="border border-brand-Gris_bajo/40 rounded-lg p-6 bg-brand-Gris_bajo/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-title font-bold text-brand-Gris_oscuro">Campos a capturar</h3>
            <Button type="button" variant="secondary" onClick={handleAddColumn} className="flex items-center gap-2 text-xs py-1.5">
              <PlusCircle size={16} />
              Agregar campo
            </Button>
          </div>

          <div className="space-y-3">
            {columns.map((column) => (
              <div key={column.id} className="flex flex-col md:flex-row md:items-center gap-4 bg-brand-Blanco p-3 rounded-md border border-brand-Gris_bajo/20 shadow-sm">
                <GripVertical size={20} className="hidden md:block text-brand-Gris_oscuro/30" />
                <Input
                  label="Nombre de columna"
                  value={column.label}
                  onChange={(event) => handleChangeColumn(column.id, 'label', event.target.value)}
                  className="h-10"
                />
                <select
                  aria-label={`Tipo de campo para ${column.label}`}
                  className="w-full md:w-48 h-10 rounded-md border border-brand-Gris_bajo/50 px-3 text-sm text-brand-Gris_oscuro font-body bg-brand-Blanco outline-none focus:border-brand-Verde_principal focus:ring-1 focus:ring-brand-Verde_principal"
                  value={column.type}
                  onChange={(event) => handleChangeColumn(column.id, 'type', event.target.value)}
                >
                  <option value="readonly">Solo lectura</option>
                  <option value="number">Numero</option>
                  <option value="text">Texto</option>
                  <option value="calculated">Calculado</option>
                </select>
                <button
                  type="button"
                  onClick={() => setColumns((current) => current.filter((item) => item.id !== column.id))}
                  className="p-2 text-brand-Gris_oscuro/40 hover:text-brand-Status_rojo transition-colors rounded-md hover:bg-brand-Status_rojo/10"
                  aria-label={`Eliminar campo ${column.label}`}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}

            {columns.length === 0 && (
              <p className="text-sm text-brand-Gris_oscuro/60 text-center py-4 bg-brand-Blanco rounded-md border border-brand-Gris_bajo/20 border-dashed">
                No hay campos configurados. Agrega uno para habilitar captura.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-brand-Gris_bajo/20">
          <Button type="button" variant="primary" onClick={handleSave} className="px-8">
            Guardar configuracion
          </Button>
        </div>
      </div>
    </div>
  );
};
