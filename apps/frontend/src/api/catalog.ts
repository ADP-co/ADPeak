import { apiJson } from './client';
import { officialCatalogRows } from '../catalog/officialCatalog.generated';
import type { IndicatorTemplate } from '../components/forms/formConfig';

export type CatalogRole = 'director' | 'responsable' | 'plantel';

export type CatalogUser = {
  id: string;
  name: string;
  role: CatalogRole;
  plantelId?: number;
  responsableId?: number;
  indicatorCodes: string[];
  active: boolean;
};

export type CatalogIndicator = {
  id: number;
  code: string;
  name: string;
  description: string;
  dataType: 'number' | 'percentage' | 'text';
  period: string;
  active: boolean;
  primaryResponsibleId: number;
  responsibleIds: number[];
  responsibleNames: string[];
  contributorNames: string[];
  activities: string[];
  plantelIds: number[];
};

type IndicatorTemplateResponse = IndicatorTemplate & {
  initialRows?: Record<string, unknown>[];
};

const INDICATORS_STORAGE_KEY = 'adpeak.catalog.indicators';
const USERS_STORAGE_KEY = 'adpeak.catalog.users';

const planteles = [
  { id: 1, name: 'Bachillerato 16' },
  { id: 2, name: 'Bachillerato 4' },
  { id: 3, name: 'Bachillerato 1' },
  { id: 4, name: 'Bachillerato 33' },
];

const fallbackIndicators = buildFallbackIndicators();
const fallbackUsers = buildFallbackUsers(fallbackIndicators);

export async function fetchIndicators() {
  try {
    const response = await apiJson<{ indicators: CatalogIndicator[] }>('/indicadores');
    writeStorage(INDICATORS_STORAGE_KEY, response.indicators);
    return response.indicators;
  } catch {
    return readStorage(INDICATORS_STORAGE_KEY, fallbackIndicators);
  }
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
  } catch {
    const current = readStorage(INDICATORS_STORAGE_KEY, fallbackIndicators);
    const existing = current.find((indicator) => indicator.id === input.id || indicator.code === input.code);
    const next: CatalogIndicator = {
      ...buildEmptyIndicator(current),
      ...existing,
      ...input,
      id: existing?.id ?? input.id ?? nextId(current),
      active: input.active ?? existing?.active ?? true,
      code: input.code?.trim() || existing?.code || `TMP-${Date.now()}`,
      name: input.name?.trim() || existing?.name || 'Nuevo indicador',
      description: input.description?.trim() || existing?.description || input.name?.trim() || 'Nuevo indicador',
      responsibleNames: input.responsibleNames?.length ? input.responsibleNames : existing?.responsibleNames ?? ['Responsable sin asignar'],
      contributorNames: input.contributorNames?.length ? input.contributorNames : existing?.contributorNames ?? ['Planteles'],
      activities: input.activities?.length ? input.activities : existing?.activities ?? ['Actividad general'],
    };

    writeStorage(
      INDICATORS_STORAGE_KEY,
      existing ? current.map((indicator) => (indicator.id === existing.id ? next : indicator)) : [next, ...current]
    );
    return next;
  }
}

export async function deactivateIndicator(id: number) {
  try {
    const response = await apiJson<CatalogIndicator>(`/indicadores/${id}/desactivar`, { method: 'PATCH' });
    mergeIndicator(response);
    return response;
  } catch {
    const current = readStorage(INDICATORS_STORAGE_KEY, fallbackIndicators);
    const updated = current.map((indicator) => (indicator.id === id ? { ...indicator, active: false } : indicator));
    writeStorage(INDICATORS_STORAGE_KEY, updated);
    return updated.find((indicator) => indicator.id === id);
  }
}

export async function fetchIndicatorTemplate(codeOrId: string) {
  try {
    return await apiJson<IndicatorTemplateResponse>(`/indicadores/${encodeURIComponent(codeOrId)}/template`);
  } catch {
    const indicator = readStorage(INDICATORS_STORAGE_KEY, fallbackIndicators)
      .find((candidate) => candidate.code === codeOrId || String(candidate.id) === codeOrId);
    return templateForIndicator(indicator ?? fallbackIndicators[0]);
  }
}

export async function fetchUsers() {
  try {
    const response = await apiJson<{ users: CatalogUser[] }>('/usuarios');
    writeStorage(USERS_STORAGE_KEY, response.users);
    return response.users;
  } catch {
    return readStorage(USERS_STORAGE_KEY, fallbackUsers);
  }
}

export async function saveUser(input: Partial<CatalogUser>) {
  try {
    const path = input.id ? `/usuarios/${encodeURIComponent(input.id)}` : '/usuarios';
    const method = input.id ? 'PUT' : 'POST';
    const response = await apiJson<CatalogUser>(path, {
      method,
      body: JSON.stringify(input),
    });
    mergeUser(response);
    return response;
  } catch {
    const current = readStorage(USERS_STORAGE_KEY, fallbackUsers);
    const existing = current.find((user) => user.id === input.id);
    const next: CatalogUser = {
      id: existing?.id ?? input.id ?? `user-${Date.now()}`,
      name: input.name?.trim() || existing?.name || 'Usuario',
      role: input.role ?? existing?.role ?? 'plantel',
      plantelId: input.plantelId ?? existing?.plantelId,
      responsableId: input.responsableId ?? existing?.responsableId,
      indicatorCodes: input.indicatorCodes ?? existing?.indicatorCodes ?? [],
      active: input.active ?? existing?.active ?? true,
    };

    writeStorage(USERS_STORAGE_KEY, existing ? current.map((user) => (user.id === next.id ? next : user)) : [next, ...current]);
    return next;
  }
}

export async function deactivateUser(id: string) {
  try {
    const response = await apiJson<CatalogUser>(`/usuarios/${encodeURIComponent(id)}/desactivar`, { method: 'PATCH' });
    mergeUser(response);
    return response;
  } catch {
    const current = readStorage(USERS_STORAGE_KEY, fallbackUsers);
    const updated = current.map((user) => (user.id === id ? { ...user, active: false } : user));
    writeStorage(USERS_STORAGE_KEY, updated);
    return updated.find((user) => user.id === id);
  }
}

function buildFallbackIndicators(): CatalogIndicator[] {
  const responsibleNames = Array.from(new Set(officialCatalogRows.map((row) => row.responsible).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'es'));
  const responsibleIdByName = new Map(responsibleNames.map((name, index) => [name, index + 1]));
  const byCode = new Map<string, CatalogIndicator>();

  officialCatalogRows.forEach((row) => {
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
      responsibleNames: [row.responsible],
      contributorNames: contributors,
      activities: [row.activity || 'Actividad general'],
      plantelIds: planteles.map((plantel) => plantel.id),
    });
  });

  return Array.from(byCode.values()).sort((a, b) => a.code.localeCompare(b.code, 'es', { numeric: true }));
}

function buildFallbackUsers(indicators: CatalogIndicator[]): CatalogUser[] {
  const responsibleNames = Array.from(new Set(indicators.flatMap((indicator) => indicator.responsibleNames)))
    .sort((a, b) => a.localeCompare(b, 'es'));
  const director: CatalogUser = {
    id: 'director-1',
    name: 'Director DGEMS',
    role: 'director',
    indicatorCodes: [],
    active: true,
  };
  const responsables = responsibleNames.map((name, index) => {
    const responsableId = index + 1;
    return {
      id: `responsable-${responsableId}`,
      name,
      role: 'responsable' as const,
      responsableId,
      indicatorCodes: indicators
        .filter((indicator) => indicator.responsibleNames.includes(name))
        .map((indicator) => indicator.code),
      active: true,
    };
  });
  const plantelUsers = planteles.map((plantel) => ({
    id: `plantel-${plantel.id}`,
    name: plantel.name,
    role: 'plantel' as const,
    plantelId: plantel.id,
    indicatorCodes: [],
    active: true,
  }));

  return [director, ...responsables, ...plantelUsers];
}

function templateForIndicator(indicator: CatalogIndicator): IndicatorTemplateResponse {
  if (indicator.code === '1.0.0.0.2') {
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
        { delegacion: 'Villa de Álvarez', plantel: 'Bachillerato 16', programa: 'Técnico Analista Programador', egresados_mujeres: '', egresados_hombres: '', matricula_mujeres: '', matricula_hombres: '' },
        { delegacion: 'Villa de Álvarez', plantel: 'Bachillerato 16', programa: 'Técnico Analista Químico', egresados_mujeres: '', egresados_hombres: '', matricula_mujeres: '', matricula_hombres: '' },
      ],
    };
  }

  return {
    indicatorCode: indicator.code,
    indicatorName: indicator.name,
    groups: [
      { label: 'Contexto', colspan: 2 },
      { label: 'Seguimiento', colspan: 3 },
    ],
    columns: [
      { key: 'plantel', label: 'Plantel', type: 'readonly' },
      { key: 'actividad', label: 'Actividad', type: 'readonly' },
      { key: 'meta', label: 'Meta', type: 'number' },
      { key: 'avance', label: 'Avance', type: 'number' },
      { key: 'observaciones', label: 'Observaciones', type: 'text' },
    ],
    initialRows: planteles.slice(0, 1).map((plantel) => ({
      plantel: plantel.name,
      actividad: indicator.activities[0] ?? 'Actividad general',
      meta: '',
      avance: '',
      observaciones: '',
    })),
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

function writeStorage<T>(key: string, value: T) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
}

function mergeIndicator(indicator: CatalogIndicator) {
  const current = readStorage(INDICATORS_STORAGE_KEY, fallbackIndicators);
  writeStorage(
    INDICATORS_STORAGE_KEY,
    current.some((item) => item.id === indicator.id)
      ? current.map((item) => (item.id === indicator.id ? indicator : item))
      : [indicator, ...current]
  );
}

function mergeUser(user: CatalogUser) {
  const current = readStorage(USERS_STORAGE_KEY, fallbackUsers);
  writeStorage(
    USERS_STORAGE_KEY,
    current.some((item) => item.id === user.id)
      ? current.map((item) => (item.id === user.id ? user : item))
      : [user, ...current]
  );
}

function buildEmptyIndicator(current: CatalogIndicator[]): CatalogIndicator {
  return {
    id: nextId(current),
    code: '',
    name: '',
    description: '',
    dataType: 'number',
    period: '2026',
    active: true,
    primaryResponsibleId: 1,
    responsibleIds: [1],
    responsibleNames: [],
    contributorNames: [],
    activities: [],
    plantelIds: planteles.map((plantel) => plantel.id),
  };
}

function nextId(indicators: CatalogIndicator[]) {
  return Math.max(0, ...indicators.map((indicator) => indicator.id)) + 1;
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
