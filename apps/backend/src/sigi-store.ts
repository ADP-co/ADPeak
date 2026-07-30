/// <reference types="node" />

import { createHash, createHmac, randomBytes, scrypt, scryptSync, timingSafeEqual } from "node:crypto";
import { SESSION_COOKIE_NAME } from "./session-cookie.js";
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
import {
  listCaptureDrafts,
  resetCaptureDraftsToInitialState,
  type CaptureDraft,
  type CapturePayload
} from "./capture-store.js";
import {
  isPersistedStateHydrated,
  persistState,
  readPersistedCollection,
  readPersistedValue
} from "./state-store.js";
import { normalizeUserFacingText } from "./text-normalization.js";

export type SystemRole = "director" | "responsable" | "plantel";

export type SigiOperationalScope =
  | "all_planteles"
  | "specific_planteles"
  | "specific_responsables"
  | "none";

export type SigiAllowedAction =
  | "view"
  | "capture"
  | "add_rows"
  | "submit_review"
  | "open_evidence"
  | "request_correction"
  | "approve"
  | "configure";

export type SigiSession = {
  userId: string;
  role: SystemRole;
  plantelId?: number;
  responsableId?: number;
  passwordChangeRequired?: boolean;
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
  credentialVersion?: number;
  passwordChangeRequired?: boolean;
};

export type PublicSigiUser = Omit<SigiUser, "passwordHash" | "credentialVersion"> & {
  reviewerIndicatorCodes: string[];
  contributorIndicatorCodes: string[];
};

export type AuthenticatedSigiUser = {
  id: string;
  username: string;
  name: string;
  role: "admin" | "responsable" | "plantel";
  description: string;
  plantelId?: number;
  responsableId?: number;
  passwordChangeRequired: boolean;
};

export type AuthenticationFailureReason = "invalid_credentials" | "inactive_user";

export type AuthenticationResult = {
  user?: AuthenticatedSigiUser;
  reason?: AuthenticationFailureReason;
};

type SessionTokenPayload = {
  sub: string;
  role: SystemRole;
  plantelId?: number;
  responsableId?: number;
  credentialVersion: number;
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
  contributorResponsibleIds?: number[];
  contributorNames: string[];
  activities: string[];
  plantelIds: number[];
  plantelScopeSource?: "official-import" | "manual";
  operationalScope?: SigiOperationalScope;
  templateColumns?: TemplateColumn[];
  templateStructureCustomized?: boolean;
  evidenceRules?: EvidenceRules;
  updatedAt?: string;
  updatedBy?: string;
  lastChange?: "importado" | "creado" | "actualizado" | "desactivado" | "habilitado";
};

export type SigiIndicatorStatus = "Pendiente" | "En revisión" | "Corregir" | "Aprobado";

export type SigiIndicatorListItem = SigiIndicator & {
  effectivePlantelIds: number[];
  status: SigiIndicatorStatus;
  captureId?: number;
  plantelId?: number;
  actividadId?: number;
  periodoId?: number;
  captureStatus?: CaptureDraft["estado"];
  canEdit?: boolean;
  canReview?: boolean;
  isReadOnly?: boolean;
  readOnlyReason?: string;
  allowedActions: SigiAllowedAction[];
};

export type SigiIndicatorHistoryEntry = {
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

export type SigiReviewCapture = {
  captureId: number;
  indicadorId: number;
  code: string;
  name: string;
  plantelId: number;
  plantel: string;
  periodoId: number;
  actividadId: number;
  responsableId: number | null;
  estado: "en_revision";
  actualizadoEn: string;
  allowedActions: SigiAllowedAction[];
};

export type SigiNotificationEvent =
  | "capture_submitted"
  | "capture_resubmitted"
  | "correction_requested"
  | "capture_approved"
  | "assignment_changed";

export type SigiNotification = {
  id: number;
  rolDestino: SystemRole;
  usuarioDestino: string;
  indicadorId: number;
  indicadorCodigo: string;
  indicadorNombre: string;
  captureId?: number;
  plantelId?: number;
  plantel?: string;
  estado?: CaptureDraft["estado"];
  eventType?: SigiNotificationEvent;
  idempotencyKey?: string;
  mensaje: string;
  createdAt: string;
  readAt: string | null;
  actorUserId: string;
  actorRole: SystemRole;
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
  validation?: {
    min?: number;
    max?: number;
    integer?: boolean;
    decimals?: number;
    allowedValues?: string[];
    qualityWarningMax?: number;
  };
  calculation?:
    | { type: "sum"; sourceKeys: string[] }
    | { type: "percentage"; numeratorKey: string; denominatorKey: string; decimals?: number }
    | { type: "formula"; expression: string; decimals?: number };
};

export type EvidenceRules = {
  required: boolean;
  allowedTypes: string[];
  maxSizeMb: number;
  requireOpenBeforeApproval: boolean;
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
  vistaReporte?: "detalle" | "avance";
  periodo: string;
  cicloEscolar: string;
  fechaGeneracion: string;
  identidadReporte: {
    tipo: "Plantel" | "Institucional" | "Responsable";
    nombre: string;
  };
  scopeSummary: string;
  estadoConteos: {
    total: number;
    pendientes: number;
    enRevision: number;
    observados: number;
    aprobados: number;
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
      estado: "Borrador" | "En revisión" | "Observado" | "Aprobado";
      avance: string;
      plantel: string;
      plantelId: string;
      periodo: string;
      periodoId?: number;
      ciclo: string;
      meta: number;
      evidencias: number;
      justificacion?: string;
      evidenciaNombre?: string;
      vencimiento: "en_tiempo" | "atrasado";
      exportable?: boolean;
      blockingIssues?: string[];
      detalle?: Array<{ campo: string; valor: string }>;
      qualityWarnings?: string[];
      capturadoEn?: string;
      actualizadoEn?: string;
      enviadoPor?: string;
    }>;
  }>;
};

export type SigiAuditEvent = {
  id: number;
  userId: string;
  role: SystemRole;
  action: string;
  resourceType: "capture" | "indicator" | "user" | "report" | "auth";
  resourceId: string;
  before?: unknown;
  after?: unknown;
  status: "ok" | "rejected" | "error";
  createdAt: string;
  requestId: string;
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
const MAX_REASONABLE_NUMERIC_VALUE = 999_999_999_999;
const DEFAULT_QUALITY_WARNING_MAX = 1_000_000;
export const MAX_AUDIT_REQUEST_ID_LENGTH = 128;
const AUDIT_VALUE_OMITTED = "[omitido]";
const MAX_AUDIT_VALUE_DEPTH = 12;
const officialSourcePlantelIds: number[] = [];
const officialCatalogImportVersion = "2026-07-29-indicadores-20260628-canonical-v4";
const officialCatalogImportedAt = "2026-06-30T00:00:00.000-06:00";
const operationalCatalogRows = officialCatalogRows.filter(isOperationalCatalogRow);
const hiddenImportedIndicatorCodes = new Set(
  officialCatalogRows
    .filter((row) => !isOperationalCatalogRow(row))
    .flatMap((row) => [row.code, row.sourceCode].filter(Boolean))
);

const officialResponsibleAccounts = [
  { responsableId: 1, username: "resp01", name: "Adriana Ruiz Rivera" },
  { responsableId: 2, username: "resp02", name: "Angel Ordoñez Ayala" },
  { responsableId: 3, username: "resp03", name: "Ariadna Zúñiga Torres" },
  { responsableId: 4, username: "resp04", name: "Armando Hernández Ramírez" },
  { responsableId: 5, username: "resp05", name: "Arturo Gordillo Chávez" },
  { responsableId: 6, username: "resp06", name: "Carlos Hernández Nava" },
  { responsableId: 7, username: "resp07", name: "Claudia Raquel Piña Andrade" },
  { responsableId: 8, username: "resp08", name: "Daniela Nohemi Navarro Castillo" },
  { responsableId: 9, username: "resp09", name: "Dulce Sarahi García Mójica" },
  { responsableId: 10, username: "resp10", name: "Laura Gabriela Calvario" },
  { responsableId: 11, username: "resp11", name: "Liliana Yunuen Rojas Maciel" },
  { responsableId: 12, username: "resp12", name: "Ma. Guadalupe del Rocío Herrera Chacón" },
  { responsableId: 13, username: "resp13", name: "Marcial Aviña Iglesias" },
  { responsableId: 14, username: "resp14", name: "Martín Jesús Robles DeAnda" },
  { responsableId: 15, username: "resp15", name: "Oscar Delgado Sánchez" },
  { responsableId: 16, username: "resp16", name: "Oscar Gustavo Mendoza Barajas" },
  { responsableId: 17, username: "resp17", name: "Oscar Pedraza Farías" },
  { responsableId: 18, username: "resp18", name: "Salvador Aguilar Aguilar" }
] as const;

const officialResponsibleAccountById = new Map<number, (typeof officialResponsibleAccounts)[number]>(
  officialResponsibleAccounts.map((account) => [account.responsableId, account])
);
const officialResponsibleAliases = [
  { name: "Angel Ordoñez", responsableId: 2 }
] as const;
const responsibleIdByName = new Map<string, number>();

for (const account of officialResponsibleAccounts) {
  responsibleIdByName.set(normalizeResponsibleName(account.name), account.responsableId);
  responsibleIdByName.set(normalizeResponsibleName(account.username), account.responsableId);
  responsibleIdByName.set(
    normalizeResponsibleName(`Responsable ${String(account.responsableId).padStart(2, "0")}`),
    account.responsableId
  );
}

for (const alias of officialResponsibleAliases) {
  responsibleIdByName.set(normalizeResponsibleName(alias.name), alias.responsableId);
}

export function resolveOfficialResponsibleId(name: string) {
  const responsibleId = responsibleIdByName.get(normalizeResponsibleName(name));

  if (responsibleId === undefined) {
    throw new Error(`No existe una cuenta oficial para el responsable importado "${name}".`);
  }

  return responsibleId;
}

const initialIndicators = buildIndicators();
const indicators = new Map<number, SigiIndicator>();
const users = new Map<string, SigiUser>();
const notifications = new Map<number, SigiNotification>();
const auditEvents = new Map<number, SigiAuditEvent>();
const defaultPasswordHashCache = new Map<SystemRole, string>();
const officialCredentialResetVersion = process.env.OFFICIAL_CREDENTIAL_RESET_VERSION?.trim();
const officialFactoryResetVersion = process.env.OFFICIAL_FACTORY_RESET_VERSION?.trim();
let nextNotificationId = 1;
let nextAuditEventId = 1;

reloadSigiStateFromPersistence();

export function sessionFromHeaders(
  headers: Record<string, string | string[] | undefined>,
  options: { allowPasswordChange?: boolean } = {}
): SigiSession {
  const token = bearerTokenFromHeaders(headers);

  if (token) {
    const session = sessionFromToken(token);

    if (session.passwordChangeRequired && !options.allowPasswordChange) {
      throw new SigiAuthError("Debes cambiar la contraseña temporal antes de continuar.");
    }

    return session;
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
    responsableId: role === "responsable" ? responsableId ?? 1 : responsableId,
    passwordChangeRequired: false
  };
}

export function authenticatedUserForSession(session: SigiSession) {
  const user = users.get(session.userId);

  if (!user?.active) {
    throw new SigiAuthError("La sesión no corresponde a un usuario activo.");
  }

  return authenticatedUser(user);
}

export function reloadSigiStateFromPersistence() {
  const persistedIndicators = readPersistedCollection<SigiIndicator>("indicators");
  const persistedUsers = readPersistedCollection<SigiUser>("users");
  const persistedNotifications = readPersistedCollection<SigiNotification>("notifications") ?? [];
  const persistedAuditEvents = readPersistedCollection<SigiAuditEvent>("auditEvents") ?? [];
  const persistedStateReady = isPersistedStateHydrated();
  const needsCatalogMigration = Boolean(
    persistedStateReady &&
    readPersistedValue<string>("catalogImportVersion") !== officialCatalogImportVersion
  );
  const needsCredentialReset = Boolean(
    persistedStateReady &&
    officialCredentialResetVersion &&
    readPersistedValue<string>("officialCredentialResetVersion") !== officialCredentialResetVersion
  );
  const needsFactoryReset = Boolean(
    persistedStateReady &&
    officialFactoryResetVersion &&
    readPersistedValue<string>("officialFactoryResetVersion") !== officialFactoryResetVersion
  );

  if (needsFactoryReset) {
    replaceWithOfficialFactoryState();
    return;
  }

  indicators.clear();
  for (const indicator of mergeInitialIndicators(persistedIndicators, needsCatalogMigration)) {
    indicators.set(indicator.id, indicator);
  }

  users.clear();
  for (const user of mergeInitialUsers(persistedUsers, needsCatalogMigration)) {
    const normalizedUser = normalizePersistedUser(user);
    users.set(normalizedUser.id, normalizedUser);
  }

  if (needsCredentialReset) {
    resetOfficialUserCredentials();
  }

  reconcileCurrentAssignments();

  notifications.clear();
  for (const notification of persistedNotifications) {
    notifications.set(notification.id, {
      ...notification,
      indicadorNombre: normalizeUserFacingText(notification.indicadorNombre),
      plantel: notification.plantel ? normalizeUserFacingText(notification.plantel) : notification.plantel,
      mensaje: normalizeUserFacingText(notification.mensaje)
    });
  }
  nextNotificationId = readPersistedValue<number>("nextNotificationId") ??
    Math.max(0, ...Array.from(notifications.keys())) + 1;

  auditEvents.clear();
  for (const event of persistedAuditEvents) {
    auditEvents.set(event.id, event);
  }
  nextAuditEventId = readPersistedValue<number>("nextAuditEventId") ??
    Math.max(0, ...Array.from(auditEvents.keys())) + 1;

  if (needsCatalogMigration) {
    notifications.clear();
    auditEvents.clear();
    nextNotificationId = 1;
    nextAuditEventId = 1;
    resetCaptureDraftsToInitialState();
    persistState({
      indicators: Array.from(indicators.values()),
      users: Array.from(users.values()),
      notifications: [],
      auditEvents: [],
      nextNotificationId,
      nextAuditEventId,
      captureDrafts: [],
      nextCaptureId: 1,
      loginRateLimits: {},
      catalogImportVersion: officialCatalogImportVersion,
      ...(officialCredentialResetVersion
        ? { officialCredentialResetVersion }
        : {})
    });
  } else if (needsCredentialReset) {
    persistState({
      users: Array.from(users.values()),
      officialCredentialResetVersion
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
    throw new SigiValidationError("El usuario debe incluir nombre y rol válido.");
  }

  const existing = input.id ? users.get(input.id) : undefined;

  if (!existing && role !== "responsable") {
    throw new SigiValidationError("Solo se pueden crear cuentas de responsables.");
  }

  if (existing?.role === "director" && role !== "director") {
    throw new SigiValidationError("El administrador principal no puede cambiar de rol.");
  }

  if (existing?.role === "plantel" && role !== "plantel") {
    throw new SigiValidationError("Las cuentas de plantel no pueden cambiar de rol.");
  }

  const normalizedPassword = typeof input.password === "string" ? input.password.trim() : "";

  if (!existing && normalizedPassword.length < 8) {
    throw new SigiValidationError("Define una contraseña inicial de al menos 8 caracteres.");
  }

  if (existing && normalizedPassword && normalizedPassword.length < 8) {
    throw new SigiValidationError("La nueva contraseña debe tener al menos 8 caracteres.");
  }

  if (role === "director") {
    const hasAnotherDirector = Array.from(users.values()).some((user) => user.role === "director" && user.id !== input.id);

    if (hasAnotherDirector) {
      throw new SigiValidationError("Solo puede existir un administrador.");
    }

    if (input.active === false) {
      throw new SigiValidationError("El administrador principal no puede desactivarse.");
    }
  }

  const responsableId = role === "responsable"
    ? input.responsableId ?? existing?.responsableId ?? nextResponsableId()
    : undefined;
  const userId = input.id || (role === "responsable" ? `responsable-${responsableId}` : `user-${Date.now()}`);
  const username = input.username?.trim().toLowerCase() || existing?.username || usernameForUser(userId, input.name, role);
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername) {
    throw new SigiValidationError("El nombre de usuario no puede estar vacío.");
  }

  const duplicateUsername = Array.from(users.values()).find((candidate) =>
    candidate.id !== userId && (
      normalizeUsername(candidate.username) === normalizedUsername ||
      matchesLoginUsername(candidate, normalizedUsername)
    )
  );

  if (duplicateUsername) {
    throw new SigiValidationError("Ese nombre de usuario ya está registrado.");
  }

  const passwordChanged = Boolean(normalizedPassword && normalizedPassword !== existing?.passwordHash);
  const activeChanged = existing ? (input.active ?? existing.active) !== existing.active : false;
  const user: SigiUser = {
    id: userId,
    username,
    name: input.name.trim(),
    role,
    plantelId: role === "plantel" ? input.plantelId ?? existing?.plantelId ?? 1 : undefined,
    responsableId,
    indicatorCodes: sanitizeUserIndicatorCodes(role, input.indicatorCodes ?? existing?.indicatorCodes ?? []),
    active: input.active ?? existing?.active ?? true,
    passwordHash: normalizedPassword ? hashPassword(normalizedPassword) : existing?.passwordHash ?? defaultPasswordHashForRole(role),
    passwordChangeRequired: normalizedPassword
      ? true
      : existing?.passwordChangeRequired ?? !existing,
    credentialVersion: existing
      ? credentialVersionFor(existing) + (passwordChanged || activeChanged ? 1 : 0)
      : 1
  };

  users.set(user.id, user);
  const assignmentChanges = syncIndicatorAssignmentsForUser(
    session,
    user,
    Object.prototype.hasOwnProperty.call(input, "indicatorCodes")
  );

  if (assignmentChanges.length > 0) {
    persistNotificationState();
    recordAuditEvent(session, {
      action: "user_indicator_assignments_changed",
      resourceType: "user",
      resourceId: user.id,
      before: {
        indicatorCodes: existing?.indicatorCodes ?? []
      },
      after: {
        indicatorCodes: users.get(user.id)?.indicatorCodes ?? [],
        changes: assignmentChanges.map((change) => ({
          indicadorId: change.indicator.id,
          codigo: change.indicator.code,
          assigned: change.isAssigned
        }))
      },
      status: "ok"
    });
  }

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

  const updated = { ...user, active: false, credentialVersion: credentialVersionFor(user) + 1 };
  users.set(id, updated);
  persistCatalogState();
  return publicUser(updated);
}

export function authenticateUserResult(username: string, password: string): AuthenticationResult {
  const normalizedUsername = normalizeUsername(username);
  const user = Array.from(users.values()).find((candidate) =>
    matchesLoginUsername(candidate, normalizedUsername)
  );

  if (!user) {
    return { reason: "invalid_credentials" };
  }

  if (!user.active) {
    return { reason: "inactive_user" };
  }

  if (!verifyPassword(user.passwordHash, password)) {
    return { reason: "invalid_credentials" };
  }

  if (!user.passwordHash.startsWith("scrypt$")) {
    users.set(user.id, {
      ...user,
      passwordHash: hashPassword(password)
    });
    persistCatalogState();
  }

  return { user: authenticatedUser(user) };
}

export async function authenticateUserResultAsync(username: string, password: string): Promise<AuthenticationResult> {
  const normalizedUsername = normalizeUsername(username);
  const user = Array.from(users.values()).find((candidate) =>
    matchesLoginUsername(candidate, normalizedUsername)
  );

  if (!user) {
    return { reason: "invalid_credentials" };
  }

  if (!user.active) {
    return { reason: "inactive_user" };
  }

  if (!(await verifyPasswordAsync(user.passwordHash, password))) {
    return { reason: "invalid_credentials" };
  }

  if (!user.passwordHash.startsWith("scrypt$")) {
    users.set(user.id, {
      ...user,
      passwordHash: hashPassword(password)
    });
    persistCatalogState();
  }

  return { user: authenticatedUser(user) };
}

export function authenticateUser(username: string, password: string): AuthenticatedSigiUser | undefined {
  return authenticateUserResult(username, password).user;
}

export function updateOwnPassword(
  session: SigiSession,
  input: { currentPassword?: unknown; newPassword?: unknown; confirmPassword?: unknown }
) {
  const user = users.get(session.userId);
  const currentPassword = typeof input.currentPassword === "string" ? input.currentPassword : "";
  const newPassword = typeof input.newPassword === "string" ? input.newPassword : "";
  const confirmPassword = typeof input.confirmPassword === "string" ? input.confirmPassword : "";

  if (!user || !user.active) {
    throw new SigiAuthError("La sesión no corresponde a un usuario activo.");
  }

  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new SigiValidationError("Completa los tres campos de contraseña.");
  }

  if (!verifyPassword(user.passwordHash, currentPassword)) {
    throw new SigiValidationError("La contraseña actual no es correcta.");
  }

  if (newPassword.length < 8) {
    throw new SigiValidationError("La nueva contraseña debe tener al menos 8 caracteres.");
  }

  if (newPassword !== confirmPassword) {
    throw new SigiValidationError("La confirmación no coincide con la nueva contraseña.");
  }

  const updated = {
    ...user,
    passwordHash: hashPassword(newPassword),
    passwordChangeRequired: false,
    credentialVersion: credentialVersionFor(user) + 1
  };
  users.set(user.id, updated);
  persistCatalogState();
  return publicUser(updated);
}

export function resetUserPassword(
  session: SigiSession,
  id: string,
  input: { password?: unknown; confirmPassword?: unknown }
) {
  requireDirector(session);

  const user = users.get(id);
  const password = typeof input.password === "string" ? input.password.trim() : "";
  const confirmPassword = typeof input.confirmPassword === "string" ? input.confirmPassword.trim() : "";

  if (!user) {
    return undefined;
  }

  if (user.role === "director") {
    throw new SigiValidationError("La contraseña del administrador se cambia desde Cuenta.");
  }

  if (!password || !confirmPassword) {
    throw new SigiValidationError("Completa la nueva contraseña y su confirmación.");
  }

  if (password.length < 8) {
    throw new SigiValidationError("La nueva contraseña debe tener al menos 8 caracteres.");
  }

  if (password !== confirmPassword) {
    throw new SigiValidationError("La confirmación no coincide con la nueva contraseña.");
  }

  const updated = {
    ...user,
    passwordHash: hashPassword(password),
    passwordChangeRequired: true,
    credentialVersion: credentialVersionFor(user) + 1
  };
  users.set(user.id, updated);
  persistCatalogState();
  return publicUser(updated);
}

function matchesLoginUsername(user: SigiUser, normalizedUsername: string) {
  if (user.username === normalizedUsername) {
    return true;
  }

  return user.id === "director-1" && [
    "admin",
    "administrador",
    "directordgems"
  ].includes(normalizedUsername);
}

export function createSessionToken(user: AuthenticatedSigiUser | PublicSigiUser | SigiUser) {
  const role = normalizeRole(user.role) ?? "plantel";
  const storedUser = users.get(user.id);
  const payload: SessionTokenPayload = {
    sub: user.id,
    role,
    plantelId: user.plantelId,
    responsableId: user.responsableId,
    credentialVersion: storedUser ? credentialVersionFor(storedUser) : 1,
    exp: Math.floor(Date.now() / 1000) + sessionTtlSeconds()
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function listIndicators(session: SigiSession, options: { includeInactive?: boolean } = {}): SigiIndicatorListItem[] {
  return Array.from(indicators.values())
    .filter((indicator) => isVisibleOperationalIndicatorCode(indicator.code))
    .filter((indicator) => options.includeInactive || indicator.active)
    .filter((indicator) => canReadIndicator(session, indicator))
    .map((indicator) => {
      const workState = workStateForIndicator(session, indicator);

      return {
        ...indicator,
        operationalScope: operationalScopeForIndicator(indicator),
        effectivePlantelIds: effectivePlantelIdsForIndicator(indicator),
        ...workState,
        allowedActions: allowedActionsForIndicator(session, indicator, workState)
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code, "es", { numeric: true }));
}

export function listIndicatorHistory(session: SigiSession): SigiIndicatorHistoryEntry[] {
  return listIndicators(session, { includeInactive: session.role === "director" })
    .map((indicator) => ({
      id: indicator.id,
      code: indicator.code,
      name: indicator.name,
      action: indicatorChangeLabel(indicator.lastChange),
      updatedAt: indicatorUpdatedAt(indicator),
      updatedBy: indicator.updatedBy ?? "Sistema",
      responsibleNames: indicator.responsibleNames,
      plantelScope: plantelScopeLabel(indicator),
      active: indicator.active
    }))
    .sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt) ||
      a.code.localeCompare(b.code, "es", { numeric: true })
    );
}

export function listReviewCaptures(session: SigiSession): SigiReviewCapture[] {
  if (session.role === "plantel") {
    throw new SigiForbiddenError("El plantel no puede revisar capturas.");
  }

  return listCaptureDrafts()
    .filter((draft) => draft.estado === "en_revision")
    .filter((draft) => session.role !== "responsable" || draft.submittedByUserId !== session.userId)
    .flatMap((draft) => {
      const indicator = indicators.get(draft.indicadorId);
      const plantel = planteles.find((item) => item.id === draft.plantelId) ?? unassignedPlantel;

      if (!indicator || !indicator.active || !isVisibleOperationalIndicatorCode(indicator.code) || !plantel) {
        return [];
      }

      if (!canReadIndicator(session, indicator)) {
        return [];
      }

      if (session.role === "responsable" && !isResponsibleReviewer(session, indicator)) {
        return [];
      }

      if (hasExplicitPlantelScope(indicator) && !canUseIndicatorForPlantel(indicator, draft.plantelId)) {
        return [];
      }

      return [{
        captureId: draft.id,
        indicadorId: indicator.id,
        code: indicator.code,
        name: indicator.name,
        plantelId: draft.plantelId,
        plantel: plantel.name,
        periodoId: draft.periodoId,
        actividadId: draft.actividadId,
        responsableId: draft.responsableId,
        estado: "en_revision" as const,
        actualizadoEn: draft.actualizadoEn,
        allowedActions: ["view", "open_evidence", "request_correction", "approve"] as SigiAllowedAction[]
      }];
    })
    .sort((a, b) =>
      b.actualizadoEn.localeCompare(a.actualizadoEn) ||
      a.code.localeCompare(b.code, "es", { numeric: true }) ||
      a.plantel.localeCompare(b.plantel, "es", { numeric: true })
    );
}

export function listNotifications(session: SigiSession): SigiNotification[] {
  return Array.from(notifications.values())
    .filter((notification) => notification.usuarioDestino === session.userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
}

export function markNotificationRead(session: SigiSession, notificationId: number) {
  const notification = notifications.get(notificationId);

  if (!notification) {
    return undefined;
  }

  if (notification.usuarioDestino !== session.userId) {
    throw new SigiForbiddenError("No tienes permiso para modificar esta notificación.");
  }

  if (notification.readAt) {
    return notification;
  }

  const updated = { ...notification, readAt: new Date().toISOString() };
  notifications.set(notificationId, updated);
  persistNotificationState();
  return updated;
}

export function resetNotificationsForTest() {
  notifications.clear();
  nextNotificationId = 1;
  persistNotificationState();
}

export function resetAuditEventsForTest() {
  auditEvents.clear();
  nextAuditEventId = 1;
  persistAuditState();
}

export function listAuditEventsForTest() {
  return Array.from(auditEvents.values()).sort((a, b) => a.id - b.id);
}

export function listAuditEvents(session: SigiSession): SigiAuditEvent[] {
  requireDirector(session);

  return Array.from(auditEvents.values())
    .map(sanitizeAuditEvent)
    .sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt) ||
      b.id - a.id
    );
}

export function recordAuditEvent(
  session: SigiSession,
  event: Omit<SigiAuditEvent, "id" | "userId" | "role" | "createdAt" | "requestId"> & { requestId?: string }
) {
  const id = nextAuditEventId;
  const auditEvent: SigiAuditEvent = {
    id,
    userId: sanitizeAuditText(session.userId),
    role: session.role,
    action: sanitizeAuditText(auditActionForTransition(event)),
    resourceType: event.resourceType,
    resourceId: sanitizeAuditText(event.resourceId),
    before: sanitizeAuditValue(event.before),
    after: sanitizeAuditValue(event.after),
    status: event.status,
    createdAt: new Date().toISOString(),
    requestId: sanitizeAuditRequestId(event.requestId, id)
  };

  nextAuditEventId += 1;
  auditEvents.set(auditEvent.id, auditEvent);
  persistAuditState();
  return auditEvent;
}

function auditActionForTransition(
  event: Pick<SigiAuditEvent, "action" | "before" | "after">
) {
  if (
    event.action === "capture_submitted" &&
    captureStatusFromAuditSnapshot(event.before) === "correccion_solicitada" &&
    captureStatusFromAuditSnapshot(event.after) === "en_revision"
  ) {
    return "capture_resubmitted";
  }

  return event.action;
}

function captureStatusFromAuditSnapshot(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !("estado" in value)) {
    return undefined;
  }

  return typeof value.estado === "string" ? value.estado : undefined;
}

function sanitizeAuditEvent(event: SigiAuditEvent): SigiAuditEvent {
  return {
    ...event,
    userId: sanitizeAuditText(event.userId),
    action: sanitizeAuditText(event.action),
    resourceId: sanitizeAuditText(event.resourceId),
    before: sanitizeAuditValue(event.before),
    after: sanitizeAuditValue(event.after),
    requestId: sanitizeAuditRequestId(event.requestId, event.id)
  };
}

function sanitizeAuditValue(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>()
): unknown {
  if (value === undefined || value === null || typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return isSensitiveAuditString(value) ? AUDIT_VALUE_OMITTED : value;
  }

  if (typeof value === "bigint") {
    return String(value);
  }

  if (typeof value !== "object" || depth >= MAX_AUDIT_VALUE_DEPTH) {
    return AUDIT_VALUE_OMITTED;
  }

  if (seen.has(value)) {
    return AUDIT_VALUE_OMITTED;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    const sanitized = value.map((item) => sanitizeAuditValue(item, depth + 1, seen));
    seen.delete(value);
    return sanitized;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    if (isSensitiveAuditKey(key)) {
      continue;
    }

    const sanitizedValue = sanitizeAuditValue(nestedValue, depth + 1, seen);

    if (sanitizedValue !== undefined) {
      sanitized[key] = sanitizedValue;
    }
  }

  seen.delete(value);
  return sanitized;
}

function isSensitiveAuditKey(key: string) {
  const normalized = key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

  return [
    "password",
    "passwd",
    "contrasena",
    "credential",
    "secret",
    "hash",
    "sha",
    "token",
    "cookie",
    "authorization",
    "storageref",
    "base64"
  ].some((term) => normalized.includes(term));
}

function sanitizeAuditText(value: string) {
  return isSensitiveAuditString(value) ? AUDIT_VALUE_OMITTED : value;
}

function sanitizeAuditRequestId(value: string | undefined, eventId: number) {
  const fallback = `local-${Date.now()}-${eventId}`;
  const bounded = typeof value === "string"
    ? value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, MAX_AUDIT_REQUEST_ID_LENGTH)
    : "";

  if (!bounded || isSensitiveAuditString(bounded)) {
    return fallback;
  }

  return bounded;
}

function isSensitiveAuditString(value: string) {
  const trimmed = value.trim();

  if (/^data:/i.test(trimmed) || /^(?:bearer|basic)\s+\S+/i.test(trimmed)) {
    return true;
  }

  if (/^[a-f0-9]{32,}$/i.test(trimmed)) {
    return true;
  }

  if (/^[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/.test(trimmed)) {
    return true;
  }

  const compact = trimmed.replace(/\s+/g, "");
  return compact.length >= 24 &&
    compact.length % 4 === 0 &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(compact) &&
    (compact.length >= 64 || /[=+/]/.test(compact));
}

export function recordEvidenceOpened(session: SigiSession, draft: CaptureDraft, requestId?: string) {
  assertCaptureAccess(session, draft, "read");
  const evidence = draft.payload.evidencia;

  if (!hasStoredEvidence(evidence)) {
    throw new SigiValidationError("La evidencia no está disponible. Solicita que el plantel reenvíe el archivo.");
  }

  return recordAuditEvent(session, {
    action: "evidence_opened",
    resourceType: "capture",
    resourceId: String(draft.id),
    after: {
      evidencia: evidence!.nombre,
      indicadorId: draft.indicadorId,
      plantelId: draft.plantelId,
      versionActual: draft.versionActual
    },
    status: "ok",
    requestId
  });
}

export function assertEvidenceOpenedBeforeApproval(session: SigiSession, draft: CaptureDraft) {
  const indicator = indicators.get(draft.indicadorId);
  const evidenceRules = sanitizeEvidenceRules(indicator?.evidenceRules);

  if (!evidenceRules.required && !evidenceRules.requireOpenBeforeApproval) {
    return;
  }

  if (evidenceRules.required && !hasStoredEvidence(draft.payload.evidencia)) {
    throw new SigiValidationError("La evidencia no está disponible. Solicita que el plantel reenvíe el archivo antes de aprobar.");
  }

  if (!evidenceRules.requireOpenBeforeApproval) {
    return;
  }

  const opened = Array.from(auditEvents.values()).some((event) =>
    event.action === "evidence_opened" &&
    event.resourceType === "capture" &&
    event.resourceId === String(draft.id) &&
    event.userId === session.userId &&
    event.status === "ok" &&
    typeof event.after === "object" &&
    event.after !== null &&
    !Array.isArray(event.after) &&
    "versionActual" in event.after &&
    event.after.versionActual === draft.versionActual
  );

  if (!opened) {
    throw new SigiValidationError("Abre la evidencia PDF antes de aprobar el indicador.");
  }
}

export function recordCaptureNotification(
  event: "submitted" | "resubmitted" | "correction_requested" | "approved",
  actor: SigiSession,
  draft: CaptureDraft
) {
  const indicator = indicators.get(draft.indicadorId);

  if (!indicator) {
    return [];
  }

  const plantel = planteles.find((item) => item.id === draft.plantelId) ?? unassignedPlantel;
  const targetUsers = notificationTargetsForCapture(event, indicator, draft, actor);
  const createdAt = new Date().toISOString();
  const created: SigiNotification[] = [];
  const eventType: SigiNotificationEvent = event === "submitted"
    ? "capture_submitted"
    : event === "resubmitted" ? "capture_resubmitted"
    : event === "approved" ? "capture_approved" : "correction_requested";

  for (const targetUser of targetUsers) {
    const idempotencyKey = `${eventType}:${draft.id}:${draft.versionActual}:${targetUser.id}`;

    if (Array.from(notifications.values()).some((item) => item.idempotencyKey === idempotencyKey)) {
      continue;
    }

    const notification: SigiNotification = {
      id: nextNotificationId,
      rolDestino: targetUser.role,
      usuarioDestino: targetUser.id,
      indicadorId: indicator.id,
      indicadorCodigo: indicator.code,
      indicadorNombre: indicator.name,
      captureId: draft.id,
      plantelId: draft.plantelId,
      plantel: plantel.name,
      estado: draft.estado,
      eventType,
      idempotencyKey,
      mensaje: notificationMessage(eventType, indicator, plantel.name === unassignedPlantel.name ? undefined : plantel.name),
      createdAt,
      readAt: null,
      actorUserId: actor.userId,
      actorRole: actor.role
    };

    nextNotificationId += 1;
    notifications.set(notification.id, notification);
    created.push(notification);
  }

  if (created.length > 0) {
    persistNotificationState();
  }

  return created;
}

function workStateForIndicator(session: SigiSession, indicator: SigiIndicator): Pick<
  SigiIndicatorListItem,
  "status" | "captureId" | "plantelId" | "actividadId" | "periodoId" | "captureStatus" | "canEdit" | "canReview" | "isReadOnly" | "readOnlyReason"
> {
  if (!indicator.active) {
    return {
      status: "Corregir",
      canEdit: false,
      canReview: false,
      isReadOnly: true,
      readOnlyReason: "El indicador esta desactivado."
    };
  }

  const relevantCaptures = relevantCapturesForIndicator(session, indicator);
  const latest = relevantCaptures[0];
  const canPlantelDraft = session.role === "plantel";
  const canResponsibleReview = session.role === "responsable" && isResponsibleReviewer(session, indicator);
  const baseState = {
    captureId: latest?.id,
    plantelId: latest?.plantelId ?? defaultPlantelIdForIndicator(session, indicator),
    actividadId: latest?.actividadId ?? 1,
    periodoId: latest?.periodoId ?? 1,
    captureStatus: latest?.estado
  };

  if (!latest) {
    return {
      ...baseState,
      status: "Pendiente",
      canEdit: canPlantelDraft,
      canReview: false,
      isReadOnly: !canPlantelDraft,
      readOnlyReason: canPlantelDraft ? undefined : "No hay una captura editable para este indicador."
    };
  }

  if (latest.estado === "aprobado" || latest.estado === "cerrado") {
    return {
      ...baseState,
      status: "Aprobado",
      canEdit: false,
      canReview: false,
      isReadOnly: true,
      readOnlyReason: "La captura ya fue aprobada."
    };
  }

  if (latest.estado === "en_revision") {
    const isOwnResponsibleSubmission =
      session.role === "responsable" && latest.submittedByUserId === session.userId;
    const canReview = session.role === "director" || (canResponsibleReview && !isOwnResponsibleSubmission);

    return {
      ...baseState,
      status: "En revisión",
      canEdit: false,
      canReview,
      isReadOnly: true,
      readOnlyReason: canReview ? "La captura está lista para revisión." : "La captura está en revisión."
    };
  }

  if (latest.estado === "correccion_solicitada") {
    return {
      ...baseState,
      status: "Corregir",
      canEdit: canPlantelDraft,
      canReview: false,
      isReadOnly: !canPlantelDraft,
      readOnlyReason: canPlantelDraft ? undefined : "La captura requiere corrección fuera de tu alcance."
    };
  }

  return {
    ...baseState,
    status: "Pendiente",
    canEdit: canPlantelDraft,
    canReview: false,
    isReadOnly: !canPlantelDraft,
    readOnlyReason: canPlantelDraft ? undefined : "La captura no esta disponible para edicion."
  };
}

function allowedActionsForIndicator(
  session: SigiSession,
  indicator: SigiIndicator,
  workState: ReturnType<typeof workStateForIndicator>
): SigiAllowedAction[] {
  const actions: SigiAllowedAction[] = ["view"];
  const capture = workState.captureId
    ? listCaptureDrafts().find((draft) => draft.id === workState.captureId)
    : undefined;

  if (session.role === "director") {
    actions.push("configure");
  }

  if (workState.canEdit && session.role === "plantel") {
    actions.push("capture", "submit_review");

    if (templateForIndicator(indicator, session).allowAddRows !== false) {
      actions.push("add_rows");
    }
  }

  if (capture?.payload.evidencia?.nombre) {
    actions.push("open_evidence");
  }

  if (workState.canReview) {
    actions.push("request_correction", "approve");
  }

  return uniqueStrings(actions) as SigiAllowedAction[];
}

function relevantCapturesForIndicator(session: SigiSession, indicator: SigiIndicator) {
  return listCaptureDrafts()
    .filter((draft) => draft.indicadorId === indicator.id && draft.estado !== "cerrado")
    .filter((draft) => !hasExplicitPlantelScope(indicator) || canUseIndicatorForPlantel(indicator, draft.plantelId))
    .filter((draft) => isCaptureCompatibleWithCurrentTemplate(session, indicator, draft))
    .filter((draft) => {
      if (session.role === "plantel") {
        return draft.plantelId === session.plantelId;
      }

      if (session.role === "responsable") {
        return isResponsibleRelated(session, indicator);
      }

      return true;
    })
    .sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn) || b.id - a.id);
}

function isCaptureCompatibleWithCurrentTemplate(
  session: SigiSession,
  indicator: SigiIndicator,
  draft: CaptureDraft
) {
  if (!Array.isArray(draft.payload.rows)) {
    return false;
  }

  const template = templateForIndicator(indicator, session);
  const columnKeys = new Set(template.columns.map((column) => column.key));

  return draft.payload.rows.every((row) =>
    typeof row === "object" &&
    row !== null &&
    !Array.isArray(row) &&
    Object.keys(row).every((key) => columnKeys.has(key))
  );
}

function defaultPlantelIdForIndicator(session: SigiSession, indicator: SigiIndicator) {
  if (session.role === "plantel" && session.plantelId) {
    return session.plantelId;
  }

  return effectivePlantelIdsForIndicator(indicator)[0];
}

export function getIndicatorById(id: number) {
  return indicators.get(id);
}

export function getIndicatorByCode(code: string) {
  return Array.from(indicators.values()).find((indicator) => indicator.code === code);
}

export function saveIndicator(session: SigiSession, input: Partial<SigiIndicator>) {
  requireDirector(session);

  const normalizedCode = input.code?.trim() ?? "";

  if (!normalizedCode || !input.name?.trim()) {
    throw new SigiValidationError("El indicador debe incluir código y nombre.");
  }

  if (!/^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/.test(normalizedCode)) {
    throw new SigiValidationError("El código del indicador contiene caracteres no válidos.");
  }

  const existingById = input.id ? indicators.get(Number(input.id)) : undefined;
  const existingByCode = getIndicatorByCode(normalizedCode);

  if (
    !existingById &&
    isProductionRuntime() &&
    (isSyntheticIndicatorCode(normalizedCode) || normalizedCode.startsWith("TMP-"))
  ) {
    throw new SigiValidationError("El código corresponde a una plantilla interna y no puede publicarse como indicador.");
  }

  if (existingById && existingById.code !== normalizedCode) {
    throw new SigiValidationError("El código de un indicador existente no puede cambiarse.");
  }

  if (!existingById && existingByCode) {
    throw new SigiValidationError("Ya existe un indicador con ese código.");
  }

  const existing = existingById;
  const id = existing?.id ?? nextIndicatorId();
  const responsibleIds = normalizeResponsibleIds(
    input.responsibleIds ?? existing?.responsibleIds,
    input.responsibleNames ?? existing?.responsibleNames
  );
  const primaryResponsibleId = input.primaryResponsibleId ?? existing?.primaryResponsibleId ?? responsibleIds[0];

  if (!responsibleIds.includes(primaryResponsibleId)) {
    throw new SigiValidationError("El responsable principal debe pertenecer a los responsables generales seleccionados.");
  }
  const isNewIndicator = !existing;
  const lastChange = existing?.active === false && input.active !== false
    ? "habilitado"
    : isNewIndicator ? "creado" : "actualizado";
  const requestedContributorNames = input.contributorNames ?? existing?.contributorNames ?? [];
  const inputHasPlantelIds = Object.prototype.hasOwnProperty.call(input, "plantelIds");
  const normalizedInputPlantelIds = normalizePlantelScope(input.plantelIds ?? []);
  const plantelIdsChanged = inputHasPlantelIds && (
    !existing || !sameNumberSet(normalizedInputPlantelIds, existing.plantelIds)
  );
  const resolvedContributorResponsibleIds = normalizeOptionalResponsibleIds(
    input.contributorResponsibleIds,
    requestedContributorNames,
    true
  );
  const hasResponsibleContributorInput = resolvedContributorResponsibleIds.length > 0;
  const isOfficialImportedIndicator = Boolean(
    initialIndicators.find((indicator) => indicator.code === normalizedCode && indicator.plantelScopeSource === "official-import")
  );
  const officialPlantelIds = normalizePlantelScope(officialIndicatorPlantelScopes[normalizedCode] ?? []);
  const requestedScopeIsConsistent = input.operationalScope === undefined || (
    input.operationalScope === "specific_responsables"
      ? hasResponsibleContributorInput && normalizedInputPlantelIds.length === 0
      : input.operationalScope === "specific_planteles"
        ? normalizedInputPlantelIds.length > 0 && !hasResponsibleContributorInput
        : input.operationalScope === "all_planteles"
          ? !hasResponsibleContributorInput
          : normalizedInputPlantelIds.length === 0 && !hasResponsibleContributorInput
  );
  const operationalScope: SigiOperationalScope = input.operationalScope && requestedScopeIsConsistent
    ? input.operationalScope
    : hasResponsibleContributorInput
      ? "specific_responsables"
      : inputHasPlantelIds
        ? normalizedInputPlantelIds.length === 0
          ? "specific_planteles"
          : sameNumberSet(normalizedInputPlantelIds, allPlantelIds()) ? "all_planteles" : "specific_planteles"
        : existing ? operationalScopeForIndicator(existing) : "all_planteles";
  const nextContributorNames = operationalScope === "specific_responsables"
    ? requestedContributorNames
    : operationalScope === "none" ? [] : ["Planteles"];
  const contributorResponsibleIds = operationalScope === "specific_responsables"
    ? resolvedContributorResponsibleIds
    : [];
  const preservesOfficialImportedScope = Boolean(
    existing &&
    isOfficialImportedIndicator &&
    existing.plantelScopeSource === "official-import" &&
    (!input.operationalScope || input.operationalScope === operationalScopeForIndicator(existing)) &&
    (!inputHasPlantelIds || sameNumberSet(normalizedInputPlantelIds, officialPlantelIds))
  );
  const scopedPlantelIds = inputHasPlantelIds
    ? input.plantelIds ?? []
    : existing?.plantelIds?.length
      ? existing.plantelIds
      : officialIndicatorPlantelScopes[normalizedCode] ?? officialSourcePlantelIds;
  const nextPlantelIds = preservesOfficialImportedScope
    ? []
    : operationalScope === "all_planteles"
      ? allPlantelIds()
      : operationalScope === "specific_planteles"
        ? normalizePlantelScope(scopedPlantelIds)
        : [];
  const effectiveNextPlantelIds = preservesOfficialImportedScope ? officialPlantelIds : nextPlantelIds;

  if (operationalScope === "specific_planteles" && effectiveNextPlantelIds.length === 0) {
    throw new SigiValidationError("Selecciona al menos un plantel específico.");
  }

  if (operationalScope === "specific_responsables" && contributorResponsibleIds.length === 0) {
    throw new SigiValidationError("Selecciona al menos un responsable específico.");
  }

  const hasTemplateColumnsInput = Object.prototype.hasOwnProperty.call(input, "templateColumns") &&
    Array.isArray(input.templateColumns);
  const nextTemplateColumns = hasTemplateColumnsInput
    ? sanitizeTemplateColumns(input.templateColumns)
    : existing?.templateColumns;

  const indicator: SigiIndicator = {
    id,
    code: normalizedCode,
    name: input.name.trim(),
    description: input.description?.trim() || input.name.trim(),
    dataType: input.dataType ?? inferDataType(input.name),
    period: input.period ?? "2026",
    active: input.active ?? existing?.active ?? true,
    primaryResponsibleId,
    responsibleIds,
    responsibleNames: namesForResponsibleIds(responsibleIds),
    contributorResponsibleIds,
    contributorNames: nextContributorNames,
    activities: input.activities?.filter(Boolean) ?? existing?.activities ?? ["Actividad general"],
    plantelIds: nextPlantelIds,
    operationalScope,
    plantelScopeSource: preservesOfficialImportedScope
      ? "official-import"
      : plantelIdsChanged || (input.operationalScope && input.operationalScope !== existing?.operationalScope)
        ? "manual"
        : existing?.plantelScopeSource ?? "manual",
    templateColumns: nextTemplateColumns,
    templateStructureCustomized: hasTemplateColumnsInput
      ? true
      : existing?.templateStructureCustomized,
    evidenceRules: sanitizeEvidenceRules(input.evidenceRules ?? existing?.evidenceRules),
    updatedAt: new Date().toISOString(),
    updatedBy: actorNameForSession(session),
    lastChange
  };

  indicators.set(id, indicator);
  syncUserAssignmentsForIndicator(
    indicator,
    existing?.responsibleIds ?? [],
    existing?.contributorResponsibleIds ?? [],
    session
  );
  persistCatalogState();
  return indicator;
}

export function deactivateIndicator(session: SigiSession, id: number) {
  requireDirector(session);
  const indicator = indicators.get(id);

  if (!indicator) {
    return undefined;
  }

  const updated = {
    ...indicator,
    active: false,
    updatedAt: new Date().toISOString(),
    updatedBy: actorNameForSession(session),
    lastChange: "desactivado" as const
  };
  indicators.set(id, updated);
  persistCatalogState();
  return updated;
}

const studentPeriodMatrixCodes = new Set([
  "1.1.2.2.10",
  "1.1.2.2.11"
]);

const integralDevelopmentCodes = new Set(["1.1.2.3.1"]);

const staffTrainingCodes = new Set([
  "1.1.2.5.10"
]);

const staffProfileCodes = new Set(["1.1.2.5.3"]);

const participantActionCodes = new Set([
  "2.1.4.1.2",
  "3.1.0.0.1",
  "3.1.1.3.6"
]);

const infrastructureCodes = new Set(["FMT-01-E81E8473-41221-porcentaje-de-uo-q"]);

export function templateForIndicator(indicator: SigiIndicator, session?: SigiSession): IndicatorTemplate {
  if (indicator.templateColumns?.length) {
    return configuredTemplate(indicator, session);
  }

  if (officialWorkbookTemplates[indicator.code]) {
    return officialWorkbookTemplate(indicator, session);
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

export function templateSessionForPlantelScope(
  session: SigiSession,
  indicator: SigiIndicator,
  plantelId?: number
): SigiSession {
  if (!plantelId) {
    return session;
  }

  if (!Number.isInteger(plantelId) || plantelId <= 0 || !planteles.some((plantel) => plantel.id === plantelId)) {
    throw new SigiValidationError("El plantel solicitado no existe.");
  }

  const operationalScope = operationalScopeForIndicator(indicator);

  if (operationalScope === "none" || operationalScope === "specific_responsables") {
    throw new SigiForbiddenError("El indicador no tiene alcance operativo para planteles.");
  }

  if (!canUseIndicatorForPlantel(indicator, plantelId)) {
    throw new SigiForbiddenError("El indicador no esta asignado a este plantel.");
  }

  if (session.role === "plantel") {
    if (session.plantelId !== plantelId) {
      throw new SigiForbiddenError("El plantel solo puede consultar su propia plantilla.");
    }
  }

  return {
    ...session,
    role: "plantel",
    plantelId
  };
}

export function assertCaptureAccess(
  session: SigiSession,
  request: {
    plantelId: number;
    indicadorId: number;
    payload?: CapturePayload;
    estado?: CaptureDraft["estado"];
    submittedByUserId?: string | null;
  },
  action: "draft" | "submit" | "read" | "review"
) {
  const indicator = indicators.get(request.indicadorId);

  if (!indicator || !indicator.active) {
    throw new SigiValidationError("El indicador no existe o esta desactivado.");
  }

  if (session.role === "plantel" && request.plantelId !== session.plantelId) {
    throw new SigiForbiddenError("El plantel solo puede operar su propio alcance.");
  }

  if (action === "draft" || action === "submit") {
    if (session.role !== "plantel") {
      throw new SigiForbiddenError("Solo el plantel puede capturar o enviar indicadores a revisión.");
    }
  }

  if (requiresPlantelScope(session, indicator) && !canUseIndicatorForPlantel(indicator, request.plantelId)) {
    throw new SigiForbiddenError("El indicador no esta asignado a este plantel.");
  }

  if (session.role === "responsable") {
    const hasResponsibleScope = action === "read"
      ? isResponsibleRelated(session, indicator)
      : isResponsibleReviewer(session, indicator);

    if (!hasResponsibleScope) {
      throw new SigiForbiddenError("El responsable no tiene asignado este indicador.");
    }
  }

  if (session.role === "plantel" && action === "review") {
    throw new SigiForbiddenError("El plantel no puede revisar capturas.");
  }

  if (session.role === "responsable" && action === "review" && request.submittedByUserId === session.userId) {
    throw new SigiForbiddenError("El responsable no puede aprobar u observar una captura enviada por su misma cuenta.");
  }

  if (request.payload && action !== "read") {
    validateCapturePayload(indicator, request.payload, action === "submit", session);
    normalizeCapturePayload(indicator, request.payload, session);
  }
}

function normalizeCapturePayload(indicator: SigiIndicator, payload: CapturePayload, session?: SigiSession) {
  if (!Array.isArray(payload.rows)) {
    return;
  }

  const template = templateForIndicator(indicator, session);
  payload.rows = payload.rows.map((row) => {
    const normalizedRow: Record<string, unknown> = {};

    for (const column of template.columns) {
      if (column.type === "calculated") {
        continue;
      }

      const value = row[column.key];

      if (column.type === "number") {
        const numericValue = numberValue(value);
        normalizedRow[column.key] = numericValue === undefined ? value ?? "" : numericValue;
        continue;
      }

      normalizedRow[column.key] = value ?? "";
    }

    for (let pass = 0; pass < Math.max(1, template.columns.length); pass += 1) {
      let changed = false;

      for (const column of template.columns) {
        if (column.type !== "calculated" || !column.calculation) {
          continue;
        }

        const nextValue = calculatedValueForRow(normalizedRow, column, template.columns) ?? 0;
        const previousValue = numberValue(normalizedRow[column.key]) ?? 0;
        normalizedRow[column.key] = nextValue;

        if (Math.abs(previousValue - nextValue) > 0.0001) {
          changed = true;
        }
      }

      if (!changed) {
        break;
      }
    }

    return normalizedRow;
  });
}

export function validateCapturePayload(indicator: SigiIndicator, payload: CapturePayload, requireJustification: boolean, session?: SigiSession) {
  if (!Array.isArray(payload.rows) || payload.rows.some((row) => typeof row !== "object" || row === null || Array.isArray(row))) {
    throw new SigiValidationError("La captura debe incluir filas válidas.");
  }

  const template = templateForIndicator(indicator, session);
  const minimumRows = template.initialRows.length;

  if (payload.rows.length === 0 || (requireJustification && !template.allowAddRows && payload.rows.length < minimumRows)) {
    throw new SigiValidationError("La captura está incompleta. Vuelve a abrir el indicador y conserva todas las filas oficiales.");
  }

  const columnKeys = new Set(template.columns.map((column) => column.key));
  const unknownKeys = payload.rows.flatMap((row) =>
    Object.keys(row).filter((key) => !columnKeys.has(key))
  );

  if (unknownKeys.length > 0) {
    throw new SigiValidationError("La captura contiene campos de una plantilla anterior. Recarga el indicador y vuelve a guardar.");
  }

  validateTextColumns(indicator, template, payload);
  validateNumericColumns(indicator, template, payload);
  validateCalculatedColumns(indicator, template, payload);
  validateDomainConsistency(indicator, payload);

  if (payload.evidencia?.nombre) {
    validateEvidenceMetadata(payload.evidencia, sanitizeEvidenceRules(indicator.evidenceRules));
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

  if (requireJustification) {
    const justificacion = payload.justificacion?.trim() ?? "";
    const evidenceRules = sanitizeEvidenceRules(indicator.evidenceRules);

    if (justificacion.length < 10) {
      throw new SigiValidationError("Agrega una descripción o justificación de al menos 10 caracteres antes de enviar.");
    }

    if (!isMeaningfulJustification(justificacion)) {
      throw new SigiValidationError("La justificación debe explicar el avance, la fuente de datos o la evidencia; no puede ser solo números.");
    }

    if (evidenceRules.required && !payload.evidencia?.nombre) {
      throw new SigiValidationError("Adjunta una evidencia PDF antes de enviar a revisión.");
    }

    if (missingValues) {
      throw new SigiValidationError("Completa los campos capturables o ajusta el formato antes de enviar.");
    }

  }
}

function isMeaningfulJustification(value: string) {
  const normalized = value.trim();

  if (!normalized || isNumericOnlyText(normalized)) {
    return false;
  }

  const words = normalized
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}]/gu, ""))
    .filter((word) => word.length >= 3);
  const letterCount = words.join("").length;

  return words.length >= 2 && letterCount >= 8;
}

function validateEvidenceMetadata(evidence: NonNullable<CapturePayload["evidencia"]>, rules: EvidenceRules) {
  const allowedTypes = new Set(rules.allowedTypes.map((type) => type.toLowerCase()));
  const evidenceType = evidence.tipo?.toLowerCase() || "application/octet-stream";
  const maxBytes = rules.maxSizeMb * 1024 * 1024;

  if (allowedTypes.size > 0 && !allowedTypes.has(evidenceType)) {
    throw new SigiValidationError("La evidencia debe ser un archivo PDF valido.");
  }

  if (!Number.isFinite(evidence.tamanoBytes) || evidence.tamanoBytes <= 0) {
    throw new SigiValidationError("La evidencia no tiene un tamano valido.");
  }

  if (evidence.tamanoBytes > maxBytes) {
    throw new SigiValidationError(`La evidencia no debe superar ${rules.maxSizeMb} MB.`);
  }

  if (!evidence.nombre.toLowerCase().endsWith(".pdf")) {
    throw new SigiValidationError("La evidencia debe conservar la extensión .pdf.");
  }

  const encodedContent = evidence.contenidoBase64?.replace(/\s+/g, "") ?? "";

  if (
    !encodedContent &&
    evidence.storageVerified === true &&
    evidence.storageRef &&
    /^[a-f0-9]{64}$/i.test(evidence.sha256 ?? "")
  ) {
    return;
  }

  if (!encodedContent || encodedContent.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encodedContent)) {
    throw new SigiValidationError("La evidencia PDF no contiene datos válidos.");
  }

  const content = Buffer.from(encodedContent, "base64");

  if (content.length !== evidence.tamanoBytes) {
    throw new SigiValidationError("El tamaño real de la evidencia no coincide con el archivo informado.");
  }

  if (content.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new SigiValidationError("El archivo adjunto no contiene un PDF válido.");
  }

  const trailer = content.subarray(Math.max(0, content.length - 2048)).toString("latin1");

  if (!trailer.includes("%%EOF")) {
    throw new SigiValidationError("El PDF está incompleto o dañado.");
  }
}

function hasStoredEvidence(evidence: CapturePayload["evidencia"]) {
  return Boolean(
    evidence?.nombre &&
    evidence.tamanoBytes > 0 &&
    (evidence.contenidoBase64 || (evidence.storageVerified === true && evidence.storageRef && evidence.sha256))
  );
}

function validateTextColumns(
  indicator: SigiIndicator,
  template: IndicatorTemplate,
  payload: CapturePayload
) {
  const textColumns = template.columns.filter((column) => column.type === "text");

  for (const row of payload.rows) {
    for (const column of textColumns) {
      const rawValue = row[column.key];
      const value = typeof rawValue === "string" ? rawValue.trim() : rawValue === undefined || rawValue === null ? "" : String(rawValue).trim();
      const validation = column.validation;

      if (column.required && !value) {
        throw new SigiValidationError(`El campo "${column.label}" de ${indicator.code} es obligatorio.`);
      }

      if (validation?.allowedValues?.length && value && !validation.allowedValues.includes(value)) {
        throw new SigiValidationError(`El campo "${column.label}" de ${indicator.code} debe usar un valor del catálogo permitido.`);
      }

      if (isCatalogTextColumn(column) && isNumericOnlyText(value)) {
        throw new SigiValidationError(`El campo "${column.label}" de ${indicator.code} debe contener texto válido, no solo números.`);
      }
    }
  }
}

function validateNumericColumns(
  indicator: SigiIndicator,
  template: IndicatorTemplate,
  payload: CapturePayload
) {
  const numericColumns = template.columns.filter((column) => column.type === "number" || column.type === "calculated");

  for (const row of payload.rows) {
    for (const column of numericColumns) {
      const value = row[column.key];

      if (value === "" || value === undefined || value === null) {
        continue;
      }

      const numericValue = numberValue(value);

      if (numericValue === undefined || Number.isNaN(numericValue)) {
        throw new SigiValidationError(`El campo "${column.label}" de ${indicator.code} debe ser numérico.`);
      }

      if (numericValue < 0) {
        throw new SigiValidationError(`El campo "${column.label}" de ${indicator.code} no puede ser negativo.`);
      }

      const validation = numericValidationForColumn(column);

      if (validation.min !== undefined && numericValue < validation.min) {
        throw new SigiValidationError(`El campo "${column.label}" de ${indicator.code} debe ser mayor o igual a ${validation.min}.`);
      }

      if (validation.max !== undefined && numericValue > validation.max) {
        throw new SigiValidationError(`El campo "${column.label}" de ${indicator.code} debe ser menor o igual a ${validation.max}.`);
      }

      if (validation.integer && !Number.isInteger(numericValue)) {
        throw new SigiValidationError(`El campo "${column.label}" de ${indicator.code} debe ser un número entero.`);
      }
    }
  }
}

function numericValidationForColumn(column: Pick<TemplateColumn, "key" | "label" | "type" | "validation">) {
  const normalized = normalizeCalculationReference(`${column.label} ${column.key}`);
  const isPercentageLike =
    normalized.includes("porcentaje") ||
    normalized.includes("tasa") ||
    normalized.includes("cumplimiento") ||
    normalized.includes("titulacion") ||
    column.label.includes("%");

  return {
    min: finiteNumber(column.validation?.min) ?? 0,
    max: finiteNumber(column.validation?.max) ?? (isPercentageLike ? 100 : MAX_REASONABLE_NUMERIC_VALUE),
    integer: typeof column.validation?.integer === "boolean"
      ? column.validation.integer
      : column.type === "number" && !isPercentageLike
  };
}

function isCatalogTextColumn(column: Pick<TemplateColumn, "key" | "label">) {
  return /programa|plantel|delegacion|responsable|actividad|nombre/i.test(normalizeCalculationReference(`${column.label} ${column.key}`));
}

function isNumericOnlyText(value: string) {
  return /^[-+]?\d+(?:[.,]\d+)?$/.test(value.trim());
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function validateCalculatedColumns(
  indicator: SigiIndicator,
  template: IndicatorTemplate,
  payload: CapturePayload
) {
  for (const row of payload.rows) {
    for (const column of template.columns) {
      if (column.type !== "calculated" || !column.calculation) {
        continue;
      }

      const actual = numberValue(row[column.key]);

      if (actual === undefined) {
        continue;
      }

      const expected = calculatedValueForRow(row, column, template.columns);

      if (expected === undefined) {
        continue;
      }

      if (Math.abs(actual - expected) > 0.01) {
        throw new SigiValidationError(
          `El campo "${column.label}" de ${indicator.code} se calcula automáticamente. Recarga el indicador y vuelve a guardar.`
        );
      }
    }
  }
}

function calculatedValueForRow(row: Record<string, unknown>, column: TemplateColumn, columns: TemplateColumn[]) {
  if (!column.calculation) {
    return undefined;
  }

  if (column.calculation.type === "sum") {
    return column.calculation.sourceKeys.reduce(
      (total, key) => total + (numberValue(valueForCalculationKey(row, key, columns)) ?? 0),
      0
    );
  }

  if (column.calculation.type === "percentage") {
    const numerator = numberValue(valueForCalculationKey(row, column.calculation.numeratorKey, columns)) ?? 0;
    const denominator = numberValue(valueForCalculationKey(row, column.calculation.denominatorKey, columns)) ?? 0;

    if (denominator === 0) {
      return 0;
    }

    const decimals = column.calculation.decimals ?? 2;
    const factor = 10 ** decimals;
    return Math.round((numerator / denominator) * 100 * factor) / factor;
  }

  if (column.calculation.type === "formula") {
    const value = evaluateConfiguredFormula(column.calculation.expression, row, columns);

    if (value === undefined) {
      return undefined;
    }

    const decimals = column.calculation.decimals ?? 2;
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  return undefined;
}

function evaluateConfiguredFormula(
  expression: string,
  row: Record<string, unknown>,
  columns: TemplateColumn[]
) {
  let normalizedExpression = expression.trim().replace(/^=/, "");

  if (!normalizedExpression) {
    return 0;
  }

  const functionPattern = /\b(SUM|SUMA)\(([^()]*)\)/gi;
  let safetyCounter = 0;

  while (functionPattern.test(normalizedExpression) && safetyCounter < 20) {
    normalizedExpression = normalizedExpression.replace(
      functionPattern,
      (_match, _functionName: string, args: string) => {
        const total = args
          .split(/[;,]/)
          .map((argument) => argument.trim())
          .filter(Boolean)
          .reduce(
            (sum, argument) => sum + (evaluateConfiguredFormula(argument, row, columns) ?? 0),
            0
          );

        return String(total);
      }
    );
    functionPattern.lastIndex = 0;
    safetyCounter += 1;
  }

  normalizedExpression = normalizedExpression.replace(
    /\[([^\]]+)\]/g,
    (_match, reference: string) => String(numberValue(valueForCalculationKey(row, reference, columns)) ?? 0)
  );

  const references = columns
    .flatMap((candidate) => [
      { key: candidate.key, name: candidate.key },
      { key: candidate.key, name: candidate.label }
    ])
    .sort((left, right) => right.name.length - left.name.length);

  for (const reference of references) {
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}_])${escapeFormulaReference(reference.name)}(?![\\p{L}\\p{N}_])`,
      "giu"
    );
    const value = numberValue(valueForCalculationKey(row, reference.key, columns)) ?? 0;
    normalizedExpression = normalizedExpression.replace(pattern, String(value));
  }

  if (!/^[0-9+\-*/().\s]+$/.test(normalizedExpression)) {
    return undefined;
  }

  return evaluateArithmeticExpression(normalizedExpression);
}

function evaluateArithmeticExpression(expression: string) {
  let index = 0;

  const skipWhitespace = () => {
    while (/\s/.test(expression[index] ?? "")) {
      index += 1;
    }
  };

  const parseNumber = (): number | undefined => {
    skipWhitespace();
    const match = expression.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);

    if (!match) {
      return undefined;
    }

    index += match[0].length;
    const value = Number(match[0]);
    return Number.isFinite(value) ? value : undefined;
  };

  const parseFactor = (): number | undefined => {
    skipWhitespace();
    const operator = expression[index];

    if (operator === "+" || operator === "-") {
      index += 1;
      const value = parseFactor();
      return value === undefined ? undefined : operator === "-" ? -value : value;
    }

    if (operator === "(") {
      index += 1;
      const value = parseExpression();
      skipWhitespace();

      if (expression[index] !== ")") {
        return undefined;
      }

      index += 1;
      return value;
    }

    return parseNumber();
  };

  const parseTerm = (): number | undefined => {
    let value = parseFactor();

    if (value === undefined) {
      return undefined;
    }

    while (true) {
      skipWhitespace();
      const operator = expression[index];

      if (operator !== "*" && operator !== "/") {
        return value;
      }

      index += 1;
      const right = parseFactor();

      if (right === undefined || (operator === "/" && right === 0)) {
        return undefined;
      }

      value = operator === "*" ? value * right : value / right;
    }
  };

  const parseExpression = (): number | undefined => {
    let value = parseTerm();

    if (value === undefined) {
      return undefined;
    }

    while (true) {
      skipWhitespace();
      const operator = expression[index];

      if (operator !== "+" && operator !== "-") {
        return value;
      }

      index += 1;
      const right = parseTerm();

      if (right === undefined) {
        return undefined;
      }

      value = operator === "+" ? value + right : value - right;
    }
  };

  const result = parseExpression();
  skipWhitespace();

  return result !== undefined && index === expression.length && Number.isFinite(result)
    ? result
    : undefined;
}

function escapeFormulaReference(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function valueForCalculationKey(row: Record<string, unknown>, key: string, columns: TemplateColumn[]) {
  if (Object.prototype.hasOwnProperty.call(row, key)) {
    return row[key];
  }

  const normalizedKey = normalizeCalculationReference(key);
  const matchingColumns = columns.filter(
    (column) =>
      normalizeCalculationReference(column.key) === normalizedKey ||
      normalizeCalculationReference(column.label) === normalizedKey
  );

  return matchingColumns.length === 1 ? row[matchingColumns[0].key] : undefined;
}

function normalizeCalculationReference(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_]+/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function validateDomainConsistency(indicator: SigiIndicator, payload: CapturePayload) {
  if (indicator.code !== "1.0.0.0.2") {
    return;
  }

  for (const row of payload.rows) {
    const egresadasMujeres = firstNumericValue(row, [
      "egresados_mujeres",
      "egresados_titulados_en_el_ano_2025_mujeres"
    ]);
    const egresadosHombres = firstNumericValue(row, [
      "egresados_hombres",
      "egresados_titulados_en_el_ano_2025_hombres"
    ]);
    const matriculaMujeres = firstNumericValue(row, [
      "matricula_mujeres",
      "matricula_de_primer_ingreso_de_la_misma_cohorte_"
    ]);
    const matriculaHombres = firstNumericValue(row, [
      "matricula_hombres",
      "matricula_de_primer_ingreso_de_la_misma_cohorte_2",
      "matricula_de_primer_ingreso_de_la_misma_cohorte__2"
    ]);
    const egresados = firstNumericValue(row, [
      "egresados_total",
      "egresados_titulados_en_el_ano_2025_total"
    ]) ?? sumNumericValues(row, [
      "egresados_mujeres",
      "egresados_hombres",
      "egresados_titulados_en_el_ano_2025_mujeres",
      "egresados_titulados_en_el_ano_2025_hombres"
    ]);
    const matricula = firstNumericValue(row, [
      "matricula_total",
      "matricula_de_primer_ingreso_de_la_misma_cohorte_3",
      "matricula_de_primer_ingreso_de_la_misma_cohorte__3"
    ]) ?? sumNumericValues(row, [
      "matricula_mujeres",
      "matricula_hombres",
      "matricula_de_primer_ingreso_de_la_misma_cohorte_",
      "matricula_de_primer_ingreso_de_la_misma_cohorte_2",
      "matricula_de_primer_ingreso_de_la_misma_cohorte__2"
    ]);

    if (matricula > 0 && egresados > matricula) {
      throw new SigiValidationError("Los egresados titulados no pueden ser mayores que la matrícula de la cohorte.");
    }

    if (
      egresadasMujeres !== undefined &&
      matriculaMujeres !== undefined &&
      egresadasMujeres > matriculaMujeres
    ) {
      throw new SigiValidationError(
        "Las mujeres egresadas tituladas no pueden ser mayores que la matrícula de mujeres de la cohorte."
      );
    }

    if (
      egresadosHombres !== undefined &&
      matriculaHombres !== undefined &&
      egresadosHombres > matriculaHombres
    ) {
      throw new SigiValidationError(
        "Los hombres egresados titulados no pueden ser mayores que la matrícula de hombres de la cohorte."
      );
    }
  }
}

function firstNumericValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = numberValue(row[key]);

    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function sumNumericValues(row: Record<string, unknown>, keys: string[]) {
  return keys.reduce((total, key) => total + (numberValue(row[key]) ?? 0), 0);
}

export function officialSourcesPayload(session: SigiSession): OfficialSourcesPayload {
  requireDirector(session);

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
  filters: { plantelId?: string; plantel?: string; periodo?: string; cicloEscolar?: string; estado?: string; tipo?: string; now?: Date } = {}
): SigiReportPayload {
  const reportPeriod = resolveReportPeriod(filters.periodo, filters.cicloEscolar);
  const { cicloEscolar, periodo, periodoId: requestedPeriodoId } = reportPeriod;
  const reportNow = filters.now ?? new Date();
  const reportView = normalizeReportView(filters.tipo, session.role);
  const includeBaseRows = reportView === "avance" && session.role !== "responsable" && requestedPeriodoId === currentReportPeriodId();
  const normalizedStatusFilter = normalizeReportStatusFilter(filters.estado);
  const hasPlantelFilter = Boolean(filters.plantelId || filters.plantel);

  if (session.role === "responsable" && hasPlantelFilter) {
    throw new SigiForbiddenError("El responsable consulta reportes por indicadores asignados, no por plantel.");
  }

  const plantelId = session.role === "plantel"
    ? session.plantelId
    : resolvePlantelId(filters.plantelId ?? filters.plantel);

  if (hasPlantelFilter && !plantelId) {
    throw new SigiValidationError("El plantel solicitado no existe.");
  }

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
          cicloEscolar,
          now: reportNow
        });

        if (capturedRows.length > 0) {
          return filterReportRowsByStatus(capturedRows, normalizedStatusFilter);
        }

        if (!includeBaseRows) {
          return [];
        }

        return filterReportRowsByStatus([{
          registro_id: `${indicator.code}-${plantel.id}-${activityIndex + 1}`,
          actividad: activity || "Actividad general",
          responsable: responsibleReportLabel(indicator),
          estado: "Borrador" as const,
          avance: "0%",
          plantel: plantel.name,
          plantelId: String(plantel.id),
          periodo,
          ciclo: cicloEscolar,
          meta: 100,
          evidencias: 0,
          vencimiento: "en_tiempo" as const,
          exportable: false,
          blockingIssues: ["No hay registros capturados para este indicador."]
        }], normalizedStatusFilter);
      })
    );

    return {
      id: indicator.code,
      nombre: indicator.name,
      descripcion: indicator.description,
      datos: rows
    };
  }).filter((indicator) => indicator.datos.length > 0);
  const identityPlantel = plantelId ? planteles.find((plantel) => plantel.id === plantelId) : undefined;
  const responsibleUser = session.role === "responsable"
    ? users.get(`responsable-${session.responsableId}`)
    : undefined;
  const allRows = grouped.flatMap((indicator) => indicator.datos);

  return {
    tipoReporte: identityPlantel ? "plantel" : session.role === "responsable" ? "responsable" : "institucional",
    vistaReporte: reportView,
    periodo,
    cicloEscolar,
    fechaGeneracion: reportNow.toISOString().slice(0, 10),
    identidadReporte: {
      tipo: identityPlantel ? "Plantel" : session.role === "responsable" ? "Responsable" : "Institucional",
      nombre: identityPlantel?.name ?? responsibleUser?.name ?? "DGEMS"
    },
    scopeSummary: reportScopeSummary({
      session,
      identityPlantel,
      responsibleUser,
      rows: allRows,
      reportView,
      hasPlantelFilter
    }),
    estadoConteos: reportStateCounts(allRows),
    indicadores: grouped
  };
}

function reportStateCounts(rows: SigiReportPayload["indicadores"][number]["datos"]) {
  return rows.reduce(
    (counts, row) => {
      counts.total += 1;

      if (row.estado === "Aprobado") {
        counts.aprobados += 1;
      } else if (row.estado === "En revisión") {
        counts.enRevision += 1;
      } else if (row.estado === "Observado") {
        counts.observados += 1;
      } else {
        counts.pendientes += 1;
      }

      return counts;
    },
    { total: 0, pendientes: 0, enRevision: 0, observados: 0, aprobados: 0 }
  );
}

function reportScopeSummary({
  session,
  identityPlantel,
  responsibleUser,
  rows,
  reportView,
  hasPlantelFilter
}: {
  session: SigiSession;
  identityPlantel?: Plantel;
  responsibleUser?: SigiUser;
  rows: SigiReportPayload["indicadores"][number]["datos"];
  reportView: "detalle" | "avance";
  hasPlantelFilter: boolean;
}) {
  if (identityPlantel) {
    return `Plantel único: ${identityPlantel.name}`;
  }

  if (session.role === "responsable") {
    return `Responsable: ${responsibleUser?.name ?? `Responsable ${session.responsableId}`}`;
  }

  const rowPlanteles = uniqueStrings(rows.map((row) => row.plantel).filter(Boolean));

  if (rowPlanteles.length === 1) {
    return `Plantel único: ${rowPlanteles[0]}`;
  }

  if (rowPlanteles.length > 1) {
    return `Institucional multi-plantel: ${rowPlanteles.length} planteles`;
  }

  if (hasPlantelFilter) {
    return "Plantel sin registros capturados";
  }

  return reportView === "detalle"
    ? "Detalle institucional sin registros capturados"
    : "Institucional multi-plantel";
}

function plantelesForReport(indicator: SigiIndicator, scopedPlanteles: Plantel[], hasPlantelFilter: boolean) {
  const effectivePlantelIds = effectivePlantelIdsForIndicator(indicator);

  if (effectivePlantelIds.length === 0) {
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
  cicloEscolar,
  now
}: {
  captureDrafts: CaptureDraft[];
  indicator: SigiIndicator;
  plantel: (typeof planteles)[number];
  activity: string;
  activityIndex: number;
  periodoId?: number;
  periodo: string;
  cicloEscolar: string;
  now: Date;
}): SigiReportPayload["indicadores"][number]["datos"] {
  return captureDrafts
    .filter((draft) =>
      draft.indicadorId === indicator.id &&
      (plantel.id === unassignedPlantel.id || draft.plantelId === plantel.id) &&
      draft.actividadId === activityIndex + 1 &&
      draft.periodoId === periodoId
    )
    .flatMap((draft) => {
      const reportPayload: CapturePayload = {
        ...draft.payload,
        rows: draft.payload.rows.map((row) => ({ ...row }))
      };
      enrichReportPayloadWithCalculatedValues(indicator, reportPayload);
      const rows = reportPayload.rows.length > 0 ? reportPayload.rows : [{}];

      return rows.map((row, rowIndex) => {
        const blockingIssues = blockingIssuesFromCapturedRow(row, indicator, draft, reportPayload.justificacion);
        const qualityWarnings = qualityWarningsFromCapturedRow(row, indicator);

        return {
          registro_id: `captura-${draft.id}-${rowIndex + 1}`,
          captureId: draft.id,
          actividadId: draft.actividadId,
          actividad: reportActivityLabel(readableValue(row.actividad), activity),
          responsable: responsibleReportLabel(indicator),
          estado: reportStatusForCapture(draft.estado),
          avance: progressForCapturedRow(row, indicator),
          plantel: readableValue(row.plantel) || (plantel.id === unassignedPlantel.id ? "Responsable" : plantel.name),
          plantelId: String(plantel.id),
          periodo,
          periodoId: draft.periodoId,
          ciclo: cicloEscolar,
          meta: numberValue(row.meta) ?? 100,
          evidencias: reportPayload.evidencia ? 1 : 0,
          justificacion: cleanReportText(reportPayload.justificacion ?? ""),
          evidenciaNombre: cleanReportText(reportPayload.evidencia?.nombre ?? ""),
          vencimiento: reportDeadlineForCapturedRow(row, now),
          exportable: blockingIssues.length === 0,
          blockingIssues,
          detalle: reportDetailsFromCapturedRow(row, indicator),
          qualityWarnings,
          capturadoEn: draft.creadoEn,
          actualizadoEn: draft.actualizadoEn,
          enviadoPor: userDisplayName(draft.submittedByUserId)
        };
      });
    });
}

function enrichReportPayloadWithCalculatedValues(indicator: SigiIndicator, payload: CapturePayload) {
  if (!Array.isArray(payload.rows)) {
    return;
  }

  const templateColumns = templateForIndicator(indicator).columns;
  const calculatedColumns = templateColumns.filter((column) => column.type === "calculated" && column.calculation);

  if (calculatedColumns.length === 0) {
    return;
  }

  payload.rows = payload.rows.map((row) => {
    const enrichedRow: Record<string, unknown> = { ...row };

    for (let pass = 0; pass < Math.max(1, calculatedColumns.length); pass += 1) {
      let changed = false;

      for (const column of calculatedColumns) {
        const nextValue = calculatedValueForRow(enrichedRow, column, templateColumns) ?? 0;
        const previousValue = numberValue(enrichedRow[column.key]) ?? 0;
        enrichedRow[column.key] = nextValue;

        if (Math.abs(previousValue - nextValue) > 0.0001) {
          changed = true;
        }
      }

      if (!changed) {
        break;
      }
    }

    return enrichedRow;
  });
}

function reportActivityLabel(capturedActivity: string, officialActivity: string) {
  const captured = cleanReportText(capturedActivity);

  if (captured && !isWorkbookFileReference(captured)) {
    return captured;
  }

  const official = cleanReportText(officialActivity);
  return official && !isWorkbookFileReference(official) ? official : "Actividad general";
}

function isWorkbookFileReference(value: string) {
  return /\.(xlsx|xlsm|xls|csv)\b/i.test(value) ||
    /(?:^|[\\/])formatos?(?:[\\/]|$)/i.test(value) ||
    /opci[oó]n de llenado/i.test(value);
}

function responsibleReportLabel(indicator: SigiIndicator) {
  const reviewerIds = uniqueNumbers([
    indicator.primaryResponsibleId,
    ...indicator.responsibleIds
  ]).sort((left, right) => {
    if (left === indicator.primaryResponsibleId) return -1;
    if (right === indicator.primaryResponsibleId) return 1;
    return left - right;
  });
  const reviewerNames = namesForResponsibleIds(reviewerIds);
  const reviewerIdSet = new Set(reviewerIds);
  const contributorNames = namesForResponsibleIds(
    (indicator.contributorResponsibleIds ?? []).filter((id) => !reviewerIdSet.has(id))
  );

  if (reviewerNames.length <= 1 && contributorNames.length === 0) {
    return reviewerNames[0] ?? "Responsable asignado";
  }

  const parts = [
    reviewerNames[0] ? `Principal: ${reviewerNames[0]}` : "",
    reviewerNames.length > 1 ? `Revisores: ${reviewerNames.slice(1).join(", ")}` : "",
    contributorNames.length > 0 ? `Responsables específicos: ${contributorNames.join(", ")}` : ""
  ].filter(Boolean);

  return parts.join("; ");
}

function userDisplayName(userId?: string | null) {
  if (!userId) {
    return "";
  }

  return users.get(userId)?.name ?? userId;
}

function blockingIssuesFromCapturedRow(
  row: Record<string, unknown>,
  indicator: SigiIndicator,
  draft: CaptureDraft,
  justificacion?: string
) {
  const issues: string[] = [];
  const templateColumns = templateForIndicator(indicator).columns;

  if (draft.estado === "borrador") {
    issues.push("El registro es un borrador y no puede exportarse como reporte oficial.");
  }

  if (!draft.payload.evidencia?.nombre) {
    issues.push("El registro no tiene evidencia PDF asociada.");
  }

  if (!isMeaningfulJustification(justificacion ?? "")) {
    issues.push("Justificación: debe explicar el avance, la fuente de datos o la evidencia.");
  }

  for (const column of templateColumns) {
    const value = row[column.key];
    const hasValue = value !== "" && value !== undefined && value !== null;

    if (column.required && !hasValue) {
      issues.push(`${column.label}: campo obligatorio sin captura`);
      continue;
    }

    if (column.type === "number" || column.type === "calculated") {
      if (!hasValue) {
        continue;
      }

      const numericValue = numberValue(value);

      if (numericValue === undefined || Number.isNaN(numericValue)) {
        issues.push(`${column.label}: debe ser numérico`);
        continue;
      }

      const validation = numericValidationForColumn(column);

      if (validation.min !== undefined && numericValue < validation.min) {
        issues.push(`${column.label}: valor menor al mínimo permitido`);
      }

      if (validation.max !== undefined && numericValue > validation.max) {
        issues.push(`${column.label}: valor mayor al máximo permitido`);
      }

      if (validation.integer && !Number.isInteger(numericValue)) {
        issues.push(`${column.label}: debe ser número entero`);
      }

      if (column.type === "calculated" && column.calculation) {
        const expected = calculatedValueForRow(row, column, templateColumns);

        if (expected !== undefined && Math.abs(numericValue - expected) > 0.01) {
          issues.push(`${column.label}: debe recalcularse con la fórmula oficial`);
        }
      }
    }

    if (column.type === "text" && typeof value === "string" && isCatalogTextColumn(column) && isNumericOnlyText(value)) {
      issues.push(`${column.label}: debe contener texto válido, no solo números`);
    }
  }

  const domainIssue = domainConsistencyIssue(indicator, row);
  if (domainIssue) {
    issues.push(domainIssue);
  }

  return uniqueStrings(issues);
}

function domainConsistencyIssue(indicator: SigiIndicator, row: Record<string, unknown>) {
  if (indicator.code !== "1.0.0.0.2") {
    return "";
  }

  const egresados = firstNumericValue(row, [
    "egresados_total",
    "egresados_titulados_en_el_ano_2025_total"
  ]) ?? sumNumericValues(row, [
    "egresados_mujeres",
    "egresados_hombres",
    "egresados_titulados_en_el_ano_2025_mujeres",
    "egresados_titulados_en_el_ano_2025_hombres"
  ]);
  const matricula = firstNumericValue(row, [
    "matricula_total",
    "matricula_de_primer_ingreso_de_la_misma_cohorte_3",
    "matricula_de_primer_ingreso_de_la_misma_cohorte__3"
  ]) ?? sumNumericValues(row, [
    "matricula_mujeres",
    "matricula_hombres",
    "matricula_de_primer_ingreso_de_la_misma_cohorte_",
    "matricula_de_primer_ingreso_de_la_misma_cohorte_2",
    "matricula_de_primer_ingreso_de_la_misma_cohorte__2"
  ]);

  if (matricula > 0 && egresados > matricula) {
    return "Los egresados titulados no pueden ser mayores que la matrícula de la cohorte.";
  }

  return "";
}

function reportStatusForCapture(status: CaptureDraft["estado"]): SigiReportPayload["indicadores"][number]["datos"][number]["estado"] {
  if (status === "aprobado" || status === "cerrado") {
    return "Aprobado";
  }

  if (status === "correccion_solicitada") {
    return "Observado";
  }

  if (status === "en_revision") {
    return "En revisión";
  }

  return "Borrador";
}

function progressForCapturedRow(row: Record<string, unknown>, indicator: SigiIndicator) {
  const templateColumns = templateForIndicator(indicator).columns;
  const calculatedPercentageColumns = templateColumns.filter((column) =>
    column.type === "calculated" && column.calculation?.type === "percentage"
  );
  const directPercentageColumns = templateColumns.filter((column) => {
    const normalized = normalizeKey(`${column.key} ${column.label}`);
    return normalized.includes("porcentaje") ||
      normalized.includes("cumplimiento") ||
      normalized.includes("tasa") ||
      column.label.includes("%");
  });
  const candidates = calculatedPercentageColumns.length > 0
    ? calculatedPercentageColumns
    : directPercentageColumns.length === 1 ? directPercentageColumns : [];

  for (const column of candidates) {
    const value = numberValue(row[column.key]);
    if (value !== undefined) {
      return `${Object.is(value, -0) ? 0 : value}%`;
    }
  }

  return "";
}

function reportDeadlineForCapturedRow(row: Record<string, unknown>, now: Date): "en_tiempo" | "atrasado" {
  const deadlineEntry = Object.entries(row).find(([key, value]) => {
    if (value === undefined || value === null || String(value).trim() === "") {
      return false;
    }

    const normalizedKey = normalizeKey(key);
    return normalizedKey.includes("fecha limite") ||
      normalizedKey.includes("fecha de limite") ||
      normalizedKey.includes("fecha vencimiento") ||
      normalizedKey.includes("fecha de vencimiento") ||
      normalizedKey.includes("fecha entrega") ||
      normalizedKey.includes("fecha de entrega") ||
      normalizedKey === "deadline" ||
      normalizedKey === "due date";
  });

  if (!deadlineEntry) {
    return "en_tiempo";
  }

  return isPastReportDeadline(deadlineEntry[1], now) ? "atrasado" : "en_tiempo";
}

function isPastReportDeadline(value: unknown, now: Date) {
  const text = String(value).trim();
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);

  if (isoDate) {
    return text < now.toISOString().slice(0, 10);
  }

  const localDate = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (localDate) {
    const normalizedDate = `${localDate[3]}-${localDate[2]}-${localDate[1]}`;
    return normalizedDate < now.toISOString().slice(0, 10);
  }

  const deadline = Date.parse(text);
  return Number.isFinite(deadline) && deadline < now.getTime();
}

function readableValue(value: unknown) {
  return typeof value === "string" ? cleanReportText(value.trim()) : "";
}

function cleanReportText(value: string) {
  return normalizeUserFacingText(value)
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
    const normalizedValue = value.replace("%", "").trim();

    if (!normalizedValue) {
      return undefined;
    }

    const numeric = Number(normalizedValue);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  return undefined;
}

function reportDetailsFromCapturedRow(row: Record<string, unknown>, indicator: SigiIndicator) {
  const details: Array<{ campo: string; valor: string }> = [];
  const templateColumns = templateForIndicator(indicator).columns;
  const labelsByKey = new Map(templateColumns.map((column) => [column.key, column.label]));
  const orderedKeys = Array.from(new Set([
    ...templateColumns.map((column) => column.key),
    ...Object.keys(row)
  ]));
  const labelCounts = orderedKeys.reduce((counts, key) => {
    const label = (labelsByKey.get(key) ?? readableReportDetailLabel(key)).trim().toLowerCase();
    if (label) {
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return counts;
  }, new Map<string, number>());
  const seenLabels = new Set<string>();

  for (const key of orderedKeys) {
    if (isReservedReportDetailKey(key)) {
      continue;
    }

    let value = reportDetailValue(row[key]);

    if (!value) {
      continue;
    }

    const column = templateColumns.find((item) => item.key === key);
    if (column?.type === "calculated" && column.calculation) {
      const formula = calculationDescription(column, templateColumns);
      if (formula) {
        value = `${value} (${formula})`;
      }
    }

    const baseLabel = (labelsByKey.get(key) ?? readableReportDetailLabel(key)).trim();
    if (!baseLabel) {
      continue;
    }

    const readableKey = readableReportDetailLabel(key);
    let normalizedLabel = (labelCounts.get(baseLabel.toLowerCase()) ?? 0) > 1
      ? `${baseLabel} (${readableKey})`
      : baseLabel;
    let dedupeKey = normalizedLabel.toLowerCase();

    if (seenLabels.has(dedupeKey)) {
      normalizedLabel = `${baseLabel} (${key})`;
      dedupeKey = normalizedLabel.toLowerCase();
    }

    seenLabels.add(dedupeKey);
    details.push({ campo: normalizedLabel, valor: value });
  }

  return details;
}

function calculationDescription(column: TemplateColumn, columns: TemplateColumn[]) {
  if (!column.calculation) {
    return "";
  }

  if (column.calculation.type === "sum") {
    return column.calculation.sourceKeys
      .map((key) => reportCalculationLabel(key, columns))
      .filter(Boolean)
      .join(" + ");
  }

  if (column.calculation.type === "percentage") {
    const numerator = reportCalculationLabel(column.calculation.numeratorKey, columns);
    const denominator = reportCalculationLabel(column.calculation.denominatorKey, columns);
    return numerator && denominator ? `${numerator} / ${denominator} * 100` : "";
  }

  return column.calculation.expression.replace(/^=/, "").trim();
}

function reportCalculationLabel(key: string, columns: TemplateColumn[]) {
  const normalizedKey = normalizeCalculationReference(key);
  const column = columns.find((item) =>
    normalizeCalculationReference(item.key) === normalizedKey ||
    normalizeCalculationReference(item.label) === normalizedKey
  );

  return column?.label ?? readableReportDetailLabel(key);
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

function buildIndicators() {
  const byCode = new Map<string, SigiIndicator>();

  for (const row of operationalCatalogRows) {
    const responsibleId = resolveOfficialResponsibleId(row.responsible);
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
      responsibleNames: namesForResponsibleIds([responsibleId]),
      contributorResponsibleIds: [],
      contributorNames: contributors,
      activities: [row.activity || "Actividad general"],
      plantelIds: [...officialSourcePlantelIds],
      plantelScopeSource: "official-import",
      operationalScope: officialIndicatorPlantelScopes[row.code]?.length
        ? "specific_planteles"
        : "none",
      updatedAt: officialCatalogImportedAt,
      updatedBy: "Sistema",
      lastChange: "importado"
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
    passwordHash: defaultPasswordHashForRole("director"),
    passwordChangeRequired: true,
    credentialVersion: 1
  };
  const responsibleUsers = officialResponsibleAccounts.map((account) => {
    const { responsableId, username, name } = account;
    return {
      id: `responsable-${responsableId}`,
      username,
      name,
      role: "responsable" as const,
      responsableId,
      indicatorCodes: initialIndicators
        .filter((indicator) => indicator.responsibleIds.includes(responsableId))
        .map((indicator) => indicator.code),
      active: true,
      passwordHash: defaultPasswordHashForRole("responsable"),
      passwordChangeRequired: true,
      credentialVersion: 1
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
    passwordHash: defaultPasswordHashForRole("plantel"),
    passwordChangeRequired: true,
    credentialVersion: 1
  }));

  return [director, ...responsibleUsers, ...plantelUsers];
}

function publicUser(user: SigiUser): PublicSigiUser {
  const { passwordHash: _passwordHash, credentialVersion: _credentialVersion, ...publicFields } = user;
  const reviewerIndicatorCodes = user.role === "responsable" && user.responsableId
    ? Array.from(indicators.values())
        .filter((indicator) => indicator.active && indicator.responsibleIds.includes(user.responsableId!))
        .map((indicator) => indicator.code)
        .sort((a, b) => a.localeCompare(b, "es", { numeric: true }))
    : [];
  const contributorIndicatorCodes = user.role === "responsable" && user.responsableId
    ? Array.from(indicators.values())
        .filter((indicator) => indicator.active && (indicator.contributorResponsibleIds ?? []).includes(user.responsableId!))
        .map((indicator) => indicator.code)
        .sort((a, b) => a.localeCompare(b, "es", { numeric: true }))
    : [];

  return { ...publicFields, reviewerIndicatorCodes, contributorIndicatorCodes };
}

function authenticatedUser(user: SigiUser): AuthenticatedSigiUser {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role === "director" ? "admin" : user.role,
    description: roleDescription(user.role),
    plantelId: user.plantelId,
    responsableId: user.responsableId,
    passwordChangeRequired: user.passwordChangeRequired ?? false
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
    passwordChangeRequired: user.passwordChangeRequired ?? false,
    credentialVersion: credentialVersionFor(user),
    indicatorCodes: sanitizeUserIndicatorCodes(role, user.indicatorCodes ?? []),
    active: user.active ?? true
  };
}

function credentialVersionFor(user: Pick<SigiUser, "credentialVersion">) {
  return Number.isInteger(user.credentialVersion) && (user.credentialVersion ?? 0) > 0
    ? user.credentialVersion!
    : 1;
}

function sanitizeUserIndicatorCodes(role: SystemRole, indicatorCodes: string[]) {
  if (role !== "responsable") {
    return [];
  }

  const assignableCodes = new Set(
    Array.from(indicators.values())
      .filter((indicator) => isVisibleOperationalIndicatorCode(indicator.code))
      .map((indicator) => indicator.code)
  );

  return uniqueStrings(indicatorCodes.filter((code) => assignableCodes.has(code)));
}

function normalizePersistedIndicator(indicator: SigiIndicator): SigiIndicator {
  const seededIndicator = initialIndicators.find((item) => item.code === indicator.code);
  const contributorResponsibleIds = normalizePersistedContributorResponsibleIds(indicator, seededIndicator);
  const persistedTemplateStructure = normalizePersistedTemplateStructure(indicator, seededIndicator);
  const plantelIds = normalizePlantelScope(indicator.plantelIds ?? []);
  const shouldResetLegacyOfficialScope =
    seededIndicator?.plantelScopeSource === "official-import" &&
    indicator.plantelScopeSource !== "manual" &&
    isLegacyImportedPlantelScope(plantelIds);
  const shouldUseSeededPlantelScope =
    Boolean(seededIndicator) &&
    ((plantelIds.length === 0 && indicator.plantelScopeSource !== "manual") || shouldResetLegacyOfficialScope);
  const shouldUseSeededOfficialMetadata =
    seededIndicator?.plantelScopeSource === "official-import" &&
    indicator.plantelScopeSource !== "manual";

  return {
    ...indicator,
    name: shouldUseSeededOfficialMetadata ? seededIndicator.name : indicator.name,
    description: shouldUseSeededOfficialMetadata ? seededIndicator.description : indicator.description,
    dataType: shouldUseSeededOfficialMetadata ? seededIndicator.dataType : indicator.dataType,
    period: shouldUseSeededOfficialMetadata ? seededIndicator.period : indicator.period,
    plantelIds: shouldUseSeededPlantelScope ? seededIndicator!.plantelIds : plantelIds,
    plantelScopeSource: indicator.plantelScopeSource ?? seededIndicator?.plantelScopeSource ?? "manual",
    operationalScope: contributorResponsibleIds.length > 0 && indicator.operationalScope === "none"
      ? "specific_responsables"
      : indicator.operationalScope ?? (
      seededIndicator?.operationalScope ?? operationalScopeForIndicator({
        ...indicator,
        plantelIds: shouldUseSeededPlantelScope ? seededIndicator!.plantelIds : plantelIds
      })
    ),
    responsibleIds: indicator.responsibleIds?.length ? indicator.responsibleIds : seededIndicator?.responsibleIds ?? [1],
    responsibleNames: indicator.responsibleNames?.length ? indicator.responsibleNames : seededIndicator?.responsibleNames ?? namesForResponsibleIds([1]),
    contributorResponsibleIds,
    contributorNames: indicator.contributorNames ?? seededIndicator?.contributorNames ?? [],
    activities: indicator.activities?.length ? indicator.activities : seededIndicator?.activities ?? ["Actividad general"],
    templateColumns: persistedTemplateStructure.columns,
    templateStructureCustomized: persistedTemplateStructure.customized,
    evidenceRules: sanitizeEvidenceRules(indicator.evidenceRules ?? seededIndicator?.evidenceRules),
    active: indicator.active ?? true,
    updatedAt: indicator.updatedAt ?? seededIndicator?.updatedAt ?? officialCatalogImportedAt,
    updatedBy: indicator.updatedBy ?? seededIndicator?.updatedBy ?? "Sistema",
    lastChange: indicator.lastChange ?? seededIndicator?.lastChange ?? "importado"
  };
}

function sanitizeEvidenceRules(rules?: Partial<EvidenceRules>): EvidenceRules {
  const allowedTypes = Array.isArray(rules?.allowedTypes)
    ? uniqueStrings(
        rules.allowedTypes
          .map((type) => typeof type === "string" ? type.trim().toLowerCase() : "")
          .filter((type) => type && type.includes("/"))
      )
    : [];
  const maxSizeMb = finiteNumber(rules?.maxSizeMb);

  return {
    required: rules?.required !== false,
    allowedTypes: allowedTypes.length > 0 ? allowedTypes : ["application/pdf"],
    maxSizeMb: maxSizeMb && maxSizeMb > 0 ? Math.min(maxSizeMb, 25) : 5,
    requireOpenBeforeApproval: rules?.required !== false && rules?.requireOpenBeforeApproval !== false
  };
}

function normalizePersistedTemplateStructure(indicator: SigiIndicator, seededIndicator?: SigiIndicator) {
  const persistedColumns = indicator.templateColumns ?? [];

  if (persistedColumns.length === 0) {
    return {
      columns: seededIndicator?.templateColumns,
      customized: seededIndicator?.templateStructureCustomized
    };
  }

  const officialColumns = officialWorkbookTemplates[indicator.code]?.columns ?? [];

  if (officialColumns.length === 0 || indicator.templateStructureCustomized === true) {
    return {
      columns: sanitizeTemplateColumns(persistedColumns),
      customized: true
    };
  }

  const effectiveOfficialColumns = sanitizeTemplateColumns(officialColumns);
  const officialPairs = new Set(
    effectiveOfficialColumns.map((column) =>
      `${normalizeCalculationReference(column.key)}\u0000${normalizeCalculationReference(column.label)}`
    )
  );
  const hasOnlyNamedUniqueColumns = persistedColumns.every((column) =>
    typeof column.key === "string" && Boolean(column.key.trim()) &&
    typeof column.label === "string" && Boolean(column.label.trim())
  ) && new Set(persistedColumns.map((column) => column.key.trim())).size === persistedColumns.length;
  const isOfficialProjection = hasOnlyNamedUniqueColumns && persistedColumns.every((column) =>
    officialPairs.has(
      `${normalizeCalculationReference(column.key)}\u0000${normalizeCalculationReference(column.label)}`
    )
  );

  if (isOfficialProjection || !hasOnlyNamedUniqueColumns) {
    return { columns: undefined, customized: false };
  }

  return {
    columns: sanitizeTemplateColumns(persistedColumns),
    customized: true
  };
}

function sanitizeTemplateColumns(columns?: TemplateColumn[]) {
  const seenKeys = new Set<string>();

  for (const [index, column] of (columns ?? []).entries()) {
    if (typeof column.label !== "string" || !column.label.trim()) {
      throw new SigiValidationError(`El campo ${index + 1} debe tener un nombre.`);
    }
  }

  const sanitizedColumns = (columns ?? [])
    .map((column, index) => {
      const label = typeof column.label === "string" ? column.label.trim() : "";
      const key = uniqueTemplateKey(
        typeof column.key === "string" && column.key.trim()
          ? column.key.trim()
          : label || `campo_${index + 1}`,
        seenKeys
      );
      const rawType = ["readonly", "number", "text", "calculated"].includes(column.type)
        ? column.type
        : "text";
      const type = normalizeTemplateColumnType(rawType, label, key);

      return {
        key,
        label,
        type,
        required: Boolean(column.required),
        validation: sanitizeColumnValidation(column.validation, type, label || column.key),
        calculation: type === "calculated" ? sanitizeCalculation(column.calculation) : undefined
      } satisfies TemplateColumn;
    })
    .filter((column) => column.label.trim());

  const resolvedColumns = resolveTemplateCalculationReferences(sanitizedColumns);
  validateTemplateCalculations(resolvedColumns);
  return resolvedColumns;
}

function qualityWarningsFromCapturedRow(row: Record<string, unknown>, indicator: SigiIndicator) {
  const warnings: string[] = [];
  const templateColumns = templateForIndicator(indicator).columns;

  for (const column of templateColumns) {
    const value = row[column.key];
    const label = column.label;

    if (column.required && (value === "" || value === undefined || value === null)) {
      warnings.push(`${label}: campo obligatorio sin captura`);
      continue;
    }

    if (column.type === "number" || column.type === "calculated") {
      const numericValue = numberValue(value);

      if (numericValue === undefined) {
        continue;
      }

      const validation = numericValidationForColumn(column);
      const warningMax = finiteNumber(column.validation?.qualityWarningMax) ?? DEFAULT_QUALITY_WARNING_MAX;

      if (numericValue < (validation.min ?? 0)) {
        warnings.push(`${label}: valor menor al minimo permitido`);
      } else if (validation.max !== undefined && numericValue > validation.max) {
        warnings.push(`${label}: valor mayor al maximo permitido`);
      } else if (numericValue > warningMax) {
        warnings.push(`${label}: valor inusualmente alto`);
      }

      if (validation.integer && !Number.isInteger(numericValue)) {
        warnings.push(`${label}: se esperaba numero entero`);
      }
    }

    if (column.type === "text" && typeof value === "string" && isCatalogTextColumn(column) && isNumericOnlyText(value)) {
      warnings.push(`${label}: texto sospechoso`);
    }
  }

  return uniqueStrings(warnings);
}

function normalizeTemplateColumnType(type: TemplateColumn["type"], label: string, key: string): TemplateColumn["type"] {
  if (type !== "text") {
    return type;
  }

  const normalized = normalizeCalculationReference(`${label} ${key}`);

  if (/(observacion|descripcion|actividad|programa|plantel|delegacion|responsable|evidencia|nombre)/.test(normalized)) {
    return type;
  }

  if (/(matr|matricula|alumn|mujeres|hombres|egresad|docent|cantidad|numero|num|sesion|accion|total|tasa|porcentaje|avance|meta|ptc)/.test(normalized)) {
    return "number";
  }

  return type;
}

function sanitizeColumnValidation(
  validation: TemplateColumn["validation"],
  type: TemplateColumn["type"],
  label: string
) {
  if (type !== "number" && type !== "calculated") {
    const allowedValues = Array.isArray(validation?.allowedValues)
      ? uniqueStrings(validation.allowedValues.map((value) => String(value).trim()).filter(Boolean))
      : undefined;

    return allowedValues?.length ? { allowedValues } : undefined;
  }

  const inferred = numericValidationForColumn({ key: label, label, type });

  const min = finiteNumber(validation?.min) ?? inferred.min;
  const max = finiteNumber(validation?.max) ?? inferred.max;

  if (min !== undefined && max !== undefined && min > max) {
    throw new SigiValidationError(`El mínimo de "${label}" no puede ser mayor que el máximo.`);
  }

  return {
    min,
    max,
    integer: typeof validation?.integer === "boolean" ? validation?.integer : inferred.integer,
    decimals: Number.isInteger(validation?.decimals) ? validation?.decimals : undefined,
    qualityWarningMax: finiteNumber(validation?.qualityWarningMax)
  };
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

function resolveTemplateCalculationReferences(columns: TemplateColumn[]) {
  return columns.map((column) => {
    if (!column.calculation) {
      return column;
    }

    if (column.calculation.type === "sum") {
      return {
        ...column,
        calculation: {
          ...column.calculation,
          sourceKeys: uniqueStrings(
            column.calculation.sourceKeys
              .map((key) => resolveTemplateColumnKey(key, columns))
              .filter((key): key is string => Boolean(key))
          )
        }
      };
    }

    if (column.calculation.type === "percentage") {
      return {
        ...column,
        calculation: {
          ...column.calculation,
          numeratorKey: resolveTemplateColumnKey(column.calculation.numeratorKey, columns) ?? column.calculation.numeratorKey,
          denominatorKey: resolveTemplateColumnKey(column.calculation.denominatorKey, columns) ?? column.calculation.denominatorKey
        }
      };
    }

    return column;
  });
}

function validateTemplateCalculations(columns: TemplateColumn[]) {
  const columnKeys = new Set(columns.map((column) => column.key));
  const dependencies = new Map<string, string[]>();
  const sampleRow = Object.fromEntries(columns.map((column) => [column.key, 1]));

  for (const column of columns) {
    if (column.type !== "calculated" || !column.calculation) {
      continue;
    }

    let sourceKeys: string[] = [];

    if (column.calculation.type === "sum") {
      sourceKeys = column.calculation.sourceKeys;
    } else if (column.calculation.type === "percentage") {
      sourceKeys = [column.calculation.numeratorKey, column.calculation.denominatorKey];
    } else {
      sourceKeys = formulaReferenceKeys(column.calculation.expression, columns);

      if (evaluateConfiguredFormula(column.calculation.expression, sampleRow, columns) === undefined) {
        throw new SigiValidationError(`La fórmula de "${column.label}" usa campos u operadores no válidos.`);
      }
    }

    if (sourceKeys.length === 0 || sourceKeys.some((key) => !columnKeys.has(key))) {
      throw new SigiValidationError(`La fórmula de "${column.label}" usa campos no configurados.`);
    }

    dependencies.set(column.key, uniqueStrings(sourceKeys));
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (key: string): boolean => {
    if (visiting.has(key)) {
      return true;
    }

    if (visited.has(key)) {
      return false;
    }

    visiting.add(key);
    const hasCycle = (dependencies.get(key) ?? []).some((dependency) =>
      dependencies.has(dependency) && visit(dependency)
    );
    visiting.delete(key);
    visited.add(key);
    return hasCycle;
  };

  if (Array.from(dependencies.keys()).some(visit)) {
    throw new SigiValidationError("Las fórmulas de la plantilla contienen una referencia circular.");
  }
}

function formulaReferenceKeys(expression: string, columns: TemplateColumn[]) {
  const references = new Set<string>();
  const bracketReferences = expression.matchAll(/\[([^\]]+)\]/g);

  for (const match of bracketReferences) {
    const key = resolveTemplateColumnKey(match[1], columns);
    if (key) {
      references.add(key);
    }
  }

  const normalizedExpression = expression.replace(/^=/, "").replace(/\[([^\]]+)\]/g, " ");
  const labelOccurrences = new Map<string, number>();
  for (const column of columns) {
    const normalizedLabel = normalizeCalculationReference(column.label);
    labelOccurrences.set(normalizedLabel, (labelOccurrences.get(normalizedLabel) ?? 0) + 1);
  }
  const candidates = columns
    .flatMap((column) => [
      { key: column.key, name: column.key },
      ...(labelOccurrences.get(normalizeCalculationReference(column.label)) === 1
        ? [{ key: column.key, name: column.label }]
        : [])
    ])
    .sort((left, right) => right.name.length - left.name.length);

  for (const candidate of candidates) {
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}_])${escapeFormulaReference(candidate.name)}(?![\\p{L}\\p{N}_])`,
      "iu"
    );
    if (pattern.test(normalizedExpression)) {
      references.add(candidate.key);
    }
  }

  return Array.from(references);
}

function resolveTemplateColumnKey(key: string | undefined, columns: TemplateColumn[]) {
  if (!key) {
    return undefined;
  }

  const exactColumn = columns.find((column) => column.key === key);

  if (exactColumn) {
    return exactColumn.key;
  }

  const normalizedKey = normalizeCalculationReference(key);
  const matchingColumns = columns.filter(
    (column) =>
      normalizeCalculationReference(column.key) === normalizedKey ||
      normalizeCalculationReference(column.label) === normalizedKey
  );

  return matchingColumns.length === 1 ? matchingColumns[0].key : undefined;
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

    if (applyCatalogMigration && !seededIndicator) {
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

function mergeInitialUsers(persisted?: SigiUser[], resetToInitial = false) {
  const byId = new Map(buildInitialUsers().map((user) => [user.id, user]));

  if (resetToInitial) {
    for (const user of persisted ?? []) {
      const normalizedUser = normalizePersistedUser(user);
      const seededUser = byId.get(normalizedUser.id);

      if (!seededUser || normalizedUser.role !== seededUser.role) {
        continue;
      }

      byId.set(normalizedUser.id, {
        ...seededUser,
        username: normalizedUser.username,
        name: normalizedUser.name,
        active: normalizedUser.active,
        passwordHash: normalizedUser.passwordHash,
        passwordChangeRequired: normalizedUser.passwordChangeRequired,
        credentialVersion: normalizedUser.credentialVersion
      });
    }

    return Array.from(byId.values());
  }

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

export function mergeInitialIndicatorsForTest(persisted: SigiIndicator[], applyCatalogMigration = false) {
  return mergeInitialIndicators(persisted, applyCatalogMigration);
}

export function mergeInitialUsersForTest(persisted: SigiUser[], resetToInitial: boolean) {
  return mergeInitialUsers(persisted, resetToInitial);
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
  const cached = defaultPasswordHashCache.get(role);

  if (cached) {
    return cached;
  }

  const configuredPassword = configuredInitialPasswordForRole(role);

  if (configuredPassword) {
    const hash = hashPassword(configuredPassword);
    defaultPasswordHashCache.set(role, hash);
    return hash;
  }

  if (isProductionRuntime()) {
    const hash = hashPassword(`${sessionSecret()}:${role}:bootstrap-disabled`);
    defaultPasswordHashCache.set(role, hash);
    return hash;
  }

  const testPasswordByRole: Record<SystemRole, string> = {
    director: "TestDirector-Only!",
    responsable: "TestResponsible-Only!",
    plantel: "TestPlantel-Only!"
  };
  const hash = hashPassword(testPasswordByRole[role]);
  defaultPasswordHashCache.set(role, hash);
  return hash;
}

function configuredInitialPasswordForRole(role: SystemRole) {
  const variableByRole: Record<SystemRole, string> = {
    director: "INITIAL_DIRECTOR_PASSWORD",
    responsable: "INITIAL_RESPONSABLE_PASSWORD",
    plantel: "INITIAL_PLANTEL_PASSWORD"
  };
  const configuredPassword = process.env[variableByRole[role]]?.trim();

  if (!configuredPassword || configuredPassword.length < 8) {
    return undefined;
  }

  if (isProductionRuntime() && /change|placeholder|test|demo/i.test(configuredPassword)) {
    return undefined;
  }

  return configuredPassword;
}

function resetOfficialUserCredentials() {
  const initialUsers = buildInitialUsers();
  const officialUserIds = new Set(initialUsers.map((user) => user.id));

  for (const role of ["director", "responsable", "plantel"] as const) {
    if (!configuredInitialPasswordForRole(role)) {
      throw new Error(`No se configuró una contraseña inicial válida para el rol ${role}.`);
    }
  }

  for (const [id, user] of users) {
    if (!officialUserIds.has(id)) {
      continue;
    }

    users.set(id, {
      ...user,
      active: true,
      passwordHash: defaultPasswordHashForRole(user.role),
      passwordChangeRequired: true,
      credentialVersion: credentialVersionFor(user) + 1
    });
  }
}

function replaceWithOfficialFactoryState() {
  assertInitialCredentialsConfigured();

  const credentialVersion = factoryCredentialVersion();
  const factoryIndicators = structuredClone(initialIndicators);
  const factoryUsers = buildInitialUsers().map((user) => ({
    ...user,
    credentialVersion
  }));

  indicators.clear();
  factoryIndicators.forEach((indicator) => indicators.set(indicator.id, indicator));
  users.clear();
  factoryUsers.forEach((user) => users.set(user.id, user));
  notifications.clear();
  auditEvents.clear();
  nextNotificationId = 1;
  nextAuditEventId = 1;
  resetCaptureDraftsToInitialState();

  persistState({
    indicators: factoryIndicators,
    users: factoryUsers,
    notifications: [],
    auditEvents: [],
    nextNotificationId: 1,
    nextAuditEventId: 1,
    captureDrafts: [],
    nextCaptureId: 1,
    loginRateLimits: {},
    catalogImportVersion: officialCatalogImportVersion,
    officialFactoryResetVersion,
    ...(officialCredentialResetVersion
      ? { officialCredentialResetVersion }
      : {})
  });
}

function assertInitialCredentialsConfigured() {
  for (const role of ["director", "responsable", "plantel"] as const) {
    if (!configuredInitialPasswordForRole(role)) {
      throw new Error(`No se configuró una contraseña inicial válida para el rol ${role}.`);
    }
  }
}

function factoryCredentialVersion() {
  const resetVersion = officialFactoryResetVersion || officialCatalogImportVersion;
  const digest = createHash("sha256").update(resetVersion).digest();
  return digest.readUInt32BE(0) || 1;
}

function hashPassword(password: string) {
  const salt = randomBytes(16);
  const params = scryptParameters();
  const digest = scryptSync(password, salt, 32, params);
  return `scrypt$${params.N}$${params.r}$${params.p}$${salt.toString("base64url")}$${digest.toString("base64url")}`;
}

function verifyPassword(storedHash: string, password: string) {
  if (storedHash.startsWith("scrypt$")) {
    const parsed = parseScryptHash(storedHash);

    if (!parsed) {
      return false;
    }

    try {
      const salt = Buffer.from(parsed.encodedSalt, "base64url");
      const expected = Buffer.from(parsed.encodedDigest, "base64url");
      const actual = scryptSync(password, salt, expected.length, parsed.options);
      return expected.length === actual.length && timingSafeEqual(expected, actual);
    } catch {
      return false;
    }
  }

  const legacy = createHash("sha256").update(`adpeak:${password}`).digest();
  const stored = Buffer.from(storedHash, "hex");
  return stored.length === legacy.length && timingSafeEqual(stored, legacy);
}

async function verifyPasswordAsync(storedHash: string, password: string) {
  if (!storedHash.startsWith("scrypt$")) {
    return verifyPassword(storedHash, password);
  }

  const parsed = parseScryptHash(storedHash);

  if (!parsed) {
    return false;
  }

  try {
    const salt = Buffer.from(parsed.encodedSalt, "base64url");
    const expected = Buffer.from(parsed.encodedDigest, "base64url");
    const actual = await deriveScryptAsync(password, salt, expected.length, parsed.options);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function deriveScryptAsync(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: { N: number; r: number; p: number; maxmem: number }
) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(Buffer.from(derivedKey));
    });
  });
}

function parseScryptHash(storedHash: string) {
  const parts = storedHash.split("$");

  if (parts.length === 3) {
    return {
      encodedSalt: parts[1],
      encodedDigest: parts[2],
      options: { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
    };
  }

  if (parts.length !== 6) {
    return undefined;
  }

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);

  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p) || N < 1024 || r < 1 || p < 1) {
    return undefined;
  }

  return {
    encodedSalt: parts[4],
    encodedDigest: parts[5],
    options: { N, r, p, maxmem: 64 * 1024 * 1024 }
  };
}

function scryptParameters() {
  const N = process.env.NODE_ENV === "test" || process.env.VITEST === "true" ? 1024 : 16384;
  return { N, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
}

function bearerTokenFromHeaders(headers: Record<string, string | string[] | undefined>) {
  const authorization = headerValue(headers.authorization ?? headers.Authorization);
  const sessionHeader = headerValue(headers["x-session-token"]);
  const cookieHeader = headerValue(headers.cookie ?? headers.Cookie);

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  if (sessionHeader?.trim()) {
    return sessionHeader.trim();
  }

  return cookieValue(cookieHeader, SESSION_COOKIE_NAME);
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

  if (!payload.sub || !Number.isInteger(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new SigiAuthError("La sesión expiró.");
  }

  const user = users.get(payload.sub);

  if (!user?.active) {
    throw new SigiAuthError("La sesión no pertenece a un usuario activo.");
  }

  if (payload.credentialVersion !== credentialVersionFor(user)) {
    throw new SigiAuthError("La sesión ya no es válida. Inicia sesión nuevamente.");
  }

  return {
    userId: user.id,
    role: user.role,
    plantelId: user.role === "plantel" ? user.plantelId : user.plantelId ?? payload.plantelId,
    responsableId: user.role === "responsable" ? user.responsableId : user.responsableId ?? payload.responsableId,
    passwordChangeRequired: user.passwordChangeRequired ?? false
  };
}

function allowUnsafeHeaderSessions() {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST === "true" ||
    (process.env.ADPEAK_ALLOW_UNSAFE_HEADERS === "true" && !isProductionRuntime())
  );
}

function cookieValue(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) {
    return undefined;
  }

  for (const pair of cookieHeader.split(";")) {
    const separator = pair.indexOf("=");

    if (separator < 0) {
      continue;
    }

    const key = pair.slice(0, separator).trim();

    if (key === name) {
      return decodeURIComponent(pair.slice(separator + 1).trim());
    }
  }

  return undefined;
}

function sessionTtlSeconds() {
  const minutes = Number(process.env.AUTH_TOKEN_TTL_MINUTES ?? 480);
  const boundedMinutes = Number.isFinite(minutes) ? Math.max(15, Math.min(1440, minutes)) : 480;
  return boundedMinutes * 60;
}

function sessionSecret() {
  const configuredSecret = process.env.AUTH_SECRET || process.env.SIGI_AUTH_SECRET;

  if (configuredSecret) {
    return configuredSecret;
  }

  if (isProductionRuntime()) {
    throw new Error("AUTH_SECRET es obligatorio en producción.");
  }

  return "adpeak-local-session-secret-change-me";
}

function isProductionRuntime() {
  return process.env.APP_ENV === "production" || process.env.VERCEL_ENV === "production";
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

function reconcileCurrentAssignments() {
  const reconciled = reconcilePersistedAssignments(
    Array.from(indicators.values()),
    Array.from(users.values())
  );

  indicators.clear();
  reconciled.indicators.forEach((indicator) => indicators.set(indicator.id, indicator));
  users.clear();
  reconciled.users.forEach((user) => users.set(user.id, user));
}

export function reconcilePersistedAssignments(
  indicatorItems: SigiIndicator[],
  userItems: SigiUser[]
) {
  const responsibleUsers = new Map(
    userItems
      .filter((user) => user.role === "responsable" && user.responsableId)
      .map((user) => [user.responsableId!, user])
  );

  const reconciledIndicators = indicatorItems.map((indicator) => {
    const seededIndicator = initialIndicators.find((item) => item.code === indicator.code);
    const seededResponsibleIds = (seededIndicator?.responsibleIds ?? []).filter((id) => responsibleUsers.has(id));
    const responsibleIds = uniqueNumbers(indicator.responsibleIds.filter((id) => responsibleUsers.has(id)));
    const effectiveResponsibleIds = responsibleIds.length > 0 ? responsibleIds : seededResponsibleIds;
    const contributorResponsibleIds = uniqueNumbers(
      (indicator.contributorResponsibleIds ?? []).filter((id) => responsibleUsers.has(id))
    );
    const primaryResponsibleId = effectiveResponsibleIds.includes(indicator.primaryResponsibleId)
      ? indicator.primaryResponsibleId
      : effectiveResponsibleIds[0] ?? seededIndicator?.primaryResponsibleId ?? indicator.primaryResponsibleId;
    const contributorNames = contributorResponsibleIds.length > 0
      ? contributorResponsibleIds.map((id) => responsibleUsers.get(id)!.name)
      : targetsPlanteles(indicator.contributorNames)
        ? ["Planteles"]
        : [];

    return {
      ...indicator,
      primaryResponsibleId,
      responsibleIds: effectiveResponsibleIds,
      responsibleNames: effectiveResponsibleIds.map((id) => responsibleUsers.get(id)!.name),
      contributorResponsibleIds,
      contributorNames
    };
  });

  const reconciledUsers = userItems.map((user) => {
    if (user.role !== "responsable" || !user.responsableId) {
      return user;
    }

    const indicatorCodes = reconciledIndicators
      .filter((indicator) =>
        indicator.responsibleIds.includes(user.responsableId!) ||
        (indicator.contributorResponsibleIds ?? []).includes(user.responsableId!)
      )
      .map((indicator) => indicator.code);

    return { ...user, indicatorCodes: uniqueStrings(indicatorCodes) };
  });

  return { indicators: reconciledIndicators, users: reconciledUsers };
}

type UserAssignmentChange = {
  indicator: SigiIndicator;
  isAssigned: boolean;
};

function syncIndicatorAssignmentsForUser(
  actor: SigiSession,
  user: SigiUser,
  shouldSync: boolean
): UserAssignmentChange[] {
  if (!shouldSync || user.role !== "responsable" || !user.responsableId) {
    return [];
  }

  const assignedCodes = new Set(user.indicatorCodes);
  const now = new Date().toISOString();
  const changes: UserAssignmentChange[] = [];

  indicators.forEach((indicator, indicatorId) => {
    if (!isVisibleOperationalIndicatorCode(indicator.code)) {
      return;
    }

    const hasResponsible = indicator.responsibleIds.includes(user.responsableId!);
    const shouldHaveResponsible = assignedCodes.has(indicator.code);

    if (hasResponsible === shouldHaveResponsible) {
      return;
    }

    const responsibleIds = shouldHaveResponsible
      ? uniqueNumbers([...indicator.responsibleIds, user.responsableId!])
      : indicator.responsibleIds.filter((id) => id !== user.responsableId);
    const primaryResponsibleId = responsibleIds.includes(indicator.primaryResponsibleId)
      ? indicator.primaryResponsibleId
      : responsibleIds[0] ?? indicator.primaryResponsibleId;

    indicators.set(indicatorId, {
      ...indicator,
      primaryResponsibleId,
      responsibleIds,
      responsibleNames: namesForResponsibleIds(responsibleIds),
      updatedAt: now,
      updatedBy: "Administración de usuarios",
      lastChange: "actualizado"
    });

    const updatedIndicator = indicators.get(indicatorId)!;
    changes.push({ indicator: updatedIndicator, isAssigned: shouldHaveResponsible });
    recordAssignmentNotification(actor, user, updatedIndicator, shouldHaveResponsible);
  });

  const visibleCodes = Array.from(indicators.values())
    .filter((indicator) =>
      indicator.responsibleIds.includes(user.responsableId!) ||
      (indicator.contributorResponsibleIds ?? []).includes(user.responsableId!)
    )
    .map((indicator) => indicator.code)
    .sort((a, b) => a.localeCompare(b, "es", { numeric: true }));

  users.set(user.id, { ...user, indicatorCodes: visibleCodes });
  return changes;
}

function syncUserAssignmentsForIndicator(
  indicator: SigiIndicator,
  previousResponsibleIds: number[],
  previousContributorResponsibleIds: number[] = [],
  actor?: SigiSession
) {
  if (!isVisibleOperationalIndicatorCode(indicator.code)) {
    return;
  }

  const nextVisibleResponsibleIds = new Set([
    ...indicator.responsibleIds,
    ...(indicator.contributorResponsibleIds ?? [])
  ]);
  const affectedResponsibleIds = new Set([
    ...previousResponsibleIds,
    ...previousContributorResponsibleIds,
    ...indicator.responsibleIds,
    ...(indicator.contributorResponsibleIds ?? [])
  ]);

  let createdNotification = false;

  users.forEach((user, userId) => {
    if (user.role !== "responsable" || !user.responsableId || !affectedResponsibleIds.has(user.responsableId)) {
      return;
    }

    const isAssigned = nextVisibleResponsibleIds.has(user.responsableId);
    const hasCode = user.indicatorCodes.includes(indicator.code);

    if (isAssigned === hasCode) {
      return;
    }

    users.set(userId, {
      ...user,
      indicatorCodes: isAssigned
        ? [...user.indicatorCodes, indicator.code].sort((a, b) => a.localeCompare(b, "es", { numeric: true }))
        : user.indicatorCodes.filter((code) => code !== indicator.code)
    });

    if (actor) {
      createdNotification = recordAssignmentNotification(actor, user, indicator, isAssigned) || createdNotification;
    }
  });

  if (createdNotification) {
    persistNotificationState();
  }
}

function recordAssignmentNotification(
  actor: SigiSession,
  targetUser: SigiUser,
  indicator: SigiIndicator,
  isAssigned: boolean
) {
  const idempotencyKey = [
    "assignment_changed",
    indicator.id,
    indicator.updatedAt ?? "",
    targetUser.id,
    isAssigned ? "assigned" : "removed"
  ].join(":");

  if (Array.from(notifications.values()).some((notification) => notification.idempotencyKey === idempotencyKey)) {
    return false;
  }

  const notification: SigiNotification = {
    id: nextNotificationId,
    rolDestino: targetUser.role,
    usuarioDestino: targetUser.id,
    indicadorId: indicator.id,
    indicadorCodigo: indicator.code,
    indicadorNombre: indicator.name,
    eventType: "assignment_changed",
    idempotencyKey,
    mensaje: isAssigned
      ? `Se te asignó el indicador ${indicator.code}.`
      : `Se retiró tu asignación al indicador ${indicator.code}.`,
    createdAt: new Date().toISOString(),
    readAt: null,
    actorUserId: actor.userId,
    actorRole: actor.role
  };

  nextNotificationId += 1;
  notifications.set(notification.id, notification);
  return true;
}

function persistNotificationState() {
  persistState({
    notifications: Array.from(notifications.values()),
    nextNotificationId
  });
}

function persistAuditState() {
  persistState({
    auditEvents: Array.from(auditEvents.values()),
    nextAuditEventId
  });
}

function notificationTargetsForCapture(
  event: "submitted" | "resubmitted" | "correction_requested" | "approved",
  indicator: SigiIndicator,
  draft: CaptureDraft,
  actor?: SigiSession
) {
  if (event === "submitted" || event === "resubmitted") {
    return Array.from(users.values())
      .filter((user) =>
        user.active &&
        user.id !== actor?.userId &&
        (
          user.role === "director" ||
          (user.role === "responsable" && indicator.responsibleIds.includes(user.responsableId ?? -1))
        )
      );
  }

  if (draft.plantelId === unassignedPlantel.id && draft.submittedByUserId) {
    return Array.from(users.values())
      .filter((user) => user.active && user.id === draft.submittedByUserId);
  }

  return Array.from(users.values())
    .filter((user) => user.active && user.role === "plantel" && user.plantelId === draft.plantelId);
}

function notificationMessage(
  event: Exclude<SigiNotificationEvent, "assignment_changed">,
  indicator: SigiIndicator,
  plantelName?: string
) {
  const scope = plantelName ? ` de ${plantelName}` : "";

  if (event === "capture_submitted") {
    return `Nueva captura en revisión${scope}: ${indicator.code}.`;
  }

  if (event === "capture_resubmitted") {
    return `Captura corregida y reenviada${scope}: ${indicator.code}.`;
  }

  if (event === "correction_requested") {
    return `Se solicitó corrección${scope}: ${indicator.code}.`;
  }

  return `Captura aprobada${scope}: ${indicator.code}.`;
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
    return hasExplicitPlantelScope(indicator) && canUseIndicatorForPlantel(indicator, session.plantelId ?? -1);
  }

  return isResponsibleRelated(session, indicator);
}

function isResponsibleAssigned(session: SigiSession, indicator: SigiIndicator) {
  const responsableId = session.responsableId ?? -1;
  const user = users.get(session.userId);

  if (session.role === "responsable" && user) {
    return user.indicatorCodes.includes(indicator.code);
  }

  return indicator.responsibleIds.includes(responsableId) || Boolean(user?.indicatorCodes.includes(indicator.code));
}

function isResponsibleReviewer(session: SigiSession, indicator: SigiIndicator) {
  const responsableId = session.responsableId ?? -1;
  return indicator.responsibleIds.includes(responsableId);
}

function isResponsibleContributor(session: SigiSession, indicator: SigiIndicator) {
  const responsableId = session.responsableId ?? -1;
  return (indicator.contributorResponsibleIds ?? []).includes(responsableId);
}

function isResponsibleRelated(session: SigiSession, indicator: SigiIndicator) {
  return isResponsibleAssigned(session, indicator) || isResponsibleContributor(session, indicator);
}

function canUseIndicatorForPlantel(indicator: SigiIndicator, plantelId: number) {
  return effectivePlantelIdsForIndicator(indicator).includes(plantelId);
}

function hasExplicitPlantelScope(indicator: SigiIndicator) {
  return effectivePlantelIdsForIndicator(indicator).length > 0;
}

function requiresPlantelScope(session: SigiSession, indicator: SigiIndicator) {
  return session.role === "plantel" || hasExplicitPlantelScope(indicator);
}

function indicatorChangeLabel(change: SigiIndicator["lastChange"]) {
  if (change === "creado") {
    return "Creado";
  }

  if (change === "actualizado") {
    return "Actualizado";
  }

  if (change === "desactivado") {
    return "Desactivado";
  }

  if (change === "habilitado") {
    return "Habilitado";
  }

  return "Carga inicial";
}

function indicatorUpdatedAt(indicator: SigiIndicator) {
  if ((indicator.lastChange ?? "importado") === "importado" && (indicator.updatedBy ?? "Sistema") === "Sistema") {
    return officialCatalogImportedAt;
  }

  return indicator.updatedAt ?? officialCatalogImportedAt;
}

function actorNameForSession(session: SigiSession) {
  return users.get(session.userId)?.name ?? (
    session.role === "director"
      ? "Director DGEMS"
      : session.role === "responsable"
        ? `Responsable ${session.responsableId ?? ""}`.trim()
        : `Plantel ${session.plantelId ?? ""}`.trim()
  );
}

function plantelScopeLabel(indicator: SigiIndicator) {
  const operationalScope = operationalScopeForIndicator(indicator);

  if (operationalScope === "none") {
    return "Sin alcance operativo";
  }

  if (operationalScope === "specific_responsables") {
    return "Responsables específicos";
  }

  const effectivePlantelIds = effectivePlantelIdsForIndicator(indicator);

  if (effectivePlantelIds.length === 0) {
    return "Pendiente de definir";
  }

  if (effectivePlantelIds.length === planteles.length) {
    return "Todos los planteles";
  }

  if (effectivePlantelIds.length === 1) {
    return planteles.find((plantel) => plantel.id === effectivePlantelIds[0])?.name ?? "Plantel";
  }

  return `${effectivePlantelIds.length} planteles`;
}

function effectivePlantelIdsForIndicator(indicator: SigiIndicator) {
  const operationalScope = operationalScopeForIndicator(indicator);

  if (operationalScope === "none" || operationalScope === "specific_responsables") {
    return [];
  }

  if (operationalScope === "all_planteles") {
    return allPlantelIds();
  }

  if (indicator.plantelIds.length > 0) {
    return indicator.plantelIds;
  }

  if (indicator.plantelScopeSource === "official-import") {
    return officialImportEvidencePlantelIds(indicator.code);
  }

  return [];
}

function isSyntheticIndicatorCode(code: string) {
  return code.startsWith("FMT-") || code.includes("-FMT-");
}

function isOperationalCatalogRow(row: (typeof officialCatalogRows)[number]) {
  return row.classification === "operational" && row.visible === true;
}

function isVisibleOperationalIndicatorCode(code: string) {
  return !isSyntheticIndicatorCode(code) && !code.startsWith("TMP-") && !hiddenImportedIndicatorCodes.has(code);
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
  const sessionPlantel = session?.role === "plantel" ? plantel : undefined;
  const columns = relaxBlankReadonlyColumns(
    sanitizeTemplateColumns(imported.columns),
    imported.initialRows,
    imported.emptyRow
  );
  const displayCode = imported.officialCode || (indicator.code.startsWith("FMT-") ? "Pendiente de mapeo" : indicator.code);
  const groups = imported.groups.filter((group) => group.label !== "Formato oficial importado");
  const sourceRows = rowsForOfficialWorkbookSession(imported.initialRows, columns, sessionPlantel);
  const rows = sourceRows.length > 0
    ? sourceRows.map((row) => rowForOfficialWorkbookColumns(columns, row, sessionPlantel))
    : [rowForOfficialWorkbookColumns(columns, imported.emptyRow, sessionPlantel ?? plantel)];

  return {
    indicatorCode: displayCode,
    indicatorName: indicator.name,
    groups,
    headerRows: imported.headerRows,
    columns,
    initialRows: rows,
    showTotals: imported.showTotals,
    allowAddRows: imported.allowAddRows,
    addRowLabel: imported.addRowLabel,
    emptyRow: rowForOfficialWorkbookColumns(columns, imported.emptyRow, sessionPlantel ?? plantel),
    analysisHeading: "Análisis",
    analysisLabel: "Descripción y observaciones",
    analysisPlaceholder: "Describe brevemente el avance, pendientes o comentarios del formato oficial."
  };
}

function relaxBlankReadonlyColumns(
  columns: TemplateColumn[],
  rows: Record<string, unknown>[],
  emptyRow: Record<string, unknown>
) {
  return columns.map((column) => {
    if (column.type !== "readonly" || isProtectedContextColumn(column)) {
      return column;
    }

    const hasOfficialValue = [...rows, emptyRow].some((row) => {
      const value = row[column.key];
      return value !== undefined && value !== null && String(value).trim() !== "";
    });

    return hasOfficialValue ? column : { ...column, type: "text" as const };
  });
}

function isProtectedContextColumn(column: TemplateColumn) {
  const normalized = normalizeKey(`${column.label} ${column.key}`);
  return ["plantel", "delegacion", "responsable", "periodo", "ciclo", "semestre"].some((token) =>
    normalized.includes(token)
  );
}

function rowForOfficialWorkbookColumns(
  columns: TemplateColumn[],
  sourceRow: Record<string, unknown>,
  plantel?: Plantel
) {
  const row: Record<string, unknown> = {};

  for (const column of columns) {
    const normalizedLabel = normalizeKey(column.label);
    const sourceValue = sourceRow[column.key];

    if (normalizedLabel.includes("plantel")) {
      row[column.key] = officialWorkbookPlantelValue(sourceValue, plantel);
      continue;
    }

    if (column.type === "number" && sourceValue !== undefined && sourceValue !== null && String(sourceValue).trim() !== "") {
      row[column.key] = numberValue(sourceValue) === undefined ? "" : sourceValue;
      continue;
    }

    row[column.key] = sourceValue ?? "";
  }

  return row;
}

function officialWorkbookPlantelValue(sourceValue: unknown, plantel?: Plantel) {
  if (plantel?.name && plantel.name !== unassignedPlantel.name) {
    return plantel.name;
  }

  const text = String(sourceValue ?? "").trim();
  const normalized = normalizeKey(text);

  if (!text || normalized === "bachillerato" || normalized === "bach") {
    return planteles[0].name;
  }

  return text;
}

function rowsForOfficialWorkbookSession(
  rows: Record<string, unknown>[],
  columns: TemplateColumn[],
  plantel?: Plantel
) {
  if (!plantel) {
    return rows;
  }

  const plantelColumn = columns.find((column) => normalizeKey(column.label).includes("plantel"));
  if (!plantelColumn) {
    return rows;
  }

  return rows.filter((row) => {
    const value = row[plantelColumn.key];
    return !value || normalizeKey(String(value)) === normalizeKey(plantel.name);
  });
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
  if (session?.role === "plantel" && session.plantelId) {
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
  assertNoDuplicateResponsibleSelections(ids, names);
  const idsFromInput = ids?.length ? ids.map(validateResponsibleId) : [];
  const idsFromNames = names?.length ? names.map(resolveResponsibleNameForAssignment) : [];

  if (idsFromInput.length > 0 && idsFromNames.length > 0 && !sameNumberSet(idsFromInput, idsFromNames)) {
    throw new SigiValidationError("Los responsables seleccionados no coinciden con sus identificadores.");
  }

  const resolved = uniqueNumbers(idsFromInput.length > 0 ? idsFromInput : idsFromNames);

  if (resolved.length === 0) {
    throw new SigiValidationError("Selecciona al menos un responsable general válido.");
  }

  return resolved;
}

function normalizeOptionalResponsibleIds(ids?: number[], names?: string[], strict = false) {
  if (ids?.length) {
    if (strict) {
      assertNoDuplicateResponsibleSelections(ids, names);
      const validatedIds = ids.map(validateResponsibleId);
      const idsFromNames = names?.length && !targetsPlanteles(names)
        ? names.map(resolveResponsibleNameForAssignment)
        : [];

      if (idsFromNames.length > 0 && !sameNumberSet(validatedIds, idsFromNames)) {
        throw new SigiValidationError("Los responsables específicos no coinciden con sus identificadores.");
      }

      return uniqueNumbers(validatedIds);
    }

    return uniqueNumbers(ids.filter((id) => Number.isInteger(id) && id > 0));
  }

  if (names?.length && !targetsPlanteles(names)) {
    if (strict) {
      assertNoDuplicateResponsibleSelections(undefined, names);
      return uniqueNumbers(names.map(resolveResponsibleNameForAssignment));
    }

    return uniqueNumbers(names.map((name) => {
      const officialId = responsibleIdByName.get(normalizeResponsibleName(name));
      return officialId ?? Array.from(users.values()).find((user) =>
        user.role === "responsable" &&
        user.name.localeCompare(name, "es", { sensitivity: "accent" }) === 0
      )?.responsableId;
    }).filter((id): id is number => Boolean(id)));
  }

  return [];
}

function validateResponsibleId(id: number) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new SigiValidationError("La selección incluye un responsable no válido.");
  }

  const exists = officialResponsibleAccountById.has(id) || Array.from(users.values()).some((user) =>
    user.role === "responsable" && user.responsableId === id
  );

  if (!exists) {
    throw new SigiValidationError(`No existe un responsable con identificador ${id}.`);
  }

  return id;
}

function resolveResponsibleNameForAssignment(name: string) {
  const normalizedName = name.trim();
  const officialId = responsibleIdByName.get(normalizeResponsibleName(normalizedName));
  const userId = officialId ?? Array.from(users.values()).find((user) =>
    user.role === "responsable" &&
    user.name.localeCompare(normalizedName, "es", { sensitivity: "accent" }) === 0
  )?.responsableId;

  if (!userId) {
    throw new SigiValidationError(`No existe el responsable "${normalizedName}".`);
  }

  return userId;
}

function assertNoDuplicateResponsibleSelections(ids?: number[], names?: string[]) {
  if (ids && new Set(ids).size !== ids.length) {
    throw new SigiValidationError("Un responsable no puede seleccionarse más de una vez.");
  }

  const normalizedNames = (names ?? []).map((name) => normalizeResponsibleName(name)).filter(Boolean);
  if (new Set(normalizedNames).size !== normalizedNames.length) {
    throw new SigiValidationError("Un responsable no puede seleccionarse más de una vez.");
  }
}

function operationalScopeForIndicator(indicator: SigiIndicator): SigiOperationalScope {
  if (
    (indicator.contributorResponsibleIds?.length ?? 0) > 0 ||
    (indicator.contributorNames.length > 0 && !targetsPlanteles(indicator.contributorNames))
  ) {
    return "specific_responsables";
  }

  if (indicator.operationalScope) {
    return indicator.operationalScope;
  }

  const explicitPlantelIds = normalizePlantelScope(indicator.plantelIds ?? []);
  const officialPlantelIds = officialIndicatorPlantelScopes[indicator.code] ?? [];
  const effectiveIds = explicitPlantelIds.length > 0 ? explicitPlantelIds : officialPlantelIds;

  if (sameNumberSet(effectiveIds, allPlantelIds())) {
    return "all_planteles";
  }

  if (effectiveIds.length > 0) {
    return "specific_planteles";
  }

  return "none";
}

function normalizePersistedContributorResponsibleIds(indicator: SigiIndicator, seededIndicator?: SigiIndicator) {
  const persistedIds = normalizeOptionalResponsibleIds(indicator.contributorResponsibleIds);

  if (persistedIds.length > 0) {
    return persistedIds;
  }

  const contributorNames = indicator.contributorNames ?? seededIndicator?.contributorNames ?? [];

  if (contributorNames.length > 0 && !targetsPlanteles(contributorNames)) {
    return normalizeOptionalResponsibleIds(undefined, contributorNames);
  }

  return seededIndicator?.contributorResponsibleIds ?? [];
}

function namesForResponsibleIds(ids: number[]) {
  return ids.map((id) =>
    officialResponsibleAccountById.get(id)?.name ??
    Array.from(users.values()).find((user) => user.role === "responsable" && user.responsableId === id)?.name
  ).filter((name): name is string => Boolean(name));
}

function nextIndicatorId() {
  return Math.max(0, ...Array.from(indicators.keys())) + 1;
}

function nextResponsableId() {
  return Math.max(
    ...officialResponsibleAccounts.map((account) => account.responsableId),
    0,
    ...Array.from(users.values())
      .map((user) => user.role === "responsable" ? user.responsableId ?? 0 : 0)
  ) + 1;
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

function currentReportPeriodId() {
  return reportPeriodDefinitions[0].id;
}

const reportPeriodDefinitions = [
  {
    id: 1,
    periodo: "2026-A",
    aliases: ["2026-A", "2026-2"],
    cicloEscolar: "2025-2026"
  },
  {
    id: 2,
    periodo: "2025-2",
    aliases: ["2025-A", "2025-2"],
    cicloEscolar: "2024-2025"
  }
] as const;

function resolveReportPeriod(periodo?: string, cicloEscolar?: string) {
  const current = reportPeriodDefinitions[0];
  const periodMatch = periodo ? reportPeriodDefinitionFromPeriod(periodo) : undefined;
  const cycleMatch = cicloEscolar ? reportPeriodDefinitionFromCycle(cicloEscolar) : undefined;
  const inferred = periodMatch ?? cycleMatch ?? current;
  const knownPair = (!periodo || periodMatch?.id === inferred.id) &&
    (!cicloEscolar || cycleMatch?.id === inferred.id);

  return {
    periodo: periodo ?? inferred.periodo,
    cicloEscolar: cicloEscolar ?? inferred.cicloEscolar,
    periodoId: knownPair ? inferred.id : undefined
  };
}

function reportPeriodDefinitionFromPeriod(periodo: string) {
  const normalized = normalizeKey(periodo).replace(/\s+/g, "");
  return reportPeriodDefinitions.find((definition) =>
    definition.aliases.some((alias) => normalizeKey(alias).replace(/\s+/g, "") === normalized)
  );
}

function reportPeriodDefinitionFromCycle(cicloEscolar: string) {
  const normalized = normalizeKey(cicloEscolar).replace(/\s+/g, "");
  return reportPeriodDefinitions.find((definition) =>
    normalizeKey(definition.cicloEscolar).replace(/\s+/g, "") === normalized
  );
}

function normalizeReportStatusFilter(status?: string) {
  const normalized = normalizeKey(status ?? "");

  if (!normalized) {
    return undefined;
  }

  if (["aprobado", "completo", "completado"].includes(normalized)) {
    return "aprobado";
  }

  if (["revision", "en revision", "enviado"].includes(normalized)) {
    return "en revision";
  }

  if (["observado", "corregir", "correccion", "correccion solicitada"].includes(normalized)) {
    return "observado";
  }

  if (["borrador", "pendiente"].includes(normalized)) {
    return "borrador";
  }

  if (normalized === "en progreso") {
    return "en progreso";
  }

  if (normalized === "rezagado") {
    return "rezagado";
  }

  if (normalized === "atrasado") {
    return "atrasado";
  }

  return normalized;
}

function normalizeReportView(tipo: string | undefined, role: SystemRole): "detalle" | "avance" {
  const normalized = normalizeKey(tipo ?? "");

  if (normalized === "avance") {
    return "avance";
  }

  if (normalized === "detalle") {
    return "detalle";
  }

  if (normalized) {
    throw new SigiValidationError('El tipo de reporte debe ser "avance" o "detalle".');
  }

  return role === "director" ? "avance" : "detalle";
}

function filterReportRowsByStatus(
  rows: SigiReportPayload["indicadores"][number]["datos"],
  normalizedStatusFilter?: string
) {
  if (!normalizedStatusFilter) {
    return rows;
  }

  if (normalizedStatusFilter === "atrasado") {
    return rows.filter((row) => row.vencimiento === "atrasado");
  }

  if (normalizedStatusFilter === "rezagado") {
    return rows.filter((row) =>
      row.vencimiento === "atrasado" ||
      normalizeReportStatusFilter(row.estado) === "observado" ||
      (numberValue(String(row.avance ?? "").replace("%", "")) ?? 0) <= 0
    );
  }

  if (normalizedStatusFilter === "en progreso") {
    return rows.filter((row) =>
      normalizeReportStatusFilter(row.estado) === "borrador" &&
      (numberValue(String(row.avance ?? "").replace("%", "")) ?? 0) > 0
    );
  }

  return rows.filter((row) => normalizeReportStatusFilter(row.estado) === normalizedStatusFilter);
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

function normalizeResponsibleName(value: string) {
  return normalizeKey(value).replace(/\s+/g, " ");
}
