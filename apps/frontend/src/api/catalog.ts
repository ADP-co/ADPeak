import { API_REQUESTS_ENABLED, apiJson } from './client';
import type { ColumnConfig, IndicatorTemplate } from '../components/forms/formConfig';

export type CatalogRole = 'director' | 'responsable' | 'plantel';
export type CatalogOperationalScope = 'all_planteles' | 'specific_planteles' | 'specific_responsables' | 'none';
export type CatalogAllowedAction =
  | 'view'
  | 'capture'
  | 'add_rows'
  | 'submit_review'
  | 'open_evidence'
  | 'request_correction'
  | 'approve'
  | 'configure';

export type CatalogUser = {
  id: string;
  username?: string;
  name: string;
  role: CatalogRole;
  plantelId?: number;
  responsableId?: number;
  indicatorCodes: string[];
  active: boolean;
};

export type CatalogUserInput = Partial<CatalogUser> & {
  password?: string;
};

export type CatalogIndicator = {
  id: number;
  code: string;
  name: string;
  status?: 'Corregir' | 'Pendiente' | 'En revisión' | 'Aprobado';
  captureId?: number;
  plantelId?: number;
  actividadId?: number;
  periodoId?: number;
  captureStatus?: 'borrador' | 'en_revision' | 'correccion_solicitada' | 'aprobado' | 'cerrado';
  canEdit?: boolean;
  canReview?: boolean;
  isReadOnly?: boolean;
  readOnlyReason?: string;
  allowedActions?: CatalogAllowedAction[];
  description: string;
  dataType: 'number' | 'percentage' | 'text';
  period: string;
  active: boolean;
  primaryResponsibleId: number;
  responsibleIds: number[];
  responsibleNames: string[];
  contributorResponsibleIds?: number[];
  contributorNames: string[];
  activities: string[];
  plantelIds: number[];
  effectivePlantelIds?: number[];
  plantelScopeSource?: 'manual' | 'official-import';
  operationalScope?: CatalogOperationalScope;
  templateColumns?: ColumnConfig[];
  evidenceRules?: {
    required: boolean;
    allowedTypes: string[];
    maxSizeMb: number;
    requireOpenBeforeApproval: boolean;
  };
};

export type IndicatorHistoryEntry = {
  id: number;
  code: string;
  name: string;
  action: string;
  updatedAt: string;
  updatedBy: string;
  responsibleNames: string[];
  plantelScope: string;
  active: boolean;
};

export type AuditEvent = {
  id: number;
  userId: string;
  role: CatalogRole;
  action: string;
  resourceType: 'capture' | 'indicator' | 'user' | 'report' | 'auth';
  resourceId: string;
  before?: unknown;
  after?: unknown;
  status: 'ok' | 'rejected' | 'error';
  createdAt: string;
  requestId: string;
};

type IndicatorTemplateResponse = IndicatorTemplate & {
  initialRows?: Record<string, unknown>[];
};

type DevelopmentCatalogRow = {
  code: string;
  name: string;
  responsible: string;
  contributors: string;
  activity: string;
};

type DevelopmentWorkbookTemplate = {
  officialCode?: string | null;
  groups: IndicatorTemplate['groups'];
  headerRows?: IndicatorTemplate['headerRows'];
  columns: ColumnConfig[];
  initialRows: Record<string, unknown>[];
  showTotals: boolean;
  allowAddRows: boolean;
  addRowLabel: string;
  emptyRow: Record<string, unknown>;
};

const officialResponsibleAccounts = [
  { responsableId: 1, username: 'resp01', name: 'Adriana Ruiz Rivera' },
  { responsableId: 2, username: 'resp02', name: 'Angel Ordoñez Ayala' },
  { responsableId: 3, username: 'resp03', name: 'Ariadna Zúñiga Torres' },
  { responsableId: 4, username: 'resp04', name: 'Armando Hernández Ramírez' },
  { responsableId: 5, username: 'resp05', name: 'Arturo Gordillo Chávez' },
  { responsableId: 6, username: 'resp06', name: 'Carlos Hernández Nava' },
  { responsableId: 7, username: 'resp07', name: 'Claudia Raquel Piña Andrade' },
  { responsableId: 8, username: 'resp08', name: 'Daniela Nohemi Navarro Castillo' },
  { responsableId: 9, username: 'resp09', name: 'Dulce Sarahi García Mójica' },
  { responsableId: 10, username: 'resp10', name: 'Laura Gabriela Calvario' },
  { responsableId: 11, username: 'resp11', name: 'Liliana Yunuen Rojas Maciel' },
  { responsableId: 12, username: 'resp12', name: 'Ma. Guadalupe del Rocío Herrera Chacón' },
  { responsableId: 13, username: 'resp13', name: 'Marcial Aviña Iglesias' },
  { responsableId: 14, username: 'resp14', name: 'Martín Jesús Robles DeAnda' },
  { responsableId: 15, username: 'resp15', name: 'Oscar Delgado Sánchez' },
  { responsableId: 16, username: 'resp16', name: 'Oscar Gustavo Mendoza Barajas' },
  { responsableId: 17, username: 'resp17', name: 'Oscar Pedraza Farías' },
  { responsableId: 18, username: 'resp18', name: 'Salvador Aguilar Aguilar' },
] as const;

type DevelopmentWorkbookTemplates = Record<string, DevelopmentWorkbookTemplate>;

const INDICATORS_STORAGE_KEY = 'adpeak.catalog.indicators';
const USERS_STORAGE_KEY = 'adpeak.catalog.users';

const legacyPlanteles = [
  { id: 1, name: 'Bachillerato 16' },
  { id: 2, name: 'Bachillerato 4' },
  { id: 3, name: 'Bachillerato 1' },
  { id: 4, name: 'Bachillerato 33' },
];
const legacyPlantelNumbers = new Set(
  legacyPlanteles
    .map((plantel) => Number(plantel.name.match(/\d+/)?.[0]))
    .filter((value) => Number.isInteger(value))
);

export const catalogPlanteles = [
  ...legacyPlanteles,
  ...Array.from({ length: 35 }, (_, index) => index + 1)
    .filter((number) => !legacyPlantelNumbers.has(number))
    .map((number, index) => ({
      id: legacyPlanteles.length + index + 1,
      name: `Bachillerato ${number}`,
    })),
  { id: 36, name: 'Bachillerato en línea' },
  { id: 37, name: 'IUBA Bachillerato' },
];

const allPlantelIds = () => catalogPlanteles.map((plantel) => plantel.id);
const DEFAULT_TEMPLATE_PLANTEL_LABEL = 'Todos los planteles';

export function plantelNameFromId(id?: number) {
  if (!id) {
    return 'Planteles';
  }

  return catalogPlanteles.find((plantel) => plantel.id === id)?.name ?? `Bachillerato ${id}`;
}

export function effectivePlantelIdsForIndicator(
  indicator: Pick<CatalogIndicator, 'code' | 'plantelIds' | 'effectivePlantelIds' | 'operationalScope'>
) {
  if (indicator.operationalScope === 'none' || indicator.operationalScope === 'specific_responsables') {
    return [];
  }

  if (indicator.operationalScope === 'all_planteles') {
    return allPlantelIds();
  }

  return indicator.effectivePlantelIds ?? indicator.plantelIds;
}

export function plantelScopeLabelForIndicator(
  indicator: Pick<CatalogIndicator, 'code' | 'plantelIds' | 'plantelScopeSource' | 'operationalScope'>
) {
  if (indicator.operationalScope === 'none') {
    return 'Sin alcance operativo';
  }

  if (indicator.operationalScope === 'specific_responsables') {
    return 'Responsables específicos';
  }

  const effectivePlantelIds = effectivePlantelIdsForIndicator(indicator);

  if (
    indicator.plantelScopeSource === 'official-import' &&
    indicator.plantelIds.length === 0 &&
    effectivePlantelIds.length === 0
  ) {
    return 'Responsable';
  }

  if (effectivePlantelIds.length === 0) {
    return 'Pendiente de definir';
  }

  const labels = effectivePlantelIds.map((id) => plantelNameFromId(id));

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === catalogPlanteles.length) {
    return 'Todos los planteles';
  }

  return `${labels.length} planteles`;
}

export async function fetchIndicators() {
  try {
    const response = await apiJson<{ indicators: CatalogIndicator[] }>('/indicadores');
    writeStorage(INDICATORS_STORAGE_KEY, response.indicators);
    return response.indicators;
  } catch (error) {
    if (API_REQUESTS_ENABLED) {
      throw error;
    }

    const fallbackIndicators = await loadDevelopmentFallbackIndicators();
    return readStorage(INDICATORS_STORAGE_KEY, fallbackIndicators);
  }
}

export async function fetchIndicatorHistory() {
  const response = await apiJson<{ history: IndicatorHistoryEntry[] }>('/indicadores/historial');
  return response.history;
}

export async function fetchAuditEvents() {
  const response = await apiJson<{ events: AuditEvent[] }>('/auditoria');
  return response.events;
}

export async function saveIndicator(input: Partial<CatalogIndicator>) {
  try {
    const path = input.id ? `/indicadores/${input.id}` : '/indicadores';
    const method = input.id ? 'PUT' : 'POST';
    const response = await apiJson<CatalogIndicator>(path, {
      method,
      body: JSON.stringify(input),
    });
    mergeIndicator(response);
    return response;
  } catch (error) {
    throw catalogWriteError(error, 'No se pudo guardar el indicador.');
  }
}

export async function deactivateIndicator(id: number) {
  try {
    const response = await apiJson<CatalogIndicator>(`/indicadores/${id}/desactivar`, { method: 'PATCH' });
    mergeIndicator(response);
    return response;
  } catch (error) {
    throw catalogWriteError(error, 'No se pudo desactivar el indicador.');
  }
}

export async function fetchIndicatorTemplate(codeOrId: string, options?: { plantelId?: number }) {
  const searchParams = new URLSearchParams();

  if (options?.plantelId && Number.isInteger(options.plantelId) && options.plantelId > 0) {
    searchParams.set('plantelId', String(options.plantelId));
  }

  const queryString = searchParams.toString();
  const path = `/indicadores/${encodeURIComponent(codeOrId)}/template${queryString ? `?${queryString}` : ''}`;

  try {
    return await apiJson<IndicatorTemplateResponse>(path);
  } catch (error) {
    if (API_REQUESTS_ENABLED) {
      throw error;
    }

    const [fallbackIndicators, fallbackData] = await Promise.all([
      loadDevelopmentFallbackIndicators(),
      loadDevelopmentFallbackData(),
    ]);
    const indicator = readStorage(INDICATORS_STORAGE_KEY, fallbackIndicators)
      .find((candidate) => candidate.code === codeOrId || String(candidate.id) === codeOrId);

    if (!indicator) {
      throw new Error('Indicador no disponible en el catálogo de desarrollo.');
    }

    return buildTemplateForCatalogIndicator(
      indicator,
      plantelNameFromId(options?.plantelId),
      fallbackData.officialWorkbookTemplates
    );
  }
}

export async function fetchUsers() {
  try {
    const response = await apiJson<{ users: CatalogUser[] }>('/usuarios');
    writeStorage(USERS_STORAGE_KEY, response.users);
    return response.users;
  } catch (error) {
    if (API_REQUESTS_ENABLED) {
      throw error;
    }

    const fallbackIndicators = await loadDevelopmentFallbackIndicators();
    const fallbackUsers = buildFallbackUsers(fallbackIndicators);
    return readStorage(USERS_STORAGE_KEY, fallbackUsers);
  }
}

export async function saveUser(input: CatalogUserInput) {
  const current = readStorage<CatalogUser[]>(USERS_STORAGE_KEY, []);
  const existing = current.find((user) => user.id === input.id);
  const nextRole = input.role ?? existing?.role ?? 'responsable';

  if (!existing && nextRole !== 'responsable') {
    throw new Error('responsable_creation_only');
  }

  if (existing?.role === 'director' && nextRole !== 'director') {
    throw new Error('single_director_required');
  }

  if (existing?.role === 'plantel' && nextRole !== 'plantel') {
    throw new Error('fixed_plantel_role');
  }

  if (nextRole === 'director') {
    const nextId = existing?.id ?? input.id;
    const hasAnotherDirector = current.some((user) => user.role === 'director' && user.id !== nextId);

    if (hasAnotherDirector || input.active === false) {
      throw new Error('single_director_required');
    }
  }

  try {
    const path = input.id ? `/usuarios/${encodeURIComponent(input.id)}` : '/usuarios';
    const method = input.id ? 'PUT' : 'POST';
    const response = await apiJson<CatalogUser>(path, {
      method,
      body: JSON.stringify(input),
    });
    mergeUser(response);
    return response;
  } catch (error) {
    throw catalogWriteError(error, 'No se pudo guardar el usuario.');
  }
}

export async function deactivateUser(id: string) {
  try {
    const response = await apiJson<CatalogUser>(`/usuarios/${encodeURIComponent(id)}/desactivar`, { method: 'PATCH' });
    mergeUser(response);
    return response;
  } catch (error) {
    throw catalogWriteError(error, 'No se pudo desactivar el usuario.');
  }
}

export async function resetUserPassword(id: string, password: string, confirmPassword: string) {
  try {
    const response = await apiJson<CatalogUser>(`/usuarios/${encodeURIComponent(id)}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ password, confirmPassword }),
    });
    mergeUser(response);
    return response;
  } catch (error) {
    throw catalogWriteError(error, 'No se pudo actualizar la contraseña.');
  }
}

async function loadDevelopmentFallbackIndicators() {
  if (!import.meta.env.DEV) {
    throw new Error('api_unavailable');
  }

  const modulePath = '../catalog/officialCatalog.generated.ts';
  const fallbackCatalog = await import(/* @vite-ignore */ modulePath) as typeof import('../catalog/officialCatalog.generated');
  return buildFallbackIndicators(
    fallbackCatalog.officialCatalogRows,
    fallbackCatalog.officialIndicatorPlantelScopes
  );
}

async function loadDevelopmentFallbackData() {
  if (!import.meta.env.DEV) {
    throw new Error('api_unavailable');
  }

  const modulePath = '../catalog/officialData.generated.ts';
  return import(/* @vite-ignore */ modulePath) as Promise<{
    officialWorkbookTemplates: DevelopmentWorkbookTemplates;
  }>;
}

function buildFallbackIndicators(
  operationalRows: DevelopmentCatalogRow[],
  plantelScopes: Record<string, number[]>
): CatalogIndicator[] {
  const responsibleNames = officialResponsibleAccounts.map((account) => account.name);
  const responsibleIdByName = new Map<string, number>();

  officialResponsibleAccounts.forEach((account) => {
    responsibleIdByName.set(account.name, account.responsableId);
    responsibleIdByName.set(account.username, account.responsableId);
    responsibleIdByName.set(`Responsable ${String(account.responsableId).padStart(2, '0')}`, account.responsableId);
  });
  const byCode = new Map<string, CatalogIndicator>();

  operationalRows.forEach((row) => {
    const responsibleId = responsibleIdByName.get(row.responsible) ?? 1;
    const contributors = splitNames(row.contributors);
    const existing = byCode.get(row.code);

    if (existing) {
      existing.responsibleIds = uniqueNumbers([...existing.responsibleIds, responsibleId]);
      existing.responsibleNames = namesForIds(existing.responsibleIds, responsibleNames);
      existing.contributorNames = uniqueStrings([...existing.contributorNames, ...contributors]);
      existing.activities = uniqueStrings([...existing.activities, row.activity || 'Actividad general']);
      return;
    }

    byCode.set(row.code, {
      id: byCode.size + 1,
      code: row.code,
      name: row.name,
      description: row.name,
      dataType: inferDataType(row.name),
      period: '2026',
      active: true,
      primaryResponsibleId: responsibleId,
      responsibleIds: [responsibleId],
      responsibleNames: namesForIds([responsibleId], responsibleNames),
      contributorNames: contributors,
      activities: [row.activity || 'Actividad general'],
      plantelIds: plantelScopes[row.code] ?? [],
      plantelScopeSource: 'official-import',
    });
  });

  return Array.from(byCode.values()).sort((a, b) => a.code.localeCompare(b.code, 'es', { numeric: true }));
}

function buildFallbackUsers(indicators: CatalogIndicator[]): CatalogUser[] {
  const director: CatalogUser = {
    id: 'director-1',
    name: 'Director DGEMS',
    role: 'director',
    indicatorCodes: [],
    active: true,
  };
  const responsables = officialResponsibleAccounts.map(({ responsableId, username, name }) => {
    return {
      id: `responsable-${responsableId}`,
      username,
      name,
      role: 'responsable' as const,
      responsableId,
      indicatorCodes: indicators
        .filter((indicator) => indicator.responsibleNames.includes(name))
        .map((indicator) => indicator.code),
      active: true,
    };
  });
  const plantelUsers = catalogPlanteles.map((plantel) => ({
    id: `plantel-${plantel.id}`,
    username: usernameForPlantel(plantel),
    name: plantel.name,
    role: 'plantel' as const,
    plantelId: plantel.id,
    indicatorCodes: [],
    active: true,
  }));

  return [director, ...responsables, ...plantelUsers];
}

const studentPeriodMatrixCodes = new Set([
  '1.1.2.2.10',
  '1.1.2.2.11',
]);

const integralDevelopmentCodes = new Set(['1.1.2.3.1']);
const staffProfileCodes = new Set(['1.1.2.5.3']);
const staffTrainingCodes = new Set([
  '1.1.2.5.10',
]);
const participantActionCodes = new Set([
  '2.1.4.1.2',
  '3.1.0.0.1',
  '3.1.1.3.6',
]);
const activitiesForTemplate = (indicator: Pick<CatalogIndicator, 'activities'>) =>
  indicator.activities.length > 0 ? indicator.activities : ['Actividad general'];

const baseInfoBlocks = (indicator: Pick<CatalogIndicator, 'code' | 'name' | 'activities'>, activityLabel = 'Actividades oficiales') => [
  {
    label: 'INDICADOR',
    text: `Código ${indicator.code} ${indicator.name}.`,
    tone: 'highlight' as const,
  },
  {
    label: activityLabel,
    text: activitiesForTemplate(indicator).join('; '),
  },
];

const rowsFromActivities = (
  indicator: Pick<CatalogIndicator, 'activities'>,
  plantelName: string,
  rowFactory: (activity: string, index: number) => Record<string, unknown>
) => activitiesForTemplate(indicator).map((activity, index) => ({
  plantel: plantelName,
  ...rowFactory(activity, index),
}));

export function buildTemplateForCatalogIndicator(
  indicator: CatalogIndicator,
  plantelName = DEFAULT_TEMPLATE_PLANTEL_LABEL,
  workbookTemplates: DevelopmentWorkbookTemplates = {}
): IndicatorTemplateResponse {
  const workbookTemplate = workbookTemplates[indicator.code];

  if (workbookTemplate) {
    return buildOfficialWorkbookTemplate(indicator, plantelName, workbookTemplate);
  }

  if (indicator.templateColumns?.length) {
    return buildConfiguredTemplate(indicator, plantelName);
  }

  if (indicator.code === '1.0.0.0.1') {
    return buildTerminalEfficiencyTemplate(indicator, plantelName);
  }

  if (indicator.code === '1.0.0.0.2') {
    return buildTitulationTemplate(indicator, plantelName);
  }

  if (indicator.code === '1.1.2.1.4') {
    return buildHealthIntegralTemplate(indicator, plantelName);
  }

  if (integralDevelopmentCodes.has(indicator.code)) {
    return buildIntegralDevelopmentTemplate(indicator);
  }

  if (studentPeriodMatrixCodes.has(indicator.code)) {
    return buildStudentPeriodMatrixTemplate(indicator, plantelName);
  }

  if (staffTrainingCodes.has(indicator.code)) {
    return buildStaffTrainingTemplate(indicator, plantelName);
  }

  if (staffProfileCodes.has(indicator.code)) {
    return buildStaffProfileTemplate(indicator, plantelName);
  }

  if (participantActionCodes.has(indicator.code) || indicator.dataType === 'number') {
    return buildParticipantActionTemplate(indicator, plantelName);
  }

  return buildGenericTemplate(indicator, plantelName);
}

function buildOfficialWorkbookTemplate(
  indicator: CatalogIndicator,
  plantelName: string,
  imported: DevelopmentWorkbookTemplate
): IndicatorTemplateResponse {
  const columns = relaxBlankReadonlyColumns(normalizeImportedColumns(imported.columns), imported.initialRows, imported.emptyRow);
  const displayCode = imported.officialCode || indicator.code;
  const groups = imported.groups.filter((group) => group.label !== 'Formato oficial importado');
  const applyPlantel = (sourceRow: Record<string, unknown>) => {
    const row: Record<string, unknown> = {};

    columns.forEach((column) => {
      if (normalizeText(column.label).includes('plantel')) {
        row[column.key] = plantelName;
        return;
      }

      const sourceValue = sourceRow[column.key];

      if (column.type === 'number' && sourceValue !== undefined && sourceValue !== null && String(sourceValue).trim()) {
        const normalizedValue = String(sourceValue).replace('%', '').trim();
        const numericValue = Number(normalizedValue);
        row[column.key] = normalizedValue && Number.isFinite(numericValue) ? sourceValue : '';
        return;
      }

      row[column.key] = sourceValue ?? '';
    });

    return row;
  };
  const initialRows = imported.initialRows.length > 0
    ? imported.initialRows.map(applyPlantel)
    : [applyPlantel(imported.emptyRow)];

  return {
    indicatorCode: displayCode,
    indicatorName: indicator.name,
    groups,
    headerRows: imported.headerRows,
    columns,
    initialRows,
    showTotals: imported.showTotals,
    allowAddRows: imported.allowAddRows,
    addRowLabel: imported.addRowLabel,
    emptyRow: applyPlantel(imported.emptyRow),
    analysisHeading: 'Análisis',
    analysisLabel: 'Descripción y observaciones',
    analysisPlaceholder: 'Describe brevemente el avance, pendientes o comentarios del formato oficial.',
  };
}

function normalizeImportedColumns(columns: ColumnConfig[]) {
  return columns.map((column) => {
    if (column.type !== 'text') {
      return column;
    }

    return shouldTreatImportedColumnAsNumber(column) ? { ...column, type: 'number' as const } : column;
  });
}

function relaxBlankReadonlyColumns(
  columns: ColumnConfig[],
  rows: Record<string, unknown>[],
  emptyRow: Record<string, unknown>
) {
  return columns.map((column) => {
    if (column.type !== 'readonly' || isProtectedContextColumn(column)) {
      return column;
    }

    const hasOfficialValue = [...rows, emptyRow].some((row) => {
      const value = row[column.key];
      return value !== undefined && value !== null && String(value).trim() !== '';
    });

    return hasOfficialValue ? column : { ...column, type: editableTypeForBlankColumn(column) };
  });
}

function isProtectedContextColumn(column: ColumnConfig) {
  const normalized = normalizeText(`${column.label} ${column.key}`);
  return ['plantel', 'delegacion', 'responsable', 'periodo', 'ciclo', 'semestre'].some((token) =>
    normalized.includes(token)
  );
}

function editableTypeForBlankColumn(column: ColumnConfig): 'number' | 'text' {
  if (shouldTreatImportedColumnAsNumber(column)) {
    return 'number';
  }

  return 'text';
}

function shouldTreatImportedColumnAsNumber(column: ColumnConfig) {
  const normalized = normalizeText(`${column.label} ${column.key}`);
  const protectedTextTokens = [
    'actividad',
    'programa',
    'plantel',
    'delegacion',
    'responsable',
    'evidencia',
    'observacion',
    'observaciones',
    'descripcion',
    'nombre',
    'modalidad',
    'estado',
    'tipo',
  ];

  if (protectedTextTokens.some((token) => normalized.includes(token))) {
    return false;
  }

  return /(matr|matricula|alumn|mujer|hombre|egresad|docent|cantidad|numero|num|sesion|accion|total|tasa|porcentaje|avance|meta|ptc)/.test(normalized);
}

function buildConfiguredTemplate(indicator: CatalogIndicator, plantelName: string): IndicatorTemplateResponse {
  const columns = indicator.templateColumns ?? [];
  const initialRows = activitiesForTemplate(indicator).map((activity) =>
    rowForConfiguredColumns(columns, plantelName, activity)
  );

  return {
    indicatorCode: indicator.code,
    indicatorName: indicator.name,
    groups: [{ label: 'Captura configurada', colspan: Math.max(columns.length, 1) }],
    columns,
    initialRows,
    allowAddRows: true,
    addRowLabel: 'Agregar fila',
    emptyRow: rowForConfiguredColumns(columns, plantelName, ''),
    showTotals: columns.some((column) => column.type === 'number' || column.type === 'calculated'),
  };
}

function rowForConfiguredColumns(columns: ColumnConfig[], plantelName: string, activity: string) {
  const row: Record<string, unknown> = {};

  columns.forEach((column) => {
    if (column.type === 'calculated') {
      return;
    }

    const normalizedLabel = normalizeText(column.label);
    if (normalizedLabel.includes('plantel')) {
      row[column.key] = plantelName;
      return;
    }

    if (normalizedLabel.includes('actividad')) {
      row[column.key] = activity;
      return;
    }

    row[column.key] = '';
  });

  return row;
}

export function buildHealthIntegralTemplate(indicator: Pick<CatalogIndicator, 'code' | 'name' | 'activities'>, plantelName = DEFAULT_TEMPLATE_PLANTEL_LABEL): IndicatorTemplateResponse {
  const activities = indicator.activities.length > 0 ? indicator.activities : ['Promoción de la salud'];

  return {
    indicatorCode: indicator.code,
    indicatorName: indicator.name,
    groups: [],
    infoBlocks: [
      {
        label: 'Actividades POA 2026',
        text: '',
      },
      {
        label: 'ACCIÓN 1.1.2.1',
        text: 'Ofrecer servicios y programas de apoyo integral a estudiantes universitarios, con enfoque interseccional e intercultural, que promuevan la equidad, el bienestar emocional y la mejora de condiciones educativas. Participar en acciones de promoción en los servicios médicos, nutricionales y psicológicos a través de las Unidades de Salud Integral y el CUAP.',
      },
      {
        label: 'INDICADOR',
        text: `Código ${indicator.code} ${indicator.name}.`,
        tone: 'highlight',
      },
      {
        label: 'ACTIVIDADES',
        text: 'PROMOCIÓN DE LA SALUD',
      },
    ],
    headerRows: [
      [
        { label: 'Plantel', rowspan: 3 },
        { label: 'Nota: anotar solo la actividad desarrollada.', colspan: 4 },
        { label: 'Febrero-Agosto 2026', colspan: 3 },
        { label: 'Agosto-Enero 2027', colspan: 3 },
      ],
      [
        { label: 'Actividad', rowspan: 2 },
        { label: 'Unidades de salud integral', colspan: 3 },
        { label: 'M', rowspan: 2 },
        { label: 'H', rowspan: 2 },
        { label: 'T', rowspan: 2 },
        { label: 'M', rowspan: 2 },
        { label: 'H', rowspan: 2 },
        { label: 'T', rowspan: 2 },
      ],
      [
        { label: 'SERVICIOS MÉDICOS' },
        { label: 'DGDI' },
        { label: 'CUAP' },
      ],
    ],
    columns: [
      { key: 'plantel', label: 'Plantel', type: 'readonly' },
      { key: 'actividad', label: 'Actividad', type: 'readonly' },
      { key: 'servicios_medicos', label: 'Servicios Médicos', type: 'number' },
      { key: 'dgdi', label: 'DGDI', type: 'number' },
      { key: 'cuap', label: 'CUAP', type: 'number' },
      { key: 'feb_ago_mujeres', label: 'M', type: 'number' },
      { key: 'feb_ago_hombres', label: 'H', type: 'number' },
      { key: 'feb_ago_total', label: 'T', type: 'calculated', calculation: { type: 'sum', sourceKeys: ['feb_ago_mujeres', 'feb_ago_hombres'] } },
      { key: 'ago_ene_mujeres', label: 'M', type: 'number' },
      { key: 'ago_ene_hombres', label: 'H', type: 'number' },
      { key: 'ago_ene_total', label: 'T', type: 'calculated', calculation: { type: 'sum', sourceKeys: ['ago_ene_mujeres', 'ago_ene_hombres'] } },
    ],
    initialRows: activities.map((activity) => ({
      plantel: plantelName,
      actividad: activity,
      servicios_medicos: '',
      dgdi: '',
      cuap: '',
      feb_ago_mujeres: '',
      feb_ago_hombres: '',
      ago_ene_mujeres: '',
      ago_ene_hombres: '',
    })),
    showTotals: true,
    footerNote: 'NOTA: En la parte de abajo, realice una breve descripción y análisis de las acciones y actividades que lleva a cabo el plantel respecto al tema de servicios y programas de apoyo integral a estudiantes universitarios.',
    analysisHeading: 'Descripción y análisis',
    analysisLabel: 'Descripción de acciones y actividades',
    analysisPlaceholder: 'Describa brevemente las acciones realizadas por el plantel...',
  };
}

function buildTitulationTemplate(indicator: Pick<CatalogIndicator, 'code' | 'name'>, plantelName: string): IndicatorTemplateResponse {
  return {
    indicatorCode: indicator.code,
    indicatorName: indicator.name,
    groups: [
      { label: 'Contexto Escolar', colspan: 3 },
      { label: 'Egresados titulados en el año 2025', colspan: 3 },
      { label: 'Matrícula de primer ingreso (agosto 2022)', colspan: 3 },
      { label: 'Resultados', colspan: 1 },
    ],
    columns: [
      { key: 'delegacion', label: 'Delegación', type: 'readonly' },
      { key: 'plantel', label: 'Plantel', type: 'readonly' },
      { key: 'programa', label: 'Programa Educativo', type: 'readonly' },
      { key: 'egresados_mujeres', label: 'Mujeres', type: 'number' },
      { key: 'egresados_hombres', label: 'Hombres', type: 'number' },
      { key: 'egresados_total', label: 'Total', type: 'calculated', calculation: { type: 'sum', sourceKeys: ['egresados_mujeres', 'egresados_hombres'] } },
      { key: 'matricula_mujeres', label: 'Mujeres', type: 'number' },
      { key: 'matricula_hombres', label: 'Hombres', type: 'number' },
      { key: 'matricula_total', label: 'Total', type: 'calculated', calculation: { type: 'sum', sourceKeys: ['matricula_mujeres', 'matricula_hombres'] } },
      { key: 'porcentaje_titulacion', label: '% de titulación', type: 'calculated', calculation: { type: 'percentage', numeratorKey: 'egresados_total', denominatorKey: 'matricula_total', decimals: 2 } },
    ],
    initialRows: [
      { delegacion: 'Villa de Álvarez', plantel: plantelName, programa: 'Técnico Analista Programador', egresados_mujeres: '', egresados_hombres: '', matricula_mujeres: '', matricula_hombres: '' },
      { delegacion: 'Villa de Álvarez', plantel: plantelName, programa: 'Técnico Analista Químico', egresados_mujeres: '', egresados_hombres: '', matricula_mujeres: '', matricula_hombres: '' },
    ],
    showTotals: true,
  };
}

function buildTerminalEfficiencyTemplate(indicator: Pick<CatalogIndicator, 'code' | 'name'>, plantelName: string): IndicatorTemplateResponse {
  return {
    indicatorCode: indicator.code,
    indicatorName: indicator.name,
    groups: [
      { label: 'Contexto Escolar', colspan: 3 },
      { label: 'Egreso de la cohorte', colspan: 3 },
      { label: 'Matrícula de primer ingreso', colspan: 3 },
      { label: 'Resultado', colspan: 1 },
    ],
    columns: [
      { key: 'delegacion', label: 'Delegación', type: 'readonly' },
      { key: 'plantel', label: 'Plantel', type: 'readonly' },
      { key: 'programa', label: 'Programa Educativo', type: 'readonly' },
      { key: 'egreso_mujeres', label: 'Mujeres', type: 'number' },
      { key: 'egreso_hombres', label: 'Hombres', type: 'number' },
      { key: 'egreso_total', label: 'Total', type: 'calculated', calculation: { type: 'sum', sourceKeys: ['egreso_mujeres', 'egreso_hombres'] } },
      { key: 'ingreso_mujeres', label: 'Mujeres', type: 'number' },
      { key: 'ingreso_hombres', label: 'Hombres', type: 'number' },
      { key: 'ingreso_total', label: 'Total', type: 'calculated', calculation: { type: 'sum', sourceKeys: ['ingreso_mujeres', 'ingreso_hombres'] } },
      { key: 'eficiencia_terminal', label: '% eficiencia', type: 'calculated', calculation: { type: 'percentage', numeratorKey: 'egreso_total', denominatorKey: 'ingreso_total', decimals: 2 } },
    ],
    initialRows: [
      { delegacion: 'Villa de Álvarez', plantel: plantelName, programa: 'Bachillerato General', egreso_mujeres: '', egreso_hombres: '', ingreso_mujeres: '', ingreso_hombres: '' },
      { delegacion: 'Villa de Álvarez', plantel: plantelName, programa: 'Técnico Analista Programador', egreso_mujeres: '', egreso_hombres: '', ingreso_mujeres: '', ingreso_hombres: '' },
      { delegacion: 'Villa de Álvarez', plantel: plantelName, programa: 'Técnico Analista Químico', egreso_mujeres: '', egreso_hombres: '', ingreso_mujeres: '', ingreso_hombres: '' },
    ],
    showTotals: true,
  };
}

function buildStudentPeriodMatrixTemplate(indicator: CatalogIndicator, plantelName: string): IndicatorTemplateResponse {
  return {
    indicatorCode: indicator.code,
    indicatorName: indicator.name,
    groups: [],
    infoBlocks: baseInfoBlocks(indicator),
    headerRows: [
      [
        { label: 'Plantel', rowspan: 2 },
        { label: 'Actividad', rowspan: 2 },
        { label: 'Meta anual', rowspan: 2 },
        { label: 'Febrero-Agosto 2026', colspan: 3 },
        { label: 'Agosto-Enero 2027', colspan: 3 },
        { label: 'Resultado', colspan: 2 },
      ],
      [
        { label: 'M' },
        { label: 'H' },
        { label: 'T' },
        { label: 'M' },
        { label: 'H' },
        { label: 'T' },
        { label: 'Total anual' },
        { label: 'Observaciones' },
      ],
    ],
    columns: [
      { key: 'plantel', label: 'Plantel', type: 'readonly' },
      { key: 'actividad', label: 'Actividad', type: 'readonly' },
      { key: 'meta', label: 'Meta anual', type: 'number' },
      { key: 'feb_ago_mujeres', label: 'M', type: 'number' },
      { key: 'feb_ago_hombres', label: 'H', type: 'number' },
      { key: 'feb_ago_total', label: 'T', type: 'calculated', calculation: { type: 'sum', sourceKeys: ['feb_ago_mujeres', 'feb_ago_hombres'] } },
      { key: 'ago_ene_mujeres', label: 'M', type: 'number' },
      { key: 'ago_ene_hombres', label: 'H', type: 'number' },
      { key: 'ago_ene_total', label: 'T', type: 'calculated', calculation: { type: 'sum', sourceKeys: ['ago_ene_mujeres', 'ago_ene_hombres'] } },
      { key: 'total_anual', label: 'Total anual', type: 'calculated', calculation: { type: 'sum', sourceKeys: ['feb_ago_total', 'ago_ene_total'] } },
      { key: 'observaciones', label: 'Observaciones', type: 'text' },
    ],
    initialRows: rowsFromActivities(indicator, plantelName, (activity) => ({
      actividad: activity,
      meta: '',
      feb_ago_mujeres: '',
      feb_ago_hombres: '',
      ago_ene_mujeres: '',
      ago_ene_hombres: '',
      observaciones: '',
    })),
    showTotals: true,
    footerNote: 'Use los totales calculados para evitar capturar manualmente sumas que se deducen de mujeres y hombres.',
  };
}

function buildIntegralDevelopmentTemplate(indicator: CatalogIndicator): IndicatorTemplateResponse {
  return {
    indicatorCode: indicator.code,
    indicatorName: indicator.name,
    groups: [],
    infoBlocks: baseInfoBlocks(indicator, 'Actividades de desarrollo y formación integral'),
    headerRows: [
      [
        { label: 'Actividad', rowspan: 3 },
        { label: 'Total de actividades', colspan: 2 },
        { label: 'Matrícula total', colspan: 3 },
        { label: 'Incorporación de estudiantes', colspan: 6 },
        { label: 'Descripción', rowspan: 3 },
      ],
      [
        { label: 'Desarrollo', rowspan: 2 },
        { label: 'Formación integral', rowspan: 2 },
        { label: 'Mujer', rowspan: 2 },
        { label: 'Hombre', rowspan: 2 },
        { label: 'Total', rowspan: 2 },
        { label: 'Mujer', colspan: 2 },
        { label: 'Hombre', colspan: 2 },
        { label: 'Total', colspan: 2 },
      ],
      [
        { label: 'No.' },
        { label: '%' },
        { label: 'No.' },
        { label: '%' },
        { label: 'No.' },
        { label: '%' },
      ],
    ],
    columns: [
      { key: 'actividad', label: 'Actividad', type: 'readonly' },
      { key: 'actividades_desarrollo', label: 'Desarrollo', type: 'number' },
      { key: 'actividades_formacion', label: 'Formación integral', type: 'number' },
      { key: 'matricula_mujeres', label: 'Mujer', type: 'number' },
      { key: 'matricula_hombres', label: 'Hombre', type: 'number' },
      { key: 'matricula_total', label: 'Total', type: 'calculated', calculation: { type: 'sum', sourceKeys: ['matricula_mujeres', 'matricula_hombres'] } },
      { key: 'incorporacion_mujeres_num', label: 'No.', type: 'number' },
      { key: 'incorporacion_mujeres_pct', label: '%', type: 'calculated', calculation: { type: 'percentage', numeratorKey: 'incorporacion_mujeres_num', denominatorKey: 'matricula_mujeres', decimals: 2 } },
      { key: 'incorporacion_hombres_num', label: 'No.', type: 'number' },
      { key: 'incorporacion_hombres_pct', label: '%', type: 'calculated', calculation: { type: 'percentage', numeratorKey: 'incorporacion_hombres_num', denominatorKey: 'matricula_hombres', decimals: 2 } },
      { key: 'incorporacion_total_num', label: 'No.', type: 'calculated', calculation: { type: 'sum', sourceKeys: ['incorporacion_mujeres_num', 'incorporacion_hombres_num'] } },
      { key: 'incorporacion_total_pct', label: '%', type: 'calculated', calculation: { type: 'percentage', numeratorKey: 'incorporacion_total_num', denominatorKey: 'matricula_total', decimals: 2 } },
      { key: 'descripcion', label: 'Descripción', type: 'text' },
    ],
    initialRows: activitiesForTemplate(indicator).map((activity) => ({
      actividad: activity,
      actividades_desarrollo: '',
      actividades_formacion: '',
      matricula_mujeres: '',
      matricula_hombres: '',
      incorporacion_mujeres_num: '',
      incorporacion_hombres_num: '',
      descripcion: '',
    })),
    showTotals: true,
    footerNote: 'Describa las actividades realizadas y deje que el sistema calcule matrícula total, participación total y porcentajes.',
  };
}

function buildStaffTrainingTemplate(indicator: CatalogIndicator, plantelName: string): IndicatorTemplateResponse {
  const emptyRow = {
    plantel: plantelName,
    actividad: '',
    tipo_evento: '',
    nombre_evento: '',
    duracion_horas: '',
    modalidad: '',
    competencias: '',
    organizado_por: '',
    participantes_hombres: '',
    participantes_mujeres: '',
    evidencias: '',
    observaciones: '',
  };

  return {
    indicatorCode: indicator.code,
    indicatorName: indicator.name,
    groups: [],
    infoBlocks: baseInfoBlocks(indicator, 'Actividades de formación o capacitación'),
    headerRows: [
      [
        { label: 'Contexto', colspan: 2 },
        { label: 'Datos del evento', colspan: 6 },
        { label: 'Participantes', colspan: 3 },
        { label: 'Seguimiento', colspan: 2 },
      ],
      [
        { label: 'Plantel' },
        { label: 'Actividad' },
        { label: 'Tipo' },
        { label: 'Nombre' },
        { label: 'Duración' },
        { label: 'Modalidad' },
        { label: 'Competencias' },
        { label: 'Organizado por' },
        { label: 'H' },
        { label: 'M' },
        { label: 'Total' },
        { label: 'Evid.' },
        { label: 'Observaciones' },
      ],
    ],
    columns: [
      { key: 'plantel', label: 'Plantel', type: 'readonly' },
      { key: 'actividad', label: 'Actividad', type: 'readonly' },
      { key: 'tipo_evento', label: 'Tipo', type: 'text' },
      { key: 'nombre_evento', label: 'Nombre', type: 'text' },
      { key: 'duracion_horas', label: 'Duración', type: 'number' },
      { key: 'modalidad', label: 'Modalidad', type: 'text' },
      { key: 'competencias', label: 'Competencias', type: 'text' },
      { key: 'organizado_por', label: 'Organizado por', type: 'text' },
      { key: 'participantes_hombres', label: 'H', type: 'number' },
      { key: 'participantes_mujeres', label: 'M', type: 'number' },
      { key: 'participantes_total', label: 'Total', type: 'calculated', calculation: { type: 'sum', sourceKeys: ['participantes_hombres', 'participantes_mujeres'] } },
      { key: 'evidencias', label: 'Evid.', type: 'number' },
      { key: 'observaciones', label: 'Observaciones', type: 'text' },
    ],
    initialRows: rowsFromActivities(indicator, plantelName, (activity) => ({ ...emptyRow, actividad: activity })),
    allowAddRows: true,
    addRowLabel: 'Agregar evento',
    emptyRow,
    showTotals: true,
  };
}

function buildStaffProfileTemplate(indicator: CatalogIndicator, plantelName: string): IndicatorTemplateResponse {
  return {
    indicatorCode: indicator.code,
    indicatorName: indicator.name,
    groups: [],
    infoBlocks: baseInfoBlocks(indicator),
    headerRows: [
      [
        { label: 'Plantel', rowspan: 2 },
        { label: 'Actividad', rowspan: 2 },
        { label: 'Personal registrado', colspan: 3 },
        { label: 'Meta', rowspan: 2 },
        { label: 'Cumplimiento', rowspan: 2 },
        { label: 'Observaciones', rowspan: 2 },
      ],
      [
        { label: 'H' },
        { label: 'M' },
        { label: 'Total' },
      ],
    ],
    columns: [
      { key: 'plantel', label: 'Plantel', type: 'readonly' },
      { key: 'actividad', label: 'Actividad', type: 'readonly' },
      { key: 'personal_hombres', label: 'H', type: 'number' },
      { key: 'personal_mujeres', label: 'M', type: 'number' },
      { key: 'personal_total', label: 'Total', type: 'calculated', calculation: { type: 'sum', sourceKeys: ['personal_hombres', 'personal_mujeres'] } },
      { key: 'meta', label: 'Meta', type: 'number' },
      { key: 'cumplimiento', label: '%', type: 'calculated', calculation: { type: 'percentage', numeratorKey: 'personal_total', denominatorKey: 'meta', decimals: 2 } },
      { key: 'observaciones', label: 'Observaciones', type: 'text' },
    ],
    initialRows: rowsFromActivities(indicator, plantelName, (activity) => ({
      actividad: activity,
      personal_hombres: '',
      personal_mujeres: '',
      meta: '',
      observaciones: '',
    })),
    showTotals: true,
  };
}

function buildParticipantActionTemplate(indicator: CatalogIndicator, plantelName: string): IndicatorTemplateResponse {
  const emptyRow = {
    plantel: plantelName,
    actividad: '',
    nombre_accion: '',
    docentes: '',
    administrativos: '',
    coordinadores: '',
    asesores: '',
    otro_personal: '',
    estudiantes_hombres: '',
    estudiantes_mujeres: '',
    evidencias: '',
    observaciones: '',
  };

  return {
    indicatorCode: indicator.code,
    indicatorName: indicator.name,
    groups: [],
    infoBlocks: baseInfoBlocks(indicator, 'Acciones oficiales'),
    headerRows: [
      [
        { label: 'Contexto', colspan: 3 },
        { label: 'Participantes internos', colspan: 5 },
        { label: 'Estudiantado', colspan: 3 },
        { label: 'Seguimiento', colspan: 2 },
      ],
      [
        { label: 'Plantel' },
        { label: 'Actividad' },
        { label: 'Nombre de la acción' },
        { label: 'Docentes' },
        { label: 'Administrativos' },
        { label: 'Coord.' },
        { label: 'Asesores' },
        { label: 'Otro' },
        { label: 'H' },
        { label: 'M' },
        { label: 'Total' },
        { label: 'Evid.' },
        { label: 'Observaciones' },
      ],
    ],
    columns: [
      { key: 'plantel', label: 'Plantel', type: 'readonly' },
      { key: 'actividad', label: 'Actividad', type: 'readonly' },
      { key: 'nombre_accion', label: 'Nombre de la acción', type: 'text' },
      { key: 'docentes', label: 'Docentes', type: 'number' },
      { key: 'administrativos', label: 'Administrativos', type: 'number' },
      { key: 'coordinadores', label: 'Coord.', type: 'number' },
      { key: 'asesores', label: 'Asesores', type: 'number' },
      { key: 'otro_personal', label: 'Otro', type: 'number' },
      { key: 'estudiantes_hombres', label: 'H', type: 'number' },
      { key: 'estudiantes_mujeres', label: 'M', type: 'number' },
      { key: 'estudiantes_total', label: 'Total', type: 'calculated', calculation: { type: 'sum', sourceKeys: ['estudiantes_hombres', 'estudiantes_mujeres'] } },
      { key: 'evidencias', label: 'Evid.', type: 'number' },
      { key: 'observaciones', label: 'Observaciones', type: 'text' },
    ],
    initialRows: rowsFromActivities(indicator, plantelName, (activity) => ({ ...emptyRow, actividad: activity })),
    allowAddRows: true,
    addRowLabel: 'Agregar acción',
    emptyRow,
    showTotals: true,
  };
}

function buildInfrastructureTemplate(indicator: CatalogIndicator, plantelName: string): IndicatorTemplateResponse {
  const emptyRow = {
    plantel: plantelName,
    actividad: '',
    rubro: '',
    descripcion: '',
    cantidad_actual: '',
    cantidad_solicitada: '',
    estado: '',
    observaciones: '',
  };

  return {
    indicatorCode: indicator.code,
    indicatorName: indicator.name,
    groups: [],
    infoBlocks: baseInfoBlocks(indicator, 'Rubro de infraestructura o equipamiento'),
    headerRows: [
      [
        { label: 'Contexto', colspan: 4 },
        { label: 'Cantidad', colspan: 3 },
        { label: 'Seguimiento', colspan: 2 },
      ],
      [
        { label: 'Plantel' },
        { label: 'Actividad' },
        { label: 'Rubro' },
        { label: 'Descripción' },
        { label: 'Actual' },
        { label: 'Solicitada' },
        { label: 'Total' },
        { label: 'Estado' },
        { label: 'Observaciones' },
      ],
    ],
    columns: [
      { key: 'plantel', label: 'Plantel', type: 'readonly' },
      { key: 'actividad', label: 'Actividad', type: 'readonly' },
      { key: 'rubro', label: 'Rubro', type: 'text' },
      { key: 'descripcion', label: 'Descripción', type: 'text' },
      { key: 'cantidad_actual', label: 'Actual', type: 'number' },
      { key: 'cantidad_solicitada', label: 'Solicitada', type: 'number' },
      { key: 'cantidad_total', label: 'Total', type: 'calculated', calculation: { type: 'sum', sourceKeys: ['cantidad_actual', 'cantidad_solicitada'] } },
      { key: 'estado', label: 'Estado', type: 'text' },
      { key: 'observaciones', label: 'Observaciones', type: 'text' },
    ],
    initialRows: rowsFromActivities(indicator, plantelName, (activity) => ({ ...emptyRow, actividad: activity })),
    allowAddRows: true,
    addRowLabel: 'Agregar rubro',
    emptyRow,
    showTotals: true,
  };
}

function buildGenericTemplate(indicator: CatalogIndicator, plantelName: string): IndicatorTemplateResponse {
  return {
    indicatorCode: indicator.code,
    indicatorName: indicator.name,
    groups: [
      { label: 'Contexto', colspan: 2 },
      { label: 'Seguimiento', colspan: 4 },
    ],
    columns: [
      { key: 'plantel', label: 'Plantel', type: 'readonly' },
      { key: 'actividad', label: 'Actividad', type: 'readonly' },
      { key: 'meta', label: 'Meta', type: 'number' },
      { key: 'avance', label: 'Avance', type: 'number' },
      { key: 'cumplimiento', label: '% cumplimiento', type: 'calculated', calculation: { type: 'percentage', numeratorKey: 'avance', denominatorKey: 'meta', decimals: 2 } },
      { key: 'observaciones', label: 'Observaciones', type: 'text' },
    ],
    initialRows: rowsFromActivities(indicator, plantelName, (activity) => ({
      actividad: activity,
      meta: '',
      avance: '',
      observaciones: '',
    })),
    showTotals: true,
  };
}

function readStorage<T>(key: string, fallback: T) {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    return JSON.parse(window.localStorage.getItem(key) ?? '') as T;
  } catch {
    return fallback;
  }
}

function catalogWriteError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.startsWith('api_error_')) {
    return new Error(`${fallbackMessage} Código ${error.message.replace('api_error_', '')}.`);
  }

  if (error instanceof Error && error.message === 'api_unavailable') {
    return new Error('El sistema no está conectado. No se guardaron cambios locales.');
  }

  return error instanceof Error ? error : new Error(fallbackMessage);
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
}

function mergeIndicator(indicator: CatalogIndicator) {
  const current = readStorage<CatalogIndicator[]>(INDICATORS_STORAGE_KEY, []);
  writeStorage(
    INDICATORS_STORAGE_KEY,
    current.some((item) => item.id === indicator.id)
      ? current.map((item) => (item.id === indicator.id ? indicator : item))
      : [indicator, ...current]
  );
}

function mergeUser(user: CatalogUser) {
  const current = readStorage<CatalogUser[]>(USERS_STORAGE_KEY, []);
  writeStorage(
    USERS_STORAGE_KEY,
    current.some((item) => item.id === user.id)
      ? current.map((item) => (item.id === user.id ? user : item))
      : [user, ...current]
  );
}

function usernameForPlantel(plantel: { key?: string; name: string }) {
  const numericName = plantel.name.match(/\d+/)?.[0];

  if (numericName) {
    return `bach${numericName}`;
  }

  const normalizedName = plantel.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (normalizedName.includes('linea')) {
    return 'bachlinea';
  }

  if (normalizedName.includes('iuba')) {
    return 'iuba';
  }

  return (plantel.key ?? plantel.name).replace(/\W+/g, '').toLowerCase();
}

function splitNames(value: string) {
  return uniqueStrings(value.split(',').map((name) => name.trim()).filter(Boolean));
}

function namesForIds(ids: number[], names: string[]) {
  return ids.map((id) => names[id - 1]).filter(Boolean);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'es'));
}

function uniqueNumbers(values: number[]) {
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

function inferDataType(name: string): CatalogIndicator['dataType'] {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (normalized.startsWith('porcentaje') || normalized.startsWith('tasa')) {
    return 'percentage';
  }

  return 'number';
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
