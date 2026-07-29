#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  assertTestEnvironment,
  displayPath,
  loadManifest,
  parseArguments,
  printDryRun,
  readEnvironmentFile,
  readClonePasswords,
  readExpectedPasswordHashes,
  runCommand,
  safeErrorMessage,
  saveManifest,
  scrubInheritedDatabaseEnvironment,
  sha256,
  withQaLock
} from "./lib/common.mjs";
import {
  assertManifestTarget,
  readTargetAppState,
  replaceTargetAppState,
  sanitizedConnection
} from "./lib/database.mjs";
import { addCheck, writeCertificationArtifacts } from "./lib/reports.mjs";
import { BASELINE } from "./lib/constants.mjs";
import { withTestBackend } from "./lib/runtime.mjs";
import {
  containsVisibleMarker,
  loadOfficialIndicatorCodes,
  roleCounts,
  stateFromRows,
  validateCertificationRows
} from "./lib/state.mjs";

scrubInheritedDatabaseEnvironment();

const HELP = `Usage: npm run qa:run -- [options]

Certify the manifest-bound clone across inventory, authentication, roles,
indicators, reports, and security. The run snapshots the isolated PostgreSQL
clone, executes a real mutable capture/review flow, stops the backend, and
restores the exact initial snapshot. Results are
written to ignored QA_MATRIX.csv, QA_REPORT.md, and QA_FINDINGS.md artifacts.

Required environment:
  APP_ENV=test
  NODE_ENV=test
  QA_CLONE_DIRECTOR_PASSWORD=<clone-only password>
  QA_CLONE_RESPONSABLE_PASSWORD=<clone-only password>
  QA_CLONE_PLANTEL_PASSWORD=<clone-only password>

Options:
  --manifest <path>  Seeded manifest created by qa:clone (and qa:seed)
  --dry-run           Print coverage without reading env, starting a server, or connecting
  -h, --help          Show this help
`;

await runCommand(async () => {
  const options = parseArguments(process.argv.slice(2), ["--manifest"]);

  if (options.help) {
    console.log(HELP);
    return;
  }

  if (options.dryRun) {
    printDryRun("qa:run", [
      "Erase inherited DATABASE_URL and PostgreSQL fallback variables",
      `Validate seeded manifest ${displayPath(options.manifest)} and generated QA environment`,
      "Read clone inventory in a repeatable-read, read-only PostgreSQL transaction",
      "Verify backup SHA, 56/14 baseline, role hashes, scopes, captures, and marker stripping",
      "Start the real backend against the isolated clone on an ephemeral localhost port",
      "Log in all 56 official accounts and probe role scoping, indicators, reports, and security rejections",
      "Temporarily assign one official indicator and run draft, conflict, review, evidence, correction, approval, notification, audit, and detail-report checks",
      "Stop the backend and restore the exact initial app_state snapshot even when the mutable flow fails",
      "Write ignored QA_MATRIX.csv, QA_REPORT.md, and QA_FINDINGS.md"
    ]);
    return;
  }

  assertTestEnvironment();
  let manifest = await loadManifest(options.manifest);
  const outputRoot = path.dirname(manifest.artifacts.activeManifest);

  await withQaLock(outputRoot, async () => {
    manifest = await loadManifest(options.manifest);
    if (!["seeded", "certified", "findings"].includes(manifest.status)) {
      throw new Error("qa:run requires a seeded, certified, or findings manifest. Run qa:seed first.");
    }

    const environment = await readEnvironmentFile(manifest.artifacts.environment);
    assertGeneratedTestEnvironment(environment);
    const targetConnection = assertManifestTarget(manifest, environment);
    const passwordHashes = readExpectedPasswordHashes(environment);
    const clonePasswords = readClonePasswords();
    const generatedAt = new Date().toISOString();
    const matrix = [];
    let snapshot;

    try {
      snapshot = await readTargetAppState(targetConnection);
      addCheck(matrix, {
        id: "INV-001",
        area: "inventory",
        test: "Manifest target opens read only",
        pass: snapshot.readOnly === true,
        severity: "critical",
        detail: snapshot.readOnly ? "Target identity matched and transaction_read_only=on." : "Target transaction was not read only."
      });
    } catch (error) {
      addCheck(matrix, {
        id: "INV-001",
        area: "inventory",
        test: "Manifest target opens read only",
        pass: false,
        severity: "critical",
        detail: safeErrorMessage(error)
      });
      addBlockedCoverage(matrix, "Target inventory was unavailable; downstream certification could not run.");
      await finishCertification({ manifest, matrix, generatedAt, targetConnection });
      return;
    }

    await addBackupIntegrityCheck(matrix, manifest);

    let validation;
    try {
      validation = await validateCertificationRows(snapshot.rows, passwordHashes);
      addCheck(matrix, {
        id: "INV-003",
        area: "inventory",
        test: "Sanitized official clone baseline",
        pass: true,
        detail: `56 official accounts and ${validation.officialCodes.length} generated official indicators validated.`
      });
    } catch (error) {
      addCheck(matrix, {
        id: "INV-003",
        area: "inventory",
        test: "Sanitized official clone baseline",
        pass: false,
        severity: "critical",
        detail: safeErrorMessage(error)
      });
      const state = stateFromRows(snapshot.rows);
      validation = {
        state,
        users: Array.isArray(state.users) ? state.users : [],
        indicators: Array.isArray(state.indicators) ? state.indicators : [],
        captures: Array.isArray(state.captureDrafts) ? state.captureDrafts : [],
        roles: roleCounts(Array.isArray(state.users) ? state.users : [])
      };
    }

    let officialCodes = validation.officialCodes;
    if (!Array.isArray(officialCodes)) {
      try {
        officialCodes = await loadOfficialIndicatorCodes();
      } catch (error) {
        officialCodes = [];
        addCheck(matrix, {
          id: "IND-000",
          area: "indicators",
          test: "Repository official catalog baseline",
          pass: false,
          severity: "critical",
          detail: safeErrorMessage(error)
        });
      }
    }
    addDatabaseChecks(matrix, validation, passwordHashes, officialCodes);

    const initialRows = structuredClone(snapshot.rows);
    const initialSnapshotDigest = appStateRowsDigest(initialRows);
    let cloneTargetApproved = false;

    try {
      assertMutableCloneTarget(manifest, environment, targetConnection);
      cloneTargetApproved = true;
      addCheck(matrix, {
        id: "MUT-GUARD-001",
        area: "mutable-flow",
        test: "Mutable QA target is an isolated test clone",
        pass: true,
        severity: "critical",
        detail: "APP_ENV/NODE_ENV are test and the manifest target uses the guarded adpeak_qa_cert_ database prefix."
      });

      await withTestBackend({
        authSecret: environment.QA_AUTH_SECRET,
        artifactDirectory: manifest.artifacts.runDirectory,
        databaseUrl: targetConnection.url.toString(),
        initialPasswords: clonePasswords
      }, async (runtime) => {
        const runtimeContext = await addRuntimeChecks(matrix, runtime, officialCodes, validation.users, clonePasswords);
        await addMutableWorkflowChecks(matrix, runtime, runtimeContext, validation.captures);
      });
    } catch (error) {
      const detail = safeErrorMessage(error);
      addMissingRuntimeFailures(matrix, detail);

      if (!matrix.some((check) => check.id === "MUT-FLOW-999")) {
        addCheck(matrix, {
          id: "MUT-FLOW-999",
          area: "mutable-flow",
          test: "End-to-end mutable clone workflow completed",
          pass: false,
          severity: "critical",
          detail
        });
      }
    } finally {
      if (cloneTargetApproved) {
        await restoreInitialSnapshot(matrix, targetConnection, initialRows, initialSnapshotDigest);
      }
    }

    await finishCertification({ manifest, matrix, generatedAt, targetConnection });
  });
});

async function addBackupIntegrityCheck(matrix, manifest) {
  try {
    const [backup, digestFile] = await Promise.all([
      readFile(manifest.artifacts.sourceBackup, "utf8"),
      readFile(manifest.artifacts.sourceBackupSha256, "utf8")
    ]);
    const digest = sha256(backup);
    const expectedLine = `${digest}  ${path.basename(manifest.artifacts.sourceBackup)}`;
    const parsed = JSON.parse(backup);
    const pass =
      digest === manifest.sourceSnapshot.sha256 &&
      digestFile.trim() === expectedLine &&
      parsed?.format === "adpeak-qa-app-state-backup-v1" &&
      parsed?.rows?.length === manifest.sourceSnapshot.rows;
    addCheck(matrix, {
      id: "INV-002",
      area: "inventory",
      test: "Source backup SHA-256 integrity",
      pass,
      severity: "critical",
      detail: pass ? `Backup digest and ${parsed.rows.length} row inventory match the manifest.` : "Backup, digest file, or manifest row count did not match."
    });
  } catch (error) {
    addCheck(matrix, {
      id: "INV-002",
      area: "inventory",
      test: "Source backup SHA-256 integrity",
      pass: false,
      severity: "critical",
      detail: safeErrorMessage(error)
    });
  }
}

function addDatabaseChecks(matrix, validation, passwordHashes, officialCodes) {
  const { state, users, indicators, captures } = validation;
  const roles = roleCounts(users);
  const usernames = users.map((user) => String(user.username ?? "").trim().toLowerCase());
  const hashesMatch = users.length > 0 && users.every((user) => user.passwordHash === passwordHashes[user.role]);
  addCheck(matrix, {
    id: "AUTH-001",
    area: "auth",
    test: "Clone-only password hashes by role",
    pass: hashesMatch && new Set(Object.values(passwordHashes)).size === 3,
    severity: "critical",
    detail: hashesMatch ? "Every official account uses its role-specific expected clone hash." : "At least one account does not use the expected clone-only role hash."
  });
  addCheck(matrix, {
    id: "AUTH-002",
    area: "auth",
    test: "Active unique account identities",
    pass: users.length === BASELINE.accounts && users.every((user) => user.active === true) && usernames.every(Boolean) && new Set(usernames).size === users.length,
    detail: `${users.length} accounts inspected; ${new Set(usernames).size} unique usernames.`
  });
  addCheck(matrix, {
    id: "ROLE-001",
    area: "roles",
    test: "Official role distribution",
    pass:
      roles.director === BASELINE.roles.director &&
      roles.responsable === BASELINE.roles.responsable &&
      roles.plantel === BASELINE.roles.plantel,
    severity: "critical",
    detail: `director=${roles.director}, responsable=${roles.responsable}, plantel=${roles.plantel}.`
  });

  const actualCodes = indicators.map((indicator) => indicator.code).sort(compareText);
  const expectedCodes = [...officialCodes].sort(compareText);
  addCheck(matrix, {
    id: "IND-001",
    area: "indicators",
    test: "Exact active official indicator inventory",
    pass: sameArray(actualCodes, expectedCodes) && indicators.every((indicator) => indicator.active === true) && !containsVisibleMarker(indicators),
    severity: "critical",
    detail: `${indicators.length} active indicator records inspected.`
  });

  const assignmentsValid = users
    .filter((user) => user.role === "responsable")
    .every((user) => {
      const expected = indicators
        .filter((indicator) => indicator.responsibleIds?.includes(user.responsableId))
        .map((indicator) => indicator.code)
        .sort(compareText);
      return sameArray([...(user.indicatorCodes ?? [])].sort(compareText), expected);
    });
  addCheck(matrix, {
    id: "IND-002",
    area: "indicators",
    test: "Responsible assignments are synchronized",
    pass: assignmentsValid,
    detail: assignmentsValid
      ? `All ${BASELINE.roles.responsable} responsible accounts match their official assignments.`
      : "One or more responsible assignments are inconsistent."
  });

  const indicatorIds = new Set(indicators.map((indicator) => indicator.id));
  const allowedStates = new Set(["borrador", "en_revision", "correccion_solicitada", "cerrado"]);
  const capturesValid = captures.every((capture) =>
    indicatorIds.has(Number(capture.indicadorId)) &&
    Number.isInteger(Number(capture.plantelId)) &&
    allowedStates.has(capture.estado) &&
    Array.isArray(capture.payload?.rows) &&
    !containsVisibleMarker(capture)
  );
  addCheck(matrix, {
    id: "REP-001",
    area: "reports",
    test: "Cloned capture/report source integrity",
    pass: capturesValid,
    detail: `${captures.length} retained capture records reference official indicators and valid report rows.`
  });

  const serialized = JSON.stringify(state);
  const hasUnexpectedPasswordField = users.some((user) =>
    Object.keys(user).some((key) => key.toLowerCase().includes("password") && key !== "passwordHash")
  );
  addCheck(matrix, {
    id: "SEC-001",
    area: "security",
    test: "No plaintext credentials or visible test markers",
    pass: !hasUnexpectedPasswordField && !containsVisibleMarker(state) && !serialized.includes("QA_CLONE_"),
    severity: "critical",
    detail: "Persisted state was checked for plaintext credential fields and QA/TMP/FMT markers."
  });
}

function addBlockedCoverage(matrix, detail) {
  for (const [id, area, test] of [
    ["AUTH-000", "auth", "Authentication inventory blocked"],
    ["ROLE-000", "roles", "Role inventory blocked"],
    ["IND-000", "indicators", "Indicator inventory blocked"],
    ["REP-000", "reports", "Report inventory blocked"],
    ["SEC-000", "security", "Security inventory blocked"]
  ]) {
    addCheck(matrix, { id, area, test, pass: false, severity: "critical", detail });
  }
}

async function addRuntimeChecks(matrix, runtime, officialCodes, users, clonePasswords) {
  const sessions = new Map();

  for (const user of users) {
    const login = await runtime.request("/api/v1/auth/login", {
      method: "POST",
      body: { username: user.username, password: clonePasswords[user.role] }
    });
    const pass = login.status === 200 && login.body?.user?.id === user.id && typeof login.body?.sessionToken === "string";

    addCheck(matrix, {
      id: `AUTH-ACCOUNT-${user.id}`,
      area: "auth-accounts",
      test: `Login oficial ${user.username}`,
      pass,
      severity: "critical",
      detail: pass ? `HTTP 200; role=${user.role}.` : `HTTP ${login.status}; no se obtuvo una sesión válida.`
    });

    if (pass) {
      sessions.set(user.id, login.body.sessionToken);
    }
  }

  const tokens = {
    director: sessions.get("director-1"),
    responsable: sessions.get("responsable-1"),
    plantel: sessions.get("plantel-1")
  };

  const [directorUsers, responsibleUsers, plantelUsers, invalidLogin] = await Promise.all([
    runtime.request("/api/v1/usuarios", { token: tokens.director }),
    runtime.request("/api/v1/usuarios", { token: tokens.responsable }),
    runtime.request("/api/v1/usuarios", { token: tokens.plantel }),
    runtime.request("/api/v1/auth/login", {
      method: "POST",
      body: { username: "qa-cert-invalid-user", password: "invalid-clone-credential" }
    })
  ]);

  addCheck(matrix, {
    id: "AUTH-003",
    area: "auth",
    test: "Signed session and invalid-login contracts",
    pass: sessions.size === users.length && directorUsers.status === 200 && invalidLogin.status === 401,
    detail: `official_logins=${sessions.size}/${users.length}, signed_session=${directorUsers.status}, invalid_login=${invalidLogin.status}.`
  });
  const directorList = arrayBody(directorUsers.body, "users");
  const responsibleList = arrayBody(responsibleUsers.body, "users");
  const plantelList = arrayBody(plantelUsers.body, "users");
  const noHashLeak = [...directorList, ...responsibleList, ...plantelList].every((user) => !("passwordHash" in user));
  addCheck(matrix, {
    id: "ROLE-002",
    area: "roles",
    test: "Role-scoped user inventory",
    pass:
      directorUsers.status === 200 && directorList.length === BASELINE.accounts &&
      responsibleUsers.status === 200 && responsibleList.length === 1 && responsibleList[0]?.id === "responsable-1" &&
      plantelUsers.status === 200 && plantelList.length === 1 && plantelList[0]?.id === "plantel-1" &&
      noHashLeak,
    detail: `director=${directorList.length}, responsable=${responsibleList.length}, plantel=${plantelList.length}, hash_leak=${!noHashLeak}.`
  });

  const [directorIndicators, responsibleIndicators] = await Promise.all([
    runtime.request("/api/v1/indicadores", { token: tokens.director }),
    runtime.request("/api/v1/indicadores", { token: tokens.responsable })
  ]);
  const directorIndicatorList = arrayBody(directorIndicators.body, "indicators");
  const responsibleIndicatorList = arrayBody(responsibleIndicators.body, "indicators");
  const directorCodes = directorIndicatorList.map((indicator) => indicator.code).sort(compareText);
  const responsibleScopeValid = responsibleIndicatorList.length > 0 && responsibleIndicatorList.every((indicator) =>
    indicator.responsibleIds?.includes(1) || indicator.contributorResponsibleIds?.includes(1)
  );
  addCheck(matrix, {
    id: "IND-003",
    area: "indicators",
    test: "Indicator API inventory and responsible scope",
    pass:
      directorIndicators.status === 200 &&
      sameArray(directorCodes, [...officialCodes].sort(compareText)) &&
      responsibleIndicators.status === 200 &&
      responsibleScopeValid,
    detail: `director=${directorIndicatorList.length}, responsable_scope=${responsibleIndicatorList.length}.`
  });

  const [directorReport, responsibleReport, plantelReport] = await Promise.all([
    runtime.request("/api/v1/reportes?tipo=avance", { token: tokens.director }),
    runtime.request("/api/v1/reportes", { token: tokens.responsable }),
    runtime.request("/api/v1/reportes", { token: tokens.plantel })
  ]);
  const directorTotals = directorReport.body?.estadoConteos;
  const totalsConsistent = directorTotals && directorTotals.total ===
    directorTotals.pendientes + directorTotals.enRevision + directorTotals.observados + directorTotals.aprobados;
  addCheck(matrix, {
    id: "REP-002",
    area: "reports",
    test: "Institutional, responsible, and plantel report contracts",
    pass:
      directorReport.status === 200 && directorReport.body?.tipoReporte === "institucional" && totalsConsistent &&
      responsibleReport.status === 200 && responsibleReport.body?.tipoReporte === "responsable" &&
      plantelReport.status === 200 && plantelReport.body?.tipoReporte === "plantel",
    detail: `director=${directorReport.status}, responsable=${responsibleReport.status}, plantel=${plantelReport.status}.`
  });

  const tamperedToken = mutateToken(tokens.director);
  const [unauthenticated, tampered, forbiddenMutation, forbiddenReport] = await Promise.all([
    runtime.request("/api/v1/usuarios"),
    runtime.request("/api/v1/usuarios", { token: tamperedToken }),
    runtime.request("/api/v1/usuarios", { method: "POST", token: tokens.responsable, body: {} }),
    runtime.request("/api/v1/reportes?plantelId=1", { token: tokens.responsable })
  ]);
  addCheck(matrix, {
    id: "SEC-002",
    area: "security",
    test: "Protected routes reject missing, tampered, and forbidden access",
    pass:
      unauthenticated.status === 401 &&
      tampered.status === 401 &&
      forbiddenMutation.status === 403 &&
      forbiddenReport.status === 403,
    severity: "critical",
    detail: `unauth=${unauthenticated.status}, tampered=${tampered.status}, role_mutation=${forbiddenMutation.status}, scoped_report=${forbiddenReport.status}.`
  });

  return { tokens, directorIndicatorList };
}

async function addMutableWorkflowChecks(matrix, runtime, runtimeContext, baselineCaptures) {
  const { tokens, directorIndicatorList } = runtimeContext;

  if (!tokens.director || !tokens.responsable || !tokens.plantel) {
    throw new Error("Mutable clone flow requires valid director, responsable-1, and plantel-1 sessions.");
  }

  const selection = selectMutableIndicator(directorIndicatorList, baselineCaptures);

  if (!selection) {
    throw new Error("No official indicator had an unused plantel-1 activity scope for the mutable clone flow.");
  }

  const { indicator, activityId } = selection;
  const periodId = 1;
  const assignment = await runtime.request(`/api/v1/indicadores/${indicator.id}`, {
    method: "PUT",
    token: tokens.director,
    body: mutableIndicatorAssignment(indicator)
  });
  requireMutableCheck(matrix, {
    id: "MUT-001",
    test: "Director temporarily assigns an official indicator to plantel-1 and resp01",
    pass:
      assignment.status === 200 &&
      assignment.body?.id === indicator.id &&
      assignment.body?.operationalScope === "specific_planteles" &&
      sameNumberArray(assignment.body?.plantelIds, [1]) &&
      sameNumberArray(assignment.body?.responsibleIds, [1]),
    detail: `indicator=${indicator.code}, HTTP ${assignment.status}.`
  });

  const [responsibleIndicators, plantelIndicators, templateResponse] = await Promise.all([
    runtime.request("/api/v1/indicadores", { token: tokens.responsable }),
    runtime.request("/api/v1/indicadores", { token: tokens.plantel }),
    runtime.request(`/api/v1/indicadores/${encodeURIComponent(indicator.code)}/template?plantelId=1`, {
      token: tokens.director
    })
  ]);
  const assignedVisible =
    arrayBody(responsibleIndicators.body, "indicators").some((item) => item.code === indicator.code) &&
    arrayBody(plantelIndicators.body, "indicators").some((item) => item.code === indicator.code);
  requireMutableCheck(matrix, {
    id: "MUT-002",
    test: "Temporary assignment is visible in both operational scopes",
    pass: responsibleIndicators.status === 200 && plantelIndicators.status === 200 && assignedVisible,
    detail: `responsable=${responsibleIndicators.status}, plantel=${plantelIndicators.status}, visible=${assignedVisible}.`
  });
  requireMutableCheck(matrix, {
    id: "MUT-003",
    test: "Official capture template is available for plantel-1",
    pass:
      templateResponse.status === 200 &&
      Array.isArray(templateResponse.body?.columns) &&
      templateResponse.body.columns.some((column) => column.type === "number" || column.type === "text"),
    detail: `HTTP ${templateResponse.status}; columns=${templateResponse.body?.columns?.length ?? 0}.`
  });

  const template = templateResponse.body;
  const firstEvidence = createPdfEvidence("version-1");
  const firstPayload = buildMutableCapturePayload(template, firstEvidence, 1);
  const created = await runtime.request("/api/v1/capturas/borradores", {
    method: "POST",
    token: tokens.plantel,
    body: {
      plantelId: 1,
      indicadorId: indicator.id,
      actividadId: activityId,
      periodoId: periodId,
      responsableId: 1,
      payload: firstPayload
    }
  });
  requireMutableCheck(matrix, {
    id: "MUT-004",
    test: "Plantel saves a valid draft with a structurally valid PDF",
    pass:
      created.status === 201 &&
      created.body?.estado === "borrador" &&
      created.body?.versionActual === 1 &&
      created.body?.payload?.evidencia?.nombre === firstEvidence.nombre,
    detail: `HTTP ${created.status}; state=${created.body?.estado ?? "none"}; version=${created.body?.versionActual ?? "none"}.`
  });

  const captureId = Number(created.body.id);
  const staleUpdate = await runtime.request(`/api/v1/capturas/${captureId}`, {
    method: "PUT",
    token: tokens.plantel,
    body: { payload: firstPayload, expectedVersion: created.body.versionActual + 10 }
  });
  const afterConflict = await runtime.request(`/api/v1/capturas/${captureId}`, { token: tokens.plantel });
  requireMutableCheck(matrix, {
    id: "MUT-005",
    test: "A stale writer receives a version conflict without changing the draft",
    pass:
      staleUpdate.status === 409 &&
      staleUpdate.body?.error === "capture_version_conflict" &&
      afterConflict.status === 200 &&
      afterConflict.body?.versionActual === created.body.versionActual,
    detail: `conflict=${staleUpdate.status}, persisted_version=${afterConflict.body?.versionActual ?? "none"}.`
  });

  const submitted = await runtime.request(`/api/v1/capturas/${captureId}/enviar-revision`, {
    method: "POST",
    token: tokens.plantel,
    body: { expectedVersion: created.body.versionActual }
  });
  requireMutableCheck(matrix, {
    id: "MUT-006",
    test: "Plantel submits the draft for review",
    pass: submitted.status === 200 && submitted.body?.estado === "en_revision" && submitted.body?.versionActual === 2,
    detail: `HTTP ${submitted.status}; state=${submitted.body?.estado ?? "none"}; version=${submitted.body?.versionActual ?? "none"}.`
  });

  const [reviewQueue, responsibleNotifications] = await Promise.all([
    runtime.request("/api/v1/capturas/en-revision", { token: tokens.responsable }),
    runtime.request("/api/v1/notificaciones", { token: tokens.responsable })
  ]);
  requireMutableCheck(matrix, {
    id: "MUT-007",
    test: "Responsible review queue and submission notification are synchronized",
    pass:
      reviewQueue.status === 200 &&
      arrayBody(reviewQueue.body, "captures").some((item) => item.captureId === captureId && item.estado === "en_revision") &&
      responsibleNotifications.status === 200 &&
      hasNotification(responsibleNotifications.body, captureId, "capture_submitted"),
    detail: `queue=${reviewQueue.status}, notifications=${responsibleNotifications.status}.`
  });

  const openedFirstEvidence = await runtime.requestBinary(`/api/v1/capturas/${captureId}/evidencia`, {
    token: tokens.responsable
  });
  requireMutableCheck(matrix, {
    id: "MUT-008",
    test: "Responsible opens the first real PDF evidence",
    pass:
      openedFirstEvidence.status === 200 &&
      openedFirstEvidence.headers.get("content-type") === "application/pdf" &&
      openedFirstEvidence.body.subarray(0, 5).toString("ascii") === "%PDF-" &&
      openedFirstEvidence.body.includes(Buffer.from("%%EOF", "ascii")),
    detail: `HTTP ${openedFirstEvidence.status}; bytes=${openedFirstEvidence.body.length}.`
  });

  const observed = await runtime.request(`/api/v1/capturas/${captureId}/observar`, {
    method: "POST",
    token: tokens.responsable,
    body: {
      observacion: "Corrige los valores y adjunta la evidencia actualizada de esta certificacion.",
      expectedVersion: submitted.body.versionActual
    }
  });
  const plantelCorrectionNotifications = await runtime.request("/api/v1/notificaciones", { token: tokens.plantel });
  requireMutableCheck(matrix, {
    id: "MUT-009",
    test: "Responsible requests correction and plantel receives the notification",
    pass:
      observed.status === 200 &&
      observed.body?.estado === "correccion_solicitada" &&
      observed.body?.versionActual === 3 &&
      hasNotification(plantelCorrectionNotifications.body, captureId, "correction_requested"),
    detail: `observe=${observed.status}, notification=${plantelCorrectionNotifications.status}.`
  });

  const secondEvidence = createPdfEvidence("version-2-corrected");
  const correctedPayload = buildMutableCapturePayload(template, secondEvidence, 2);
  const corrected = await runtime.request(`/api/v1/capturas/${captureId}`, {
    method: "PUT",
    token: tokens.plantel,
    body: { payload: correctedPayload, expectedVersion: observed.body.versionActual }
  });
  const resubmitted = corrected.status === 200
    ? await runtime.request(`/api/v1/capturas/${captureId}/enviar-revision`, {
        method: "POST",
        token: tokens.plantel,
        body: { expectedVersion: corrected.body.versionActual }
      })
    : { status: 0, body: undefined };
  requireMutableCheck(matrix, {
    id: "MUT-010",
    test: "Plantel corrects the draft with a new PDF and resubmits",
    pass:
      corrected.status === 200 && corrected.body?.versionActual === 4 &&
      corrected.body?.payload?.evidencia?.nombre === secondEvidence.nombre &&
      resubmitted.status === 200 && resubmitted.body?.estado === "en_revision" && resubmitted.body?.versionActual === 5,
    detail: `update=${corrected.status}, resubmit=${resubmitted.status}, version=${resubmitted.body?.versionActual ?? "none"}.`
  });

  const [queueAfterResubmit, notificationsAfterResubmit] = await Promise.all([
    runtime.request("/api/v1/capturas/en-revision", { token: tokens.responsable }),
    runtime.request("/api/v1/notificaciones", { token: tokens.responsable })
  ]);
  requireMutableCheck(matrix, {
    id: "MUT-011",
    test: "Corrected version returns to review with one resubmission notification",
    pass:
      queueAfterResubmit.status === 200 &&
      arrayBody(queueAfterResubmit.body, "captures").some((item) => item.captureId === captureId) &&
      countNotifications(notificationsAfterResubmit.body, captureId, "capture_resubmitted") === 1,
    detail: `queue=${queueAfterResubmit.status}, resubmission_notifications=${countNotifications(notificationsAfterResubmit.body, captureId, "capture_resubmitted")}.`
  });

  const prematureApproval = await runtime.request(`/api/v1/capturas/${captureId}/aprobar`, {
    method: "POST",
    token: tokens.responsable,
    body: { expectedVersion: resubmitted.body.versionActual }
  });
  requireMutableCheck(matrix, {
    id: "MUT-012",
    test: "A new capture version cannot be approved using an older evidence-open event",
    pass:
      prematureApproval.status === 400 &&
      String(prematureApproval.body?.message ?? "").toLowerCase().includes("evidencia"),
    detail: `HTTP ${prematureApproval.status}; approval remained blocked until the corrected evidence was opened.`
  });

  const openedSecondEvidence = await runtime.requestBinary(`/api/v1/capturas/${captureId}/evidencia`, {
    token: tokens.responsable
  });
  const approved = openedSecondEvidence.status === 200
    ? await runtime.request(`/api/v1/capturas/${captureId}/aprobar`, {
        method: "POST",
        token: tokens.responsable,
        body: { expectedVersion: resubmitted.body.versionActual }
      })
    : { status: 0, body: undefined };
  requireMutableCheck(matrix, {
    id: "MUT-013",
    test: "Responsible reopens corrected evidence and approves the current version",
    pass:
      openedSecondEvidence.status === 200 &&
      openedSecondEvidence.headers.get("content-disposition")?.includes(secondEvidence.nombre) &&
      approved.status === 200 && approved.body?.estado === "aprobado" && approved.body?.versionActual === 6,
    detail: `evidence=${openedSecondEvidence.status}, approve=${approved.status}, version=${approved.body?.versionActual ?? "none"}.`
  });

  const [plantelNotifications, finalCapture, audit, detailReport] = await Promise.all([
    runtime.request("/api/v1/notificaciones", { token: tokens.plantel }),
    runtime.request(`/api/v1/capturas/${captureId}`, { token: tokens.responsable }),
    runtime.request("/api/v1/auditoria", { token: tokens.director }),
    runtime.request("/api/v1/reportes?tipo=detalle&plantelId=1", { token: tokens.director })
  ]);
  requireMutableCheck(matrix, {
    id: "MUT-014",
    test: "Final state and plantel approval notification are consistent",
    pass:
      finalCapture.status === 200 &&
      finalCapture.body?.estado === "aprobado" &&
      finalCapture.body?.versionActual === 6 &&
      hasNotification(plantelNotifications.body, captureId, "capture_approved"),
    detail: `capture=${finalCapture.status}, notification=${plantelNotifications.status}.`
  });

  const captureAudit = arrayBody(audit.body, "events").filter((event) => event.resourceId === String(captureId));
  const auditActions = new Set(captureAudit.map((event) => event.action));
  const evidenceVersions = captureAudit
    .filter((event) => event.action === "evidence_opened")
    .map((event) => Number(event.after?.versionActual))
    .sort((left, right) => left - right);
  const serializedAudit = JSON.stringify(captureAudit).toLowerCase();
  requireMutableCheck(matrix, {
    id: "MUT-015",
    test: "Audit trail reconstructs the workflow without evidence contents or secrets",
    pass:
      audit.status === 200 &&
      ["capture_saved", "capture_submitted", "evidence_opened", "capture_correction_requested", "capture_updated", "capture_approved"]
        .every((action) => auditActions.has(action)) &&
      sameNumberArray(evidenceVersions, [2, 5]) &&
      !serializedAudit.includes("contenidobase64") &&
      !serializedAudit.includes("passwordhash") &&
      !serializedAudit.includes("storageref"),
    detail: `events=${captureAudit.length}, evidence_versions=${evidenceVersions.join("/") || "none"}.`
  });

  const reportIndicator = arrayBody(detailReport.body, "indicadores").find((item) => item.id === indicator.code);
  const reportRow = reportIndicator?.datos?.find((row) => row.captureId === captureId);
  requireMutableCheck(matrix, {
    id: "MUT-016",
    test: "Detail report exposes the approved captured data and corrected evidence",
    pass:
      detailReport.status === 200 &&
      detailReport.body?.vistaReporte === "detalle" &&
      reportRow?.estado === "Aprobado" &&
      reportRow?.evidenciaNombre === secondEvidence.nombre &&
      reportRow?.justificacion === correctedPayload.justificacion &&
      reportRow?.exportable === true &&
      Array.isArray(reportRow?.detalle) && reportRow.detalle.length > 0,
    detail: `HTTP ${detailReport.status}; state=${reportRow?.estado ?? "missing"}; detail_fields=${reportRow?.detalle?.length ?? 0}.`
  });

  addCheck(matrix, {
    id: "MUT-FLOW-999",
    area: "mutable-flow",
    test: "End-to-end mutable clone workflow completed",
    pass: true,
    severity: "critical",
    detail: `Official indicator ${indicator.code} completed draft, conflict, review, correction, evidence re-open, approval, audit, notification, and report checks.`
  });
}

function requireMutableCheck(matrix, { id, test, pass, detail }) {
  addCheck(matrix, {
    id,
    area: "mutable-flow",
    test,
    pass,
    severity: "critical",
    detail
  });

  if (!pass) {
    throw new Error(`Mutable clone QA step ${id} failed.`);
  }
}

function selectMutableIndicator(indicators, captures) {
  const ordered = [...indicators].sort((left, right) => {
    if (left.code === "1.0.0.0.2") return -1;
    if (right.code === "1.0.0.0.2") return 1;
    return compareText(left.code, right.code);
  });

  for (const indicator of ordered) {
    const activityCount = Math.max(1, Array.isArray(indicator.activities) ? indicator.activities.length : 0);

    for (let activityId = 1; activityId <= activityCount; activityId += 1) {
      const occupied = captures.some((capture) =>
        capture.plantelId === 1 &&
        capture.indicadorId === indicator.id &&
        capture.actividadId === activityId &&
        capture.periodoId === 1 &&
        capture.estado !== "cerrado"
      );

      if (!occupied) {
        return { indicator, activityId };
      }
    }
  }

  return undefined;
}

function mutableIndicatorAssignment(indicator) {
  return {
    code: indicator.code,
    name: indicator.name,
    description: indicator.description,
    dataType: indicator.dataType,
    period: indicator.period,
    active: true,
    primaryResponsibleId: 1,
    responsibleIds: [1],
    contributorResponsibleIds: [],
    contributorNames: ["Planteles"],
    activities: indicator.activities,
    plantelIds: [1],
    operationalScope: "specific_planteles",
    templateColumns: indicator.templateColumns,
    evidenceRules: {
      required: true,
      allowedTypes: ["application/pdf"],
      maxSizeMb: 1,
      requireOpenBeforeApproval: true
    }
  };
}

function buildMutableCapturePayload(template, evidence, variant) {
  const sourceRows = Array.isArray(template.initialRows) && template.initialRows.length > 0
    ? template.initialRows
    : [template.emptyRow && typeof template.emptyRow === "object" ? template.emptyRow : {}];
  const rows = sourceRows.map((sourceRow, rowIndex) => {
    const row = {};

    for (const column of template.columns) {
      if (column.type === "calculated") {
        continue;
      }

      if (column.type === "readonly") {
        row[column.key] = readonlyValue(sourceRow[column.key], column, rowIndex);
        continue;
      }

      if (column.type === "number") {
        row[column.key] = validNumberForColumn(column, variant, rowIndex);
        continue;
      }

      const allowed = column.validation?.allowedValues;
      row[column.key] = Array.isArray(allowed) && allowed.length > 0
        ? allowed[0]
        : `Registro certificacion ${variant}-${rowIndex + 1}`;
    }

    return row;
  });

  return {
    rows,
    justificacion: variant === 1
      ? "Captura inicial de certificacion con datos y evidencia verificables."
      : "Captura corregida de certificacion con valores y evidencia actualizados.",
    evidencia: evidence
  };
}

function readonlyValue(value, column, rowIndex) {
  if (value !== undefined && value !== null && value !== "") {
    return value;
  }

  const normalized = `${column.label} ${column.key}`.toLowerCase();
  if (normalized.includes("plantel")) return "Bachillerato 1";
  if (normalized.includes("deleg")) return "Delegacion certificacion";
  if (normalized.includes("actividad")) return "Actividad certificacion";
  if (normalized.includes("programa")) return "Programa certificacion";
  return `Contexto ${rowIndex + 1}`;
}

function validNumberForColumn(column, variant, rowIndex) {
  const validation = column.validation ?? {};
  const minimum = Number.isFinite(validation.min) ? validation.min : 0;
  const maximum = Number.isFinite(validation.max) ? validation.max : undefined;
  let value = minimum + variant + rowIndex + 1;

  if (maximum !== undefined) {
    value = Math.min(value, maximum);
  }

  if (validation.integer !== false) {
    value = Math.ceil(value);
  }

  return value;
}

function createPdfEvidence(label) {
  const safeLabel = String(label).replace(/[^A-Za-z0-9 -]/g, " ").slice(0, 80);
  const stream = `BT /F1 12 Tf 72 720 Td (ADPeak QA ${safeLabel}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  const content = Buffer.from(pdf, "ascii");

  return {
    nombre: `qa-cert-evidence-${safeLabel.toLowerCase().replace(/\s+/g, "-")}.pdf`,
    tipo: "application/pdf",
    tamanoBytes: content.length,
    contenidoBase64: content.toString("base64")
  };
}

function hasNotification(body, captureId, eventType) {
  return countNotifications(body, captureId, eventType) > 0;
}

function countNotifications(body, captureId, eventType) {
  return arrayBody(body, "notifications").filter((notification) =>
    notification.captureId === captureId && notification.eventType === eventType
  ).length;
}

function sameNumberArray(left, right) {
  return Array.isArray(left) &&
    left.length === right.length &&
    left.every((value, index) => Number(value) === Number(right[index]));
}

function assertMutableCloneTarget(manifest, environment, targetConnection) {
  const database = String(targetConnection.database ?? "");

  if (
    environment.APP_ENV !== "test" ||
    environment.NODE_ENV !== "test" ||
    !database.startsWith("adpeak_qa_cert_") ||
    database !== manifest.target.database ||
    database === manifest.source.database
  ) {
    throw new Error("Mutable QA was rejected because the target is not the manifest-bound isolated test clone.");
  }
}

async function restoreInitialSnapshot(matrix, targetConnection, initialRows, initialDigest) {
  try {
    await replaceTargetAppState(targetConnection, initialRows);
    const restored = await readTargetAppState(targetConnection);
    const restoredDigest = appStateRowsDigest(restored.rows);
    addCheck(matrix, {
      id: "MUT-RESTORE-001",
      area: "mutable-flow",
      test: "Backend stopped and initial PostgreSQL app_state snapshot was restored exactly",
      pass: restored.rows.length === initialRows.length && restoredDigest === initialDigest,
      severity: "critical",
      detail: `rows=${restored.rows.length}/${initialRows.length}; snapshot_digest_match=${restoredDigest === initialDigest}.`
    });
  } catch (error) {
    addCheck(matrix, {
      id: "MUT-RESTORE-001",
      area: "mutable-flow",
      test: "Backend stopped and initial PostgreSQL app_state snapshot was restored exactly",
      pass: false,
      severity: "critical",
      detail: safeErrorMessage(error)
    });
  }
}

function appStateRowsDigest(rows) {
  const normalized = [...rows]
    .map((row) => ({ key: row.key, value: row.value, updatedAt: String(row.updatedAt) }))
    .sort((left, right) => compareText(left.key, right.key));
  return sha256(stableJson(normalized));
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort(compareText).map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }

  return JSON.stringify(value);
}

function addMissingRuntimeFailures(matrix, detail) {
  for (const [id, area, test] of [
    ["AUTH-003", "auth", "Signed session route probe"],
    ["ROLE-002", "roles", "Role-scoped route probes"],
    ["IND-003", "indicators", "Indicator route probes"],
    ["REP-002", "reports", "Report route probes"],
    ["SEC-002", "security", "Protected-route rejection probes"]
  ]) {
    if (!matrix.some((check) => check.id === id)) {
      addCheck(matrix, { id, area, test, pass: false, severity: "high", detail });
    }
  }
}

async function finishCertification({ manifest, matrix, generatedAt, targetConnection }) {
  const summary = await writeCertificationArtifacts({ matrix, manifest, generatedAt });
  const status = summary.failed === 0 ? "certified" : "findings";
  await saveManifest({
    ...manifest,
    status,
    certification: {
      generatedAt,
      ...summary
    }
  });

  console.log(`QA database: ${sanitizedConnection(targetConnection)}`);
  console.log(`Certification: ${summary.passed}/${summary.total} checks passed (${status})`);
  console.log(`Matrix: ${displayPath(manifest.artifacts.matrix)}`);
  console.log(`Report: ${displayPath(manifest.artifacts.report)}`);
  console.log(`Findings: ${displayPath(manifest.artifacts.findings)}`);

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

function assertGeneratedTestEnvironment(environment) {
  if (environment.APP_ENV !== "test" || environment.NODE_ENV !== "test" || !environment.QA_AUTH_SECRET) {
    throw new Error("Generated QA environment is incomplete or not explicitly test/test.");
  }
}

function arrayBody(body, key) {
  return Array.isArray(body?.[key]) ? body[key] : [];
}

function mutateToken(token) {
  const replacement = token.endsWith("a") ? "b" : "a";
  return `${token.slice(0, -1)}${replacement}`;
}

function compareText(left, right) {
  return String(left).localeCompare(String(right), "en", { numeric: true });
}

function sameArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
