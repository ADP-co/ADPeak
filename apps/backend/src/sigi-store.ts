import { createHash } from "node:crypto";
import { officialCatalogRows } from "./official-catalog.generated.js";
import {
  officialDataSummary,
  officialEvidenceGroups,
  officialWorkbookSummaries
} from "./official-data.generated.js";
import { listCaptureDrafts, type CaptureDraft, type CapturePayload } from "./capture-store.js";
import {
  persistState,
  readPersistedCollection
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
};

export type TemplateColumn = {
  key: string;
  label: string;
  type: "readonly" | "number" | "text" | "calculated";
  required?: boolean;
  calculation?:
    | { type: "sum"; sourceKeys: string[] }
    | { type: "percentage"; numeratorKey: string; denominatorKey: string; decimals?: number };
};

export type IndicatorTemplate = {
  indicatorCode: string;
  indicatorName: string;
  groups: { label: string; colspan: number }[];
  columns: TemplateColumn[];
  initialRows: Record<string, unknown>[];
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
      actividad: string;
      responsable: string;
      estado: "Borrador" | "Enviado" | "Observado" | "Aprobado";
      avance: string;
      plantel: string;
      plantelId: string;
      periodo: string;
      ciclo: string;
      meta: number;
      evidencias: number;
      vencimiento: "en_tiempo" | "atrasado";
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

export const planteles = [
  { id: 1, key: "bach-16", name: "Bachillerato 16" },
  { id: 2, key: "bach-4", name: "Bachillerato 4" },
  { id: 3, key: "bach-1", name: "Bachillerato 1" },
  { id: 4, key: "bach-33", name: "Bachillerato 33" }
] as const;

const responsibleNames = Array.from(
  new Set(officialCatalogRows.map((row) => row.responsible).filter(Boolean))
).sort((a, b) => a.localeCompare(b, "es"));

const responsibleIdByName = new Map(
  responsibleNames.map((name, index) => [name, index + 1])
);

const initialIndicators = buildIndicators();
const persistedIndicators = readPersistedCollection<SigiIndicator>("indicators");
const indicators = new Map<number, SigiIndicator>(
  (persistedIndicators?.length ? persistedIndicators : initialIndicators).map((indicator) => [indicator.id, indicator])
);
const persistedUsers = readPersistedCollection<SigiUser>("users");
const users = new Map<string, SigiUser>(
  (persistedUsers?.length ? persistedUsers : buildInitialUsers()).map((user) => {
    const normalizedUser = normalizePersistedUser(user);
    return [normalizedUser.id, normalizedUser];
  })
);

export function sessionFromHeaders(headers: Record<string, string | string[] | undefined>): SigiSession {
  const rawRole = headerValue(headers["x-role"]);
  const role = normalizeRole(rawRole);

  if (!role) {
    throw new SigiAuthError("La sesión no incluye un rol válido.");
  }

  const userId = headerValue(headers["x-user-id"]) || defaultUserIdForRole(role);
  const plantelId = numberHeader(headers["x-plantel-id"]);
  const responsableId = numberHeader(headers["x-responsable-id"]);

  return {
    userId,
    role,
    plantelId: role === "plantel" ? plantelId ?? 1 : plantelId,
    responsableId: role === "responsable" ? responsableId ?? 1 : responsableId
  };
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
  const user: SigiUser = {
    id,
    username: input.username?.trim().toLowerCase() || existing?.username || usernameForUser(id, input.name, role),
    name: input.name.trim(),
    role,
    plantelId: role === "plantel" ? input.plantelId ?? 1 : undefined,
    responsableId: role === "responsable" ? input.responsableId ?? 1 : undefined,
    indicatorCodes: role === "responsable" ? input.indicatorCodes ?? [] : [],
    active: input.active ?? true,
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
    contributorNames: input.contributorNames ?? existing?.contributorNames ?? [],
    activities: input.activities?.filter(Boolean) ?? existing?.activities ?? ["Actividad general"],
    plantelIds: input.plantelIds?.length ? input.plantelIds : planteles.map((plantel) => plantel.id)
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

export function templateForIndicator(indicator: SigiIndicator): IndicatorTemplate {
  if (indicator.code === "1.0.0.0.2") {
    return titulationTemplate(indicator);
  }

  return genericTemplate(indicator);
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

  if (session.role === "responsable" && !indicator.responsibleIds.includes(session.responsableId ?? -1)) {
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
  const plantelId = resolvePlantelId(filters.plantelId ?? filters.plantel);
  const scopedPlanteles = plantelId
    ? planteles.filter((plantel) => plantel.id === plantelId)
    : planteles;
  const scopedIndicators = listIndicators(session);
  const captureDrafts = listCaptureDrafts();
  const grouped = scopedIndicators.map((indicator) => {
    const rows = scopedPlanteles.flatMap((plantel) =>
      indicator.activities.flatMap((activity, activityIndex) => {
        const capturedRows = rowsFromCaptureDrafts({
          captureDrafts,
          indicator,
          plantel,
          activity,
          activityIndex,
          periodo,
          cicloEscolar
        });

        if (capturedRows.length > 0) {
          return capturedRows;
        }

        const status = deterministicStatus(indicator.id + plantel.id + activityIndex);
        return {
          registro_id: `${indicator.code}-${plantel.id}-${activityIndex + 1}`,
          actividad: activity || "Actividad general",
          responsable: indicator.responsibleNames.join(", "),
          estado: status,
          avance: `${deterministicProgress(status, indicator.id, activityIndex)}%`,
          plantel: plantel.name,
          plantelId: String(plantel.id),
          periodo,
          ciclo: cicloEscolar,
          meta: 100,
          evidencias: evidenceCountForReportRow(indicator, activity, status, plantel.id),
          vencimiento: status === "Borrador" ? "atrasado" as const : "en_tiempo" as const
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
  const officialSourcesReport = officialSourcesReportRows(plantelId, periodo, cicloEscolar);

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

function rowsFromCaptureDrafts({
  captureDrafts,
  indicator,
  plantel,
  activity,
  activityIndex,
  periodo,
  cicloEscolar
}: {
  captureDrafts: CaptureDraft[];
  indicator: SigiIndicator;
  plantel: (typeof planteles)[number];
  activity: string;
  activityIndex: number;
  periodo: string;
  cicloEscolar: string;
}): SigiReportPayload["indicadores"][number]["datos"] {
  return captureDrafts
    .filter((draft) =>
      draft.indicadorId === indicator.id &&
      draft.plantelId === plantel.id &&
      draft.actividadId === activityIndex + 1
    )
    .flatMap((draft) => {
      const rows = draft.payload.rows.length > 0 ? draft.payload.rows : [{}];

      return rows.map((row, rowIndex) => ({
        registro_id: `captura-${draft.id}-${rowIndex + 1}`,
        actividad: readableValue(row.actividad) || activity || "Actividad general",
        responsable: indicator.responsibleNames.join(", "),
        estado: reportStatusForCapture(draft.estado),
        avance: progressForCapturedRow(row, draft.estado),
        plantel: readableValue(row.plantel) || plantel.name,
        plantelId: String(plantel.id),
        periodo,
        ciclo: cicloEscolar,
        meta: numberValue(row.meta) ?? 100,
        evidencias: draft.payload.evidencia ? 1 : 0,
        vencimiento: draft.estado === "borrador" ? "atrasado" as const : "en_tiempo" as const
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
  return typeof value === "string" ? value.trim() : "";
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

function evidenceCountForReportRow(
  indicator: SigiIndicator,
  activity: string,
  status: SigiReportPayload["indicadores"][number]["datos"][number]["estado"],
  plantelId: number
) {
  if (status === "Borrador") {
    return 0;
  }

  if (plantelId !== 1) {
    return 1;
  }

  const candidates = [indicator.name, indicator.description, activity].map(normalizeKey);
  const matchedGroup = officialEvidenceGroups.find((group) => {
    const category = normalizeKey(group.category);
    return candidates.some((candidate) => areRelatedText(category, candidate));
  });

  return matchedGroup ? Math.max(1, matchedGroup.fileCount) : 1;
}

function areRelatedText(a: string, b: string) {
  if (!a || !b) {
    return false;
  }

  if (a.includes(b) || b.includes(a)) {
    return true;
  }

  const aTokens = a.split(/\s+/).filter((token) => token.length > 4);
  const bTokens = new Set(b.split(/\s+/).filter((token) => token.length > 4));
  const overlap = aTokens.filter((token) => bTokens.has(token)).length;

  return overlap >= 2 || (aTokens.length === 1 && bTokens.has(aTokens[0]));
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
      plantelIds: planteles.map((plantel) => plantel.id)
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
    username: `bach${plantel.name.match(/\d+/)?.[0] ?? plantel.id}`,
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
  if (session.role === "director" || session.role === "plantel") {
    return true;
  }

  return indicator.responsibleIds.includes(session.responsableId ?? -1);
}

function genericTemplate(indicator: SigiIndicator): IndicatorTemplate {
  const activity = indicator.activities[0] ?? "Actividad general";
  return {
    indicatorCode: indicator.code,
    indicatorName: indicator.name,
    groups: [
      { label: "Contexto", colspan: 2 },
      { label: "Seguimiento", colspan: 3 }
    ],
    columns: [
      { key: "plantel", label: "Plantel", type: "readonly" },
      { key: "actividad", label: "Actividad", type: "readonly" },
      { key: "meta", label: "Meta", type: "number" },
      { key: "avance", label: "Avance", type: "number" },
      { key: "observaciones", label: "Observaciones", type: "text" }
    ],
    initialRows: planteles.slice(0, 1).map((plantel) => ({
      plantel: plantel.name,
      actividad: activity,
      meta: "",
      avance: "",
      observaciones: ""
    }))
  };
}

function titulationTemplate(indicator: SigiIndicator): IndicatorTemplate {
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
        plantel: "Bachillerato 16",
        programa: "Técnico Analista Programador",
        egresados_mujeres: "",
        egresados_hombres: "",
        matricula_mujeres: "",
        matricula_hombres: ""
      },
      {
        delegacion: "Villa de Álvarez",
        plantel: "Bachillerato 16",
        programa: "Técnico Analista Químico",
        egresados_mujeres: "",
        egresados_hombres: "",
        matricula_mujeres: "",
        matricula_hombres: ""
      }
    ]
  };
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

function deterministicStatus(seed: number): SigiReportPayload["indicadores"][number]["datos"][number]["estado"] {
  const statuses: Array<SigiReportPayload["indicadores"][number]["datos"][number]["estado"]> = [
    "Aprobado",
    "Enviado",
    "Observado",
    "Borrador"
  ];
  return statuses[seed % statuses.length];
}

function deterministicProgress(
  status: SigiReportPayload["indicadores"][number]["datos"][number]["estado"],
  indicatorId: number,
  activityIndex: number
) {
  if (status === "Aprobado") {
    return 100;
  }

  if (status === "Borrador") {
    return 0;
  }

  return 45 + ((indicatorId + activityIndex) % 45);
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

function defaultUserIdForRole(role: SystemRole) {
  if (role === "director") {
    return "director-1";
  }

  if (role === "responsable") {
    return "responsable-1";
  }

  return "plantel-1";
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
