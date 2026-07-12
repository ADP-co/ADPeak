import { applyCors, handleOptions, InvalidJsonBodyError, methodNotAllowed, positiveInteger, readJsonBody } from "./http";

type RequestLike = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, unknown>;
  body?: unknown;
};

let sigiModulePromise: Promise<any> | undefined;
let captureModulePromise: Promise<any> | undefined;
let stateModulePromise: Promise<any> | undefined;

async function hydrateRuntimeState() {
  stateModulePromise ??= import("../../apps/backend/src/state-store.js");
  const state = await stateModulePromise;
  await state.hydrateState?.({ force: true });
  return state;
}

async function flushRuntimeState() {
  const state = await hydrateRuntimeState();
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
    const authResult = sigi.authenticateUserResult(username, password);
    const user = authResult.user;

    if (!user) {
      const inactiveUser = authResult.reason === "inactive_user";

      sendJson(response, inactiveUser ? 403 : 401, {
        error: inactiveUser ? "user_inactive" : "invalid_credentials",
        message: inactiveUser
          ? "El usuario está bloqueado. Contacta al administrador."
          : "Usuario o contraseña incorrectos."
      });
      return;
    }

    sendJson(response, 200, { user, sessionToken: sigi.createSessionToken(user) });
  } catch (error) {
    if (!sendKnownError(response, error)) {
      sendJson(response, 400, { error: "invalid_json", message: "El cuerpo de la solicitud debe ser JSON válido." });
    }
  }
}

export async function handleUpdatePassword(request: RequestLike, response: any) {
  if (prepare(request, response, ["PATCH", "OPTIONS"])) {
    return;
  }

  try {
    const sigi = await loadSigi();
    const session = sigi.sessionFromHeaders(request.headers ?? {});
    const user = sigi.updateOwnPassword(session, await readJsonBody(request));

    await flushRuntimeState();
    sendJson(response, 200, { user });
  } catch (error) {
    if (!sendKnownError(response, error)) {
      sendJson(response, 400, { error: "invalid_json", message: "El cuerpo de la solicitud debe ser JSON válido." });
    }
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
      await flushRuntimeState();
      sendJson(response, 201, saved);
      return;
    }
  } catch (error) {
    if (sendKnownError(response, error)) {
      return;
    }

    sendJson(response, 400, { error: "invalid_json", message: "El cuerpo de la solicitud debe ser JSON válido." });
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
      const saved = sigi.saveUser(session, { ...(await readJsonBody(request)), id: userId });
      await flushRuntimeState();
      sendJson(response, 200, saved);
      return;
    }

    if (request.method === "PATCH" && action === "desactivar") {
      const updated = sigi.deactivateUser(session, userId);

      if (!updated) {
        sendJson(response, 404, { error: "user_not_found", message: "No existe un usuario con ese ID." });
        return;
      }

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

      await flushRuntimeState();
      sendJson(response, 200, updated);
      return;
    }
  } catch (error) {
    console.error("capture_drafts_error", error);

    if (sendKnownError(response, error)) {
      return;
    }

    sendJson(response, 400, { error: "invalid_json", message: "El cuerpo de la solicitud debe ser JSON válido." });
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
    if (sendKnownError(response, error)) {
      return;
    }

    sendJson(response, 400, { error: "invalid_json", message: "El cuerpo de la solicitud debe ser JSON válido." });
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
      if (!indicator || !sigi.listIndicators(session, { includeInactive: session.role === "director" }).some((item: any) => item.id === indicator.id)) {
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
      const saved = sigi.saveIndicator(session, { ...(await readJsonBody(request)), id: indicator?.id ?? indicatorId });
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

      await flushRuntimeState();
      sendJson(response, 200, updated);
      return;
    }
  } catch (error) {
    if (sendKnownError(response, error)) {
      return;
    }

    sendJson(response, 400, { error: "invalid_json", message: "El cuerpo de la solicitud debe ser JSON válido." });
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

      sigi.assertCaptureAccess(session, body, "draft");
      const existingDraft = captures.findCaptureDraftByScope(body);

      if (existingDraft && !isEditableCaptureStatus(existingDraft.estado)) {
        sendJson(response, 409, {
          error: "capture_not_editable",
          message: "La captura ya fue enviada y no puede modificarse hasta que se solicite corrección."
        });
        return;
      }

      const created = captures.createCaptureDraft(body);
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
    const content = Buffer.from(evidence?.contenidoBase64 ?? "", "base64");

    if (!evidence?.nombre || content.length === 0) {
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
    response.setHeader("Content-Disposition", `inline; filename="${sanitizeDownloadFileName(evidence.nombre)}"`);
    response.setHeader("Content-Type", evidence.tipo || "application/pdf");
    response.setHeader("Content-Length", String(content.length));
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

      sigi.assertCaptureAccess(session, { ...draft, payload: body.payload }, "draft");
      const updatedDraft = captures.updateCaptureDraft(id, body.payload, {
        allowReviewStatus: false
      });

      if (!updatedDraft) {
        sendJson(response, 409, {
          error: "capture_not_editable",
          message: "La captura ya fue enviada y no puede modificarse hasta que se solicite corrección."
        });
        return;
      }

      await flushRuntimeState();
      sendJson(response, 200, updatedDraft);
      return;
    }

    if (request.method === "POST" && action === "enviar-revision") {
      sigi.assertCaptureAccess(session, draft, "submit");
      const notificationEvent = draft.estado === "correccion_solicitada" ? "resubmitted" : "submitted";
      const updatedDraft = captures.sendCaptureToReview(id, { userId: session.userId, role: session.role });

      if (!updatedDraft) {
        sendJson(response, 409, {
          error: "invalid_capture_status",
          message: "No se pudo enviar esta captura a revisión."
        });
        return;
      }

      sigi.recordCaptureNotification(notificationEvent, session, updatedDraft);
      await flushRuntimeState();
      sendJson(response, 200, updatedDraft);
      return;
    }

    if (request.method === "POST" && action === "aprobar") {
      sigi.assertCaptureAccess(session, draft, "review");
      sigi.assertEvidenceOpenedBeforeApproval(session, draft);
      const updatedDraft = captures.approveCapture(id);

      if (!updatedDraft) {
        sendJson(response, 409, {
          error: "invalid_capture_status",
          message: "La captura debe estar en revisión para aprobarse."
        });
        return;
      }

      sigi.recordCaptureNotification("approved", session, updatedDraft);
      await flushRuntimeState();
      sendJson(response, 200, updatedDraft);
      return;
    }

    if (request.method === "POST" && action === "observar") {
      sigi.assertCaptureAccess(session, draft, "review");
      const body = await readJsonBody(request);
      const observacion = typeof body.observacion === "string" ? body.observacion.trim() : "";

      if (!observacion) {
        sendJson(response, 400, { error: "observation_required", message: "Agrega una observación para solicitar corrección." });
        return;
      }

      const updatedDraft = captures.requestCaptureCorrection(id, observacion);

      if (!updatedDraft) {
        sendJson(response, 409, {
          error: "invalid_capture_status",
          message: "La captura debe estar en revisión para solicitar corrección."
        });
        return;
      }

      sigi.recordCaptureNotification("correction_requested", session, updatedDraft);
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

  applyCors(response);

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
    const knownError = error as { statusCode: number; code: string; message?: string };
    sendJson(response, knownError.statusCode, { error: knownError.code, message: knownError.message });
    return true;
  }

  return false;
}
