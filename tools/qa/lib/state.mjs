import { readFile } from "node:fs/promises";
import path from "node:path";
import { BASELINE, REPO_ROOT } from "./constants.mjs";
import { QaHarnessError } from "./common.mjs";

const VISIBLE_MARKER = /(^|[^a-z0-9])(qa|tmp|fmt)(?=$|[^a-z0-9])/i;
const OFFICIAL_DIRECTOR_ID = "director-1";

export async function loadOfficialIndicatorCodes() {
  const catalogPath = path.join(REPO_ROOT, "apps", "backend", "src", "official-catalog.generated.ts");
  const source = await readFile(catalogPath, "utf8");
  const match = source.match(/export const officialCatalogRows:[^=]+?=\s*(\[[\s\S]*\]);\s*$/);

  if (!match) {
    throw new QaHarnessError("Could not locate the generated official catalog array.");
  }

  let rows;

  try {
    rows = JSON.parse(match[1]);
  } catch (error) {
    throw new QaHarnessError("Generated official catalog is not parseable JSON data.", { cause: error });
  }

  const codes = [...new Set(
    rows
      .filter((row) => row?.classification === "operational" && row?.visible === true)
      .map((row) => row.code)
      .filter((code) => typeof code === "string" && code.length > 0)
  )].sort(compareText);

  if (codes.length !== BASELINE.indicators) {
    throw new QaHarnessError(
      `Repository catalog baseline changed: expected ${BASELINE.indicators} visible indicators, found ${codes.length}.`
    );
  }

  return codes;
}

export function stateFromRows(rows) {
  const state = {};

  for (const row of rows) {
    if (!row || typeof row.key !== "string") {
      throw new QaHarnessError("app_state contains a row without a string key.");
    }

    if (Object.prototype.hasOwnProperty.call(state, row.key)) {
      throw new QaHarnessError(`app_state contains duplicate key ${row.key}.`);
    }

    state[row.key] = structuredClone(row.value);
  }

  return state;
}

export async function sanitizeCloneStateRows(rows, passwordHashes) {
  const officialCodes = await loadOfficialIndicatorCodes();
  const officialCodeSet = new Set(officialCodes);
  const state = stateFromRows(rows);
  const rawUsers = requiredArray(state.users, "users");
  const rawIndicators = requiredArray(state.indicators, "indicators");

  const users = rawUsers
    .filter(isOfficialUser)
    .map((user) => normalizeOfficialUser(user, passwordHashes, officialCodeSet))
    .filter((user) => !containsVisibleMarker({
      id: user.id,
      username: user.username,
      name: user.name
    }));

  assertOfficialAccountBaseline(users);

  const indicatorByCode = new Map();
  for (const indicator of rawIndicators) {
    if (!isRecord(indicator) || !officialCodeSet.has(indicator.code) || containsVisibleMarker(indicator)) {
      continue;
    }

    if (indicatorByCode.has(indicator.code)) {
      throw new QaHarnessError(`Clone contains duplicate official indicator code ${indicator.code}.`);
    }

    indicatorByCode.set(indicator.code, normalizeOfficialIndicator(indicator));
  }

  const indicators = officialCodes.map((code) => indicatorByCode.get(code)).filter(Boolean).sort(sortByNumericId);

  if (indicators.length !== BASELINE.indicators) {
    const missing = officialCodes.filter((code) => !indicatorByCode.has(code));
    throw new QaHarnessError(
      `Clone baseline requires ${BASELINE.indicators} official indicators; missing ${missing.join(", ") || "unknown"}.`
    );
  }

  synchronizeResponsibleAssignments(users, indicators);

  const officialUserIds = new Set(users.map((user) => user.id));
  const officialIndicatorIds = new Set(indicators.map((indicator) => indicator.id));
  const officialIndicatorCodeSet = new Set(indicators.map((indicator) => indicator.code));
  const captures = cleanArray(state.captureDrafts).filter((capture) =>
    isRecord(capture) &&
    !containsVisibleMarker(capture) &&
    officialIndicatorIds.has(Number(capture.indicadorId)) &&
    isIntegerInRange(capture.plantelId, 1, BASELINE.roles.plantel)
  );
  const captureIds = new Set(captures.map((capture) => Number(capture.id)));
  const notifications = cleanArray(state.notifications).filter((notification) =>
    isRecord(notification) &&
    !containsVisibleMarker(notification) &&
    officialIndicatorIds.has(Number(notification.indicadorId)) &&
    officialIndicatorCodeSet.has(notification.indicadorCodigo) &&
    officialUserIds.has(notification.usuarioDestino) &&
    officialUserIds.has(notification.actorUserId)
  );
  const auditEvents = cleanArray(state.auditEvents).filter((event) =>
    isRecord(event) &&
    !containsVisibleMarker(event) &&
    officialUserIds.has(event.userId) &&
    auditResourceIsOfficial(event, officialUserIds, officialIndicatorIds, officialIndicatorCodeSet, captureIds)
  );

  const sanitizedState = stripMarkedEntries(state);
  sanitizedState.users = users.sort(sortUsers);
  sanitizedState.indicators = indicators;
  sanitizedState.captureDrafts = captures.sort(sortByNumericId);
  sanitizedState.notifications = notifications.sort(sortByNumericId);
  sanitizedState.auditEvents = auditEvents.sort(sortByNumericId);
  sanitizedState.nextCaptureId = nextNumericId(captures);
  sanitizedState.nextNotificationId = nextNumericId(notifications);
  sanitizedState.nextAuditEventId = nextNumericId(auditEvents);

  validateCertificationState(sanitizedState, passwordHashes, officialCodes);

  const now = new Date().toISOString();
  return {
    rows: Object.entries(sanitizedState)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => ({ key, value, updatedAt: now })),
    summary: {
      users: users.length,
      indicators: indicators.length,
      captures: captures.length,
      notifications: notifications.length,
      auditEvents: auditEvents.length,
      removedUsers: rawUsers.length - users.length,
      removedIndicators: rawIndicators.length - indicators.length
    }
  };
}

export async function validateCertificationRows(rows, passwordHashes) {
  const officialCodes = await loadOfficialIndicatorCodes();
  const state = stateFromRows(rows);
  return validateCertificationState(state, passwordHashes, officialCodes);
}

export function containsVisibleMarker(value, seen = new Set()) {
  if (typeof value === "string") {
    return VISIBLE_MARKER.test(value);
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  if (seen.has(value)) {
    return false;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.some((item) => containsVisibleMarker(item, seen));
  }

  return Object.entries(value).some(([key, item]) =>
    VISIBLE_MARKER.test(key) || containsVisibleMarker(item, seen)
  );
}

export function roleCounts(users) {
  return {
    director: users.filter((user) => user.role === "director").length,
    responsable: users.filter((user) => user.role === "responsable").length,
    plantel: users.filter((user) => user.role === "plantel").length
  };
}

export function isOfficialUser(user) {
  if (!isRecord(user)) {
    return false;
  }

  if (user.role === "director") {
    return user.id === OFFICIAL_DIRECTOR_ID;
  }

  if (user.role === "responsable") {
    const id = numericSuffix(user.id, "responsable-");
    return id !== undefined && id === Number(user.responsableId) && isIntegerInRange(id, 1, BASELINE.roles.responsable);
  }

  if (user.role === "plantel") {
    const id = numericSuffix(user.id, "plantel-");
    return id !== undefined && id === Number(user.plantelId) && isIntegerInRange(id, 1, BASELINE.roles.plantel);
  }

  return false;
}

function validateCertificationState(state, passwordHashes, officialCodes) {
  const users = requiredArray(state.users, "users");
  const indicators = requiredArray(state.indicators, "indicators");
  assertOfficialAccountBaseline(users);

  const actualCodes = indicators.map((indicator) => indicator?.code).sort(compareText);
  if (indicators.length !== BASELINE.indicators || !sameStringArray(actualCodes, [...officialCodes].sort(compareText))) {
    throw new QaHarnessError("Certification state does not contain the exact 14-code official indicator baseline.");
  }

  if (containsVisibleMarker(state)) {
    throw new QaHarnessError("Certification state still contains visible QA, TMP, or FMT markers.");
  }

  const userNames = new Set();
  const userIds = new Set(users.map((user) => user.id));
  const indicatorIds = new Set();
  const indicatorCodeSet = new Set(officialCodes);

  for (const user of users) {
    if (user.active !== true) {
      throw new QaHarnessError(`Official account ${user.id} is not active in the clone baseline.`);
    }

    const normalizedUsername = String(user.username ?? "").trim().toLowerCase();
    if (!normalizedUsername || userNames.has(normalizedUsername)) {
      throw new QaHarnessError("Official clone accounts must have unique non-empty usernames.");
    }
    userNames.add(normalizedUsername);

    if (passwordHashes && user.passwordHash !== passwordHashes[user.role]) {
      throw new QaHarnessError(`Clone password hash mismatch for role ${user.role}.`);
    }

    if (!/^[a-f0-9]{64}$/.test(user.passwordHash ?? "")) {
      throw new QaHarnessError(`Invalid password hash for official account ${user.id}.`);
    }

    if ((user.indicatorCodes ?? []).some((code) => !indicatorCodeSet.has(code))) {
      throw new QaHarnessError(`Official account ${user.id} references a non-official indicator.`);
    }
  }

  for (const indicator of indicators) {
    if (!isRecord(indicator) || !Number.isInteger(indicator.id) || indicatorIds.has(indicator.id)) {
      throw new QaHarnessError("Official indicators must have unique integer IDs.");
    }
    indicatorIds.add(indicator.id);

    if (indicator.active !== true) {
      throw new QaHarnessError(`Official indicator ${indicator.code} is not active in the clone baseline.`);
    }

    if (!Array.isArray(indicator.responsibleIds) || indicator.responsibleIds.length === 0) {
      throw new QaHarnessError(`Official indicator ${indicator.code} has no responsible assignment.`);
    }
  }

  for (const user of users.filter((item) => item.role === "responsable")) {
    const expectedCodes = indicators
      .filter((indicator) =>
        indicator.responsibleIds.includes(user.responsableId) ||
        cleanArray(indicator.contributorResponsibleIds).includes(user.responsableId)
      )
      .map((indicator) => indicator.code)
      .sort(compareText);
    const actualUserCodes = [...user.indicatorCodes].sort(compareText);

    if (!sameStringArray(expectedCodes, actualUserCodes)) {
      throw new QaHarnessError(`Responsible assignment mismatch for ${user.id}.`);
    }
  }

  for (const capture of cleanArray(state.captureDrafts)) {
    if (!indicatorIds.has(Number(capture.indicadorId)) || !userIds.has(capture.submittedByUserId ?? "plantel-1")) {
      if (!indicatorIds.has(Number(capture.indicadorId))) {
        throw new QaHarnessError("A cloned capture references a removed indicator.");
      }
    }
  }

  return {
    state,
    users,
    indicators,
    captures: cleanArray(state.captureDrafts),
    notifications: cleanArray(state.notifications),
    auditEvents: cleanArray(state.auditEvents),
    roles: roleCounts(users),
    officialCodes
  };
}

function normalizeOfficialUser(user, passwordHashes, officialCodeSet) {
  const role = user.role;
  return {
    ...structuredClone(user),
    username: String(user.username ?? "").trim().toLowerCase(),
    active: true,
    passwordHash: passwordHashes[role],
    indicatorCodes: role === "responsable"
      ? uniqueStrings(cleanArray(user.indicatorCodes).filter((code) => officialCodeSet.has(code)))
      : []
  };
}

function normalizeOfficialIndicator(indicator) {
  return {
    ...structuredClone(indicator),
    active: true,
    responsibleIds: uniqueNumbers(cleanArray(indicator.responsibleIds), 1, BASELINE.roles.responsable),
    contributorResponsibleIds: uniqueNumbers(cleanArray(indicator.contributorResponsibleIds), 1, BASELINE.roles.responsable),
    plantelIds: uniqueNumbers(cleanArray(indicator.plantelIds), 1, BASELINE.roles.plantel)
  };
}

function synchronizeResponsibleAssignments(users, indicators) {
  for (const user of users) {
    if (user.role !== "responsable") {
      user.indicatorCodes = [];
      continue;
    }

    user.indicatorCodes = indicators
      .filter((indicator) =>
        indicator.responsibleIds.includes(user.responsableId) ||
        cleanArray(indicator.contributorResponsibleIds).includes(user.responsableId)
      )
      .map((indicator) => indicator.code)
      .sort(compareText);
  }
}

function assertOfficialAccountBaseline(users) {
  const roles = roleCounts(users);

  if (
    users.length !== BASELINE.accounts ||
    roles.director !== BASELINE.roles.director ||
    roles.responsable !== BASELINE.roles.responsable ||
    roles.plantel !== BASELINE.roles.plantel ||
    users.some((user) => !isOfficialUser(user))
  ) {
    throw new QaHarnessError(
      `Clone baseline requires ${BASELINE.accounts} official accounts (1 director, ${BASELINE.roles.responsable} responsables, ${BASELINE.roles.plantel} planteles).`
    );
  }

  if (new Set(users.map((user) => user.id)).size !== users.length) {
    throw new QaHarnessError("Clone baseline contains duplicate official account IDs.");
  }
}

function auditResourceIsOfficial(event, userIds, indicatorIds, indicatorCodes, captureIds) {
  const resourceId = String(event.resourceId ?? "");

  if (event.resourceType === "user" || event.resourceType === "auth") {
    return userIds.has(resourceId);
  }

  if (event.resourceType === "indicator") {
    return indicatorIds.has(Number(resourceId)) || indicatorCodes.has(resourceId);
  }

  if (event.resourceType === "capture") {
    return captureIds.has(Number(resourceId));
  }

  return event.resourceType === "report";
}

function stripMarkedEntries(value) {
  if (Array.isArray(value)) {
    return value
      .filter((item) => !containsVisibleMarker(item))
      .map((item) => stripMarkedEntries(item));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, item]) => !VISIBLE_MARKER.test(key) && !(typeof item === "string" && VISIBLE_MARKER.test(item)))
      .map(([key, item]) => [key, stripMarkedEntries(item)])
  );
}

function requiredArray(value, key) {
  if (!Array.isArray(value)) {
    throw new QaHarnessError(`app_state is missing required array ${key}.`);
  }

  return value;
}

function cleanArray(value) {
  return Array.isArray(value) ? value : [];
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function numericSuffix(value, prefix) {
  if (typeof value !== "string") {
    return undefined;
  }

  const match = value.match(new RegExp(`^${prefix}(\\d+)$`));
  return match ? Number(match[1]) : undefined;
}

function isIntegerInRange(value, minimum, maximum) {
  const number = Number(value);
  return Number.isInteger(number) && number >= minimum && number <= maximum;
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === "string"))].sort(compareText);
}

function uniqueNumbers(values, minimum, maximum) {
  return [...new Set(values.map(Number).filter((value) => isIntegerInRange(value, minimum, maximum)))].sort((a, b) => a - b);
}

function nextNumericId(items) {
  return Math.max(0, ...items.map((item) => Number(item.id) || 0)) + 1;
}

function sortByNumericId(left, right) {
  return Number(left.id) - Number(right.id);
}

function sortUsers(left, right) {
  const priority = { director: 0, responsable: 1, plantel: 2 };
  return priority[left.role] - priority[right.role] || String(left.id).localeCompare(String(right.id), "en", { numeric: true });
}

function compareText(left, right) {
  return String(left).localeCompare(String(right), "en", { numeric: true });
}

function sameStringArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
