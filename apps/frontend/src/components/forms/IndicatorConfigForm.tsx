import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, GripVertical, PlusCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  fetchIndicators,
  fetchIndicatorTemplate,
  fetchUsers,
  saveIndicator,
  type CatalogIndicator,
  type CatalogUser,
} from '../../api/catalog';

type ColumnType = 'readonly' | 'number' | 'text' | 'calculated';

interface ConfigColumn {
  id: string;
  label: string;
  type: ColumnType;
}

const fallbackUsers = ['Usuario08', 'Usuario4', 'Usuario5', 'Supervisor', 'Revisor 1', 'Revisor 2'];
const defaultColumns: ConfigColumn[] = [
  { id: 'delegacion', label: 'Delegación', type: 'readonly' },
  { id: 'plantel', label: 'Plantel', type: 'readonly' },
  { id: 'programa', label: 'Programa Educativo', type: 'readonly' },
  { id: 'hombres', label: 'Hombres', type: 'number' },
  { id: 'mujeres', label: 'Mujeres', type: 'number' },
];

export const IndicatorConfigForm = ({ onBack }: { onBack?: () => void }) => {
  const { code } = useParams();
  const navigate = useNavigate();
  const isNew = code?.startsWith('TMP-');
  const [indicatorName, setIndicatorName] = useState('');
  const [responsables, setResponsables] = useState<string[]>(['']);
  const [contributorType, setContributorType] = useState<'planteles' | 'responsables'>('planteles');
  const [contributors, setContributors] = useState<string[]>(['']);
  const [columns, setColumns] = useState<ConfigColumn[]>(isNew ? [] : defaultColumns);
  const [catalogUsers, setCatalogUsers] = useState<CatalogUser[]>([]);
  const [editingIndicator, setEditingIndicator] = useState<CatalogIndicator | null>(null);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentValues() {
      setIsLoading(true);
      setLoadError('');

      try {
        const [users, indicators] = await Promise.all([fetchUsers(), fetchIndicators()]);

        if (!isMounted) {
          return;
        }

        setCatalogUsers(users);

        if (isNew) {
          setEditingIndicator(null);
          setIndicatorName('');
          setResponsables(['']);
          setContributorType('planteles');
          setContributors(['']);
          setColumns([]);
          return;
        }

        const currentIndicator = indicators.find(
          (indicator) => indicator.code === code || String(indicator.id) === code
        );

        if (!currentIndicator) {
          setIndicatorName(code ?? '');
          setResponsables(['']);
          setContributorType('planteles');
          setContributors(['']);
          setColumns(defaultColumns);
          setLoadError('No se encontró el indicador; revisa el código antes de guardar.');
          return;
        }

        setEditingIndicator(currentIndicator);
        setIndicatorName(currentIndicator.name);
        setResponsables(nonEmptyList(currentIndicator.responsibleNames, ['']));

        const currentContributors = nonEmptyList(currentIndicator.contributorNames, ['Planteles']);
        if (isPlantelContributor(currentContributors)) {
          setContributorType('planteles');
          setContributors(['']);
        } else {
          setContributorType('responsables');
          setContributors(currentContributors);
        }

        const template = await fetchIndicatorTemplate(currentIndicator.code);

        if (isMounted) {
          setColumns(
            template.columns.length > 0
              ? template.columns.map((column, index) => ({
                  id: column.key || `column-${index}`,
                  label: column.label,
                  type: column.type,
                }))
              : defaultColumns
          );
        }
      } catch {
        if (isMounted) {
          setLoadError('No se pudieron cargar los datos actuales del indicador.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCurrentValues();

    return () => {
      isMounted = false;
    };
  }, [code, isNew]);

  const responsibleOptions = useMemo(
    () =>
      uniqueOptions([
        ...catalogUsers.filter((user) => user.active && user.role !== 'plantel').map((user) => user.name),
        ...fallbackUsers,
        ...responsables,
      ]),
    [catalogUsers, responsables]
  );

  const contributorOptions = useMemo(
    () =>
      uniqueOptions([
        ...catalogUsers.filter((user) => user.active && user.role !== 'plantel').map((user) => user.name),
        ...fallbackUsers,
        ...contributors,
      ]),
    [catalogUsers, contributors]
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
    const cleanedName = indicatorName.trim();
    const cleanedResponsables = normalizeList(responsables);
    const cleanedContributors = contributorType === 'planteles' ? ['Planteles'] : normalizeList(contributors);

    if (!cleanedName) {
      toast.error('Agrega el nombre del indicador');
      return;
    }

    if (cleanedResponsables.length === 0) {
      toast.error('Selecciona al menos un responsable');
      return;
    }

    if (contributorType === 'responsables' && cleanedContributors.length === 0) {
      toast.error('Selecciona al menos un contribuidor');
      return;
    }

    const responsibleIds = idsForUserNames(cleanedResponsables, catalogUsers);
    const canSendResponsibleIds = responsibleIds.length === cleanedResponsables.length;

    try {
      await saveIndicator({
        id: editingIndicator?.id,
        code: isNew ? undefined : editingIndicator?.code ?? code,
        name: cleanedName,
        description:
          editingIndicator?.description && editingIndicator.description !== editingIndicator.name
            ? editingIndicator.description
            : cleanedName,
        dataType: editingIndicator?.dataType ?? 'number',
        period: editingIndicator?.period ?? '2026',
        active: editingIndicator?.active ?? true,
        primaryResponsibleId: canSendResponsibleIds ? responsibleIds[0] : undefined,
        responsibleIds: canSendResponsibleIds ? responsibleIds : undefined,
        responsibleNames: cleanedResponsables,
        contributorNames: cleanedContributors,
        activities: editingIndicator?.activities?.length
          ? editingIndicator.activities
          : columns.length > 0
            ? ['Captura configurada']
            : ['Actividad general'],
        plantelIds: editingIndicator?.plantelIds,
      });
      toast.success('Configuración guardada');
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
            {isNew ? 'NUEVO INDICADOR' : 'CONFIGURACIÓN DE INDICADOR'}
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
          placeholder="Ej. Porcentaje de titulación por cohorte..."
          onChange={(event) => setIndicatorName(event.target.value)}
          disabled={isLoading}
        />
        {isLoading && (
          <p className="text-sm font-body font-semibold text-brand-Verde_oscuro" role="status">
            Cargando datos actuales del indicador...
          </p>
        )}
        {loadError && (
          <p className="text-sm font-body font-semibold text-brand-Status_rojo" role="alert">
            {loadError}
          </p>
        )}

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
                    {responsibleOptions.map((user) => (
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
              <option value="responsables">Responsables específicos</option>
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
                      {contributorOptions.map((user) => (
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
                  <option value="number">Número</option>
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
          <Button type="button" variant="primary" onClick={handleSave} className="px-8" disabled={isLoading}>
            Guardar configuración
          </Button>
        </div>
      </div>
    </div>
  );
};

function normalizeList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

function nonEmptyList(values: string[] | undefined, fallback: string[]) {
  const normalized = normalizeList(values ?? []);
  return normalized.length > 0 ? normalized : fallback;
}

function uniqueOptions(values: string[]) {
  return Array.from(new Set(normalizeList(values))).sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
}

function isPlantelContributor(contributors: string[]) {
  return contributors.length === 0 || contributors.some((contributor) => normalizeText(contributor).includes('plantel'));
}

function idsForUserNames(names: string[], users: CatalogUser[]) {
  return names
    .map((name) => users.find((user) => user.name === name)?.responsableId)
    .filter((id): id is number => Number.isInteger(id));
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
