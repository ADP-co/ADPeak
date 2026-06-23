import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  ConfigurationError,
  getAppConfig,
  loadLocalEnv,
  redactConfig
} from "./config.js";
import {
  approveCapture,
  createCaptureDraft,
  findCaptureDraftByScope,
  getCaptureDraft,
  isCaptureDraftRequest,
  isCapturePayload,
  requestCaptureCorrection,
  reloadCaptureDraftsFromState,
  sendCaptureToReview,
  updateCaptureDraft
} from "./capture-store.js";
import {
  assertCaptureAccess,
  authenticateUser,
  buildReportPayload,
  createSessionToken,
  deactivateIndicator,
  deactivateUser,
  getIndicatorByCode,
  getIndicatorById,
  listIndicatorHistory,
  listIndicators,
  listUsers,
  officialSourcesPayload,
  reloadSigiStateFromPersistence,
  saveIndicator,
  saveUser,
  sessionFromHeaders,
  SigiAuthError,
  SigiForbiddenError,
  SigiValidationError,
  templateForIndicator
} from "./sigi-store.js";
import {
  authenticateDemoUser,
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
import { flushPersistedState, hydrateState } from "./state-store.js";

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
  await hydrateState({ force: true });
  reloadSigiStateFromPersistence();
  reloadCaptureDraftsFromState();
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  payload: unknown
) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function sendCsv(response: ServerResponse, payload: string) {
  response.writeHead(200, {
    "Access-Control-Allow-Origin": "*",
    "Content-Disposition": "attachment; filename=\"adpeak-demo-report.csv\"",
    "Content-Type": "text/csv; charset=utf-8"
  });
  response.end(payload);
}

function sendError(response: ServerResponse, error: unknown) {
  if (
    error instanceof SigiAuthError ||
    error instanceof SigiForbiddenError ||
    error instanceof SigiValidationError
  ) {
    sendJson(response, error.statusCode, {
      error: error.code,
      message: error.message
    });
    return true;
  }

  return false;
}

async function readJsonBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (request, response) => {
  const url = new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? `localhost:${port}`}`
  );

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Headers": "Authorization, Content-Type, x-session-token, x-user-id, x-role, x-plantel-id, x-responsable-id",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,OPTIONS",
      "Access-Control-Allow-Origin": "*"
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
      const user = authenticateUser(username, password);

      if (!user) {
        sendJson(response, 401, {
          error: "invalid_credentials",
          message: "Usuario o contraseña incorrectos."
        });
        return;
      }

      sendJson(response, 200, { user, sessionToken: createSessionToken(user) });
      return;
    } catch {
      sendJson(response, 400, {
        error: "invalid_json",
        message: "El cuerpo de la solicitud debe ser JSON valido."
      });
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
        await flushPersistedState();
        sendJson(response, 201, saved);
        return;
      }
    } catch (error) {
      if (sendError(response, error)) {
        return;
      }

      sendJson(response, 400, {
        error: "invalid_json",
        message: "El cuerpo de la solicitud debe ser JSON valido."
      });
      return;
    }
  }

  const userMatch = url.pathname.match(/^\/api\/v1\/usuarios\/([^/]+)(?:\/(desactivar))?$/);

  if (userMatch) {
    try {
      const session = sessionFromHeaders(request.headers);
      const userId = decodeURIComponent(userMatch[1]);
      const action = userMatch[2];

      if (request.method === "PUT" && !action) {
        const saved = saveUser(session, { ...(await readJsonBody(request)), id: userId });
        await flushPersistedState();
        sendJson(response, 200, saved);
        return;
      }

      if (request.method === "PATCH" && action === "desactivar") {
        const updated = deactivateUser(session, userId);

        if (!updated) {
          sendJson(response, 404, { error: "user_not_found", message: "No existe un usuario con ese ID." });
          return;
        }

        await flushPersistedState();
        sendJson(response, 200, updated);
        return;
      }
    } catch (error) {
      if (sendError(response, error)) {
        return;
      }

      sendJson(response, 400, { error: "invalid_json", message: "El cuerpo de la solicitud debe ser JSON valido." });
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
        await flushPersistedState();
        sendJson(response, 201, saved);
        return;
      }
    } catch (error) {
      if (sendError(response, error)) {
        return;
      }

      sendJson(response, 400, { error: "invalid_json", message: "El cuerpo de la solicitud debe ser JSON valido." });
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

        sendJson(response, 200, templateForIndicator(indicator, session));
        return;
      }

      if (request.method === "PUT" && !action) {
        const saved = saveIndicator(session, { ...(await readJsonBody(request)), id: indicator?.id ?? indicatorId });
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

        await flushPersistedState();
        sendJson(response, 200, updated);
        return;
      }
    } catch (error) {
      if (sendError(response, error)) {
        return;
      }

      sendJson(response, 400, { error: "invalid_json", message: "El cuerpo de la solicitud debe ser JSON valido." });
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
      sendJson(response, 200, { capture: findCaptureDraftByScope(scope) ?? null });
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

      assertCaptureAccess(session, payload, "draft");
      const existingDraft = findCaptureDraftByScope(payload);

      if (existingDraft && !isEditableCaptureStatus(existingDraft.estado)) {
        sendJson(response, 409, {
          error: "capture_not_editable",
          message: "La captura ya fue enviada y no puede modificarse hasta que se solicite corrección."
        });
        return;
      }

      const created = createCaptureDraft(payload);
      await flushPersistedState();
      sendJson(response, 201, created);
      return;
    } catch (error) {
      if (sendError(response, error)) {
        return;
      }

      sendJson(response, 400, {
        error: "invalid_json",
        message: "El cuerpo de la solicitud debe ser JSON valido."
      });
      return;
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
            message: "La actualizacion debe incluir payload.rows."
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

        assertCaptureAccess(session, { ...draft, payload }, "draft");
        const updatedDraft = updateCaptureDraft(captureId, payload);

        if (!updatedDraft) {
          sendJson(response, 409, {
            error: "capture_not_editable",
            message: "La captura ya fue enviada y no puede modificarse hasta que se solicite corrección."
          });
          return;
        }

        await flushPersistedState();
        sendJson(response, 200, updatedDraft);
        return;
      } catch (error) {
        if (sendError(response, error)) {
          return;
        }

        sendJson(response, 400, {
          error: "invalid_json",
          message: "El cuerpo de la solicitud debe ser JSON valido."
        });
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

        assertCaptureAccess(session, { ...draft, payload: draft.payload }, "submit");
        const updatedDraft = sendCaptureToReview(captureId);

        if (!updatedDraft) {
          sendJson(response, 409, {
            error: "invalid_capture_status",
            message: "No se pudo enviar esta captura a revisión."
          });
          return;
        }

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

        if (!observacion) {
          sendJson(response, 400, {
            error: "observation_required",
            message: "Agrega una observación para solicitar corrección."
          });
          return;
        }

        const updatedDraft = requestCaptureCorrection(captureId, observacion);

        if (!updatedDraft) {
          sendJson(response, 409, {
            error: "invalid_capture_status",
            message: "La captura debe estar en revisión para solicitar corrección."
          });
          return;
        }

        await flushPersistedState();
        sendJson(response, 200, updatedDraft);
        return;
      } catch (error) {
        if (sendError(response, error)) {
          return;
        }

        sendJson(response, 400, {
          error: "invalid_json",
          message: "El cuerpo de la solicitud debe ser JSON valido."
        });
        return;
      }
    }

    if (request.method === "POST" && action === "aprobar") {
      const draft = getCaptureDraft(captureId);

      if (!draft) {
        sendJson(response, 404, {
          error: "capture_not_found",
          message: "No existe una captura con ese ID."
        });
        return;
      }

      assertCaptureAccess(session, draft, "review");
      const updatedDraft = approveCapture(captureId);

      if (!updatedDraft) {
        sendJson(response, 409, {
          error: "invalid_capture_status",
          message: "La captura debe estar en revisión para aprobarse."
        });
        return;
      }

      await flushPersistedState();
      sendJson(response, 200, updatedDraft);
      return;
    }
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
        message: "El cuerpo de la solicitud debe ser JSON valido."
      });
      return;
    }
  }

  sendJson(response, 404, {
    error: "not_found",
    message: "Ruta no configurada"
  });
});

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
    plantelId: url.searchParams.get("plantelId") ?? undefined
  };
}

function captureScopeFromUrl(url: URL) {
  const plantelId = positiveIntegerParam(url, "plantelId");
  const indicadorId = positiveIntegerParam(url, "indicadorId");
  const actividadId = positiveIntegerParam(url, "actividadId");
  const periodoId = positiveIntegerParam(url, "periodoId");

  if (!plantelId || !indicadorId || !actividadId || !periodoId) {
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

function isEditableCaptureStatus(status: string) {
  return status === "borrador" || status === "correccion_solicitada";
}
