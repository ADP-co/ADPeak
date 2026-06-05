import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  ConfigurationError,
  getAppConfig,
  loadLocalEnv,
  redactConfig
} from "./config.js";
import {
  authenticateDemoUser,
  demoDatasetPayload,
  demoRoleFlows,
  demoStatusPayload,
  publicDemoUsers
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
  payload: Record<string, unknown>
) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
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
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Origin": "*"
    });
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, healthPayload());
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
