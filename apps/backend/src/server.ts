import { createServer, type ServerResponse } from "node:http";
import {
  ConfigurationError,
  getAppConfig,
  loadLocalEnv,
  redactConfig
} from "./config.js";
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

const server = createServer((request, response) => {
  const url = new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? `localhost:${port}`}`
  );

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, healthPayload());
    return;
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
