import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  assertLoginAllowed,
  clearLoginFailures,
  loginAttemptKey,
  recordLoginFailure
} from "./auth-rate-limit.js";
import {
  ConfigurationError,
  getAppConfig,
  loadLocalEnv,
  redactConfig
} from "./config.js";
import {
  approveCapture,
  assertCaptureEvidenceAvailable,
  CaptureVersionConflictError,
  createCaptureDraft,
  externalizeCaptureEvidence,
  findCaptureDraftByScope,
  getCaptureDraft,
  isCaptureDraftRequest,
  isCapturePayload,
  readCaptureEvidenceContent,
  requestCaptureCorrection,
  reloadCaptureDraftsFromState,
  sendCaptureToReview,
  updateCaptureDraft,
  withTrustedEvidence
} from "./capture-store.js";
import {
  assertCaptureAccess,
  assertEvidenceOpenedBeforeApproval,
  authenticatedUserForSession,
  authenticateUserResultAsync,
  buildReportPayload,
  createSessionToken,
  deactivateIndicator,
  deactivateUser,
  getIndicatorByCode,
  getIndicatorById,
  listAuditEvents,
  listIndicatorHistory,
  listIndicators,
  listNotifications,
  listReviewCaptures,
  listUsers,
  markNotificationRead,
  officialSourcesPayload,
  recordEvidenceOpened,
  recordCaptureNotification,
  recordAuditEvent,
  reloadSigiStateFromPersistence,
  resetUserPassword,
  saveIndicator,
  saveUser,
  sessionFromHeaders,
  SigiAuthError,
  SigiForbiddenError,
  SigiValidationError,
  templateSessionForPlantelScope,
  templateForIndicator,
  updateOwnPassword
} from "./sigi-store.js";
import {
  authenticationResponse,
  clearSessionCookie,
  setSessionCookie
} from "./session-cookie.js";
import {
  authenticateDemoUser,
  demoEnabled,
  demoDatasetPayload,
  demoReportCsv,
  demoReportPayload,
  demoRoleFlows,
  demoStatusPayload,
  publicDemoUsers,
  runDemoAction,
  type DemoAction,
  type DemoRole
} from "./demo-data.js";
import { healthPayload } from "./health.js";
import { API_SECURITY_HEADERS, corsDecision } from "./http-security.js";
import {
  flushPersistedState,
  hydrateState,
  withPersistedStateMutation
} from "./state-store.js";

loadLocalEnv();

let appConfig;

try {
  appConfig = getAppConfig();
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error(error.message);
    process.exit(1);
  }

  throw error;
}

const port = appConfig.backendPort;

async function prepareRuntimeState() {
  await withPersistedStateMutation(async () => {
    await hydrateState({ force: true });
    reloadSigiStateFromPersistence();
    reloadCaptureDraftsFromState();
  });
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  payload: unknown
) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function sendCsv(response: ServerResponse, payload: string) {
  response.writeHead(200, {
    "Content-Disposition": "attachment; filename=\"adpeak-demo-report.csv\"",
    "Content-Type": "text/csv; charset=utf-8"
  });
  response.end(payload);
}

function sendError(response: ServerResponse, error: unknown) {
  if (
    error instanceof SigiAuthError ||
    error instanceof SigiForbiddenError ||
    error instanceof SigiValidationError ||
    error instanceof CaptureVersionConflictError
  ) {
    sendJson(response, error.statusCode, {
      error: error.code,
      message: error.message
    });
    return true;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    "code" in error
  ) {
    const knownError = error as {
      statusCode: number;
      code: string;
      message?: string;
      retryAfterSeconds?: number;
    };

    if (knownError.retryAfterSeconds) {
      response.setHeader("Retry-After", String(knownError.retryAfterSeconds));
    }

    sendJson(response, knownError.statusCode, {
      error: knownError.code,
      message: knownError.message
    });
    return true;
  }

  return false;
}

class InvalidJsonBodyError extends Error {
  constructor() {
    super("Invalid JSON body");
    this.name = "InvalidJsonBodyError";
  }
}

function sendInvalidJson(response: ServerResponse) {
  sendJson(response, 400, {
    error: "invalid_json",
    message: "El cuerpo de la solicitud debe ser JSON válido."
  });
}

function sendMutationError(response: ServerResponse, error: unknown) {
  if (sendError(response, error)) {
    return true;
  }

  if (error instanceof InvalidJsonBodyError) {
    sendInvalidJson(response);
    return true;
  }

  sendJson(response, 500, {
    error: "server_error",
    message: "No se pudo procesar la solicitud."
  });
  return true;
}

async function readJsonBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new InvalidJsonBodyError();
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? `localhost:${port}`}`
  );
  const requestId = request.headers["x-request-id"]?.toString() || `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  response.setHeader("X-Request-Id", requestId);
  applySecurityHeaders(response);

  if (!applyCors(request, response)) {
    sendJson(response, 403, {
      error: "origin_not_allowed",
      message: "El origen de la solicitud no está autorizado."
    });
    return;
  }

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Headers": "Authorization, Content-Type, x-session-token, x-user-id, x-role, x-plantel-id, x-responsable-id, x-request-id",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    });
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, healthPayload());
    return;
  }

  await prepareRuntimeState();

  if (request.method === "POST" && url.pathname === "/api/v1/auth/login") {
    try {
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
      const authResult = await authenticateUserResultAsync(username, password);
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
      const sessionToken = createSessionToken(user);
      setSessionCookie(response, sessionToken);
      sendJson(response, 200, authenticationResponse(user, sessionToken));
      return;
    } catch (error) {
      sendMutationError(response, error);
      return;
    }
  }

  if (request.method === "GET" && url.pathname === "/api/v1/auth/session") {
    try {
      const session = sessionFromHeaders(request.headers, { allowPasswordChange: true });
      sendJson(response, 200, { user: authenticatedUserForSession(session) });
    } catch (error) {
      sendMutationError(response, error);
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/auth/logout") {
    clearSessionCookie(response);
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "PATCH" && url.pathname === "/api/v1/auth/password") {
    try {
      const session = sessionFromHeaders(request.headers, { allowPasswordChange: true });
      const user = updateOwnPassword(session, await readJsonBody(request));
      recordAuditEvent(session, {
        action: "password_changed",
        resourceType: "auth",
        resourceId: session.userId,
        status: "ok",
        requestId
      });
      await flushPersistedState();
      const sessionToken = createSessionToken(user);
      setSessionCookie(response, sessionToken);
      sendJson(response, 200, authenticationResponse(user, sessionToken));
      return;
    } catch (error) {
      sendMutationError(response, error);
      return;
    }
  }

  if (url.pathname === "/api/v1/usuarios") {
    try {
      const session = sessionFromHeaders(request.headers);

      if (request.method === "GET") {
        sendJson(response, 200, { users: listUsers(session) });
        return;
      }

      if (request.method === "POST") {
        const saved = saveUser(session, await readJsonBody(request));
        recordAuditEvent(session, {
          action: "user_created",
          resourceType: "user",
          resourceId: saved.id,
          after: saved,
          status: "ok",
          requestId
        });
        await flushPersistedState();
        sendJson(response, 201, saved);
        return;
      }
    } catch (error) {
      sendMutationError(response, error);
      return;
    }
  }

  const userMatch = url.pathname.match(/^\/api\/v1\/usuarios\/([^/]+)(?:\/(desactivar|password))?$/);

  if (userMatch) {
    try {
      const session = sessionFromHeaders(request.headers);
      const userId = decodeURIComponent(userMatch[1]);
      const action = userMatch[2];

      if (request.method === "PUT" && !action) {
        const before = listUsers(session).find((candidate) => candidate.id === userId);
        const saved = saveUser(session, { ...(await readJsonBody(request)), id: userId });
        recordAuditEvent(session, {
          action: "user_updated",
          resourceType: "user",
          resourceId: saved.id,
          before,
          after: saved,
          status: "ok",
          requestId
        });
        await flushPersistedState();
        sendJson(response, 200, saved);
        return;
      }

      if (request.method === "PATCH" && action === "desactivar") {
        const before = listUsers(session).find((candidate) => candidate.id === userId);
        const updated = deactivateUser(session, userId);

        if (!updated) {
          sendJson(response, 404, { error: "user_not_found", message: "No existe un usuario con ese ID." });
          return;
        }

        recordAuditEvent(session, {
          action: "user_deactivated",
          resourceType: "user",
          resourceId: updated.id,
          before,
          after: updated,
          status: "ok",
          requestId
        });
        await flushPersistedState();
        sendJson(response, 200, updated);
        return;
      }

      if (request.method === "PATCH" && action === "password") {
        const updated = resetUserPassword(session, userId, await readJsonBody(request));

        if (!updated) {
          sendJson(response, 404, { error: "user_not_found", message: "No existe un usuario con ese ID." });
          return;
        }

        recordAuditEvent(session, {
          action: "user_password_reset",
          resourceType: "auth",
          resourceId: updated.id,
          status: "ok",
          requestId
        });
        await flushPersistedState();
        sendJson(response, 200, updated);
        return;
      }
    } catch (error) {
      if (sendError(response, error)) {
        return;
      }

      sendMutationError(response, error);
      return;
    }
  }

  if (url.pathname === "/api/v1/indicadores") {
    try {
      const session = sessionFromHeaders(request.headers);

      if (request.method === "GET") {
        sendJson(response, 200, { indicators: listIndicators(session, { includeInactive: session.role === "director" }) });
        return;
      }

      if (request.method === "POST") {
        const saved = saveIndicator(session, await readJsonBody(request));
        recordAuditEvent(session, {
          action: "indicator_created",
          resourceType: "indicator",
          resourceId: String(saved.id),
          after: saved,
          status: "ok",
          requestId
        });
        await flushPersistedState();
        sendJson(response, 201, saved);
        return;
      }
    } catch (error) {
      sendMutationError(response, error);
      return;
    }
  }

  if (request.method === "GET" && url.pathname === "/api/v1/indicadores/historial") {
    try {
      const session = sessionFromHeaders(request.headers);
      sendJson(response, 200, { history: listIndicatorHistory(session) });
      return;
    } catch (error) {
      if (sendError(response, error)) {
        return;
      }

      sendJson(response, 400, { error: "invalid_request", message: "No se pudo consultar el historial." });
      return;
    }
  }

  const indicatorMatch = url.pathname.match(/^\/api\/v1\/indicadores\/([^/]+)(?:\/(template|desactivar))?$/);

  if (indicatorMatch) {
    try {
      const session = sessionFromHeaders(request.headers);
      const idOrCode = decodeURIComponent(indicatorMatch[1]);
      const action = indicatorMatch[2];
      const indicatorId = Number(idOrCode);
      const indicator = Number.isInteger(indicatorId)
        ? getIndicatorById(indicatorId)
        : getIndicatorByCode(idOrCode);

      if (request.method === "GET" && action === "template") {
        if (!indicator || !listIndicators(session, { includeInactive: session.role === "director" }).some((item) => item.id === indicator.id)) {
          sendJson(response, 404, { error: "indicator_not_found", message: "No existe un indicador con ese ID o código." });
          return;
        }

        const templatePlantelId = positiveIntegerParam(url, "plantelId");
        sendJson(response, 200, templateForIndicator(
          indicator,
          templateSessionForPlantelScope(session, indicator, templatePlantelId)
        ));
        return;
      }

      if (request.method === "PUT" && !action) {
        const before = indicator;
        const saved = saveIndicator(session, { ...(await readJsonBody(request)), id: indicator?.id ?? indicatorId });
        recordAuditEvent(session, {
          action: "indicator_configured",
          resourceType: "indicator",
          resourceId: String(saved.id),
          before,
          after: saved,
          status: "ok",
          requestId
        });
        await flushPersistedState();
        sendJson(response, 200, saved);
        return;
      }

      if (request.method === "PATCH" && action === "desactivar") {
        if (!Number.isInteger(indicatorId)) {
          sendJson(response, 400, { error: "invalid_indicator_id", message: "El ID del indicador debe ser numerico." });
          return;
        }

        const updated = deactivateIndicator(session, indicatorId);

        if (!updated) {
          sendJson(response, 404, { error: "indicator_not_found", message: "No existe un indicador con ese ID." });
          return;
        }

        recordAuditEvent(session, {
          action: "indicator_deactivated",
          resourceType: "indicator",
          resourceId: String(updated.id),
          before: indicator,
          after: updated,
          status: "ok",
          requestId
        });
        await flushPersistedState();
        sendJson(response, 200, updated);
        return;
      }
    } catch (error) {
      if (sendError(response, error)) {
        return;
      }

      sendMutationError(response, error);
      return;
    }
  }

  if (request.method === "GET" && url.pathname === "/api/v1/auditoria") {
    try {
      const session = sessionFromHeaders(request.headers);
      sendJson(response, 200, { events: listAuditEvents(session) });
      return;
    } catch (error) {
      if (sendError(response, error)) {
        return;
      }

      sendJson(response, 500, { error: "audit_error", message: "No se pudo consultar la auditoria." });
      return;
    }
  }

  if (request.method === "GET" && url.pathname === "/api/v1/reportes") {
    try {
      sendJson(response, 200, buildReportPayload(sessionFromHeaders(request.headers), reportFiltersFromUrl(url)));
      return;
    } catch (error) {
      if (sendError(response, error)) {
        return;
      }

      throw error;
    }
  }

  if (request.method === "GET" && url.pathname === "/api/v1/fuentes-oficiales") {
    try {
      sendJson(response, 200, officialSourcesPayload(sessionFromHeaders(request.headers)));
      return;
    } catch (error) {
      if (sendError(response, error)) {
        return;
      }

      throw error;
    }
  }

  if (request.method === "GET" && url.pathname === "/api/v1/capturas/borradores") {
    try {
      const session = sessionFromHeaders(request.headers);
      const scope = captureScopeFromUrl(url);

      if (!scope) {
        sendJson(response, 400, {
          error: "invalid_capture_scope",
          message: "La consulta debe incluir plantelId, indicadorId, actividadId y periodoId."
        });
        return;
      }

      assertCaptureAccess(session, scope, "read");
      const capture = findCaptureDraftByScope(scope);

      if (capture) {
        try {
          assertCaptureAccess(session, capture, "read");
        } catch (error) {
          if (error instanceof SigiValidationError) {
            sendJson(response, 200, { capture: null });
            return;
          }

          throw error;
        }
      }

      sendJson(response, 200, { capture: capture ?? null });
      return;
    } catch (error) {
      if (sendError(response, error)) {
        return;
      }

      throw error;
    }
  }

  if (request.method === "GET" && url.pathname === "/api/v1/capturas/en-revision") {
    try {
      sendJson(response, 200, { captures: listReviewCaptures(sessionFromHeaders(request.headers)) });
      return;
    } catch (error) {
      if (sendError(response, error)) {
        return;
      }

      throw error;
    }
  }

  if (request.method === "GET" && url.pathname === "/api/v1/notificaciones") {
    try {
      sendJson(response, 200, { notifications: listNotifications(sessionFromHeaders(request.headers)) });
      return;
    } catch (error) {
      if (sendError(response, error)) {
        return;
      }

      throw error;
    }
  }

  const notificationMatch = url.pathname.match(/^\/api\/v1\/notificaciones\/(\d+)\/leida$/);

  if (notificationMatch && request.method === "PATCH") {
    try {
      const session = sessionFromHeaders(request.headers);
      const notificationId = Number(notificationMatch[1]);
      const notification = markNotificationRead(session, notificationId);

      if (!notification) {
        sendJson(response, 404, {
          error: "notification_not_found",
          message: "No existe una notificación con ese ID."
        });
        return;
      }

      await flushPersistedState();
      sendJson(response, 200, notification);
      return;
    } catch (error) {
      if (sendError(response, error)) {
        return;
      }

      throw error;
    }
  }

  if (request.method === "POST" && url.pathname === "/api/v1/capturas/borradores") {
    try {
      const session = sessionFromHeaders(request.headers);
      const payload = await readJsonBody(request);

      if (!isCaptureDraftRequest(payload)) {
        sendJson(response, 400, {
          error: "invalid_capture_draft",
          message: "La captura debe incluir IDs positivos y payload.rows."
        });
        return;
      }

      const existingDraft = findCaptureDraftByScope(payload);
      const trustedPayload = {
        ...payload,
        payload: withTrustedEvidence(payload.payload, existingDraft)
      };
      assertCaptureAccess(session, trustedPayload, "draft");

      if (existingDraft && !isEditableCaptureStatus(existingDraft.estado)) {
        sendJson(response, 409, {
          error: "capture_not_editable",
          message: "La captura ya fue enviada y no puede modificarse hasta que se solicite corrección."
        });
        return;
      }

      if (existingDraft && trustedPayload.expectedVersion !== existingDraft.versionActual) {
        sendCaptureVersionConflict(response, existingDraft.versionActual);
        return;
      }

      const createdWithInlineEvidence = createCaptureDraft(trustedPayload);
      const created = await externalizeCaptureEvidence(
        createdWithInlineEvidence.id,
        existingDraft?.payload.evidencia?.storageRef
      ) ?? createdWithInlineEvidence;
      recordAuditEvent(session, {
        action: "capture_saved",
        resourceType: "capture",
        resourceId: String(created.id),
        before: existingDraft,
        after: created,
        status: "ok",
        requestId
      });
      await flushPersistedState();
      sendJson(response, 201, created);
      return;
    } catch (error) {
      sendMutationError(response, error);
      return;
    }
  }

  const evidenceMatch = url.pathname.match(/^\/api\/v1\/capturas\/(\d+)\/evidencia$/);

  if (request.method === "GET" && evidenceMatch) {
    try {
      const session = sessionFromHeaders(request.headers);
      const captureId = Number(evidenceMatch[1]);
      const draft = getCaptureDraft(captureId);

      if (!draft) {
        sendJson(response, 404, {
          error: "capture_not_found",
          message: "No existe una captura con ese ID."
        });
        return;
      }

      assertCaptureAccess(session, draft, "read");
      const evidence = draft.payload.evidencia;
      const fileName = sanitizeDownloadFileName(evidence?.nombre || `evidencia-${captureId}.pdf`);
      const content = await readCaptureEvidenceContent(draft);

      if (!evidence?.nombre || !content?.length) {
        sendJson(response, 404, {
          error: "evidence_not_available",
          message: "La evidencia no está disponible. Solicita que el plantel reenvíe el archivo."
        });
        return;
      }

      recordEvidenceOpened(session, draft, requestId);

      response.writeHead(200, {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "private, no-store",
        "Content-Security-Policy": "sandbox; default-src 'none'",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Content-Length": String(content.length),
        "Content-Type": "application/pdf",
        "X-Content-Type-Options": "nosniff"
      });
      response.end(content);
      await flushPersistedState();
      return;
    } catch (error) {
      if (sendError(response, error)) {
        return;
      }

      throw error;
    }
  }

  const captureMatch = url.pathname.match(/^\/api\/v1\/capturas\/(\d+)(?:\/(enviar-revision|observar|aprobar))?$/);

  if (captureMatch) {
    let session: ReturnType<typeof sessionFromHeaders>;

    try {
      session = sessionFromHeaders(request.headers);
    } catch (error) {
      if (sendError(response, error)) {
        return;
      }

      throw error;
    }

    const captureId = Number(captureMatch[1]);
    const action = captureMatch[2];

    if (request.method === "GET" && !action) {
      try {
        const draft = getCaptureDraft(captureId);

      if (!draft) {
        sendJson(response, 404, {
          error: "capture_not_found",
          message: "No existe una captura con ese ID."
        });
        return;
      }

        assertCaptureAccess(session, draft, "read");
        sendJson(response, 200, draft);
      } catch (error) {
        if (sendError(response, error)) {
          return;
        }

        throw error;
      }
      return;
    }

    if (request.method === "PUT" && !action) {
      try {
        const body = await readJsonBody(request);
        const payload = typeof body === "object" && body !== null && "payload" in body
          ? (body as { payload?: unknown }).payload
          : undefined;

        if (!isCapturePayload(payload)) {
          sendJson(response, 400, {
            error: "invalid_capture_payload",
            message: "La actualización debe incluir filas de captura."
          });
          return;
        }

        const draft = getCaptureDraft(captureId);

        if (!draft) {
          sendJson(response, 404, {
            error: "capture_not_found",
            message: "No existe una captura con ese ID."
          });
          return;
        }

        const trustedPayload = withTrustedEvidence(payload, draft);
        assertCaptureAccess(session, { ...draft, payload: trustedPayload }, "draft");
        const expectedVersion = positiveExpectedVersion(body);

        if (!expectedVersion) {
          sendCaptureVersionConflict(response, draft.versionActual);
          return;
        }

        const updatedDraftWithInlineEvidence = updateCaptureDraft(captureId, trustedPayload, { expectedVersion });

        if (!updatedDraftWithInlineEvidence) {
          sendJson(response, 409, {
            error: "capture_not_editable",
            message: "La captura ya fue enviada y no puede modificarse hasta que se solicite corrección."
          });
          return;
        }

        const updatedDraft = await externalizeCaptureEvidence(
          captureId,
          draft.payload.evidencia?.storageRef
        ) ?? updatedDraftWithInlineEvidence;

        recordAuditEvent(session, {
          action: "capture_updated",
          resourceType: "capture",
          resourceId: String(updatedDraft.id),
          before: draft,
          after: updatedDraft,
          status: "ok",
          requestId
        });
        await flushPersistedState();
        sendJson(response, 200, updatedDraft);
        return;
      } catch (error) {
        sendMutationError(response, error);
        return;
      }
    }

    if (request.method === "POST" && action === "enviar-revision") {
      try {
        const draft = getCaptureDraft(captureId);

        if (!draft) {
          sendJson(response, 404, {
            error: "capture_not_found",
            message: "No existe una captura con ese ID."
          });
          return;
        }

        const expectedVersion = positiveExpectedVersion(await readJsonBody(request));

        if (!expectedVersion) {
          sendCaptureVersionConflict(response, draft.versionActual);
          return;
        }

        assertCaptureAccess(session, { ...draft, payload: draft.payload }, "submit");
        const notificationEvent = draft.estado === "correccion_solicitada" ? "resubmitted" : "submitted";
        const updatedDraft = sendCaptureToReview(captureId, {
          userId: session.userId,
          role: session.role
        }, expectedVersion);

        if (!updatedDraft) {
          sendJson(response, 409, {
            error: "invalid_capture_status",
            message: "No se pudo enviar esta captura a revisión."
          });
          return;
        }

        recordCaptureNotification(notificationEvent, session, updatedDraft);
        recordAuditEvent(session, {
          action: "capture_submitted",
          resourceType: "capture",
          resourceId: String(updatedDraft.id),
          before: draft,
          after: updatedDraft,
          status: "ok",
          requestId
        });
        await flushPersistedState();
        sendJson(response, 200, updatedDraft);
        return;
      } catch (error) {
        if (sendError(response, error)) {
          return;
        }

        sendJson(response, 400, {
          error: "invalid_capture",
          message: "No se pudo enviar esta captura a revisión."
        });
        return;
      }
    }

    if (request.method === "POST" && action === "observar") {
      try {
        const draft = getCaptureDraft(captureId);

        if (!draft) {
          sendJson(response, 404, {
            error: "capture_not_found",
            message: "No existe una captura con ese ID."
          });
          return;
        }

        assertCaptureAccess(session, draft, "review");
        const body = await readJsonBody(request);
        const observacion = typeof body.observacion === "string" ? body.observacion.trim() : "";
        const expectedVersion = positiveExpectedVersion(body);

        if (!expectedVersion) {
          sendCaptureVersionConflict(response, draft.versionActual);
          return;
        }

        if (!observacion) {
          sendJson(response, 400, {
            error: "observation_required",
            message: "Agrega una observación para solicitar corrección."
          });
          return;
        }

        const updatedDraft = requestCaptureCorrection(captureId, observacion, expectedVersion);

        if (!updatedDraft) {
          sendJson(response, 409, {
            error: "invalid_capture_status",
            message: "La captura debe estar en revisión para solicitar corrección."
          });
          return;
        }

        recordCaptureNotification("correction_requested", session, updatedDraft);
        recordAuditEvent(session, {
          action: "capture_correction_requested",
          resourceType: "capture",
          resourceId: String(updatedDraft.id),
          before: draft,
          after: updatedDraft,
          status: "ok",
          requestId
        });
        await flushPersistedState();
        sendJson(response, 200, updatedDraft);
        return;
      } catch (error) {
        sendMutationError(response, error);
        return;
      }
    }

    if (request.method === "POST" && action === "aprobar") {
      try {
        const draft = getCaptureDraft(captureId);

        if (!draft) {
          sendJson(response, 404, {
            error: "capture_not_found",
            message: "No existe una captura con ese ID."
          });
          return;
        }

        const expectedVersion = positiveExpectedVersion(await readJsonBody(request));

        if (!expectedVersion) {
          sendCaptureVersionConflict(response, draft.versionActual);
          return;
        }

        assertCaptureAccess(session, draft, "review");
        await assertCaptureEvidenceAvailable(draft);
        assertEvidenceOpenedBeforeApproval(session, draft);
        const updatedDraft = approveCapture(captureId, expectedVersion);

        if (!updatedDraft) {
          sendJson(response, 409, {
            error: "invalid_capture_status",
            message: "La captura debe estar en revisión para aprobarse."
          });
          return;
        }

        recordCaptureNotification("approved", session, updatedDraft);
        recordAuditEvent(session, {
          action: "capture_approved",
          resourceType: "capture",
          resourceId: String(updatedDraft.id),
          before: draft,
          after: updatedDraft,
          status: "ok",
          requestId
        });
        await flushPersistedState();
        sendJson(response, 200, updatedDraft);
      } catch (error) {
        if (sendError(response, error)) {
          return;
        }

        throw error;
      }
      return;
    }
  }

  if (url.pathname.startsWith("/demo/") && !demoEnabled()) {
    sendJson(response, 404, { error: "not_found", message: "Ruta no disponible." });
    return;
  }

  if (request.method === "GET" && url.pathname === "/demo/status") {
    sendJson(response, 200, demoStatusPayload());
    return;
  }

  if (request.method === "GET" && url.pathname === "/demo/users") {
    sendJson(response, 200, { users: publicDemoUsers() });
    return;
  }

  if (request.method === "GET" && url.pathname === "/demo/data") {
    sendJson(response, 200, demoDatasetPayload());
    return;
  }

  if (request.method === "GET" && url.pathname === "/demo/report") {
    sendJson(response, 200, demoReportPayload(reportFiltersFromUrl(url)));
    return;
  }

  if (request.method === "GET" && url.pathname === "/demo/report.csv") {
    sendCsv(response, demoReportCsv(reportFiltersFromUrl(url)));
    return;
  }

  if (request.method === "GET" && url.pathname === "/demo/roles") {
    sendJson(response, 200, { roles: demoRoleFlows() });
    return;
  }

  if (request.method === "POST" && url.pathname === "/demo/login") {
    try {
      const payload = await readJsonBody(request);
      const email =
        typeof payload.email === "string" ? payload.email : "";
      const accessCode =
        typeof payload.accessCode === "string" ? payload.accessCode : "";
      const session = authenticateDemoUser(email, accessCode);

      if (!session) {
        sendJson(response, 401, {
          error: "demo_login_invalid",
          message: "Usuario demo o código de acceso inválido."
        });
        return;
      }

      sendJson(response, 200, session);
      return;
    } catch {
      sendJson(response, 400, {
        error: "invalid_json",
          message: "El cuerpo de la solicitud debe ser JSON válido."
      });
      return;
    }
  }

  if (request.method === "POST" && url.pathname === "/demo/action") {
    try {
      const payload = await readJsonBody(request);
      const role = typeof payload.role === "string" ? payload.role : "";
      const action = typeof payload.action === "string" ? payload.action : "";
      const result = runDemoAction(role as DemoRole, action as DemoAction);

      if (!result) {
        sendJson(response, 403, {
          error: "demo_action_forbidden",
          message: "La acción demo no está permitida para el rol seleccionado."
        });
        return;
      }

      sendJson(response, 200, result);
      return;
    } catch {
      sendJson(response, 400, {
        error: "invalid_json",
        message: "El cuerpo de la solicitud debe ser JSON válido."
      });
      return;
    }
  }

  sendJson(response, 404, {
    error: "not_found",
    message: "Ruta no configurada"
  });
});

function applyCors(request: IncomingMessage, response: ServerResponse) {
  const decision = corsDecision(request.headers);

  if (!decision.allowed) {
    return false;
  }

  if (!decision.origin) {
    return true;
  }

  response.setHeader("Access-Control-Allow-Origin", decision.origin);
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader("Vary", "Origin");
  return true;
}

function applySecurityHeaders(response: ServerResponse) {
  for (const [name, value] of Object.entries(API_SECURITY_HEADERS)) {
    response.setHeader(name, value);
  }
}

server.listen(port, () => {
  console.log(`Backend listo en http://127.0.0.1:${port}`);
  console.log(`Healthcheck: http://127.0.0.1:${port}/health`);
  console.log(`Configuración: ${JSON.stringify(redactConfig(appConfig))}`);
});

function reportFiltersFromUrl(url: URL) {
  return {
    cicloEscolar: url.searchParams.get("cicloEscolar") ?? undefined,
    periodo: url.searchParams.get("periodo") ?? undefined,
    plantel: url.searchParams.get("plantel") ?? undefined,
    plantelId: url.searchParams.get("plantelId") ?? undefined,
    tipo: url.searchParams.get("tipo") ?? undefined,
    estado: url.searchParams.get("estado") ?? url.searchParams.get("status") ?? undefined
  };
}

function captureScopeFromUrl(url: URL) {
  const plantelId = nonNegativeIntegerParam(url, "plantelId");
  const indicadorId = positiveIntegerParam(url, "indicadorId");
  const actividadId = positiveIntegerParam(url, "actividadId");
  const periodoId = positiveIntegerParam(url, "periodoId");

  if (plantelId === undefined || !indicadorId || !actividadId || !periodoId) {
    return undefined;
  }

  return {
    plantelId,
    indicadorId,
    actividadId,
    periodoId
  };
}

function positiveIntegerParam(url: URL, key: string) {
  const value = Number(url.searchParams.get(key));
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function sanitizeDownloadFileName(value: string) {
  const clean = value.replace(/[\\/:*?"<>|]+/g, "-").trim();
  return clean || "evidencia.pdf";
}

function nonNegativeIntegerParam(url: URL, key: string) {
  const value = Number(url.searchParams.get(key));
  return Number.isInteger(value) && value >= 0 ? value : undefined;
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

function sendCaptureVersionConflict(response: ServerResponse, currentVersion: number) {
  sendJson(response, 409, {
    error: "capture_version_conflict",
    message: "La captura cambió en otra sesión. Recarga antes de guardar de nuevo.",
    currentVersion
  });
}
