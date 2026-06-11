import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  ConfigurationError,
  getAppConfig,
  loadLocalEnv,
  redactConfig
} from "./config.js";
import {
  createCaptureDraft,
  getCaptureDraft,
  isCaptureDraftRequest,
  isCapturePayload,
  sendCaptureToReview,
  updateCaptureDraft
} from "./capture-store.js";
import {
  authenticateDemoUser,
  demoDatasetPayload,
  demoReportCsv,
  demoRoleFlows,
  demoStatusPayload,
  publicDemoUsers,
  runDemoAction,
  type DemoAction,
  type DemoRole
} from "./demo-data.js";
import { healthPayload } from "./health.js";

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
      "Access-Control-Allow-Headers": "Content-Type, x-user-id, x-role, x-plantel-id, x-responsable-id",
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

  if (request.method === "POST" && url.pathname === "/api/v1/capturas/borradores") {
    try {
      const payload = await readJsonBody(request);

      if (!isCaptureDraftRequest(payload)) {
        sendJson(response, 400, {
          error: "invalid_capture_draft",
          message: "La captura debe incluir IDs positivos y payload.rows."
        });
        return;
      }

      sendJson(response, 201, createCaptureDraft(payload));
      return;
    } catch {
      sendJson(response, 400, {
        error: "invalid_json",
        message: "El cuerpo de la solicitud debe ser JSON valido."
      });
      return;
    }
  }

  const captureMatch = url.pathname.match(/^\/api\/v1\/capturas\/(\d+)(?:\/(enviar-revision))?$/);

  if (captureMatch) {
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

        const updatedDraft = updateCaptureDraft(captureId, payload);

        if (!updatedDraft) {
          sendJson(response, 404, {
            error: "capture_not_found",
            message: "No existe una captura con ese ID."
          });
          return;
        }

        sendJson(response, 200, updatedDraft);
        return;
      } catch {
        sendJson(response, 400, {
          error: "invalid_json",
          message: "El cuerpo de la solicitud debe ser JSON valido."
        });
        return;
      }
    }

    if (request.method === "POST" && action === "enviar-revision") {
      const updatedDraft = sendCaptureToReview(captureId);

      if (!updatedDraft) {
        sendJson(response, 404, {
          error: "capture_not_found",
          message: "No existe una captura con ese ID."
        });
        return;
      }

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

  if (request.method === "GET" && url.pathname === "/demo/report.csv") {
    sendCsv(response, demoReportCsv());
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
          message: "Usuario demo o codigo de acceso invalido."
        });
        return;
      }

      sendJson(response, 200, session);
      return;
    } catch {
      sendJson(response, 400, {
        error: "invalid_json",
        message: "El cuerpo de la solicitud debe ser JSON valido."
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
          message: "La accion demo no esta permitida para el rol seleccionado."
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
  console.log(`Configuracion: ${JSON.stringify(redactConfig(appConfig))}`);
});
