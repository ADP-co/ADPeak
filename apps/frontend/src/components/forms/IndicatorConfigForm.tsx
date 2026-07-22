import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, PlusCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { ColumnConfig } from './formConfig';
import { validateFormulaExpression } from './formula';
import {
  fetchIndicators,
  fetchIndicatorTemplate,
  fetchUsers,
  catalogPlanteles,
  effectivePlantelIdsForIndicator,
  plantelScopeLabelForIndicator,
  saveIndicator,
  type CatalogIndicator,
  type CatalogOperationalScope,
  type CatalogUser,
} from '../../api/catalog';

export type ColumnType = 'readonly' | 'number' | 'text' | 'calculated';

export const FIELD_EDITOR_PRIMARY_GRID =
  'grid min-w-0 gap-4 p-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-end';

export function supportsNumericValidation(type: ColumnType) {
  return type === 'number';
}

interface ConfigColumn {
  id: string;
  label: string;
  type: ColumnType;
  formula?: string;
  required?: boolean;
  min?: string;
  max?: string;
  integer?: boolean;
  qualityWarningMax?: string;
}

type EvidenceRulesConfig = {
  required: boolean;
  maxSizeMb: string;
  requireOpenBeforeApproval: boolean;
};

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
  const [indicatorCode, setIndicatorCode] = useState('');
  const [indicatorName, setIndicatorName] = useState('');
  const [responsables, setResponsables] = useState<string[]>(['']);
  const [operationalScope, setOperationalScope] = useState<CatalogOperationalScope>('all_planteles');
  const [selectedPlantelIds, setSelectedPlantelIds] = useState<number[]>([]);
  const [plantelSearch, setPlantelSearch] = useState('');
  const [contributors, setContributors] = useState<string[]>(['']);
  const [columns, setColumns] = useState<ConfigColumn[]>(isNew ? [] : defaultColumns);
  const [evidenceRules, setEvidenceRules] = useState<EvidenceRulesConfig>({
    required: true,
    maxSizeMb: '5',
    requireOpenBeforeApproval: true,
  });
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
        const currentResponsibleNames = (names: string[]) => cleanResponsibleNames(names, users);

        if (isNew) {
          setEditingIndicator(null);
          setIndicatorCode('');
          setIndicatorName('');
          setResponsables(['']);
          setOperationalScope('all_planteles');
          setSelectedPlantelIds([]);
          setPlantelSearch('');
          setContributors(['']);
          setColumns([]);
          setEvidenceRules({
            required: true,
            maxSizeMb: '5',
            requireOpenBeforeApproval: true,
          });
          return;
        }

        const currentIndicator = indicators.find(
          (indicator) => indicator.code === code || String(indicator.id) === code
        );

        if (!currentIndicator) {
          setIndicatorName(code ?? '');
          setResponsables(['']);
          setOperationalScope('all_planteles');
          setSelectedPlantelIds([]);
          setContributors(['']);
          setColumns(defaultColumns);
          setEvidenceRules({
            required: true,
            maxSizeMb: '5',
            requireOpenBeforeApproval: true,
          });
          setLoadError('No se encontró el indicador; revisa el código antes de guardar.');
          return;
        }

        setEditingIndicator(currentIndicator);
        setIndicatorCode(currentIndicator.code);
        setIndicatorName(currentIndicator.name);
        setEvidenceRules({
          required: currentIndicator.evidenceRules?.required ?? true,
          maxSizeMb: String(currentIndicator.evidenceRules?.maxSizeMb ?? 5),
          requireOpenBeforeApproval: currentIndicator.evidenceRules?.requireOpenBeforeApproval ?? true,
        });
        setResponsables(nonEmptyList(currentResponsibleNames(currentIndicator.responsibleNames), ['']));

        const currentScope = currentIndicator.operationalScope ?? deriveOperationalScope(currentIndicator);
        const currentContributors = currentResponsibleNames(currentIndicator.contributorNames);
        setOperationalScope(currentScope);
        setSelectedPlantelIds(
          currentScope === 'specific_planteles'
            ? effectivePlantelIdsForIndicator(currentIndicator)
            : []
        );
        setPlantelSearch('');
        setContributors(
          currentScope === 'specific_responsables'
            ? nonEmptyList(currentContributors, [''])
            : ['']
        );

        const template = await fetchIndicatorTemplate(currentIndicator.code);

        if (isMounted) {
          setColumns(
            template.columns.length > 0
              ? template.columns.map((column, index) => ({
                  id: column.key || `column-${index}`,
                  label: column.label,
                  type: column.type,
                  formula: formulaFromCalculation(column, template.columns),
                  required: column.required,
                  min: column.validation?.min !== undefined ? String(column.validation.min) : '',
                  max: column.validation?.max !== undefined ? String(column.validation.max) : '',
                  integer: column.validation?.integer,
                  qualityWarningMax: column.validation?.qualityWarningMax !== undefined ? String(column.validation.qualityWarningMax) : '',
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
        ...responsibleUserNames(catalogUsers),
        ...cleanResponsibleNames(responsables, catalogUsers),
      ]),
    [catalogUsers, responsables]
  );

  const contributorOptions = useMemo(
    () =>
      uniqueOptions([
        ...responsibleUserNames(catalogUsers),
        ...cleanResponsibleNames(contributors, catalogUsers),
      ]),
    [catalogUsers, contributors]
  );
  const filteredPlanteles = useMemo(() => {
    const search = normalizeSearchText(plantelSearch);

    return catalogPlanteles.filter((plantel) =>
      !search || normalizeSearchText(plantel.name).includes(search)
    );
  }, [plantelSearch]);

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
      { id: `local-${Date.now()}`, label: '', type: 'number' },
    ]);
  };

  const handleChangeColumn = (id: string, field: keyof ConfigColumn, value: string | boolean) => {
    setColumns((current) =>
      current.map((column) =>
        column.id === id ? updateConfigColumn(column, field, value) : column
      )
    );
  };

  const handleSave = async () => {
    const cleanedCode = indicatorCode.trim();
    const cleanedName = indicatorName.trim();
    const cleanedResponsables = normalizeList(responsables);
    const cleanedContributors = operationalScope === 'specific_responsables'
      ? normalizeList(contributors)
      : operationalScope === 'none' ? [] : ['Planteles'];

    if (!cleanedCode) {
      toast.error('Agrega el código del indicador');
      return;
    }

    if (!isValidIndicatorCode(cleanedCode)) {
      toast.error('Usa un código válido, por ejemplo 1.2.3.4.5');
      return;
    }

    if (!cleanedName) {
      toast.error('Agrega el nombre del indicador');
      return;
    }

    if (cleanedResponsables.length === 0) {
      toast.error('Selecciona al menos un responsable');
      return;
    }

    if (operationalScope === 'specific_responsables' && cleanedContributors.length === 0) {
      toast.error('Selecciona al menos un responsable específico');
      return;
    }

    if (operationalScope === 'specific_planteles' && selectedPlantelIds.length === 0) {
      toast.error('Selecciona al menos un plantel específico');
      return;
    }

    const configuredTemplateColumns = buildTemplateColumns(columns);
    const canPersistTemplateColumns = !configuredTemplateColumns.error;
    const normalizedEvidenceRules = {
      required: evidenceRules.required,
      allowedTypes: ['application/pdf'],
      maxSizeMb: positiveNumberOrDefault(evidenceRules.maxSizeMb, 5),
      requireOpenBeforeApproval: evidenceRules.requireOpenBeforeApproval,
    };

    if (configuredTemplateColumns.error && isNew) {
      toast.error(configuredTemplateColumns.error);
      return;
    }

    const responsibleIds = idsForUserNames(cleanedResponsables, catalogUsers);
    const canSendResponsibleIds = responsibleIds.length === cleanedResponsables.length;
    const contributorResponsibleIds = operationalScope === 'specific_responsables'
      ? idsForUserNames(cleanedContributors, catalogUsers)
      : [];
    const canSendContributorResponsibleIds =
      operationalScope !== 'specific_responsables' || contributorResponsibleIds.length === cleanedContributors.length;
    const scopedPlantelIds = operationalScope === 'all_planteles'
      ? catalogPlanteles.map((plantel) => plantel.id)
      : operationalScope === 'specific_planteles' ? selectedPlantelIds : [];

    try {
      await saveIndicator({
        id: editingIndicator?.id,
        code: editingIndicator?.code ?? cleanedCode,
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
        contributorResponsibleIds: canSendContributorResponsibleIds ? contributorResponsibleIds : undefined,
        contributorNames: cleanedContributors,
        activities: editingIndicator?.activities?.length
          ? editingIndicator.activities
          : configuredTemplateColumns.columns.length > 0
            ? ['Captura configurada']
            : ['Actividad general'],
        operationalScope,
        plantelIds: scopedPlantelIds,
        templateColumns: canPersistTemplateColumns ? configuredTemplateColumns.columns : undefined,
        evidenceRules: normalizedEvidenceRules,
      });
      toast.success('Configuración guardada');
      handleBack();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar');
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
            {editingIndicator?.code ?? (indicatorCode || 'Nuevo indicador')}
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
          label="Código del indicador"
          value={indicatorCode}
          placeholder="Ej. 1.2.3.4.5"
          onChange={(event) => setIndicatorCode(event.target.value)}
          disabled={isLoading || !isNew}
        />
        <Input
          label="Nombre del indicador"
          value={indicatorName}
          placeholder="Ej. Porcentaje de titulación por cohorte..."
          onChange={(event) => setIndicatorName(event.target.value)}
          disabled={isLoading}
        />
        {editingIndicator && (
          <div className="grid grid-cols-1 gap-2 rounded-lg border border-brand-Gris_bajo/40 bg-brand-Gris_bajo/5 px-4 py-3 md:grid-cols-[160px_1fr] md:items-center">
            <span className="text-xs font-bold uppercase tracking-wide text-brand-Gris_oscuro/60">
              Alcance actual
            </span>
            <span className="text-sm font-semibold text-brand-Gris_oscuro">
              {plantelScopeLabelForIndicator(editingIndicator)}
            </span>
          </div>
        )}
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
            <label htmlFor="indicator-operational-scope" className="block text-sm font-bold font-accent text-brand-Gris_oscuro mb-1">
              Alcance operativo
            </label>
            <p className="text-xs text-brand-Gris_oscuro/60 mb-3">Define quién puede consultar o capturar este indicador.</p>
            <select
              id="indicator-operational-scope"
              value={operationalScope}
              onChange={(event) => setOperationalScope(event.target.value as CatalogOperationalScope)}
              className="w-full h-10 rounded-md border border-brand-Gris_bajo/50 px-3 text-sm text-brand-Gris_oscuro font-body bg-brand-Blanco outline-none focus:border-brand-Verde_principal focus:ring-1 focus:ring-brand-Verde_principal"
            >
              <option value="all_planteles">Todos los planteles</option>
              <option value="specific_planteles">Planteles específicos</option>
              <option value="specific_responsables">Responsables específicos</option>
              <option value="none">Sin alcance operativo</option>
            </select>

            {operationalScope === 'specific_planteles' && (
              <div className="mt-4 space-y-3">
                <Input
                  label="Buscar plantel"
                  value={plantelSearch}
                  placeholder="Ej. Bachillerato 16"
                  onChange={(event) => setPlantelSearch(event.target.value)}
                  className="h-10"
                />
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-brand-Gris_bajo/30 bg-brand-Blanco p-2">
                  {filteredPlanteles.map((plantel) => (
                    <label key={plantel.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-brand-Gris_oscuro hover:bg-brand-Gris_bajo/10">
                      <input
                        type="checkbox"
                        checked={selectedPlantelIds.includes(plantel.id)}
                        onChange={(event) => setSelectedPlantelIds((current) =>
                          event.target.checked
                            ? [...new Set([...current, plantel.id])].sort((a, b) => a - b)
                            : current.filter((id) => id !== plantel.id)
                        )}
                        className="h-4 w-4 accent-brand-Verde_principal"
                      />
                      {plantel.name}
                    </label>
                  ))}
                  {filteredPlanteles.length === 0 && (
                    <p className="px-2 py-3 text-sm text-brand-Gris_oscuro/60">No se encontraron planteles.</p>
                  )}
                </div>
                <p className="text-xs font-semibold text-brand-Gris_oscuro/70">
                  {selectedPlantelIds.length} plantel{selectedPlantelIds.length === 1 ? '' : 'es'} seleccionado{selectedPlantelIds.length === 1 ? '' : 's'}
                </p>
              </div>
            )}

            {operationalScope === 'specific_responsables' && (
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

            {operationalScope === 'none' && (
              <p className="mt-4 rounded-md border border-brand-Gris_bajo/30 bg-brand-Blanco px-3 py-2 text-xs text-brand-Gris_oscuro/70">
                El indicador quedará disponible para administración, sin tareas de captura para planteles.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-lg border border-brand-Gris_bajo/40 bg-brand-Gris_bajo/5 p-6 md:grid-cols-[1fr_160px_1fr] md:items-end">
          <div>
            <h3 className="font-title font-bold text-brand-Gris_oscuro">Reglas de evidencia</h3>
            <p className="mt-1 text-xs text-brand-Gris_oscuro/60">
              Controla si el archivo PDF es obligatorio y si el revisor debe abrirlo antes de aprobar.
            </p>
            <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-brand-Gris_oscuro">
              <input
                type="checkbox"
                checked={evidenceRules.required}
                onChange={(event) => setEvidenceRules((current) => ({ ...current, required: event.target.checked }))}
                className="h-4 w-4 accent-brand-Verde_principal"
              />
              Evidencia PDF obligatoria
            </label>
          </div>
          <Input
            label="Tamaño máximo MB"
            type="number"
            min="1"
            max="25"
            value={evidenceRules.maxSizeMb}
            onChange={(event) => setEvidenceRules((current) => ({ ...current, maxSizeMb: event.target.value }))}
            className="h-10"
          />
          <label className="flex items-center gap-2 text-sm font-semibold text-brand-Gris_oscuro">
            <input
              type="checkbox"
              checked={evidenceRules.requireOpenBeforeApproval}
              onChange={(event) => setEvidenceRules((current) => ({ ...current, requireOpenBeforeApproval: event.target.checked }))}
              className="h-4 w-4 accent-brand-Verde_principal"
            />
            Exigir abrir evidencia antes de aprobar
          </label>
        </div>

        <div className="rounded-lg border border-brand-Gris_bajo/40 bg-brand-Gris_bajo/5 p-4 md:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-title font-bold text-brand-Gris_oscuro">Campos a capturar</h3>
              <p className="mt-1 text-sm text-brand-Gris_oscuro/60">
                {columns.length === 1 ? '1 campo configurado' : `${columns.length} campos configurados`}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddColumn}
              className="inline-flex items-center justify-center gap-2 self-start rounded-full px-5 text-sm sm:self-auto"
            >
              <PlusCircle size={16} />
              Agregar campo
            </Button>
          </div>

          <div className="space-y-4">
            {columns.map((column, index) => (
              <section
                key={column.id}
                className="overflow-hidden rounded-lg border border-brand-Gris_bajo/30 bg-brand-Blanco shadow-sm"
              >
                <div className="flex min-h-12 items-center justify-between border-b border-brand-Gris_bajo/20 bg-brand-Gris_bajo/5 px-4 py-2">
                  <span className="text-xs font-bold uppercase text-brand-Gris_oscuro/70">Campo {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => setColumns((current) => current.filter((item) => item.id !== column.id))}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-brand-Gris_oscuro/55 transition-colors hover:bg-brand-Status_rojo/10 hover:text-brand-Status_rojo focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal focus-visible:ring-offset-2"
                    aria-label={`Eliminar campo ${column.label || index + 1}`}
                    title="Eliminar campo"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className={FIELD_EDITOR_PRIMARY_GRID}>
                  <Input
                    label="Nombre de columna"
                    value={column.label}
                    placeholder="Ej. Mujeres"
                    onChange={(event) => handleChangeColumn(column.id, 'label', event.target.value)}
                    className="h-10"
                  />
                  <div className="flex min-w-0 flex-col gap-1">
                    <label
                      htmlFor={`column-type-${column.id}`}
                      className="font-title text-sm font-semibold text-brand-Gris_oscuro"
                    >
                      Tipo de campo
                    </label>
                    <select
                      id={`column-type-${column.id}`}
                      className="h-10 w-full rounded-md border border-brand-Gris_bajo/50 bg-brand-Blanco px-3 font-body text-sm text-brand-Gris_oscuro outline-none focus:border-brand-Verde_principal focus:ring-1 focus:ring-brand-Verde_principal"
                      value={column.type}
                      onChange={(event) => handleChangeColumn(column.id, 'type', event.target.value)}
                    >
                      <option value="readonly">Solo lectura</option>
                      <option value="number">Número</option>
                      <option value="text">Texto</option>
                      <option value="calculated">Calculado con fórmula</option>
                    </select>
                  </div>
                </div>

                {column.type === 'calculated' && (
                  <div className="border-t border-brand-Gris_bajo/20 bg-brand-Gris_bajo/5 px-4 py-4">
                    <Input
                      label="Fórmula"
                      value={column.formula ?? ''}
                      placeholder="Ej. =Mujeres + Hombres"
                      onChange={(event) => handleChangeColumn(column.id, 'formula', event.target.value)}
                      className="h-10"
                    />
                    <p className="mt-1 text-xs text-brand-Gris_oscuro/60">
                      Usa columnas, + - * /, paréntesis y SUMA(). Para nombres largos usa corchetes.
                    </p>
                  </div>
                )}

                <fieldset className="border-t border-brand-Gris_bajo/20 bg-brand-Gris_bajo/5 px-4 py-4">
                  <legend className="sr-only">Validación del campo {column.label || index + 1}</legend>
                  <p className="mb-3 font-title text-sm font-bold text-brand-Gris_oscuro">Validación</p>
                  <div
                    className={
                      supportsNumericValidation(column.type)
                        ? 'grid gap-3 sm:grid-cols-2 xl:grid-cols-[180px_180px_repeat(3,minmax(120px,1fr))]'
                        : 'grid gap-3 sm:grid-cols-2'
                    }
                  >
                    <label className="flex min-h-10 items-center gap-2 rounded-md border border-brand-Gris_bajo/35 bg-brand-Blanco px-3 py-2 text-sm font-semibold text-brand-Gris_oscuro">
                      <input
                        type="checkbox"
                        checked={Boolean(column.required)}
                        onChange={(event) => handleChangeColumn(column.id, 'required', event.target.checked)}
                        className="h-4 w-4 shrink-0 accent-brand-Verde_principal"
                      />
                      Requerido
                    </label>

                    {supportsNumericValidation(column.type) && (
                      <>
                        <label className="flex min-h-10 items-center gap-2 rounded-md border border-brand-Gris_bajo/35 bg-brand-Blanco px-3 py-2 text-sm font-semibold text-brand-Gris_oscuro">
                          <input
                            type="checkbox"
                            checked={Boolean(column.integer)}
                            onChange={(event) => handleChangeColumn(column.id, 'integer', event.target.checked)}
                            className="h-4 w-4 shrink-0 accent-brand-Verde_principal"
                          />
                          Solo enteros
                        </label>
                        <Input
                          label="Mínimo"
                          type="number"
                          value={column.min ?? ''}
                          onChange={(event) => handleChangeColumn(column.id, 'min', event.target.value)}
                          className="h-10"
                        />
                        <Input
                          label="Máximo"
                          type="number"
                          value={column.max ?? ''}
                          onChange={(event) => handleChangeColumn(column.id, 'max', event.target.value)}
                          className="h-10"
                        />
                        <Input
                          label="Alerta si supera"
                          type="number"
                          value={column.qualityWarningMax ?? ''}
                          onChange={(event) => handleChangeColumn(column.id, 'qualityWarningMax', event.target.value)}
                          className="h-10"
                        />
                      </>
                    )}
                  </div>
                </fieldset>
              </section>
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

function isValidIndicatorCode(value: string) {
  return /^(?!TMP(?:-|$))(?!FMT(?:-|$))[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/i.test(value);
}

function buildTemplateColumns(columns: ConfigColumn[]) {
  const seenKeys = new Set<string>();
  const templateColumns: ColumnConfig[] = columns
    .filter((column) => column.label.trim())
    .map((column) => {
      const key = stableColumnKey(column, seenKeys);
      const templateColumn: ColumnConfig = {
        key,
        label: column.label.trim(),
        type: column.type,
        required: Boolean(column.required),
      };

      const validation = validationFromConfigColumn(column);

      if (validation) {
        templateColumn.validation = validation;
      }

      if (column.type === 'calculated') {
        templateColumn.calculation = {
          type: 'formula',
          expression: column.formula?.trim() ?? '',
          decimals: 2,
        };
      }

      return templateColumn;
    });

  for (const column of templateColumns) {
    if (column.type !== 'calculated') {
      continue;
    }

    const error = validateFormulaExpression(
      column.calculation?.type === 'formula' ? column.calculation.expression : '',
      templateColumns,
      column.key
    );

    if (error) {
      return { columns: templateColumns, error: `${column.label}: ${error}` };
    }
  }

  return { columns: templateColumns, error: '' };
}

function updateConfigColumn(column: ConfigColumn, field: keyof ConfigColumn, value: string | boolean): ConfigColumn {
  if (field === 'required' || field === 'integer') {
    return { ...column, [field]: Boolean(value) };
  }

  if (field === 'type') {
    const type = String(value) as ColumnType;
    return {
      ...column,
      type,
      formula: type === 'calculated' ? column.formula : undefined,
      integer: type === 'number' ? column.integer : false,
      min: type === 'number' ? column.min : '',
      max: type === 'number' ? column.max : '',
      qualityWarningMax: type === 'number' ? column.qualityWarningMax : '',
    };
  }

  if (field === 'formula' || field === 'label' || field === 'min' || field === 'max' || field === 'qualityWarningMax') {
    return { ...column, [field]: String(value) };
  }

  return column;
}

function validationFromConfigColumn(column: ConfigColumn): ColumnConfig['validation'] | undefined {
  if (column.type !== 'number') {
    return undefined;
  }

  const validation: NonNullable<ColumnConfig['validation']> = {};
  const min = optionalNumber(column.min);
  const max = optionalNumber(column.max);
  const qualityWarningMax = optionalNumber(column.qualityWarningMax);

  if (min !== undefined) {
    validation.min = min;
  }

  if (max !== undefined) {
    validation.max = max;
  }

  if (column.integer) {
    validation.integer = true;
  }

  if (qualityWarningMax !== undefined) {
    validation.qualityWarningMax = qualityWarningMax;
  }

  return Object.keys(validation).length > 0 ? validation : undefined;
}

function optionalNumber(value?: string) {
  if (!value?.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function positiveNumberOrDefault(value: string, fallback: number) {
  const parsed = optionalNumber(value);
  return parsed && parsed > 0 ? parsed : fallback;
}

function stableColumnKey(column: ConfigColumn, seenKeys: Set<string>) {
  const rawKey = column.id && !column.id.startsWith('local-') ? column.id : column.label;
  const baseKey = normalizeKey(rawKey) || 'campo';
  let key = baseKey;
  let counter = 2;

  while (seenKeys.has(key)) {
    key = `${baseKey}_${counter}`;
    counter += 1;
  }

  seenKeys.add(key);
  return key;
}

function formulaFromCalculation(column: ColumnConfig, columns: ColumnConfig[]) {
  if (!column.calculation) {
    return '';
  }

  if (column.calculation.type === 'formula') {
    return column.calculation.expression;
  }

  if (column.calculation.type === 'sum') {
    return `=${column.calculation.sourceKeys.map((key) => formulaReference(labelForColumnKey(key, columns))).join(' + ')}`;
  }

  return `=${formulaReference(labelForColumnKey(column.calculation.numeratorKey, columns))} / ${formulaReference(labelForColumnKey(column.calculation.denominatorKey, columns))} * 100`;
}

function labelForColumnKey(key: string, columns: ColumnConfig[]) {
  return columns.find((column) => column.key === key)?.label ?? key;
}

function formulaReference(label: string) {
  return /[^a-zA-Z0-9_]/.test(label) ? `[${label}]` : label;
}

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

function responsibleUserNames(users: CatalogUser[]) {
  return users
    .filter((user) => user.active && user.role === 'responsable')
    .map((user) => user.name);
}

function cleanResponsibleNames(names: string[], users: CatalogUser[]) {
  const validNames = new Set(responsibleUserNames(users));
  return normalizeList(names).filter((name) => validNames.has(name) && !isGhostUserName(name));
}

function isGhostUserName(name: string) {
  const normalized = normalizeText(name);
  return /^usuario\d*$/.test(normalized) ||
    /^revisor\s*\d*$/.test(normalized) ||
    normalized === 'supervisor' ||
    normalized.includes('demo') ||
    normalized === 'director dgems';
}

function isPlantelContributor(contributors: string[]) {
  return contributors.length === 0 || contributors.some((contributor) => normalizeText(contributor).includes('plantel'));
}

function deriveOperationalScope(indicator: CatalogIndicator): CatalogOperationalScope {
  if (
    (indicator.contributorResponsibleIds?.length ?? 0) > 0 ||
    (indicator.contributorNames.length > 0 && !isPlantelContributor(indicator.contributorNames))
  ) {
    return 'specific_responsables';
  }

  const plantelIds = effectivePlantelIdsForIndicator(indicator);

  if (plantelIds.length === 0) {
    return 'none';
  }

  return plantelIds.length === catalogPlanteles.length ? 'all_planteles' : 'specific_planteles';
}

function normalizeSearchText(value: string) {
  return normalizeText(value).trim();
}

function idsForUserNames(names: string[], users: CatalogUser[]) {
  return names
    .map((name) => users.find((user) => user.role === 'responsable' && user.name === name)?.responsableId)
    .filter((id): id is number => Number.isInteger(id));
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeKey(value: string) {
  return normalizeText(value)
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
