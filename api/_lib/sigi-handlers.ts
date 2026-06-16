import { applyCors, handleOptions, methodNotAllowed, positiveInteger, readJsonBody } from "./http";

type RequestLike = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, unknown>;
  body?: unknown;
};

let sigiModulePromise: Promise<any> | undefined;
let captureModulePromise: Promise<any> | undefined;

function loadSigi() {
  sigiModulePromise ??= import("../../apps/backend/src/sigi-store.js");
  return sigiModulePromise;
}

function loadCaptures() {
  captureModulePromise ??= import("../../apps/backend/src/capture-store.js");
  return captureModulePromise;
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
    const user = sigi.authenticateUser(username, password);

    if (!user) {
      sendJson(response, 401, { error: "invalid_credentials", message: "Usuario o contrasena incorrectos." });
      return;
    }

    sendJson(response, 200, { user });
  } catch (error) {
    if (!sendKnownError(response, error)) {
      sendJson(response, 400, { error: "invalid_json", message: "El cuerpo de la solicitud debe ser JSON valido." });
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
      sendJson(response, 201, sigi.saveUser(session, await readJsonBody(request)));
      return;
    }
  } catch (error) {
    if (sendKnownError(response, error)) {
      return;
    }

    sendJson(response, 400, { error: "invalid_json", message: "El cuerpo de la solicitud debe ser JSON valido." });
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
      sendJson(response, 200, sigi.saveUser(session, { ...(await readJsonBody(request)), id: userId }));
      return;
    }

    if (request.method === "PATCH" && action === "desactivar") {
      const updated = sigi.deactivateUser(session, userId);

      if (!updated) {
        sendJson(response, 404, { error: "user_not_found", message: "No existe un usuario con ese ID." });
        return;
      }

      sendJson(response, 200, updated);
      return;
    }
  } catch (error) {
    console.error("capture_drafts_error", error);

    if (sendKnownError(response, error)) {
      return;
    }

    sendJson(response, 400, { error: "invalid_json", message: "El cuerpo de la solicitud debe ser JSON valido." });
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
      sendJson(response, 201, sigi.saveIndicator(session, await readJsonBody(request)));
      return;
    }
  } catch (error) {
    if (sendKnownError(response, error)) {
      return;
    }

    sendJson(response, 400, { error: "invalid_json", message: "El cuerpo de la solicitud debe ser JSON valido." });
    return;
  }

  methodNotAllowed(response, ["GET", "POST", "OPTIONS"]);
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
        sendJson(response, 404, { error: "indicator_not_found", message: "No existe un indicador con ese ID o codigo." });
        return;
      }

      sendJson(response, 200, sigi.templateForIndicator(indicator, session));
      return;
    }

    if (request.method === "PUT" && !action) {
      sendJson(response, 200, sigi.saveIndicator(session, { ...(await readJsonBody(request)), id: indicator?.id ?? indicatorId }));
      return;
    }

    if (request.method === "PATCH" && action === "desactivar") {
      if (!Number.isInteger(indicatorId)) {
        sendJson(response, 400, { error: "invalid_indicator_id", message: "El ID del indicador debe ser numerico." });
        return;
      }

      const updated = sigi.deactivateIndicator(session, indicatorId);

      if (!updated) {
        sendJson(response, 404, { error: "indicator_not_found", message: "No existe un indicador con ese ID." });
        return;
      }

      sendJson(response, 200, updated);
      return;
    }
  } catch (error) {
    if (sendKnownError(response, error)) {
      return;
    }

    sendJson(response, 400, { error: "invalid_json", message: "El cuerpo de la solicitud debe ser JSON valido." });
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
      sendJson(response, 200, { capture: captures.findCaptureDraftByScope(scope) ?? null });
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

      sendJson(response, 201, captures.createCaptureDraft(body));
      return;
    }
  } catch (error) {
    if (sendKnownError(response, error)) {
      return;
    }

    sendJson(response, 400, { error: "invalid_json_body", message: "El cuerpo de la solicitud debe ser JSON válido." });
    return;
  }

  methodNotAllowed(response, ["GET", "POST", "OPTIONS"]);
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
      const updatedDraft = captures.updateCaptureDraft(id, body.payload);

      if (!updatedDraft) {
        sendJson(response, 409, {
          error: "capture_not_editable",
          message: "La captura ya fue enviada y no puede modificarse hasta que se solicite corrección."
        });
        return;
      }

      sendJson(response, 200, updatedDraft);
      return;
    }

    if (request.method === "POST" && action === "enviar-revision") {
      sigi.assertCaptureAccess(session, draft, "submit");
      const updatedDraft = captures.sendCaptureToReview(id);

      if (!updatedDraft) {
        sendJson(response, 409, {
          error: "invalid_capture_status",
          message: "No se pudo enviar esta captura a revisión."
        });
        return;
      }

      sendJson(response, 200, updatedDraft);
      return;
    }

    if (request.method === "POST" && action === "aprobar") {
      sigi.assertCaptureAccess(session, draft, "review");
      const updatedDraft = captures.approveCapture(id);

      if (!updatedDraft) {
        sendJson(response, 409, {
          error: "invalid_capture_status",
          message: "La captura debe estar en revisión para aprobarse."
        });
        return;
      }

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

      sendJson(response, 200, updatedDraft);
      return;
    }
  } catch (error) {
    if (sendKnownError(response, error)) {
      return;
    }

    sendJson(response, 400, { error: "invalid_json", message: "El cuerpo de la solicitud debe ser JSON valido." });
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
  };
}

function queryValue(value: unknown) {
  return Array.isArray(value) ? String(value[0] ?? "") : typeof value === "string" ? value : undefined;
}

function sendJson(response: any, statusCode: number, payload: unknown) {
  applyCors(response);
  response.status(statusCode).json(payload);
}

function sendKnownError(response: any, error: unknown) {
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
