import { applyCors, handleOptions, InvalidJsonBodyError, methodNotAllowed, positiveInteger, readJsonBody } from "./http";
import {
  assertLoginAllowed,
  clearLoginFailures,
  loginAttemptKey,
  recordLoginFailure
} from "../../apps/backend/src/auth-rate-limit.js";
import {
  authenticationResponse,
  clearSessionCookie,
  setSessionCookie
} from "../../apps/backend/src/session-cookie.js";

type RequestLike = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, unknown>;
  body?: unknown;
  socket?: { remoteAddress?: string };
};

type SigiModule = typeof import("../../apps/backend/src/sigi-store.js");
type CaptureModule = typeof import("../../apps/backend/src/capture-store.js");
type StateModule = typeof import("../../apps/backend/src/state-store.js");

let sigiModulePromise: Promise<SigiModule> | undefined;
let captureModulePromise: Promise<CaptureModule> | undefined;
let stateModulePromise: Promise<StateModule> | undefined;

async function hydrateRuntimeState() {
  stateModulePromise ??= import("../../apps/backend/src/state-store.js");
  const state = await stateModulePromise;
  await state.hydrateState?.({ force: true });
  return state;
}

async function flushRuntimeState() {
  stateModulePromise ??= import("../../apps/backend/src/state-store.js");
  const state = await stateModulePromise;
  await state.flushPersistedState?.();
}

async function loadSigi() {
  await hydrateRuntimeState();
  sigiModulePromise ??= import("../../apps/backend/src/sigi-store.js");
  const sigi = await sigiModulePromise;
  sigi.reloadSigiStateFromPersistence?.();
  return sigi;
}

async function loadCaptures() {
  await hydrateRuntimeState();
  captureModulePromise ??= import("../../apps/backend/src/capture-store.js");
  const captures = await captureModulePromise;
  captures.reloadCaptureDraftsFromState?.();
  return captures;
}

export async function handleLogin(request: RequestLike, response: any) {
  if (prepare(request, response, ["POST", "OPTIONS"])) {
    return;
  }

  try {
    const sigi = await loadSigi();
    const payload = await readJsonBody(request);
    const username = typeof payload.username === "string"
      ? payload.username
      : typeof payload.usuario === "string"
        ? payload.usuario
        : "";
    const password = typeof payload.password === "string"
      ? payload.password
      : typeof payload.contrasena === "string"
        ? payload.contrasena
        : "";
    const attemptKey = loginAttemptKey(request, username);
    await assertLoginAllowed(attemptKey);
    const authResult = await sigi.authenticateUserResultAsync(username, password);
    const user = authResult.user;

    if (!user) {
      await recordLoginFailure(attemptKey);
      const inactiveUser = authResult.reason === "inactive_user";

      sendJson(response, inactiveUser ? 403 : 401, {
        error: inactiveUser ? "user_inactive" : "invalid_credentials",
        message: inactiveUser
          ? "El usuario está bloqueado. Contacta al administrador."
          : "Usuario o contraseña incorrectos."
      });
      return;
    }

    await clearLoginFailures(attemptKey);
    await flushRuntimeState();
    const sessionToken = sigi.createSessionToken(user);
    setSessionCookie(response, sessionToken);
    sendJson(response, 200, authenticationResponse(user, sessionToken));
  } catch (error) {
    sendErrorResponse(response, error);
  }
}

export async function handleSession(request: RequestLike, response: any) {
  if (prepare(request, response, ["GET", "OPTIONS"])) {
    return;
  }

  try {
    const sigi = await loadSigi();
    const session = sigi.sessionFromHeaders(request.headers ?? {}, { allowPasswordChange: true });
    sendJson(response, 200, { user: sigi.authenticatedUserForSession(session) });
  } catch (error) {
    sendErrorResponse(response, error);
  }
}

export async function handleLogout(request: RequestLike, response: any) {
  if (prepare(request, response, ["POST", "OPTIONS"])) {
    return;
  }

  clearSessionCookie(response);
  response.status(204).end();
}

export async function handleUpdatePassword(request: RequestLike, response: any) {
  if (prepare(request, response, ["PATCH", "OPTIONS"])) {
    return;
  }

  try {
    const sigi = await loadSigi();
    const session = sigi.sessionFromHeaders(request.headers ?? {}, { allowPasswordChange: true });
    const user = sigi.updateOwnPassword(session, await readJsonBody(request));

    sigi.recordAuditEvent(session, {
      action: "password_changed",
      resourceType: "auth",
      resourceId: session.userId,
      status: "ok",
      requestId: requestIdFromRequest(request)
    });

    await flushRuntimeState();
    const sessionToken = sigi.createSessionToken(user);
    setSessionCookie(response, sessionToken);
    sendJson(response, 200, authenticationResponse(user, sessionToken));
  } catch (error) {
    sendErrorResponse(response, error);
  }
}

export async function handleUsers(request: RequestLike, response: any) {
  if (handleOptions(request, response)) {
    return;
  }

  applyCors(response);

  try {
    const sigi = await loadSigi();
    const session = sigi.sessionFromHeaders(request.headers ?? {});

    if (request.method === "GET") {
      sendJson(response, 200, { users: sigi.listUsers(session) });
      return;
    }

    if (request.method === "POST") {
      const saved = sigi.saveUser(session, await readJsonBody(request));
      sigi.recordAuditEvent(session, {
        action: "user_created",
        resourceType: "user",
        resourceId: saved.id,
        after: saved,
        status: "ok",
        requestId: requestIdFromRequest(request)
      });
      await flushRuntimeState();
      sendJson(response, 201, saved);
      return;
    }
  } catch (error) {
    sendErrorResponse(response, error);
    return;
  }

  methodNotAllowed(response, ["GET", "POST", "OPTIONS"]);
}

export async function handleUserAction(request: RequestLike, response: any) {
  if (handleOptions(request, response)) {
    return;
  }

  applyCors(response);

  try {
    const sigi = await loadSigi();
    const session = sigi.sessionFromHeaders(request.headers ?? {});
    const userId = queryValue(request.query?.id);
    const action = queryValue(request.query?.action);

    if (!userId) {
      sendJson(response, 400, { error: "invalid_user_id" });
      return;
    }

    if (request.method === "PUT" && !action) {
      const before = sigi.listUsers(session).find((candidate) => candidate.id === userId);
      const saved = sigi.saveUser(session, { ...(await readJsonBody(request)), id: userId });
      sigi.recordAuditEvent(session, {
        action: "user_updated",
        resourceType: "user",
        resourceId: saved.id,
        before,
        after: saved,
        status: "ok",
        requestId: requestIdFromRequest(request)
      });
      await flushRuntimeState();
      sendJson(response, 200, saved);
      return;
    }

    if (request.method === "PATCH" && action === "desactivar") {
      const before = sigi.listUsers(session).find((candidate) => candidate.id === userId);
      const updated = sigi.deactivateUser(session, userId);

      if (!updated) {
        sendJson(response, 404, { error: "user_not_found", message: "No existe un usuario con ese ID." });
        return;
      }

      sigi.recordAuditEvent(session, {
        action: "user_deactivated",
        resourceType: "user",
        resourceId: updated.id,
        before,
        after: updated,
        status: "ok",
        requestId: requestIdFromRequest(request)
      });
      await flushRuntimeState();
      sendJson(response, 200, updated);
      return;
    }

    if (request.method === "PATCH" && action === "password") {
      const updated = sigi.resetUserPassword(session, userId, await readJsonBody(request));

      if (!updated) {
        sendJson(response, 404, { error: "user_not_found", message: "No existe un usuario con ese ID." });
        return;
      }

      sigi.recordAuditEvent(session, {
        action: "user_password_reset",
        resourceType: "auth",
        resourceId: updated.id,
        status: "ok",
        requestId: requestIdFromRequest(request)
      });
      await flushRuntimeState();
      sendJson(response, 200, updated);
      return;
    }
  } catch (error) {
    console.error("user_action_error", error);
    sendErrorResponse(response, error);
    return;
  }

  methodNotAllowed(response, ["PUT", "PATCH", "OPTIONS"]);
}

export async function handleIndicators(request: RequestLike, response: any) {
  if (handleOptions(request, response)) {
    return;
  }

  applyCors(response);

  try {
    const sigi = await loadSigi();
    const session = sigi.sessionFromHeaders(request.headers ?? {});

    if (request.method === "GET") {
      sendJson(response, 200, { indicators: sigi.listIndicators(session, { includeInactive: session.role === "director" }) });
      return;
    }

    if (request.method === "POST") {
      const saved = sigi.saveIndicator(session, await readJsonBody(request));
      await flushRuntimeState();
      sendJson(response, 201, saved);
      return;
    }
  } catch (error) {
    sendErrorResponse(response, error);
    return;
  }

  methodNotAllowed(response, ["GET", "POST", "OPTIONS"]);
}

export async function handleIndicatorHistory(request: RequestLike, response: any) {
  if (prepare(request, response, ["GET", "OPTIONS"])) {
    return;
  }

  try {
    const sigi = await loadSigi();
    const session = sigi.sessionFromHeaders(request.headers ?? {});
    sendJson(response, 200, { history: sigi.listIndicatorHistory(session) });
  } catch (error) {
    if (!sendKnownError(response, error)) {
      sendJson(response, 500, { error: "indicator_history_error" });
    }
  }
}

export async function handleAuditEvents(request: RequestLike, response: any) {
  if (prepare(request, response, ["GET", "OPTIONS"])) {
    return;
  }

  try {
    const sigi = await loadSigi();
    const session = sigi.sessionFromHeaders(request.headers ?? {});
    sendJson(response, 200, { events: sigi.listAuditEvents(session) });
  } catch (error) {
    if (!sendKnownError(response, error)) {
      sendJson(response, 500, { error: "audit_error", message: "No se pudo consultar la auditoria." });
    }
  }
}

export async function handleIndicatorAction(request: RequestLike, response: any) {
  if (handleOptions(request, response)) {
    return;
  }

  applyCors(response);

  try {
    const sigi = await loadSigi();
    const session = sigi.sessionFromHeaders(request.headers ?? {});
    const idOrCode = queryValue(request.query?.id);
    const action = queryValue(request.query?.action);

    if (!idOrCode) {
      sendJson(response, 400, { error: "invalid_indicator_id" });
      return;
    }

    const indicatorId = Number(idOrCode);
    const indicator = Number.isInteger(indicatorId) ? sigi.getIndicatorById(indicatorId) : sigi.getIndicatorByCode(idOrCode);

    if (request.method === "GET" && action === "template") {
      if (!indicator || !sigi.listIndicators(session, { includeInactive: session.role === "director" }).some((item) => item.id === indicator.id)) {
        sendJson(response, 404, { error: "indicator_not_found", message: "No existe un indicador con ese ID o código." });
        return;
      }

      const templatePlantelId = positiveNumber(request.query?.plantelId);
      sendJson(response, 200, sigi.templateForIndicator(
        indicator,
        sigi.templateSessionForPlantelScope(session, indicator, templatePlantelId)
      ));
      return;
    }

    if (request.method === "PUT" && !action) {
      const before = indicator;
      const saved = sigi.saveIndicator(session, { ...(await readJsonBody(request)), id: indicator?.id ?? indicatorId });
      sigi.recordAuditEvent(session, {
        action: "indicator_configured",
        resourceType: "indicator",
        resourceId: String(saved.id),
        before,
        after: saved,
        status: "ok",
        requestId: requestIdFromRequest(request)
      });
      await flushRuntimeState();
      sendJson(response, 200, saved);
      return;
    }

    if (request.method === "PATCH" && action === "desactivar") {
      if (!Number.isInteger(indicatorId)) {
        sendJson(response, 400, { error: "invalid_indicator_id", message: "El ID del indicador debe ser numérico." });
        return;
      }

      const updated = sigi.deactivateIndicator(session, indicatorId);

      if (!updated) {
        sendJson(response, 404, { error: "indicator_not_found", message: "No existe un indicador con ese ID." });
        return;
      }

      sigi.recordAuditEvent(session, {
        action: "indicator_deactivated",
        resourceType: "indicator",
        resourceId: String(updated.id),
        before: indicator,
        after: updated,
        status: "ok",
        requestId: requestIdFromRequest(request)
      });
      await flushRuntimeState();
      sendJson(response, 200, updated);
      return;
    }
  } catch (error) {
    sendErrorResponse(response, error);
    return;
  }

  methodNotAllowed(response, ["GET", "PUT", "PATCH", "OPTIONS"]);
}

export async function handleReports(request: RequestLike, response: any) {
  if (prepare(request, response, ["GET", "OPTIONS"])) {
    return;
  }

  try {
    const sigi = await loadSigi();
    sendJson(response, 200, sigi.buildReportPayload(sigi.sessionFromHeaders(request.headers ?? {}), filtersFromRequest(request)));
  } catch (error) {
    if (!sendKnownError(response, error)) {
      sendJson(response, 500, { error: "report_error" });
    }
  }
}

export async function handleOfficialSources(request: RequestLike, response: any) {
  if (prepare(request, response, ["GET", "OPTIONS"])) {
    return;
  }

  try {
    const sigi = await loadSigi();
    sendJson(response, 200, sigi.officialSourcesPayload(sigi.sessionFromHeaders(request.headers ?? {})));
  } catch (error) {
    if (!sendKnownError(response, error)) {
      sendJson(response, 500, { error: "official_sources_error" });
    }
  }
}

export async function handleNotifications(request: RequestLike, response: any) {
  if (prepare(request, response, ["GET", "OPTIONS"])) {
    return;
  }

  try {
    const sigi = await loadSigi();
    const session = sigi.sessionFromHeaders(request.headers ?? {});

    sendJson(response, 200, { notifications: sigi.listNotifications(session) });
  } catch (error) {
    if (!sendKnownError(response, error)) {
      sendJson(response, 400, { error: "notifications_error", message: "No se pudieron cargar las notificaciones." });
    }
  }
}

export async function handleNotificationAction(request: RequestLike, response: any) {
  if (prepare(request, response, ["PATCH", "OPTIONS"])) {
    return;
  }

  try {
    const sigi = await loadSigi();
    const session = sigi.sessionFromHeaders(request.headers ?? {});
    const notificationId = positiveNumber(request.query?.id);

    if (!notificationId) {
      sendJson(response, 400, { error: "invalid_notification_id", message: "El ID de la notificación no es válido." });
      return;
    }

    const notification = sigi.markNotificationRead(session, notificationId);

    if (!notification) {
      sendJson(response, 404, { error: "notification_not_found", message: "No existe una notificación con ese ID." });
      return;
    }

    await flushRuntimeState();
    sendJson(response, 200, notification);
  } catch (error) {
    if (!sendKnownError(response, error)) {
      sendJson(response, 400, { error: "notification_update_error", message: "No se pudo actualizar la notificación." });
    }
  }
}

export async function handleCaptureDrafts(request: RequestLike, response: any) {
  if (handleOptions(request, response)) {
    return;
  }

  applyCors(response);

  if (queryValue(request.query?.id)) {
    await handleCaptureAction(request, response);
    return;
  }

  try {
    const sigi = await loadSigi();
    const captures = await loadCaptures();
    const session = sigi.sessionFromHeaders(request.headers ?? {});

    if (request.method === "GET") {
      const scope = captureScopeFromQuery(request.query ?? {});

      if (!scope) {
        sendJson(response, 400, {
          error: "invalid_capture_scope",
          message: "La consulta debe incluir plantel, indicador, actividad y periodo."
        });
        return;
      }

      sigi.assertCaptureAccess(session, scope, "read");
      const capture = captures.findCaptureDraftByScope(scope);

      if (capture) {
        try {
          sigi.assertCaptureAccess(session, capture, "read");
        } catch (error) {
          if (error instanceof sigi.SigiValidationError) {
            sendJson(response, 200, { capture: null });
            return;
          }

          throw error;
        }
      }

      sendJson(response, 200, { capture: capture ?? null });
      return;
    }

    if (request.method === "POST") {
      const body = await readJsonBody(request);

      if (!captures.isCaptureDraftRequest(body)) {
        sendJson(response, 400, {
          error: "invalid_capture_payload",
          message: "La captura debe incluir identificadores válidos y filas de captura."
        });
        return;
      }

      const existingDraft = captures.findCaptureDraftByScope(body);
      const trustedBody = {
        ...body,
        payload: captures.withTrustedEvidence(body.payload, existingDraft)
      };
      sigi.assertCaptureAccess(session, trustedBody, "draft");

      if (existingDraft && !isEditableCaptureStatus(existingDraft.estado)) {
        sendJson(response, 409, {
          error: "capture_not_editable",
          message: "La captura ya fue enviada y no puede modificarse hasta que se solicite corrección."
        });
        return;
      }

      if (existingDraft && trustedBody.expectedVersion !== existingDraft.versionActual) {
        sendCaptureVersionConflict(response, existingDraft.versionActual);
        return;
      }

      const createdWithInlineEvidence = captures.createCaptureDraft(trustedBody);
      const created = await captures.externalizeCaptureEvidence(
        createdWithInlineEvidence.id,
        existingDraft?.payload.evidencia?.storageRef
      ) ?? createdWithInlineEvidence;
      sigi.recordAuditEvent(session, {
        action: "capture_saved",
        resourceType: "capture",
        resourceId: String(created.id),
        before: existingDraft,
        after: created,
        status: "ok",
        requestId: requestIdFromRequest(request)
      });
      await flushRuntimeState();
      sendJson(response, 201, created);
      return;
    }
  } catch (error) {
    if (sendKnownError(response, error)) {
      return;
    }

    console.error("capture_drafts_error", error);
    sendJson(response, 500, { error: "capture_save_error", message: "No se pudo guardar la captura. Intenta de nuevo." });
    return;
  }

  methodNotAllowed(response, ["GET", "POST", "OPTIONS"]);
}

export async function handleReviewCaptures(request: RequestLike, response: any) {
  if (prepare(request, response, ["GET", "OPTIONS"])) {
    return;
  }

  try {
    const sigi = await loadSigi();
    const session = sigi.sessionFromHeaders(request.headers ?? {});

    sendJson(response, 200, { captures: sigi.listReviewCaptures(session) });
  } catch (error) {
    if (!sendKnownError(response, error)) {
      sendJson(response, 400, { error: "invalid_review_queue", message: "No se pudo cargar la bandeja de revisión." });
    }
  }
}

export async function handleCaptureEvidence(request: RequestLike, response: any) {
  if (prepare(request, response, ["GET", "OPTIONS"])) {
    return;
  }

  const id = positiveNumber(request.query?.id);

  if (!id) {
    sendJson(response, 400, { error: "invalid_capture_id", message: "El identificador de la captura no es válido." });
    return;
  }

  try {
    const sigi = await loadSigi();
    const captures = await loadCaptures();
    const session = sigi.sessionFromHeaders(request.headers ?? {});
    const draft = captures.getCaptureDraft(id);

    if (!draft) {
      sendJson(response, 404, { error: "capture_not_found", message: "No existe una captura con ese ID." });
      return;
    }

    sigi.assertCaptureAccess(session, draft, "read");
    const evidence = draft.payload.evidencia;
    const content = await captures.readCaptureEvidenceContent(draft);

    if (!evidence?.nombre || !content?.length) {
      sendJson(response, 404, {
        error: "evidence_not_available",
        message: "La evidencia no está disponible. Solicita que el plantel reenvíe el archivo."
      });
      return;
    }

    sigi.recordEvidenceOpened(session, draft, requestIdFromRequest(request));
    await flushRuntimeState();
    applyCors(response);
    response.status(200);
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("Content-Security-Policy", "sandbox; default-src 'none'");
    response.setHeader("Content-Disposition", `inline; filename="${sanitizeDownloadFileName(evidence.nombre)}"`);
    response.setHeader("Content-Length", String(content.length));
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.end(content);
  } catch (error) {
    if (!sendKnownError(response, error)) {
      sendJson(response, 500, { error: "evidence_error", message: "No se pudo abrir la evidencia." });
    }
  }
}

export async function handleCaptureAction(request: RequestLike, response: any) {
  if (handleOptions(request, response)) {
    return;
  }

  applyCors(response);

  const id = Number(queryValue(request.query?.id));
  const action = queryValue(request.query?.action);

  if (!Number.isInteger(id) || id <= 0) {
    sendJson(response, 400, { error: "invalid_capture_id", message: "El identificador de la captura no es válido." });
    return;
  }

  try {
    const sigi = await loadSigi();
    const captures = await loadCaptures();
    const session = sigi.sessionFromHeaders(request.headers ?? {});
    const draft = captures.getCaptureDraft(id);

    if (!draft) {
      sendJson(response, 404, { error: "capture_not_found", message: "No existe una captura con ese ID." });
      return;
    }

    if (request.method === "GET" && !action) {
      sigi.assertCaptureAccess(session, draft, "read");
      sendJson(response, 200, draft);
      return;
    }

    if (request.method === "PUT" && !action) {
      const body = await readJsonBody(request);

      if (!captures.isCapturePayload(body.payload)) {
        sendJson(response, 400, { error: "invalid_capture_payload", message: "La actualización debe incluir filas de captura." });
        return;
      }

      const trustedPayload = captures.withTrustedEvidence(body.payload, draft);
      sigi.assertCaptureAccess(session, { ...draft, payload: trustedPayload }, "draft");
      const expectedVersion = positiveExpectedVersion(body);

      if (!expectedVersion) {
        sendCaptureVersionConflict(response, draft.versionActual);
        return;
      }

      const updatedDraftWithInlineEvidence = captures.updateCaptureDraft(id, trustedPayload, {
        allowReviewStatus: false,
        expectedVersion
      });

      if (!updatedDraftWithInlineEvidence) {
        sendJson(response, 409, {
          error: "capture_not_editable",
          message: "La captura ya fue enviada y no puede modificarse hasta que se solicite corrección."
        });
        return;
      }

      const updatedDraft = await captures.externalizeCaptureEvidence(
        id,
        draft.payload.evidencia?.storageRef
      ) ?? updatedDraftWithInlineEvidence;

      sigi.recordAuditEvent(session, {
        action: "capture_updated",
        resourceType: "capture",
        resourceId: String(updatedDraft.id),
        before: draft,
        after: updatedDraft,
        status: "ok",
        requestId: requestIdFromRequest(request)
      });
      await flushRuntimeState();
      sendJson(response, 200, updatedDraft);
      return;
    }

    if (request.method === "POST" && action === "enviar-revision") {
      const body = await readJsonBody(request);
      const expectedVersion = positiveExpectedVersion(body);

      if (!expectedVersion) {
        sendCaptureVersionConflict(response, draft.versionActual);
        return;
      }

      sigi.assertCaptureAccess(session, draft, "submit");
      const notificationEvent = draft.estado === "correccion_solicitada" ? "resubmitted" : "submitted";
      const updatedDraft = captures.sendCaptureToReview(
        id,
        { userId: session.userId, role: session.role },
        expectedVersion
      );

      if (!updatedDraft) {
        sendJson(response, 409, {
          error: "invalid_capture_status",
          message: "No se pudo enviar esta captura a revisión."
        });
        return;
      }

      sigi.recordCaptureNotification(notificationEvent, session, updatedDraft);
      sigi.recordAuditEvent(session, {
        action: "capture_submitted",
        resourceType: "capture",
        resourceId: String(updatedDraft.id),
        before: draft,
        after: updatedDraft,
        status: "ok",
        requestId: requestIdFromRequest(request)
      });
      await flushRuntimeState();
      sendJson(response, 200, updatedDraft);
      return;
    }

    if (request.method === "POST" && action === "aprobar") {
      const body = await readJsonBody(request);
      const expectedVersion = positiveExpectedVersion(body);

      if (!expectedVersion) {
        sendCaptureVersionConflict(response, draft.versionActual);
        return;
      }

      sigi.assertCaptureAccess(session, draft, "review");
      await captures.assertCaptureEvidenceAvailable(draft);
      sigi.assertEvidenceOpenedBeforeApproval(session, draft);
      const updatedDraft = captures.approveCapture(id, expectedVersion);

      if (!updatedDraft) {
        sendJson(response, 409, {
          error: "invalid_capture_status",
          message: "La captura debe estar en revisión para aprobarse."
        });
        return;
      }

      sigi.recordCaptureNotification("approved", session, updatedDraft);
      sigi.recordAuditEvent(session, {
        action: "capture_approved",
        resourceType: "capture",
        resourceId: String(updatedDraft.id),
        before: draft,
        after: updatedDraft,
        status: "ok",
        requestId: requestIdFromRequest(request)
      });
      await flushRuntimeState();
      sendJson(response, 200, updatedDraft);
      return;
    }

    if (request.method === "POST" && action === "observar") {
      sigi.assertCaptureAccess(session, draft, "review");
      const body = await readJsonBody(request);
      const observacion = typeof body.observacion === "string" ? body.observacion.trim() : "";
      const expectedVersion = positiveExpectedVersion(body);

      if (!expectedVersion) {
        sendCaptureVersionConflict(response, draft.versionActual);
        return;
      }

      if (!observacion) {
        sendJson(response, 400, { error: "observation_required", message: "Agrega una observación para solicitar corrección." });
        return;
      }

      const updatedDraft = captures.requestCaptureCorrection(id, observacion, expectedVersion);

      if (!updatedDraft) {
        sendJson(response, 409, {
          error: "invalid_capture_status",
          message: "La captura debe estar en revisión para solicitar corrección."
        });
        return;
      }

      sigi.recordCaptureNotification("correction_requested", session, updatedDraft);
      sigi.recordAuditEvent(session, {
        action: "capture_correction_requested",
        resourceType: "capture",
        resourceId: String(updatedDraft.id),
        before: draft,
        after: updatedDraft,
        status: "ok",
        requestId: requestIdFromRequest(request)
      });
      await flushRuntimeState();
      sendJson(response, 200, updatedDraft);
      return;
    }
  } catch (error) {
    if (sendKnownError(response, error)) {
      return;
    }

    console.error("capture_action_error", error);
    sendJson(response, 500, { error: "capture_update_error", message: "No se pudo actualizar la captura. Intenta de nuevo." });
    return;
  }

  methodNotAllowed(response, ["GET", "POST", "PUT", "OPTIONS"]);
}

function prepare(request: RequestLike, response: any, allowed: string[]) {
  if (handleOptions(request, response)) {
    return true;
  }

  if (!applyCors(response, request)) {
    sendJson(response, 403, {
      error: "origin_not_allowed",
      message: "El origen de la solicitud no está autorizado."
    });
    return true;
  }

  if (!allowed.includes(request.method ?? "")) {
    methodNotAllowed(response, allowed);
    return true;
  }

  return false;
}

function captureScopeFromQuery(query: Record<string, unknown>) {
  const plantelId = positiveNumber(query.plantelId);
  const indicadorId = positiveNumber(query.indicadorId);
  const actividadId = positiveNumber(query.actividadId);
  const periodoId = positiveNumber(query.periodoId);

  if (!plantelId || !indicadorId || !actividadId || !periodoId) {
    return undefined;
  }

  return { plantelId, indicadorId, actividadId, periodoId };
}

function positiveNumber(value: unknown) {
  const candidate = Array.isArray(value) ? value[0] : value;
  const numericValue = Number(candidate);
  return positiveInteger(numericValue) ? numericValue : undefined;
}

function isEditableCaptureStatus(status: string) {
  return status === "borrador" || status === "correccion_solicitada";
}

function positiveExpectedVersion(body: unknown) {
  if (typeof body !== "object" || body === null || !("expectedVersion" in body)) {
    return undefined;
  }

  const value = Number((body as { expectedVersion?: unknown }).expectedVersion);
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function sendCaptureVersionConflict(response: any, currentVersion: number) {
  sendJson(response, 409, {
    error: "capture_version_conflict",
    message: "La captura cambió en otra sesión. Recarga antes de guardar de nuevo.",
    currentVersion
  });
}

function filtersFromRequest(request: RequestLike) {
  const query = request.query ?? {};

  return {
    cicloEscolar: queryValue(query.cicloEscolar),
    periodo: queryValue(query.periodo),
    plantel: queryValue(query.plantel),
    plantelId: queryValue(query.plantelId),
    tipo: queryValue(query.tipo),
    estado: queryValue(query.estado) ?? queryValue(query.status)
  };
}

function queryValue(value: unknown) {
  return Array.isArray(value) ? String(value[0] ?? "") : typeof value === "string" ? value : undefined;
}

function requestIdFromRequest(request: RequestLike) {
  const value = request.headers?.["x-request-id"];
  return Array.isArray(value) ? value[0] : value;
}

function sanitizeDownloadFileName(value: string) {
  const clean = value.replace(/[\\/:*?"<>|\r\n]+/g, "-").trim();
  return clean || "evidencia.pdf";
}

function sendJson(response: any, statusCode: number, payload: unknown) {
  applyCors(response);
  response.status(statusCode).json(payload);
}

function sendErrorResponse(response: any, error: unknown) {
  if (sendKnownError(response, error)) {
    return;
  }

  console.error("sigi_server_error", error);
  sendJson(response, 500, {
    error: "server_error",
    message: "Ocurrió un error interno. Intenta de nuevo."
  });
}

function sendKnownError(response: any, error: unknown) {
  if (error instanceof InvalidJsonBodyError) {
    sendJson(response, 400, { error: "invalid_json", message: "El cuerpo de la solicitud debe ser JSON válido." });
    return true;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    "code" in error
  ) {
    const knownError = error as { statusCode: number; code: string; message?: string; retryAfterSeconds?: number };

    if (knownError.retryAfterSeconds) {
      response.setHeader("Retry-After", String(knownError.retryAfterSeconds));
    }

    sendJson(response, knownError.statusCode, { error: knownError.code, message: knownError.message });
    return true;
  }

  return false;
}
