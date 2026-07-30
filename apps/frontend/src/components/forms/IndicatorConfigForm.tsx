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

export interface ConfigColumn {
  id: string;
  label: string;
  type: ColumnType;
  formula?: string;
  decimals?: string;
  originalCalculation?: ColumnConfig['calculation'];
  originalValidation?: ColumnConfig['validation'];
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
  const [initialStructureFingerprint, setInitialStructureFingerprint] = useState('');

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
          setInitialStructureFingerprint('');
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
          setInitialStructureFingerprint('');
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
          setInitialStructureFingerprint(templateColumnsFingerprint(template.columns));
          setColumns(
            template.columns.length > 0
              ? configColumnsFromTemplate(template.columns)
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
    const duplicateResponsible = duplicateSelection(responsables);
    const duplicateContributor = operationalScope === 'specific_responsables'
      ? duplicateSelection(contributors)
      : '';

    if (duplicateResponsible) {
      toast.error(`El responsable "${duplicateResponsible}" está seleccionado más de una vez.`);
      return;
    }

    if (duplicateContributor) {
      toast.error(`El responsable específico "${duplicateContributor}" está seleccionado más de una vez.`);
      return;
    }

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
    const structureWasExplicitlyChanged = shouldPersistTemplateStructure(
      Boolean(isNew),
      configuredTemplateColumns.columns,
      initialStructureFingerprint
    );
    const normalizedEvidenceRules = {
      required: evidenceRules.required,
      allowedTypes: ['application/pdf'],
      maxSizeMb: positiveNumberOrDefault(evidenceRules.maxSizeMb, 5),
      requireOpenBeforeApproval: evidenceRules.required && evidenceRules.requireOpenBeforeApproval,
    };

    if (configuredTemplateColumns.error) {
      toast.error(configuredTemplateColumns.error);
      return;
    }

    const responsibleIds = idsForUserNames(cleanedResponsables, catalogUsers);
    if (responsibleIds.length !== cleanedResponsables.length) {
      toast.error('Uno de los responsables seleccionados ya no existe o no está activo. Recarga la página.');
      return;
    }

    const contributorResponsibleIds = operationalScope === 'specific_responsables'
      ? idsForUserNames(cleanedContributors, catalogUsers)
      : [];
    if (operationalScope === 'specific_responsables' && contributorResponsibleIds.length !== cleanedContributors.length) {
      toast.error('Uno de los responsables específicos ya no existe o no está activo. Recarga la página.');
      return;
    }
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
        primaryResponsibleId: responsibleIds[0],
        responsibleIds,
        responsibleNames: cleanedResponsables,
        contributorResponsibleIds,
        contributorNames: cleanedContributors,
        activities: editingIndicator?.activities?.length
          ? editingIndicator.activities
          : configuredTemplateColumns.columns.length > 0
            ? ['Captura configurada']
            : ['Actividad general'],
        operationalScope,
        plantelIds: scopedPlantelIds,
        templateColumns: structureWasExplicitlyChanged ? configuredTemplateColumns.columns : undefined,
        evidenceRules: normalizedEvidenceRules,
      });
      toast.success('Configuración guardada');
      handleBack();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar');
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1000px] rounded-lg border border-brand-Gris_bajo/20 bg-brand-Blanco p-4 shadow-md sm:p-6" aria-busy={isLoading}>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
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
          className="inline-flex self-start items-center gap-2 rounded-full border-transparent px-4 py-1.5 text-xs sm:self-auto"
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

        <div className="grid grid-cols-1 gap-6 rounded-lg border border-brand-Gris_bajo/40 bg-brand-Gris_bajo/5 p-4 md:grid-cols-2 md:p-6">
          <div>
            <label htmlFor="indicator-responsible-0" className="block text-sm font-bold font-accent text-brand-Gris_oscuro mb-1">
              Responsables generales
            </label>
            <p id="indicator-responsible-help" className="text-xs text-brand-Gris_oscuro/70 mb-3">Usuarios encargados de revisar y aprobar.</p>
            <div className="space-y-3">
              {responsables.map((responsable, index) => (
                <div key={index} className="flex items-center gap-2">
                  <select
                    id={`indicator-responsible-${index}`}
                    aria-label={`Responsable general ${index + 1}`}
                    aria-describedby="indicator-responsible-help"
                    value={responsable}
                    onChange={(event) => {
                      const next = [...responsables];
                      next[index] = event.target.value;
                      setResponsables(next);
                    }}
                    className="h-11 w-full rounded-md border border-brand-Gris_bajo/50 bg-brand-Blanco px-3 font-body text-sm text-brand-Gris_oscuro outline-none focus:border-brand-Verde_principal focus:ring-2 focus:ring-brand-Verde_principal"
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
                      className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-brand-Gris_oscuro/60 transition-colors hover:bg-brand-Status_rojo/10 hover:text-brand-Status_rojo focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal"
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
                className="mt-1 flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-bold text-brand-Verde_oscuro hover:bg-brand-Verde_principal/10 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal"
              >
                <PlusCircle size={14} /> Agregar responsable
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="indicator-operational-scope" className="block text-sm font-bold font-accent text-brand-Gris_oscuro mb-1">
              Alcance operativo
            </label>
            <p id="indicator-scope-help" className="text-xs text-brand-Gris_oscuro/70 mb-3">Define quién puede consultar o capturar este indicador.</p>
            <select
              id="indicator-operational-scope"
              aria-describedby="indicator-scope-help"
              value={operationalScope}
              onChange={(event) => setOperationalScope(event.target.value as CatalogOperationalScope)}
              className="h-11 w-full rounded-md border border-brand-Gris_bajo/50 bg-brand-Blanco px-3 font-body text-sm text-brand-Gris_oscuro outline-none focus:border-brand-Verde_principal focus:ring-2 focus:ring-brand-Verde_principal"
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
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-brand-Gris_bajo/30 bg-brand-Blanco p-2" role="group" aria-label="Planteles disponibles">
                  {filteredPlanteles.map((plantel) => (
                    <label key={plantel.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm text-brand-Gris_oscuro hover:bg-brand-Gris_bajo/10 focus-within:ring-2 focus-within:ring-brand-Verde_principal">
                      <input
                        type="checkbox"
                        checked={selectedPlantelIds.includes(plantel.id)}
                        onChange={(event) => setSelectedPlantelIds((current) =>
                          event.target.checked
                            ? [...new Set([...current, plantel.id])].sort((a, b) => a - b)
                            : current.filter((id) => id !== plantel.id)
                        )}
                        className="h-5 w-5 shrink-0 accent-brand-Verde_principal"
                      />
                      {plantel.name}
                    </label>
                  ))}
                  {filteredPlanteles.length === 0 && (
                    <p className="px-2 py-3 text-sm text-brand-Gris_oscuro/60">No se encontraron planteles.</p>
                  )}
                </div>
                <p className="text-sm font-semibold text-brand-Gris_oscuro/70" role="status" aria-live="polite">
                  {selectedPlantelIds.length} plantel{selectedPlantelIds.length === 1 ? '' : 'es'} seleccionado{selectedPlantelIds.length === 1 ? '' : 's'}
                </p>
              </div>
            )}

            {operationalScope === 'specific_responsables' && (
              <div className="space-y-3 mt-4">
                {contributors.map((contributor, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      id={`indicator-contributor-${index}`}
                      aria-label={`Responsable específico ${index + 1}`}
                      value={contributor}
                      onChange={(event) => {
                        const next = [...contributors];
                        next[index] = event.target.value;
                        setContributors(next);
                      }}
                      className="h-11 w-full rounded-md border border-brand-Gris_bajo/50 bg-brand-Blanco px-3 font-body text-sm text-brand-Gris_oscuro outline-none focus:border-brand-Verde_principal focus:ring-2 focus:ring-brand-Verde_principal"
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
                        className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-brand-Gris_oscuro/60 transition-colors hover:bg-brand-Status_rojo/10 hover:text-brand-Status_rojo focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal"
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
                  className="mt-1 flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-bold text-brand-Verde_oscuro hover:bg-brand-Verde_principal/10 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal"
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

        <div className="grid grid-cols-1 gap-4 rounded-lg border border-brand-Gris_bajo/40 bg-brand-Gris_bajo/5 p-4 md:grid-cols-[minmax(0,1fr)_160px_minmax(0,1fr)] md:items-end md:p-6">
          <div>
            <h3 className="font-title font-bold text-brand-Gris_oscuro">Reglas de evidencia</h3>
            <p className="mt-1 text-xs text-brand-Gris_oscuro/70">
              Controla si el archivo PDF es obligatorio y si el revisor debe abrirlo antes de aprobar.
            </p>
            <label className="mt-4 flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-semibold text-brand-Gris_oscuro focus-within:ring-2 focus-within:ring-brand-Verde_principal">
              <input
                type="checkbox"
                checked={evidenceRules.required}
                onChange={(event) => setEvidenceRules((current) => ({
                  ...current,
                  required: event.target.checked,
                  requireOpenBeforeApproval: event.target.checked && current.requireOpenBeforeApproval,
                }))}
                className="h-5 w-5 shrink-0 accent-brand-Verde_principal"
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
          <label className="flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-semibold text-brand-Gris_oscuro focus-within:ring-2 focus-within:ring-brand-Verde_principal">
            <input
              type="checkbox"
              checked={evidenceRules.requireOpenBeforeApproval}
              disabled={!evidenceRules.required}
              onChange={(event) => setEvidenceRules((current) => ({ ...current, requireOpenBeforeApproval: event.target.checked }))}
              className="h-5 w-5 shrink-0 accent-brand-Verde_principal"
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
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-brand-Gris_oscuro/55 transition-colors hover:bg-brand-Status_rojo/10 hover:text-brand-Status_rojo focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-Verde_principal focus-visible:ring-offset-2"
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
                      className="h-11 w-full rounded-md border border-brand-Gris_bajo/50 bg-brand-Blanco px-3 font-body text-sm text-brand-Gris_oscuro outline-none focus:border-brand-Verde_principal focus:ring-2 focus:ring-brand-Verde_principal"
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
                  <div className="grid gap-4 border-t border-brand-Gris_bajo/20 bg-brand-Gris_bajo/5 px-4 py-4 md:grid-cols-[minmax(0,1fr)_140px] md:items-end">
                    <Input
                      label="Fórmula"
                      value={column.formula ?? ''}
                      placeholder="Ej. =[mujeres] + [hombres]"
                      onChange={(event) => handleChangeColumn(column.id, 'formula', event.target.value)}
                      className="h-10"
                    />
                    <Input
                      label="Decimales"
                      type="number"
                      min="0"
                      max="6"
                      value={column.decimals ?? ''}
                      onChange={(event) => handleChangeColumn(column.id, 'decimals', event.target.value)}
                      className="h-10"
                    />
                    <p className="text-xs text-brand-Gris_oscuro/70 md:col-span-2">
                      Usa las claves entre corchetes, + - * /, paréntesis y SUMA(). Así cada referencia es inequívoca.
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
                    <label className="flex min-h-11 items-center gap-2 rounded-md border border-brand-Gris_bajo/35 bg-brand-Blanco px-3 py-2 text-sm font-semibold text-brand-Gris_oscuro focus-within:ring-2 focus-within:ring-brand-Verde_principal">
                      <input
                        type="checkbox"
                        checked={Boolean(column.required)}
                        onChange={(event) => handleChangeColumn(column.id, 'required', event.target.checked)}
                        className="h-5 w-5 shrink-0 accent-brand-Verde_principal"
                      />
                      Requerido
                    </label>

                    {supportsNumericValidation(column.type) && (
                      <>
                        <label className="flex min-h-11 items-center gap-2 rounded-md border border-brand-Gris_bajo/35 bg-brand-Blanco px-3 py-2 text-sm font-semibold text-brand-Gris_oscuro focus-within:ring-2 focus-within:ring-brand-Verde_principal">
                          <input
                            type="checkbox"
                            checked={Boolean(column.integer)}
                            onChange={(event) => handleChangeColumn(column.id, 'integer', event.target.checked)}
                            className="h-5 w-5 shrink-0 accent-brand-Verde_principal"
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

        <div className="flex justify-stretch border-t border-brand-Gris_bajo/20 pt-6 sm:justify-end">
          <Button type="button" variant="primary" onClick={handleSave} className="w-full px-8 sm:w-auto" disabled={isLoading}>
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

export function buildTemplateColumns(columns: ConfigColumn[]) {
  if (columns.some((column) => !column.label.trim())) {
    return { columns: [], error: 'Todos los campos deben tener un nombre.' };
  }

  for (const column of columns) {
    const min = optionalNumber(column.min);
    const max = optionalNumber(column.max);

    if (min !== undefined && max !== undefined && min > max) {
      return { columns: [], error: `${column.label}: el mínimo no puede ser mayor que el máximo.` };
    }
  }

  const seenKeys = new Set<string>();
  const sourceColumns = columns.filter((column) => column.label.trim());
  const templateColumns: ColumnConfig[] = sourceColumns.map((column) => {
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

      return templateColumn;
    });

  sourceColumns.forEach((column, index) => {
    if (column.type !== 'calculated') {
      return;
    }

    const expression = normalizeFormulaReferences(column.formula?.trim() ?? '', templateColumns);
    const originalExpression = normalizeFormulaReferences(
      formulaFromOriginalCalculation(column.originalCalculation),
      templateColumns
    );
    templateColumns[index].calculation = column.originalCalculation && expression === originalExpression
      ? structuredClone(column.originalCalculation)
      : {
          type: 'formula',
          expression,
          decimals: configuredDecimals(column.decimals),
        };
  });

  for (const column of templateColumns) {
    if (column.type !== 'calculated') {
      continue;
    }

    const calculation = column.calculation;
    const knownKeys = new Set(templateColumns.map((item) => item.key));
    const hasInvalidStructuredReference = calculation?.type === 'sum'
      ? calculation.sourceKeys.some((key) => !knownKeys.has(key))
      : calculation?.type === 'percentage'
        ? !knownKeys.has(calculation.numeratorKey) || !knownKeys.has(calculation.denominatorKey)
        : false;
    const error = hasInvalidStructuredReference
      ? 'La fórmula usa campos no configurados.'
      : calculation?.type === 'formula'
        ? validateFormulaExpression(calculation.expression, templateColumns, column.key)
        : '';

    if (error) {
      return { columns: templateColumns, error: `${column.label}: ${error}` };
    }
  }

  return { columns: templateColumns, error: '' };
}

export function configColumnsFromTemplate(columns: ColumnConfig[]): ConfigColumn[] {
  return columns.map((column, index) => ({
    id: column.key || `column-${index}`,
    label: column.label,
    type: column.type,
    formula: formulaFromCalculation(column, columns),
    decimals: calculationDecimals(column.calculation),
    originalCalculation: column.calculation ? structuredClone(column.calculation) : undefined,
    originalValidation: column.validation ? structuredClone(column.validation) : undefined,
    required: column.required,
    min: column.validation?.min !== undefined ? String(column.validation.min) : '',
    max: column.validation?.max !== undefined ? String(column.validation.max) : '',
    integer: column.validation?.integer,
    qualityWarningMax: column.validation?.qualityWarningMax !== undefined
      ? String(column.validation.qualityWarningMax)
      : '',
  }));
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

  if (field === 'formula' || field === 'decimals' || field === 'label' || field === 'min' || field === 'max' || field === 'qualityWarningMax') {
    return { ...column, [field]: String(value) };
  }

  return column;
}

function validationFromConfigColumn(column: ConfigColumn): ColumnConfig['validation'] | undefined {
  if (column.type !== 'number') {
    return column.originalValidation ? structuredClone(column.originalValidation) : undefined;
  }

  const validation: NonNullable<ColumnConfig['validation']> = {
    ...(column.originalValidation?.decimals !== undefined
      ? { decimals: column.originalValidation.decimals }
      : {}),
    ...(column.originalValidation?.allowedValues?.length
      ? { allowedValues: [...column.originalValidation.allowedValues] }
      : {}),
  };
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
    return normalizeFormulaReferences(column.calculation.expression, columns);
  }

  if (column.calculation.type === 'sum') {
    return `=${column.calculation.sourceKeys.map(formulaKeyReference).join(' + ')}`;
  }

  return `=${formulaKeyReference(column.calculation.numeratorKey)} / ${formulaKeyReference(column.calculation.denominatorKey)} * 100`;
}

function formulaFromOriginalCalculation(calculation: ColumnConfig['calculation']) {
  if (!calculation) {
    return '';
  }

  if (calculation.type === 'formula') {
    return calculation.expression;
  }

  if (calculation.type === 'sum') {
    return `=${calculation.sourceKeys.map(formulaKeyReference).join(' + ')}`;
  }

  return `=${formulaKeyReference(calculation.numeratorKey)} / ${formulaKeyReference(calculation.denominatorKey)} * 100`;
}

function formulaKeyReference(key: string) {
  return `[${key}]`;
}

function normalizeFormulaReferences(expression: string, columns: ColumnConfig[]) {
  return expression.replace(/\[([^\]]+)\]/g, (_match, reference: string) => {
    const exact = columns.find((column) => column.key === reference.trim());

    if (exact) {
      return formulaKeyReference(exact.key);
    }

    const normalizedReference = normalizeKey(reference);
    const matches = columns.filter((column) => normalizeKey(column.label) === normalizedReference);
    return matches.length === 1 ? formulaKeyReference(matches[0].key) : `[${reference.trim()}]`;
  });
}

function calculationDecimals(calculation: ColumnConfig['calculation']) {
  return calculation && 'decimals' in calculation && calculation.decimals !== undefined
    ? String(calculation.decimals)
    : '';
}

function configuredDecimals(value?: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 6 ? parsed : 2;
}

export function templateColumnsFingerprint(columns: ColumnConfig[]) {
  return JSON.stringify(columns.map((column) => ({
    key: column.key,
    label: column.label.trim(),
    type: column.type,
    required: Boolean(column.required),
    validation: canonicalValidationForFingerprint(column.validation),
    calculation: canonicalCalculationForFingerprint(column.calculation, columns),
  })));
}

export function shouldPersistTemplateStructure(
  isNew: boolean,
  columns: ColumnConfig[],
  initialFingerprint: string
) {
  return isNew || templateColumnsFingerprint(columns) !== initialFingerprint;
}

function canonicalValidationForFingerprint(validation: ColumnConfig['validation']) {
  if (!validation) {
    return null;
  }

  return {
    min: validation.min ?? null,
    max: validation.max ?? null,
    integer: validation.integer ?? null,
    decimals: validation.decimals ?? null,
    allowedValues: validation.allowedValues ?? null,
    qualityWarningMax: validation.qualityWarningMax ?? null,
  };
}

function canonicalCalculationForFingerprint(
  calculation: ColumnConfig['calculation'],
  columns: ColumnConfig[]
) {
  if (!calculation) {
    return null;
  }

  if (calculation.type !== 'formula') {
    return calculation;
  }

  return {
    ...calculation,
    expression: normalizeFormulaReferences(calculation.expression, columns),
  };
}

function normalizeList(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function duplicateSelection(values: string[]) {
  const seen = new Set<string>();

  for (const value of values.map((item) => item.trim()).filter(Boolean)) {
    const normalized = normalizeText(value);
    if (seen.has(normalized)) {
      return value;
    }
    seen.add(normalized);
  }

  return '';
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

  if (indicator.operationalScope) {
    return indicator.operationalScope;
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
