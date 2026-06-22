/// <reference types="node" />

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import {
  officialCatalogRows,
  officialIndicatorPlantelScopes
} from "./official-catalog.generated.js";
import {
  officialDataSummary,
  officialEvidenceGroups,
  officialWorkbookSummaries,
  officialWorkbookTemplates
} from "./official-data.generated.js";
import { listCaptureDrafts, type CaptureDraft, type CapturePayload } from "./capture-store.js";
import {
  persistState,
  readPersistedCollection,
  readPersistedValue
} from "./state-store.js";

export type SystemRole = "director" | "responsable" | "plantel";

export type SigiSession = {
  userId: string;
  role: SystemRole;
  plantelId?: number;
  responsableId?: number;
};

export type SigiUser = {
  id: string;
  username: string;
  name: string;
  role: SystemRole;
  plantelId?: number;
  responsableId?: number;
  indicatorCodes: string[];
  active: boolean;
  passwordHash: string;
};

export type PublicSigiUser = Omit<SigiUser, "passwordHash">;

export type AuthenticatedSigiUser = {
  id: string;
  username: string;
  name: string;
  role: "admin" | "responsable" | "plantel";
  description: string;
  plantelId?: number;
  responsableId?: number;
};

type SessionTokenPayload = {
  sub: string;
  role: SystemRole;
  plantelId?: number;
  responsableId?: number;
  exp: number;
};

export type SigiIndicator = {
  id: number;
  code: string;
  name: string;
  description: string;
  dataType: "number" | "percentage" | "text";
  period: string;
  active: boolean;
  primaryResponsibleId: number;
  responsibleIds: number[];
  responsibleNames: string[];
  contributorNames: string[];
  activities: string[];
  plantelIds: number[];
  plantelScopeSource?: "official-import" | "manual";
  templateColumns?: TemplateColumn[];
};

export type Plantel = {
  id: number;
  key: string;
  name: string;
};

export type TemplateColumn = {
  key: string;
  label: string;
  type: "readonly" | "number" | "text" | "calculated";
  required?: boolean;
  calculation?:
    | { type: "sum"; sourceKeys: string[] }
    | { type: "percentage"; numeratorKey: string; denominatorKey: string; decimals?: number }
    | { type: "formula"; expression: string; decimals?: number };
};

export type IndicatorTemplate = {
  indicatorCode: string;
  indicatorName: string;
  groups: { label: string; colspan: number }[];
  columns: TemplateColumn[];
  initialRows: Record<string, unknown>[];
  headerRows?: Array<Array<{ label: string; colspan?: number; rowspan?: number }>>;
  infoBlocks?: Array<{ label?: string; text: string; tone?: "default" | "highlight" }>;
  footerNote?: string;
  showTotals?: boolean;
  allowAddRows?: boolean;
  addRowLabel?: string;
  emptyRow?: Record<string, unknown>;
  analysisHeading?: string;
  analysisLabel?: string;
  analysisPlaceholder?: string;
};

export type SigiReportPayload = {
  tipoReporte: "plantel" | "institucional" | "responsable";
  periodo: string;
  cicloEscolar: string;
  fechaGeneracion: string;
  identidadReporte: {
    tipo: "Plantel" | "Institucional" | "Responsable";
    nombre: string;
  };
  indicadores: Array<{
    id: string;
    nombre: string;
    descripcion: string;
    datos: Array<{
      registro_id: string;
      captureId?: number;
      actividadId?: number;
      actividad: string;
      responsable: string;
      estado: "Borrador" | "Enviado" | "Observado" | "Aprobado";
      avance: string;
      plantel: string;
      plantelId: string;
      periodo: string;
      periodoId?: number;
      ciclo: string;
      meta: number;
      evidencias: number;
      vencimiento: "en_tiempo" | "atrasado";
      detalle?: Array<{ campo: string; valor: string }>;
    }>;
  }>;
};

export type OfficialSourcesPayload = {
  summary: typeof officialDataSummary;
  evidenceGroups: typeof officialEvidenceGroups;
  workbookSummaries: typeof officialWorkbookSummaries;
  scope: {
    plantel: string;
    visibleForRole: SystemRole;
  };
};

export class SigiAuthError extends Error {
  statusCode = 401;
  code = "session_required";
}

export class SigiForbiddenError extends Error {
  statusCode = 403;
  code = "forbidden";
}

export class SigiValidationError extends Error {
  statusCode = 400;
  code = "invalid_payload";
}

const roleAliases: Record<string, SystemRole> = {
  admin: "director",
  administrador: "director",
  admin_dgems: "director",
  director: "director",
  responsable: "responsable",
  responsable_indicador: "responsable",
  plantel: "plantel"
};

const legacyPlanteles: Plantel[] = [
  { id: 1, key: "bach-16", name: "Bachillerato 16" },
  { id: 2, key: "bach-4", name: "Bachillerato 4" },
  { id: 3, key: "bach-1", name: "Bachillerato 1" },
  { id: 4, key: "bach-33", name: "Bachillerato 33" }
];

const legacyPlantelNumbers = new Set(
  legacyPlanteles
    .map((plantel) => Number(plantel.name.match(/\d+/)?.[0]))
    .filter((value) => Number.isInteger(value))
);

export const planteles: Plantel[] = [
  ...legacyPlanteles,
  ...Array.from({ length: 35 }, (_, index) => index + 1)
    .filter((number) => !legacyPlantelNumbers.has(number))
    .map((number, index) => ({
      id: legacyPlanteles.length + index + 1,
      key: `bach-${number}`,
      name: `Bachillerato ${number}`
    })),
  { id: 36, key: "bach-linea", name: "Bachillerato en línea" },
  { id: 37, key: "iuba-bachillerato", name: "IUBA Bachillerato" }
];

const unassignedPlantel: Plantel = { id: 0, key: "sin-plantel", name: "Sin plantel asignado" };
const officialSourcePlantelIds: number[] = [];
const officialCatalogImportVersion = "2026-06-22-official-indicators-v8";

const responsibleNames = Array.from(
  new Set(officialCatalogRows.map((row) => row.responsible).filter(Boolean))
).sort((a, b) => a.localeCompare(b, "es"));

const responsibleIdByName = new Map(
  responsibleNames.map((name, index) => [name, index + 1])
);

const initialIndicators = buildIndicators();
const indicators = new Map<number, SigiIndicator>();
const users = new Map<string, SigiUser>();

reloadSigiStateFromPersistence();

export function sessionFromHeaders(headers: Record<string, string | string[] | undefined>): SigiSession {
  const token = bearerTokenFromHeaders(headers);

  if (token) {
    return sessionFromToken(token);
  }

  if (!allowUnsafeHeaderSessions()) {
    throw new SigiAuthError("La sesión requiere autenticación.");
  }

  const rawRole = headerValue(headers["x-role"]);
  const role = normalizeRole(rawRole);

  if (!role) {
    throw new SigiAuthError("La sesión no incluye un rol válido.");
  }

  const plantelId = numberHeader(headers["x-plantel-id"]);
  const responsableId = numberHeader(headers["x-responsable-id"]);
  const userId = headerValue(headers["x-user-id"]) || defaultUserIdForSession(role, plantelId, responsableId);

  return {
    userId,
    role,
    plantelId: role === "plantel" ? plantelId ?? 1 : plantelId,
    responsableId: role === "responsable" ? responsableId ?? 1 : responsableId
  };
}

export function reloadSigiStateFromPersistence() {
  const persistedIndicators = readPersistedCollection<SigiIndicator>("indicators");
  const persistedUsers = readPersistedCollection<SigiUser>("users");
  const needsCatalogMigration = readPersistedValue<string>("catalogImportVersion") !== officialCatalogImportVersion;

  indicators.clear();
  for (const indicator of mergeInitialIndicators(persistedIndicators, needsCatalogMigration)) {
    indicators.set(indicator.id, indicator);
  }

  users.clear();
  for (const user of mergeInitialUsers(persistedUsers)) {
    const normalizedUser = normalizePersistedUser(user);
    users.set(normalizedUser.id, normalizedUser);
  }

  if (needsCatalogMigration) {
    persistState({
      indicators: Array.from(indicators.values()),
      users: Array.from(users.values()),
      catalogImportVersion: officialCatalogImportVersion
    });
  }
}

export function normalizeRole(value?: string) {
  if (!value) {
    return undefined;
  }

  return roleAliases[normalizeKey(value)];
}

export function listUsers(session: SigiSession) {
  if (session.role === "director") {
    return Array.from(users.values()).sort(sortUsers).map(publicUser);
  }

  return Array.from(users.values()).filter((user) => user.id === session.userId).map(publicUser);
}

export function saveUser(session: SigiSession, input: Partial<SigiUser> & { password?: string }) {
  requireDirector(session);

  const role = normalizeRole(input.role);

  if (!role || !input.name?.trim()) {
    throw new SigiValidationError("El usuario debe incluir nombre y rol valido.");
  }

  const id = input.id || `user-${Date.now()}`;
  const existing = users.get(id);

  if (!existing && role !== "responsable") {
    throw new SigiValidationError("Solo se pueden crear cuentas de responsables.");
  }

  if (existing?.role === "director" && role !== "director") {
    throw new SigiValidationError("El administrador principal no puede cambiar de rol.");
  }

  if (existing?.role === "plantel" && role !== "plantel") {
    throw new SigiValidationError("Las cuentas de plantel no pueden cambiar de rol.");
  }

  if (role === "director") {
    const hasAnotherDirector = Array.from(users.values()).some((user) => user.role === "director" && user.id !== id);

    if (hasAnotherDirector) {
      throw new SigiValidationError("Solo puede existir un administrador.");
    }

    if (input.active === false) {
      throw new SigiValidationError("El administrador principal no puede desactivarse.");
    }
  }

  const user: SigiUser = {
    id,
    username: input.username?.trim().toLowerCase() || existing?.username || usernameForUser(id, input.name, role),
    name: input.name.trim(),
    role,
    plantelId: role === "plantel" ? input.plantelId ?? existing?.plantelId ?? 1 : undefined,
    responsableId: role === "responsable" ? input.responsableId ?? existing?.responsableId ?? 1 : undefined,
    indicatorCodes: role === "responsable" ? input.indicatorCodes ?? existing?.indicatorCodes ?? [] : [],
    active: input.active ?? existing?.active ?? true,
    passwordHash: input.password ? hashPassword(input.password) : existing?.passwordHash ?? defaultPasswordHashForRole(role)
  };

  users.set(id, user);
  persistCatalogState();
  return publicUser(user);
}

export function deactivateUser(session: SigiSession, id: string) {
  requireDirector(session);
  const user = users.get(id);

  if (!user) {
    return undefined;
  }

  if (user.role === "director") {
    throw new SigiValidationError("El administrador principal no puede desactivarse.");
  }

  const updated = { ...user, active: false };
  users.set(id, updated);
  persistCatalogState();
  return publicUser(updated);
}

export function authenticateUser(username: string, password: string): AuthenticatedSigiUser | undefined {
  const normalizedUsername = normalizeUsername(username);
  const user = Array.from(users.values()).find((candidate) =>
    candidate.active && candidate.username === normalizedUsername
  );

  if (!user || user.passwordHash !== hashPassword(password)) {
    return undefined;
  }

  return authenticatedUser(user);
}

export function createSessionToken(user: AuthenticatedSigiUser | SigiUser) {
  const role = normalizeRole(user.role) ?? "plantel";
  const payload: SessionTokenPayload = {
    sub: user.id,
    role,
    plantelId: user.plantelId,
    responsableId: user.responsableId,
    exp: Math.floor(Date.now() / 1000) + sessionTtlSeconds()
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function listIndicators(session: SigiSession, options: { includeInactive?: boolean } = {}) {
  return Array.from(indicators.values())
    .filter((indicator) => options.includeInactive || indicator.active)
    .filter((indicator) => canReadIndicator(session, indicator))
    .sort((a, b) => a.code.localeCompare(b.code, "es", { numeric: true }));
}

export function getIndicatorById(id: number) {
  return indicators.get(id);
}

export function getIndicatorByCode(code: string) {
  return Array.from(indicators.values()).find((indicator) => indicator.code === code);
}

export function saveIndicator(session: SigiSession, input: Partial<SigiIndicator>) {
  requireDirector(session);

  if (!input.code?.trim() || !input.name?.trim()) {
    throw new SigiValidationError("El indicador debe incluir código y nombre.");
  }

  const existing = input.id ? indicators.get(Number(input.id)) : getIndicatorByCode(input.code);
  const id = existing?.id ?? nextIndicatorId();
  const responsibleIds = normalizeResponsibleIds(input.responsibleIds, input.responsibleNames);
  const primaryResponsibleId = input.primaryResponsibleId ?? responsibleIds[0] ?? 1;
  const isNewIndicator = !existing;
  const nextContributorNames = input.contributorNames ?? existing?.contributorNames ?? [];
  const inputHasPlantelIds = Object.prototype.hasOwnProperty.call(input, "plantelIds");
  const isOfficialImportedIndicator = Boolean(
    initialIndicators.find((indicator) => indicator.code === input.code && indicator.plantelScopeSource === "official-import")
  );
  const nextPlantelIds = normalizePlantelScope(
    inputHasPlantelIds
      ? input.plantelIds ?? []
      : existing?.plantelIds ??
        (isNewIndicator && targetsPlanteles(nextContributorNames) ? allPlantelIds() : officialSourcePlantelIds)
  );
  const preservesOfficialImportedScope =
    isOfficialImportedIndicator &&
    nextPlantelIds.length === 0;

  if (nextPlantelIds.length === 0 && !preservesOfficialImportedScope) {
    throw new SigiValidationError("Asigna al menos un plantel para habilitar captura.");
  }

  const indicator: SigiIndicator = {
    id,
    code: input.code.trim(),
    name: input.name.trim(),
    description: input.description?.trim() || input.name.trim(),
    dataType: input.dataType ?? inferDataType(input.name),
    period: input.period ?? "2026",
    active: input.active ?? existing?.active ?? true,
    primaryResponsibleId,
    responsibleIds,
    responsibleNames: namesForResponsibleIds(responsibleIds),
    contributorNames: nextContributorNames,
    activities: input.activities?.filter(Boolean) ?? existing?.activities ?? ["Actividad general"],
    plantelIds: nextPlantelIds,
    plantelScopeSource: preservesOfficialImportedScope
      ? "official-import"
      : inputHasPlantelIds ? "manual" : existing?.plantelScopeSource ?? "manual",
    templateColumns: sanitizeTemplateColumns(input.templateColumns ?? existing?.templateColumns)
  };

  indicators.set(id, indicator);
  persistCatalogState();
  return indicator;
}

export function deactivateIndicator(session: SigiSession, id: number) {
  requireDirector(session);
  const indicator = indicators.get(id);

  if (!indicator) {
    return undefined;
  }

  const updated = { ...indicator, active: false };
  indicators.set(id, updated);
  persistCatalogState();
  return updated;
}

const studentPeriodMatrixCodes = new Set([
  "1.1.2.1.1",
  "1.1.2.1.3",
  "1.1.2.2.1",
  "1.1.2.2.8",
  "1.1.2.2.9",
  "1.1.2.2.10",
  "1.1.2.2.11",
  "1.1.2.4.1"
]);

const integralDevelopmentCodes = new Set(["1.1.2.3.1"]);

const staffTrainingCodes = new Set([
  "1.1.2.5.5",
  "1.1.2.5.6",
  "1.1.2.5.7",
  "1.1.2.5.8",
  "1.1.2.5.9",
  "1.1.2.5.10",
  "4.1.4.3.3"
]);

const staffProfileCodes = new Set(["1.1.2.5.1", "1.1.2.5.3"]);

const participantActionCodes = new Set([
  "2.1.4.1.1",
  "2.1.4.1.2",
  "2.1.4.1.3",
  "3.1.0.0.1",
  "3.1.1.2.2",
  "3.1.1.3.6",
  "4.1.5.3.3"
]);

const infrastructureCodes = new Set(["4.1.2.1.3", "4.1.2.1.6", "4.1.2.2.1"]);

export function templateForIndicator(indicator: SigiIndicator, session?: SigiSession): IndicatorTemplate {
  if (officialWorkbookTemplates[indicator.code]) {
    return officialWorkbookTemplate(indicator, session);
  }

  if (indicator.templateColumns?.length) {
    return configuredTemplate(indicator, session);
  }

  if (indicator.code === "1.0.0.0.1") {
    return terminalEfficiencyTemplate(indicator, session);
  }

  if (indicator.code === "1.0.0.0.2") {
    return titulationTemplate(indicator, session);
  }

  if (indicator.code === "1.1.2.1.4") {
    return healthIntegralTemplate(indicator, session);
  }

  if (integralDevelopmentCodes.has(indicator.code)) {
    return integralDevelopmentTemplate(indicator, session);
  }

  if (studentPeriodMatrixCodes.has(indicator.code)) {
    return studentPeriodMatrixTemplate(indicator, session);
  }

  if (staffTrainingCodes.has(indicator.code)) {
    return staffTrainingTemplate(indicator, session);
  }

  if (staffProfileCodes.has(indicator.code)) {
    return staffProfileTemplate(indicator, session);
  }

  if (participantActionCodes.has(indicator.code)) {
    return participantActionTemplate(indicator, session);
  }

  if (infrastructureCodes.has(indicator.code)) {
    return infrastructureTemplate(indicator, session);
  }

  if (indicator.dataType === "number") {
    return participantActionTemplate(indicator, session);
  }

  return genericTemplate(indicator, session);
}

export function assertCaptureAccess(
  session: SigiSession,
  request: { plantelId: number; indicadorId: number; payload?: CapturePayload },
  action: "draft" | "submit" | "read" | "review"
) {
  const indicator = indicators.get(request.indicadorId);

  if (!indicator || !indicator.active) {
    throw new SigiValidationError("El indicador no existe o esta desactivado.");
  }

  if (session.role === "plantel" && request.plantelId !== session.plantelId) {
    throw new SigiForbiddenError("El plantel solo puede operar su propio alcance.");
  }

  if (!canUseIndicatorForPlantel(indicator, request.plantelId)) {
    throw new SigiForbiddenError("El indicador no esta asignado a este plantel.");
  }

  if (session.role === "responsable" && !isResponsibleAssigned(session, indicator)) {
    throw new SigiForbiddenError("El responsable no tiene asignado este indicador.");
  }

  if (session.role === "plantel" && action === "review") {
    throw new SigiForbiddenError("El plantel no puede revisar capturas.");
  }

  if (request.payload) {
    validateCapturePayload(indicator, request.payload, action === "submit");
  }
}

export function validateCapturePayload(indicator: SigiIndicator, payload: CapturePayload, requireJustification: boolean) {
  if (!Array.isArray(payload.rows) || payload.rows.some((row) => typeof row !== "object" || row === null || Array.isArray(row))) {
    throw new SigiValidationError("La captura debe incluir filas validas.");
  }

  const template = templateForIndicator(indicator);
  const minimumRows = template.initialRows.length;

  if (payload.rows.length === 0 || (requireJustification && !template.allowAddRows && payload.rows.length < minimumRows)) {
    throw new SigiValidationError("La captura está incompleta. Vuelve a abrir el indicador y conserva todas las filas oficiales.");
  }

  const columnKeys = new Set(template.columns.map((column) => column.key));
  const unknownKeys = payload.rows.flatMap((row) =>
    Object.keys(row).filter((key) => !columnKeys.has(key))
  );

  if (unknownKeys.length > 0) {
    throw new SigiValidationError(`La captura incluye columnas no configuradas: ${Array.from(new Set(unknownKeys)).join(", ")}.`);
  }

  const missingValues = payload.rows.some((row) =>
    template.columns.some((column) => {
      if (column.type === "readonly" || column.type === "calculated") {
        return false;
      }

      const value = row[column.key];
      return value === "" || value === undefined || value === null;
    })
  );

  if (requireJustification && missingValues && !payload.justificacion?.trim()) {
    throw new SigiValidationError("Agrega una justificación cuando existan datos pendientes.");
  }
}

export function officialSourcesPayload(session: SigiSession): OfficialSourcesPayload {
  if (session.role === "plantel" && session.plantelId !== 1) {
    throw new SigiForbiddenError("El plantel solo puede consultar sus propias fuentes oficiales.");
  }

  return {
    summary: officialDataSummary,
    evidenceGroups: officialEvidenceGroups,
    workbookSummaries: officialWorkbookSummaries,
    scope: {
      plantel: officialDataSummary.plantel,
      visibleForRole: session.role
    }
  };
}

export function buildReportPayload(
  session: SigiSession,
  filters: { plantelId?: string; plantel?: string; periodo?: string; cicloEscolar?: string; now?: Date } = {}
): SigiReportPayload {
  if (session.role === "plantel") {
    throw new SigiForbiddenError("El plantel no tiene acceso a reportes institucionales.");
  }

  const cicloEscolar = filters.cicloEscolar ?? "2025-2026";
  const periodo = filters.periodo ?? "2026-A";
  const requestedPeriodoId = periodIdFromReportPeriod(periodo);
  const plantelId = resolvePlantelId(filters.plantelId ?? filters.plantel);
  const scopedPlanteles = plantelId
    ? planteles.filter((plantel) => plantel.id === plantelId)
    : planteles;
  const scopedIndicators = listIndicators(session);
  const captureDrafts = listCaptureDrafts();
  const grouped = scopedIndicators.map((indicator) => {
    const indicatorPlanteles = plantelesForReport(indicator, scopedPlanteles, Boolean(plantelId));
    const rows = indicatorPlanteles.flatMap((plantel) =>
      indicator.activities.flatMap((activity, activityIndex) => {
        const capturedRows = rowsFromCaptureDrafts({
          captureDrafts,
          indicator,
          plantel,
          activity,
          activityIndex,
          periodoId: requestedPeriodoId,
          periodo,
          cicloEscolar
        });

        if (capturedRows.length > 0) {
          return capturedRows;
        }

        return {
          registro_id: `${indicator.code}-${plantel.id}-${activityIndex + 1}`,
          actividad: activity || "Actividad general",
          responsable: indicator.responsibleNames.join(", "),
          estado: "Borrador" as const,
          avance: "0%",
          plantel: plantel.name,
          plantelId: String(plantel.id),
          periodo,
          ciclo: cicloEscolar,
          meta: 100,
          evidencias: 0,
          vencimiento: "atrasado" as const
        };
      })
    );

    return {
      id: indicator.code,
      nombre: indicator.name,
      descripcion: indicator.description,
      datos: rows
    };
  }).filter((indicator) => indicator.datos.length > 0);
  const officialSourcesReport = session.role === "director"
    ? officialSourcesReportRows(plantelId, periodo, cicloEscolar)
    : undefined;

  const identityPlantel = plantelId ? planteles.find((plantel) => plantel.id === plantelId) : undefined;
  const responsibleUser = session.role === "responsable"
    ? users.get(`responsable-${session.responsableId}`)
    : undefined;

  return {
    tipoReporte: identityPlantel ? "plantel" : session.role === "responsable" ? "responsable" : "institucional",
    periodo,
    cicloEscolar,
    fechaGeneracion: (filters.now ?? new Date()).toISOString().slice(0, 10),
    identidadReporte: {
      tipo: identityPlantel ? "Plantel" : session.role === "responsable" ? "Responsable" : "Institucional",
      nombre: identityPlantel?.name ?? responsibleUser?.name ?? "DGEMS"
    },
    indicadores: officialSourcesReport ? [...grouped, officialSourcesReport] : grouped
  };
}

function plantelesForReport(indicator: SigiIndicator, scopedPlanteles: Plantel[], hasPlantelFilter: boolean) {
  const effectivePlantelIds = effectivePlantelIdsForIndicator(indicator);

  if (effectivePlantelIds.length === 0) {
    if (
      indicator.plantelScopeSource === "official-import" &&
      indicator.plantelIds.length === 0 &&
      !officialIndicatorPlantelScopes[indicator.code]?.length
    ) {
      return scopedPlanteles.filter((plantel) => canUseIndicatorForPlantel(indicator, plantel.id));
    }

    return hasPlantelFilter ? [] : [unassignedPlantel];
  }

  return scopedPlanteles.filter((plantel) => effectivePlantelIds.includes(plantel.id));
}

function rowsFromCaptureDrafts({
  captureDrafts,
  indicator,
  plantel,
  activity,
  activityIndex,
  periodoId,
  periodo,
  cicloEscolar
}: {
  captureDrafts: CaptureDraft[];
  indicator: SigiIndicator;
  plantel: (typeof planteles)[number];
  activity: string;
  activityIndex: number;
  periodoId: number;
  periodo: string;
  cicloEscolar: string;
}): SigiReportPayload["indicadores"][number]["datos"] {
  return captureDrafts
    .filter((draft) =>
      draft.indicadorId === indicator.id &&
      draft.plantelId === plantel.id &&
      draft.actividadId === activityIndex + 1 &&
      draft.periodoId === periodoId
    )
    .flatMap((draft) => {
      const rows = draft.payload.rows.length > 0 ? draft.payload.rows : [{}];

      return rows.map((row, rowIndex) => ({
        registro_id: `captura-${draft.id}-${rowIndex + 1}`,
        captureId: draft.id,
        actividadId: draft.actividadId,
        actividad: readableValue(row.actividad) || activity || "Actividad general",
        responsable: indicator.responsibleNames.join(", "),
        estado: reportStatusForCapture(draft.estado),
        avance: progressForCapturedRow(row, draft.estado),
        plantel: readableValue(row.plantel) || plantel.name,
        plantelId: String(plantel.id),
        periodo,
        periodoId: draft.periodoId,
        ciclo: cicloEscolar,
        meta: numberValue(row.meta) ?? 100,
        evidencias: draft.payload.evidencia ? 1 : 0,
        vencimiento: draft.estado === "borrador" ? "atrasado" as const : "en_tiempo" as const,
        detalle: reportDetailsFromCapturedRow(row, indicator)
      }));
    });
}

function reportStatusForCapture(status: CaptureDraft["estado"]): SigiReportPayload["indicadores"][number]["datos"][number]["estado"] {
  if (status === "aprobado" || status === "cerrado") {
    return "Aprobado";
  }

  if (status === "correccion_solicitada") {
    return "Observado";
  }

  if (status === "en_revision") {
    return "Enviado";
  }

  return "Borrador";
}

function progressForCapturedRow(row: Record<string, unknown>, status: CaptureDraft["estado"]) {
  const explicitProgress = numberValue(row.avance) ?? numberValue(row.porcentaje_titulacion);

  if (explicitProgress !== undefined) {
    return `${Math.max(0, Math.min(100, explicitProgress))}%`;
  }

  if (status === "aprobado" || status === "cerrado") {
    return "100%";
  }

  if (status === "borrador") {
    return "0%";
  }

  return "75%";
}

function readableValue(value: unknown) {
  return typeof value === "string" ? cleanReportText(value.trim()) : "";
}

function cleanReportText(value: string) {
  if (!value.includes("\uFFFD")) {
    return value;
  }

  return value
    .replace(/\uFFFDlvarez/g, "\u00C1lvarez")
    .replace(/T\uFFFDcnico/g, "T\u00E9cnico")
    .replace(/Qu\uFFFDmico/g, "Qu\u00EDmico")
    .replace(/Cl\uFFFDnica/g, "Cl\u00EDnica")
    .replace(/Atenci\uFFFDn/g, "Atenci\u00F3n")
    .replace(/Promoci\uFFFDn/g, "Promoci\u00F3n")
    .replace(/N\uFFFDmero/g, "N\u00FAmero")
    .replace(/Matr\uFFFDcula/g, "Matr\u00EDcula")
    .replace(/titulaci\uFFFDn/g, "titulaci\u00F3n")
    .replace(/Titulaci\uFFFDn/g, "Titulaci\u00F3n");
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value.replace("%", ""));
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  return undefined;
}

function reportDetailsFromCapturedRow(row: Record<string, unknown>, indicator: SigiIndicator) {
  const details: Array<{ campo: string; valor: string }> = [];
  const labelsByKey = new Map((indicator.templateColumns ?? []).map((column) => [column.key, column.label]));
  const orderedKeys = uniqueStrings([
    ...(indicator.templateColumns ?? []).map((column) => column.key),
    ...Object.keys(row)
  ]);
  const seenLabels = new Set<string>();

  for (const key of orderedKeys) {
    if (isReservedReportDetailKey(key)) {
      continue;
    }

    const value = reportDetailValue(row[key]);

    if (!value) {
      continue;
    }

    const label = labelsByKey.get(key) ?? readableReportDetailLabel(key);
    const normalizedLabel = label.trim();
    const dedupeKey = normalizedLabel.toLowerCase();

    if (!normalizedLabel || seenLabels.has(dedupeKey)) {
      continue;
    }

    seenLabels.add(dedupeKey);
    details.push({ campo: normalizedLabel, valor: value });
  }

  return details;
}

function isReservedReportDetailKey(key: string) {
  return new Set([
    "id",
    "registro_id",
    "captureid",
    "capture_id",
    "actividadid",
    "actividad_id",
    "actividad",
    "responsable",
    "estado",
    "avance",
    "meta",
    "plantel",
    "plantelid",
    "plantel_id",
    "periodo",
    "periodoid",
    "periodo_id",
    "ciclo",
    "evidencias",
    "vencimiento"
  ]).has(key.toLowerCase());
}

function reportDetailValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    return cleanReportText(value.trim());
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(reportDetailValue).filter(Boolean).join(", ");
  }

  return "";
}

function readableReportDetailLabel(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function officialSourcesReportRows(
  plantelId: number | undefined,
  periodo: string,
  cicloEscolar: string
): SigiReportPayload["indicadores"][number] | undefined {
  if (plantelId && plantelId !== 1) {
    return undefined;
  }

  return {
    id: "fuentes-oficiales-cargadas",
    nombre: "Fuentes oficiales cargadas",
    descripcion: "Inventario agregado del paquete oficial recibido.",
    datos: officialEvidenceGroups.map((group, index) => ({
      registro_id: `fuente-oficial-${index + 1}`,
      actividad: group.category,
      responsable: officialDataSummary.plantel,
      estado: "Aprobado",
      avance: "100%",
      plantel: officialDataSummary.plantel,
      plantelId: "1",
      periodo,
      ciclo: cicloEscolar,
      meta: group.fileCount,
      evidencias: group.fileCount,
      vencimiento: "en_tiempo"
    }))
  };
}

function buildIndicators() {
  const byCode = new Map<string, SigiIndicator>();

  for (const row of officialCatalogRows) {
    const responsibleId = responsibleIdByName.get(row.responsible) ?? 1;
    const contributors = splitNames(row.contributors);
    const existing = byCode.get(row.code);

    if (existing) {
      existing.responsibleIds = uniqueNumbers([...existing.responsibleIds, responsibleId]);
      existing.responsibleNames = namesForResponsibleIds(existing.responsibleIds);
      existing.contributorNames = uniqueStrings([...existing.contributorNames, ...contributors]);
      existing.activities = uniqueStrings([...existing.activities, row.activity || "Actividad general"]);
      continue;
    }

    byCode.set(row.code, {
      id: byCode.size + 1,
      code: row.code,
      name: row.name,
      description: row.name,
      dataType: inferDataType(row.name),
      period: "2026",
      active: true,
      primaryResponsibleId: responsibleId,
      responsibleIds: [responsibleId],
      responsibleNames: [row.responsible],
      contributorNames: contributors,
      activities: [row.activity || "Actividad general"],
      plantelIds: [...officialSourcePlantelIds],
      plantelScopeSource: "official-import"
    });
  }

  return Array.from(byCode.values());
}

function buildInitialUsers(): SigiUser[] {
  const director: SigiUser = {
    id: "director-1",
    username: "director",
    name: "Director DGEMS",
    role: "director",
    indicatorCodes: [],
    active: true,
    passwordHash: defaultPasswordHashForRole("director")
  };
  const responsibleUsers = responsibleNames.map((name) => {
    const responsableId = responsibleIdByName.get(name) ?? 1;
    return {
      id: `responsable-${responsableId}`,
      username: `resp${String(responsableId).padStart(2, "0")}`,
      name,
      role: "responsable" as const,
      responsableId,
      indicatorCodes: initialIndicators
        .filter((indicator) => indicator.responsibleIds.includes(responsableId))
        .map((indicator) => indicator.code),
      active: true,
      passwordHash: defaultPasswordHashForRole("responsable")
    };
  });
  const plantelUsers = planteles.map((plantel) => ({
    id: `plantel-${plantel.id}`,
    username: usernameForPlantel(plantel),
    name: plantel.name,
    role: "plantel" as const,
    plantelId: plantel.id,
    indicatorCodes: [],
    active: true,
    passwordHash: defaultPasswordHashForRole("plantel")
  }));

  return [director, ...responsibleUsers, ...plantelUsers];
}

function publicUser(user: SigiUser): PublicSigiUser {
  const { passwordHash: _passwordHash, ...publicFields } = user;
  return publicFields;
}

function authenticatedUser(user: SigiUser): AuthenticatedSigiUser {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role === "director" ? "admin" : user.role,
    description: roleDescription(user.role),
    plantelId: user.plantelId,
    responsableId: user.responsableId
  };
}

function roleDescription(role: SystemRole) {
  if (role === "director") {
    return "Administrador";
  }

  if (role === "responsable") {
    return "Responsable de indicador";
  }

  return "Plantel";
}

function normalizePersistedUser(user: SigiUser): SigiUser {
  const role = normalizeRole(user.role) ?? "plantel";

  return {
    ...user,
    role,
    username: normalizeUsername(user.username || usernameForUser(user.id, user.name, role)),
    passwordHash: user.passwordHash || defaultPasswordHashForRole(role),
    indicatorCodes: user.indicatorCodes ?? [],
    active: user.active ?? true
  };
}

function normalizePersistedIndicator(indicator: SigiIndicator): SigiIndicator {
  const seededIndicator = initialIndicators.find((item) => item.code === indicator.code);
  const plantelIds = normalizePlantelScope(indicator.plantelIds ?? []);
  const shouldResetLegacyOfficialScope =
    seededIndicator?.plantelScopeSource === "official-import" &&
    indicator.plantelScopeSource !== "manual" &&
    isLegacyImportedPlantelScope(plantelIds);
  const shouldUseSeededPlantelScope =
    Boolean(seededIndicator) &&
    ((plantelIds.length === 0 && indicator.plantelScopeSource !== "manual") || shouldResetLegacyOfficialScope);

  return {
    ...indicator,
    plantelIds: shouldUseSeededPlantelScope ? seededIndicator!.plantelIds : plantelIds,
    plantelScopeSource: indicator.plantelScopeSource ?? seededIndicator?.plantelScopeSource ?? "manual",
    responsibleIds: indicator.responsibleIds?.length ? indicator.responsibleIds : seededIndicator?.responsibleIds ?? [1],
    responsibleNames: indicator.responsibleNames?.length ? indicator.responsibleNames : seededIndicator?.responsibleNames ?? namesForResponsibleIds([1]),
    contributorNames: indicator.contributorNames ?? seededIndicator?.contributorNames ?? [],
    activities: indicator.activities?.length ? indicator.activities : seededIndicator?.activities ?? ["Actividad general"],
    templateColumns: sanitizeTemplateColumns(indicator.templateColumns ?? seededIndicator?.templateColumns),
    active: indicator.active ?? true
  };
}

function sanitizeTemplateColumns(columns?: TemplateColumn[]) {
  const seenKeys = new Set<string>();

  return (columns ?? [])
    .map((column, index) => {
      const label = typeof column.label === "string" ? column.label.trim() : "";
      const key = uniqueTemplateKey(
        typeof column.key === "string" && column.key.trim()
          ? column.key.trim()
          : label || `campo_${index + 1}`,
        seenKeys
      );
      const type = ["readonly", "number", "text", "calculated"].includes(column.type)
        ? column.type
        : "text";

      return {
        key,
        label: label || `Campo ${index + 1}`,
        type,
        required: Boolean(column.required),
        calculation: type === "calculated" ? sanitizeCalculation(column.calculation) : undefined
      } satisfies TemplateColumn;
    })
    .filter((column) => column.label.trim());
}

function sanitizeCalculation(calculation: TemplateColumn["calculation"]) {
  if (!calculation) {
    return undefined;
  }

  if (calculation.type === "sum") {
    return { type: "sum" as const, sourceKeys: uniqueStrings(calculation.sourceKeys ?? []) };
  }

  if (calculation.type === "percentage") {
    return {
      type: "percentage" as const,
      numeratorKey: calculation.numeratorKey,
      denominatorKey: calculation.denominatorKey,
      decimals: Number.isInteger(calculation.decimals) ? calculation.decimals : 2
    };
  }

  const expression = typeof calculation.expression === "string" ? calculation.expression.trim() : "";
  return expression
    ? {
        type: "formula" as const,
        expression,
        decimals: Number.isInteger(calculation.decimals) ? calculation.decimals : 2
      }
    : undefined;
}

function uniqueTemplateKey(value: string, seenKeys: Set<string>) {
  const baseKey = normalizeKey(value).replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") || "campo";
  let key = baseKey;
  let counter = 2;

  while (seenKeys.has(key)) {
    key = `${baseKey}_${counter}`;
    counter += 1;
  }

  seenKeys.add(key);
  return key;
}

function normalizePlantelScope(ids: number[]) {
  const validIds = new Set(planteles.map((plantel) => plantel.id));
  return uniqueNumbers(ids.filter((id) => Number.isInteger(id) && validIds.has(id)));
}

function allPlantelIds() {
  return planteles.map((plantel) => plantel.id);
}

function targetsPlanteles(names: string[]) {
  return names.length === 0 || names.some((name) => normalizeKey(name).includes("plantel"));
}

function isLegacyDefaultPlantelScope(ids: number[]) {
  return sameNumberSet(ids, planteles.map((plantel) => plantel.id)) ||
    sameNumberSet(ids, legacyPlanteles.map((plantel) => plantel.id));
}

function isLegacyImportedPlantelScope(ids: number[]) {
  return sameNumberSet(ids, [1]) || isLegacyDefaultPlantelScope(ids);
}

function sameNumberSet(a: number[], b: number[]) {
  const left = uniqueNumbers(a);
  const right = uniqueNumbers(b);
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function mergeInitialIndicators(persisted?: SigiIndicator[], applyCatalogMigration = false) {
  const byCode = new Map(initialIndicators.map((indicator) => [indicator.code, normalizePersistedIndicator(indicator)]));

  for (const indicator of persisted ?? []) {
    if (applyCatalogMigration && isKnownTestIndicator(indicator)) {
      continue;
    }

    const normalizedIndicator = migratePersistedOfficialScope(
      normalizePersistedIndicator(indicator),
      applyCatalogMigration
    );
    const seededIndicator = byCode.get(normalizedIndicator.code);

    if (applyCatalogMigration && isRetiredOfficialImport(normalizedIndicator, seededIndicator)) {
      continue;
    }

    if (
      applyCatalogMigration &&
      seededIndicator?.plantelScopeSource === "official-import" &&
      normalizedIndicator.plantelScopeSource === "official-import"
    ) {
      byCode.set(normalizedIndicator.code, {
        ...seededIndicator,
        id: normalizedIndicator.id,
        active: normalizedIndicator.active
      });
      continue;
    }

    byCode.set(normalizedIndicator.code, seededIndicator
      ? {
          ...seededIndicator,
          ...normalizedIndicator
        }
      : normalizedIndicator
    );
  }

  return ensureUniqueIndicatorIds(Array.from(byCode.values()));
}

function isRetiredOfficialImport(indicator: SigiIndicator, seededIndicator?: SigiIndicator) {
  return indicator.plantelScopeSource === "official-import" && !seededIndicator;
}

function isKnownTestIndicator(indicator: Partial<SigiIndicator>) {
  const code = typeof indicator.code === "string" ? indicator.code : "";
  const name = typeof indicator.name === "string" ? normalizeKey(indicator.name) : "";

  return code.startsWith("TMP-") && (
    name.includes("temporal") ||
    [
      "TMP-CAPTURE-COLUMNS",
      "TMP-FORMULA",
      "TMP-PLANTEL-SESSION",
      "TMP-TRUNCATED-CAPTURE"
    ].includes(code)
  );
}

function migratePersistedOfficialScope(indicator: SigiIndicator, applyCatalogMigration: boolean) {
  if (!applyCatalogMigration) {
    return indicator;
  }

  const seededIndicator = initialIndicators.find((item) => item.code === indicator.code);

  if (
    seededIndicator?.plantelScopeSource === "official-import" &&
    !officialIndicatorPlantelScopes[indicator.code]?.length &&
    isLegacyImportedPlantelScope(indicator.plantelIds)
  ) {
    return {
      ...indicator,
      plantelIds: [...seededIndicator.plantelIds],
      plantelScopeSource: seededIndicator.plantelScopeSource
    };
  }

  return indicator;
}

function ensureUniqueIndicatorIds(items: SigiIndicator[]) {
  const usedIds = new Set<number>();
  let nextId = Math.max(0, ...items.map((indicator) => indicator.id).filter(Number.isInteger));

  return items
    .sort((a, b) => a.id - b.id || a.code.localeCompare(b.code, "es", { numeric: true }))
    .map((indicator) => {
      if (Number.isInteger(indicator.id) && indicator.id > 0 && !usedIds.has(indicator.id)) {
        usedIds.add(indicator.id);
        return indicator;
      }

      nextId += 1;
      usedIds.add(nextId);
      return { ...indicator, id: nextId };
    });
}

function mergeInitialUsers(persisted?: SigiUser[]) {
  const byId = new Map(buildInitialUsers().map((user) => [user.id, user]));

  for (const user of persisted ?? []) {
    const normalizedUser = normalizePersistedUser(user);

    if (normalizedUser.role === "director" && normalizedUser.id !== "director-1") {
      continue;
    }

    byId.set(normalizedUser.id, {
      ...byId.get(normalizedUser.id),
      ...normalizedUser
    });
  }

  return Array.from(byId.values());
}

function usernameForPlantel(plantel: Plantel) {
  const numericName = plantel.name.match(/\d+/)?.[0];

  if (numericName) {
    return `bach${numericName}`;
  }

  if (normalizeKey(plantel.name).includes("linea")) {
    return "bachlinea";
  }

  if (normalizeKey(plantel.name).includes("iuba")) {
    return "iuba";
  }

  return plantel.key.replace(/-/g, "");
}

function usernameForUser(id: string, name: string | undefined, role: SystemRole) {
  if (role === "director") {
    return "director";
  }

  if (role === "plantel") {
    const plantelNumber = name?.match(/\d+/)?.[0] || id.match(/\d+/)?.[0] || "1";
    return `bach${plantelNumber}`;
  }

  const responsableNumber = id.match(/\d+/)?.[0] || "1";
  return `resp${String(Number(responsableNumber)).padStart(2, "0")}`;
}

function defaultPasswordHashForRole(role: SystemRole) {
  if (role === "director") {
    return hashPassword("Director2026!");
  }

  if (role === "responsable") {
    return hashPassword("Resp2026!");
  }

  return hashPassword("Plantel2026!");
}

function hashPassword(password: string) {
  return createHash("sha256").update(`adpeak:${password}`).digest("hex");
}

function bearerTokenFromHeaders(headers: Record<string, string | string[] | undefined>) {
  const authorization = headerValue(headers.authorization ?? headers.Authorization);
  const sessionHeader = headerValue(headers["x-session-token"]);

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return sessionHeader?.trim();
}

function sessionFromToken(token: string): SigiSession {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature || !verifySignature(encodedPayload, signature)) {
    throw new SigiAuthError("La sesión no es válida.");
  }

  let payload: SessionTokenPayload;

  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionTokenPayload;
  } catch {
    throw new SigiAuthError("La sesión no es válida.");
  }

  if (!payload.sub || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new SigiAuthError("La sesión expiró.");
  }

  const user = users.get(payload.sub);

  if (!user?.active) {
    throw new SigiAuthError("La sesión no pertenece a un usuario activo.");
  }

  return {
    userId: user.id,
    role: user.role,
    plantelId: user.role === "plantel" ? user.plantelId : user.plantelId ?? payload.plantelId,
    responsableId: user.role === "responsable" ? user.responsableId : user.responsableId ?? payload.responsableId
  };
}

function allowUnsafeHeaderSessions() {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST === "true" ||
    process.env.ADPEAK_ALLOW_UNSAFE_HEADERS === "true"
  );
}

function sessionTtlSeconds() {
  const minutes = Number(process.env.AUTH_TOKEN_TTL_MINUTES ?? 480);
  const boundedMinutes = Number.isFinite(minutes) ? Math.max(15, Math.min(1440, minutes)) : 480;
  return boundedMinutes * 60;
}

function sessionSecret() {
  return process.env.AUTH_SECRET || process.env.SIGI_AUTH_SECRET || "adpeak-local-session-secret-change-me";
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", sessionSecret()).update(encodedPayload).digest("base64url");
}

function verifySignature(encodedPayload: string, signature: string) {
  const expected = Buffer.from(signPayload(encodedPayload), "utf8");
  const received = Buffer.from(signature, "utf8");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function normalizeUsername(value: string) {
  return normalizeKey(value).replace(/\s+/g, "");
}

function persistCatalogState() {
  persistState({
    users: Array.from(users.values()),
    indicators: Array.from(indicators.values())
  });
}

function requireDirector(session: SigiSession) {
  if (session.role !== "director") {
    throw new SigiForbiddenError("Solo dirección puede administrar este recurso.");
  }
}

function canReadIndicator(session: SigiSession, indicator: SigiIndicator) {
  if (session.role === "director") {
    return true;
  }

  if (session.role === "plantel") {
    return canUseIndicatorForPlantel(indicator, session.plantelId ?? -1);
  }

  return isResponsibleAssigned(session, indicator);
}

function isResponsibleAssigned(session: SigiSession, indicator: SigiIndicator) {
  const responsableId = session.responsableId ?? -1;

  if (indicator.responsibleIds.includes(responsableId)) {
    return true;
  }

  const user = users.get(session.userId);
  return Boolean(user?.indicatorCodes.includes(indicator.code));
}

function canUseIndicatorForPlantel(indicator: SigiIndicator, plantelId: number) {
  if (
    indicator.plantelScopeSource === "official-import" &&
    indicator.plantelIds.length === 0 &&
    !officialIndicatorPlantelScopes[indicator.code]?.length
  ) {
    return planteles.some((plantel) => plantel.id === plantelId);
  }

  return effectivePlantelIdsForIndicator(indicator).includes(plantelId);
}

function effectivePlantelIdsForIndicator(indicator: SigiIndicator) {
  if (indicator.plantelIds.length > 0) {
    return indicator.plantelIds;
  }

  if (indicator.plantelScopeSource === "official-import") {
    return officialImportEvidencePlantelIds(indicator.code);
  }

  return [];
}

function officialImportEvidencePlantelIds(code?: string) {
  if (code && officialIndicatorPlantelScopes[code]?.length) {
    return normalizePlantelScope(officialIndicatorPlantelScopes[code]);
  }

  return [];
}

function activitiesForTemplate(indicator: SigiIndicator) {
  return indicator.activities.length > 0 ? indicator.activities : ["Actividad general"];
}

function configuredTemplate(indicator: SigiIndicator, session?: SigiSession): IndicatorTemplate {
  const columns = sanitizeTemplateColumns(indicator.templateColumns);
  const plantel = plantelForTemplate(session, indicator);
  const initialRows = activitiesForTemplate(indicator).map((activity) =>
    rowForConfiguredColumns(columns, plantel, activity)
  );

  return {
    indicatorCode: indicator.code,
    indicatorName: indicator.name,
    groups: [{ label: "Captura configurada", colspan: Math.max(columns.length, 1) }],
    columns,
    initialRows,
    allowAddRows: true,
    addRowLabel: "Agregar fila",
    emptyRow: rowForConfiguredColumns(columns, plantel, ""),
    showTotals: columns.some((column) => column.type === "number" || column.type === "calculated")
  };
}

function officialWorkbookTemplate(indicator: SigiIndicator, session?: SigiSession): IndicatorTemplate {
  const imported = officialWorkbookTemplates[indicator.code];
  const plantel = plantelForTemplate(session, indicator);
  const columns = sanitizeTemplateColumns(imported.columns);
  const displayCode = imported.officialCode || (indicator.code.startsWith("B16-FMT-") ? "Pendiente de mapeo" : indicator.code);
  const indicatorInfoText = imported.officialCode && imported.officialCode !== indicator.code
    ? `Código oficial ${imported.officialCode}. Formato diferenciado por fuente oficial.`
    : imported.officialCode
      ? `Código ${imported.officialCode} ${indicator.name}.`
      : `${indicator.name}.`;
  const rows = imported.initialRows.length > 0
    ? imported.initialRows.map((row) => rowForOfficialWorkbookColumns(columns, row, plantel))
    : [rowForOfficialWorkbookColumns(columns, imported.emptyRow, plantel)];

  return {
    indicatorCode: displayCode,
    indicatorName: indicator.name,
    groups: imported.groups.length > 0
      ? imported.groups
      : [{ label: "Formato oficial importado", colspan: Math.max(columns.length, 1) }],
    columns,
    initialRows: rows,
    infoBlocks: [
      {
        label: "INDICADOR",
        text: indicatorInfoText,
        tone: "highlight"
      },
      {
        label: "FUENTE",
        text: `${imported.sourceLabel} · ${imported.sheetName}`
      }
    ],
    footerNote: imported.footerNote,
    showTotals: imported.showTotals,
    allowAddRows: imported.allowAddRows,
    addRowLabel: imported.addRowLabel,
    emptyRow: rowForOfficialWorkbookColumns(columns, imported.emptyRow, plantel),
    analysisHeading: "Análisis",
    analysisLabel: "Descripción y observaciones",
    analysisPlaceholder: "Describe brevemente el avance, pendientes o comentarios del formato oficial."
  };
}

function rowForOfficialWorkbookColumns(
  columns: TemplateColumn[],
  sourceRow: Record<string, unknown>,
  plantel: Plantel
) {
  const row: Record<string, unknown> = {};

  for (const column of columns) {
    const normalizedLabel = normalizeKey(column.label);
    const sourceValue = sourceRow[column.key];

    if (normalizedLabel.includes("plantel")) {
      row[column.key] = plantel.name;
      continue;
    }

    row[column.key] = sourceValue ?? "";
  }

  return row;
}

function rowForConfiguredColumns(columns: TemplateColumn[], plantel: Plantel, activity: string) {
  const row: Record<string, unknown> = {};

  columns.forEach((column) => {
    if (column.type === "calculated") {
      return;
    }

    const normalizedLabel = normalizeKey(column.label);
    if (normalizedLabel.includes("plantel")) {
      row[column.key] = plantel.name;
      return;
    }

    if (normalizedLabel.includes("actividad")) {
      row[column.key] = activity;
      return;
    }

    row[column.key] = "";
  });

  return row;
}

function rowsFromActivities(
  indicator: SigiIndicator,
  session: SigiSession | undefined,
  rowFactory: (activity: string, index: number, plantel: Plantel) => Record<string, unknown>
) {
  const plantel = plantelForTemplate(session, indicator);
  return activitiesForTemplate(indicator).map((activity, index) => rowFactory(activity, index, plantel));
}

function baseInfoBlocks(indicator: SigiIndicator, activityLabel = "Actividades oficiales") {
  return [
    {
      label: "INDICADOR",
      text: `Código ${indicator.code} ${indicator.name}.`,
      tone: "highlight" as const
    },
    {
      label: activityLabel,
      text: activitiesForTemplate(indicator).join("; ")
    }
  ];
}

function genericTemplate(indicator: SigiIndicator, session?: SigiSession): IndicatorTemplate {
  return {
    indicatorCode: indicator.code,
    indicatorName: indicator.name,
    groups: [
      { label: "Contexto", colspan: 2 },
      { label: "Seguimiento", colspan: 4 }
    ],
    columns: [
      { key: "plantel", label: "Plantel", type: "readonly" },
      { key: "actividad", label: "Actividad", type: "readonly" },
      { key: "meta", label: "Meta", type: "number" },
      { key: "avance", label: "Avance", type: "number" },
      { key: "cumplimiento", label: "% cumplimiento", type: "calculated", calculation: { type: "percentage", numeratorKey: "avance", denominatorKey: "meta", decimals: 2 } },
      { key: "observaciones", label: "Observaciones", type: "text" }
    ],
    initialRows: rowsFromActivities(indicator, session, (activity, _index, plantel) => ({
      plantel: plantel.name,
      actividad: activity,
      meta: "",
      avance: "",
      observaciones: ""
    })),
    showTotals: true
  };
}

function studentPeriodMatrixTemplate(indicator: SigiIndicator, session?: SigiSession): IndicatorTemplate {
  return {
    indicatorCode: indicator.code,
    indicatorName: indicator.name,
    groups: [],
    infoBlocks: baseInfoBlocks(indicator),
    headerRows: [
      [
        { label: "Plantel", rowspan: 2 },
        { label: "Actividad", rowspan: 2 },
        { label: "Meta anual", rowspan: 2 },
        { label: "Febrero-Agosto 2026", colspan: 3 },
        { label: "Agosto-Enero 2027", colspan: 3 },
        { label: "Resultado", colspan: 2 }
      ],
      [
        { label: "M" },
        { label: "H" },
        { label: "T" },
        { label: "M" },
        { label: "H" },
        { label: "T" },
        { label: "Total anual" },
        { label: "Observaciones" }
      ]
    ],
    columns: [
      { key: "plantel", label: "Plantel", type: "readonly" },
      { key: "actividad", label: "Actividad", type: "readonly" },
      { key: "meta", label: "Meta anual", type: "number" },
      { key: "feb_ago_mujeres", label: "M", type: "number" },
      { key: "feb_ago_hombres", label: "H", type: "number" },
      { key: "feb_ago_total", label: "T", type: "calculated", calculation: { type: "sum", sourceKeys: ["feb_ago_mujeres", "feb_ago_hombres"] } },
      { key: "ago_ene_mujeres", label: "M", type: "number" },
      { key: "ago_ene_hombres", label: "H", type: "number" },
      { key: "ago_ene_total", label: "T", type: "calculated", calculation: { type: "sum", sourceKeys: ["ago_ene_mujeres", "ago_ene_hombres"] } },
      { key: "total_anual", label: "Total anual", type: "calculated", calculation: { type: "sum", sourceKeys: ["feb_ago_total", "ago_ene_total"] } },
      { key: "observaciones", label: "Observaciones", type: "text" }
    ],
    initialRows: rowsFromActivities(indicator, session, (activity, _index, plantel) => ({
      plantel: plantel.name,
      actividad: activity,
      meta: "",
      feb_ago_mujeres: "",
      feb_ago_hombres: "",
      ago_ene_mujeres: "",
      ago_ene_hombres: "",
      observaciones: ""
    })),
    showTotals: true,
    footerNote: "Use los totales calculados para evitar capturar manualmente sumas que se deducen de mujeres y hombres."
  };
}

function integralDevelopmentTemplate(indicator: SigiIndicator, session?: SigiSession): IndicatorTemplate {
  return {
    indicatorCode: indicator.code,
    indicatorName: indicator.name,
    groups: [],
    infoBlocks: baseInfoBlocks(indicator, "Actividades de desarrollo y formación integral"),
    headerRows: [
      [
        { label: "Actividad", rowspan: 3 },
        { label: "Total de actividades", colspan: 2 },
        { label: "Matrícula total", colspan: 3 },
        { label: "Incorporación de estudiantes", colspan: 6 },
        { label: "Descripción", rowspan: 3 }
      ],
      [
        { label: "Desarrollo", rowspan: 2 },
        { label: "Formación integral", rowspan: 2 },
        { label: "Mujer", rowspan: 2 },
        { label: "Hombre", rowspan: 2 },
        { label: "Total", rowspan: 2 },
        { label: "Mujer", colspan: 2 },
        { label: "Hombre", colspan: 2 },
        { label: "Total", colspan: 2 }
      ],
      [
        { label: "No." },
        { label: "%" },
        { label: "No." },
        { label: "%" },
        { label: "No." },
        { label: "%" }
      ]
    ],
    columns: [
      { key: "actividad", label: "Actividad", type: "readonly" },
      { key: "actividades_desarrollo", label: "Desarrollo", type: "number" },
      { key: "actividades_formacion", label: "Formación integral", type: "number" },
      { key: "matricula_mujeres", label: "Mujer", type: "number" },
      { key: "matricula_hombres", label: "Hombre", type: "number" },
      { key: "matricula_total", label: "Total", type: "calculated", calculation: { type: "sum", sourceKeys: ["matricula_mujeres", "matricula_hombres"] } },
      { key: "incorporacion_mujeres_num", label: "No.", type: "number" },
      { key: "incorporacion_mujeres_pct", label: "%", type: "calculated", calculation: { type: "percentage", numeratorKey: "incorporacion_mujeres_num", denominatorKey: "matricula_mujeres", decimals: 2 } },
      { key: "incorporacion_hombres_num", label: "No.", type: "number" },
      { key: "incorporacion_hombres_pct", label: "%", type: "calculated", calculation: { type: "percentage", numeratorKey: "incorporacion_hombres_num", denominatorKey: "matricula_hombres", decimals: 2 } },
      { key: "incorporacion_total_num", label: "No.", type: "calculated", calculation: { type: "sum", sourceKeys: ["incorporacion_mujeres_num", "incorporacion_hombres_num"] } },
      { key: "incorporacion_total_pct", label: "%", type: "calculated", calculation: { type: "percentage", numeratorKey: "incorporacion_total_num", denominatorKey: "matricula_total", decimals: 2 } },
      { key: "descripcion", label: "Descripción", type: "text" }
    ],
    initialRows: rowsFromActivities(indicator, session, (activity) => ({
      actividad: activity,
      actividades_desarrollo: "",
      actividades_formacion: "",
      matricula_mujeres: "",
      matricula_hombres: "",
      incorporacion_mujeres_num: "",
      incorporacion_hombres_num: "",
      descripcion: ""
    })),
    showTotals: true,
    footerNote: "Describa las actividades realizadas y deje que el sistema calcule matrícula total, participación total y porcentajes."
  };
}

function staffTrainingTemplate(indicator: SigiIndicator, session?: SigiSession): IndicatorTemplate {
  const plantel = plantelForTemplate(session, indicator);
  const emptyRow = {
    plantel: plantel.name,
    actividad: "",
    tipo_evento: "",
    nombre_evento: "",
    duracion_horas: "",
    modalidad: "",
    competencias: "",
    organizado_por: "",
    participantes_hombres: "",
    participantes_mujeres: "",
    evidencias: "",
    observaciones: ""
  };

  return {
    indicatorCode: indicator.code,
    indicatorName: indicator.name,
    groups: [],
    infoBlocks: baseInfoBlocks(indicator, "Actividades de formación o capacitación"),
    headerRows: [
      [
        { label: "Contexto", colspan: 2 },
        { label: "Datos del evento", colspan: 6 },
        { label: "Participantes", colspan: 3 },
        { label: "Seguimiento", colspan: 2 }
      ],
      [
        { label: "Plantel" },
        { label: "Actividad" },
        { label: "Tipo" },
        { label: "Nombre" },
        { label: "Duración" },
        { label: "Modalidad" },
        { label: "Competencias" },
        { label: "Organizado por" },
        { label: "H" },
        { label: "M" },
        { label: "Total" },
        { label: "Evid." },
        { label: "Observaciones" }
      ]
    ],
    columns: [
      { key: "plantel", label: "Plantel", type: "readonly" },
      { key: "actividad", label: "Actividad", type: "readonly" },
      { key: "tipo_evento", label: "Tipo", type: "text" },
      { key: "nombre_evento", label: "Nombre", type: "text" },
      { key: "duracion_horas", label: "Duración", type: "number" },
      { key: "modalidad", label: "Modalidad", type: "text" },
      { key: "competencias", label: "Competencias", type: "text" },
      { key: "organizado_por", label: "Organizado por", type: "text" },
      { key: "participantes_hombres", label: "H", type: "number" },
      { key: "participantes_mujeres", label: "M", type: "number" },
      { key: "participantes_total", label: "Total", type: "calculated", calculation: { type: "sum", sourceKeys: ["participantes_hombres", "participantes_mujeres"] } },
      { key: "evidencias", label: "Evid.", type: "number" },
      { key: "observaciones", label: "Observaciones", type: "text" }
    ],
    initialRows: rowsFromActivities(indicator, session, (activity, _index, plantel) => ({
      ...emptyRow,
      plantel: plantel.name,
      actividad: activity
    })),
    allowAddRows: true,
    addRowLabel: "Agregar evento",
    emptyRow,
    showTotals: true
  };
}

function staffProfileTemplate(indicator: SigiIndicator, session?: SigiSession): IndicatorTemplate {
  return {
    indicatorCode: indicator.code,
    indicatorName: indicator.name,
    groups: [],
    infoBlocks: baseInfoBlocks(indicator),
    headerRows: [
      [
        { label: "Plantel", rowspan: 2 },
        { label: "Actividad", rowspan: 2 },
        { label: "Personal registrado", colspan: 3 },
        { label: "Meta", rowspan: 2 },
        { label: "Cumplimiento", rowspan: 2 },
        { label: "Observaciones", rowspan: 2 }
      ],
      [
        { label: "H" },
        { label: "M" },
        { label: "Total" }
      ]
    ],
    columns: [
      { key: "plantel", label: "Plantel", type: "readonly" },
      { key: "actividad", label: "Actividad", type: "readonly" },
      { key: "personal_hombres", label: "H", type: "number" },
      { key: "personal_mujeres", label: "M", type: "number" },
      { key: "personal_total", label: "Total", type: "calculated", calculation: { type: "sum", sourceKeys: ["personal_hombres", "personal_mujeres"] } },
      { key: "meta", label: "Meta", type: "number" },
      { key: "cumplimiento", label: "%", type: "calculated", calculation: { type: "percentage", numeratorKey: "personal_total", denominatorKey: "meta", decimals: 2 } },
      { key: "observaciones", label: "Observaciones", type: "text" }
    ],
    initialRows: rowsFromActivities(indicator, session, (activity, _index, plantel) => ({
      plantel: plantel.name,
      actividad: activity,
      personal_hombres: "",
      personal_mujeres: "",
      meta: "",
      observaciones: ""
    })),
    showTotals: true
  };
}

function participantActionTemplate(indicator: SigiIndicator, session?: SigiSession): IndicatorTemplate {
  const plantel = plantelForTemplate(session, indicator);
  const emptyRow = {
    plantel: plantel.name,
    actividad: "",
    nombre_accion: "",
    docentes: "",
    administrativos: "",
    coordinadores: "",
    asesores: "",
    otro_personal: "",
    estudiantes_hombres: "",
    estudiantes_mujeres: "",
    evidencias: "",
    observaciones: ""
  };

  return {
    indicatorCode: indicator.code,
    indicatorName: indicator.name,
    groups: [],
    infoBlocks: baseInfoBlocks(indicator, "Acciones oficiales"),
    headerRows: [
      [
        { label: "Contexto", colspan: 3 },
        { label: "Participantes internos", colspan: 5 },
        { label: "Estudiantado", colspan: 3 },
        { label: "Seguimiento", colspan: 2 }
      ],
      [
        { label: "Plantel" },
        { label: "Actividad" },
        { label: "Nombre de la acción" },
        { label: "Docentes" },
        { label: "Administrativos" },
        { label: "Coord." },
        { label: "Asesores" },
        { label: "Otro" },
        { label: "H" },
        { label: "M" },
        { label: "Total" },
        { label: "Evid." },
        { label: "Observaciones" }
      ]
    ],
    columns: [
      { key: "plantel", label: "Plantel", type: "readonly" },
      { key: "actividad", label: "Actividad", type: "readonly" },
      { key: "nombre_accion", label: "Nombre de la acción", type: "text" },
      { key: "docentes", label: "Docentes", type: "number" },
      { key: "administrativos", label: "Administrativos", type: "number" },
      { key: "coordinadores", label: "Coord.", type: "number" },
      { key: "asesores", label: "Asesores", type: "number" },
      { key: "otro_personal", label: "Otro", type: "number" },
      { key: "estudiantes_hombres", label: "H", type: "number" },
      { key: "estudiantes_mujeres", label: "M", type: "number" },
      { key: "estudiantes_total", label: "Total", type: "calculated", calculation: { type: "sum", sourceKeys: ["estudiantes_hombres", "estudiantes_mujeres"] } },
      { key: "evidencias", label: "Evid.", type: "number" },
      { key: "observaciones", label: "Observaciones", type: "text" }
    ],
    initialRows: rowsFromActivities(indicator, session, (activity, _index, plantel) => ({
      ...emptyRow,
      plantel: plantel.name,
      actividad: activity
    })),
    allowAddRows: true,
    addRowLabel: "Agregar acción",
    emptyRow,
    showTotals: true
  };
}

function infrastructureTemplate(indicator: SigiIndicator, session?: SigiSession): IndicatorTemplate {
  const plantel = plantelForTemplate(session, indicator);
  const emptyRow = {
    plantel: plantel.name,
    actividad: "",
    rubro: "",
    descripcion: "",
    cantidad_actual: "",
    cantidad_solicitada: "",
    estado: "",
    observaciones: ""
  };

  return {
    indicatorCode: indicator.code,
    indicatorName: indicator.name,
    groups: [],
    infoBlocks: baseInfoBlocks(indicator, "Rubro de infraestructura o equipamiento"),
    headerRows: [
      [
        { label: "Contexto", colspan: 4 },
        { label: "Cantidad", colspan: 3 },
        { label: "Seguimiento", colspan: 2 }
      ],
      [
        { label: "Plantel" },
        { label: "Actividad" },
        { label: "Rubro" },
        { label: "Descripción" },
        { label: "Actual" },
        { label: "Solicitada" },
        { label: "Total" },
        { label: "Estado" },
        { label: "Observaciones" }
      ]
    ],
    columns: [
      { key: "plantel", label: "Plantel", type: "readonly" },
      { key: "actividad", label: "Actividad", type: "readonly" },
      { key: "rubro", label: "Rubro", type: "text" },
      { key: "descripcion", label: "Descripción", type: "text" },
      { key: "cantidad_actual", label: "Actual", type: "number" },
      { key: "cantidad_solicitada", label: "Solicitada", type: "number" },
      { key: "cantidad_total", label: "Total", type: "calculated", calculation: { type: "sum", sourceKeys: ["cantidad_actual", "cantidad_solicitada"] } },
      { key: "estado", label: "Estado", type: "text" },
      { key: "observaciones", label: "Observaciones", type: "text" }
    ],
    initialRows: rowsFromActivities(indicator, session, (activity, _index, plantel) => ({
      ...emptyRow,
      plantel: plantel.name,
      actividad: activity
    })),
    allowAddRows: true,
    addRowLabel: "Agregar rubro",
    emptyRow,
    showTotals: true
  };
}

function healthIntegralTemplate(indicator: SigiIndicator, session?: SigiSession): IndicatorTemplate {
  const plantel = plantelForTemplate(session, indicator);
  const activities = indicator.activities.length > 0 ? indicator.activities : ["Promocion de la salud"];

  return {
    indicatorCode: indicator.code,
    indicatorName: indicator.name,
    groups: [],
    infoBlocks: [
      {
        label: "Actividades POA 2026",
        text: ""
      },
      {
        label: "ACCIÓN 1.1.2.1",
        text: "Ofrecer servicios y programas de apoyo integral a estudiantes universitarios, con enfoque interseccional e intercultural, que promuevan la equidad, el bienestar emocional y la mejora de condiciones educativas. Participar en acciones de promoción en los servicios médicos, nutricionales y psicológicos a través de las Unidades de Salud Integral y el CUAP."
      },
      {
        label: "INDICADOR",
        text: `Código ${indicator.code} ${indicator.name}.`,
        tone: "highlight"
      },
      {
        label: "ACTIVIDADES",
        text: "PROMOCIÓN DE LA SALUD"
      }
    ],
    headerRows: [
      [
        { label: "Plantel", rowspan: 3 },
        { label: "Nota: anotar solo la actividad desarrollada.", colspan: 4 },
        { label: "Febrero-Agosto 2026", colspan: 3 },
        { label: "Agosto-Enero 2027", colspan: 3 }
      ],
      [
        { label: "Actividad", rowspan: 2 },
        { label: "Unidades de salud integral", colspan: 3 },
        { label: "M", rowspan: 2 },
        { label: "H", rowspan: 2 },
        { label: "T", rowspan: 2 },
        { label: "M", rowspan: 2 },
        { label: "H", rowspan: 2 },
        { label: "T", rowspan: 2 }
      ],
      [
        { label: "SERVICIOS MÉDICOS" },
        { label: "DGDI" },
        { label: "CUAP" }
      ]
    ],
    columns: [
      { key: "plantel", label: "Plantel", type: "readonly" },
      { key: "actividad", label: "Actividad", type: "readonly" },
      { key: "servicios_medicos", label: "Servicios Médicos", type: "number" },
      { key: "dgdi", label: "DGDI", type: "number" },
      { key: "cuap", label: "CUAP", type: "number" },
      { key: "feb_ago_mujeres", label: "M", type: "number" },
      { key: "feb_ago_hombres", label: "H", type: "number" },
      { key: "feb_ago_total", label: "T", type: "calculated", calculation: { type: "sum", sourceKeys: ["feb_ago_mujeres", "feb_ago_hombres"] } },
      { key: "ago_ene_mujeres", label: "M", type: "number" },
      { key: "ago_ene_hombres", label: "H", type: "number" },
      { key: "ago_ene_total", label: "T", type: "calculated", calculation: { type: "sum", sourceKeys: ["ago_ene_mujeres", "ago_ene_hombres"] } }
    ],
    initialRows: activities.map((activity) => ({
      plantel: plantel.name,
      actividad: activity,
      servicios_medicos: "",
      dgdi: "",
      cuap: "",
      feb_ago_mujeres: "",
      feb_ago_hombres: "",
      ago_ene_mujeres: "",
      ago_ene_hombres: ""
    })),
    showTotals: true,
    footerNote: "NOTA: En la parte de abajo, realice una breve descripción y análisis de las acciones y actividades que lleva a cabo el plantel respecto al tema de servicios y programas de apoyo integral a estudiantes universitarios.",
    analysisHeading: "Descripción y análisis",
    analysisLabel: "Descripción de acciones y actividades",
    analysisPlaceholder: "Describa brevemente las acciones realizadas por el plantel..."
  };
}

function titulationTemplate(indicator: SigiIndicator, session?: SigiSession): IndicatorTemplate {
  const plantel = plantelForTemplate(session, indicator);
  return {
    indicatorCode: indicator.code,
    indicatorName: indicator.name,
    groups: [
      { label: "Contexto Escolar", colspan: 3 },
      { label: "Egresados titulados en el año 2025", colspan: 3 },
      { label: "Matrícula de primer ingreso (agosto 2022)", colspan: 3 },
      { label: "Resultados", colspan: 1 }
    ],
    columns: [
      { key: "delegacion", label: "Delegación", type: "readonly" },
      { key: "plantel", label: "Plantel", type: "readonly" },
      { key: "programa", label: "Programa Educativo", type: "readonly" },
      { key: "egresados_mujeres", label: "Mujeres", type: "number" },
      { key: "egresados_hombres", label: "Hombres", type: "number" },
      { key: "egresados_total", label: "Total", type: "calculated", calculation: { type: "sum", sourceKeys: ["egresados_mujeres", "egresados_hombres"] } },
      { key: "matricula_mujeres", label: "Mujeres", type: "number" },
      { key: "matricula_hombres", label: "Hombres", type: "number" },
      { key: "matricula_total", label: "Total", type: "calculated", calculation: { type: "sum", sourceKeys: ["matricula_mujeres", "matricula_hombres"] } },
      { key: "porcentaje_titulacion", label: "% de titulación", type: "calculated", calculation: { type: "percentage", numeratorKey: "egresados_total", denominatorKey: "matricula_total", decimals: 2 } }
    ],
    initialRows: [
      {
        delegacion: "Villa de Álvarez",
        plantel: plantel.name,
        programa: "Técnico Analista Programador",
        egresados_mujeres: "",
        egresados_hombres: "",
        matricula_mujeres: "",
        matricula_hombres: ""
      },
      {
        delegacion: "Villa de Álvarez",
        plantel: plantel.name,
        programa: "Técnico Analista Químico",
        egresados_mujeres: "",
        egresados_hombres: "",
        matricula_mujeres: "",
        matricula_hombres: ""
      }
    ]
  };
}

function terminalEfficiencyTemplate(indicator: SigiIndicator, session?: SigiSession): IndicatorTemplate {
  const plantel = plantelForTemplate(session, indicator);
  return {
    indicatorCode: indicator.code,
    indicatorName: indicator.name,
    groups: [
      { label: "Contexto Escolar", colspan: 3 },
      { label: "Egreso de la cohorte", colspan: 3 },
      { label: "Matrícula de primer ingreso", colspan: 3 },
      { label: "Resultado", colspan: 1 }
    ],
    columns: [
      { key: "delegacion", label: "Delegación", type: "readonly" },
      { key: "plantel", label: "Plantel", type: "readonly" },
      { key: "programa", label: "Programa Educativo", type: "readonly" },
      { key: "egreso_mujeres", label: "Mujeres", type: "number" },
      { key: "egreso_hombres", label: "Hombres", type: "number" },
      { key: "egreso_total", label: "Total", type: "calculated", calculation: { type: "sum", sourceKeys: ["egreso_mujeres", "egreso_hombres"] } },
      { key: "ingreso_mujeres", label: "Mujeres", type: "number" },
      { key: "ingreso_hombres", label: "Hombres", type: "number" },
      { key: "ingreso_total", label: "Total", type: "calculated", calculation: { type: "sum", sourceKeys: ["ingreso_mujeres", "ingreso_hombres"] } },
      { key: "eficiencia_terminal", label: "% eficiencia", type: "calculated", calculation: { type: "percentage", numeratorKey: "egreso_total", denominatorKey: "ingreso_total", decimals: 2 } }
    ],
    initialRows: [
      {
        delegacion: "Villa de Álvarez",
        plantel: plantel.name,
        programa: "Bachillerato General",
        egreso_mujeres: "",
        egreso_hombres: "",
        ingreso_mujeres: "",
        ingreso_hombres: ""
      },
      {
        delegacion: "Villa de Álvarez",
        plantel: plantel.name,
        programa: "Técnico Analista Programador",
        egreso_mujeres: "",
        egreso_hombres: "",
        ingreso_mujeres: "",
        ingreso_hombres: ""
      },
      {
        delegacion: "Villa de Álvarez",
        plantel: plantel.name,
        programa: "Técnico Analista Químico",
        egreso_mujeres: "",
        egreso_hombres: "",
        ingreso_mujeres: "",
        ingreso_hombres: ""
      }
    ],
    showTotals: true
  };
}

function plantelForTemplate(session?: SigiSession, indicator?: SigiIndicator) {
  if (
    session?.role === "plantel" &&
    session.plantelId &&
    (!indicator || canUseIndicatorForPlantel(indicator, session.plantelId))
  ) {
    return planteles.find((plantel) => plantel.id === session.plantelId) ?? planteles[0];
  }

  const effectivePlantelIds = indicator ? effectivePlantelIdsForIndicator(indicator) : [];

  if (effectivePlantelIds.length === 0) {
    return unassignedPlantel;
  }

  if (effectivePlantelIds.length === 1) {
    return planteles.find((plantel) => plantel.id === effectivePlantelIds[0]) ?? planteles[0];
  }

  return planteles[0];
}

function normalizeResponsibleIds(ids?: number[], names?: string[]) {
  if (ids?.length) {
    return uniqueNumbers(ids.filter((id) => Number.isInteger(id) && id > 0));
  }

  if (names?.length) {
    return uniqueNumbers(names.map((name) => responsibleIdByName.get(name)).filter((id): id is number => Boolean(id)));
  }

  return [1];
}

function namesForResponsibleIds(ids: number[]) {
  return ids.map((id) => responsibleNames[id - 1]).filter(Boolean);
}

function nextIndicatorId() {
  return Math.max(0, ...Array.from(indicators.keys())) + 1;
}

function sortUsers(a: SigiUser, b: SigiUser) {
  const priority: Record<SystemRole, number> = { director: 1, responsable: 2, plantel: 3 };
  return priority[a.role] - priority[b.role] || a.name.localeCompare(b.name, "es", { numeric: true });
}

function splitNames(value: string) {
  return uniqueStrings(value.split(",").map((name) => name.trim()).filter(Boolean));
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "es"));
}

function uniqueNumbers(values: number[]) {
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

function inferDataType(name: string): SigiIndicator["dataType"] {
  const normalized = normalizeKey(name);

  if (normalized.startsWith("porcentaje") || normalized.startsWith("tasa")) {
    return "percentage";
  }

  if (normalized.startsWith("numero")) {
    return "number";
  }

  return "number";
}

function periodIdFromReportPeriod(_periodo: string) {
  // El sprint actual opera con un periodo activo de captura. El texto del
  // reporte se conserva para filtros visuales, pero el ID real se mantiene
  // estable hasta que exista un catalogo de periodos en backend.
  return 1;
}

function resolvePlantelId(value?: string) {
  if (!value) {
    return undefined;
  }

  const numeric = Number(value);
  if (Number.isInteger(numeric) && planteles.some((plantel) => plantel.id === numeric)) {
    return numeric;
  }

  const normalized = normalizeKey(value);
  return planteles.find((plantel) =>
    normalizeKey(plantel.key) === normalized || normalizeKey(plantel.name) === normalized
  )?.id;
}

function defaultUserIdForSession(role: SystemRole, plantelId?: number, responsableId?: number) {
  if (role === "director") {
    return "director-1";
  }

  if (role === "responsable") {
    return `responsable-${responsableId ?? 1}`;
  }

  return `plantel-${plantelId ?? 1}`;
}

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function numberHeader(value: string | string[] | undefined) {
  const rawValue = headerValue(value);
  const numericValue = rawValue ? Number(rawValue) : undefined;
  return Number.isInteger(numericValue) && Number(numericValue) > 0 ? numericValue : undefined;
}

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ");
}
