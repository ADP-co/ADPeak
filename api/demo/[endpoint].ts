import {
  authenticateDemoUser,
  demoDatasetPayload,
  demoReportCsv,
  demoReportPayload,
  demoRoleFlows,
  demoStatusPayload,
  publicDemoUsers,
  runDemoAction
} from "../_lib/demo";
import { applyCors, handleOptions, isRecord, methodNotAllowed, readJsonBody } from "../_lib/http";

export default async function handler(request: any, response: any) {
  if (handleOptions(request, response)) {
    return;
  }

  applyCors(response);

  const endpoint = String(request.query?.endpoint ?? "");

  if (request.method === "GET") {
    if (endpoint === "status") {
      response.status(200).json(demoStatusPayload());
      return;
    }

    if (endpoint === "users") {
      response.status(200).json({ users: publicDemoUsers() });
      return;
    }

    if (endpoint === "data") {
      response.status(200).json(demoDatasetPayload());
      return;
    }

    if (endpoint === "roles") {
      response.status(200).json({ roles: demoRoleFlows() });
      return;
    }

    if (endpoint === "report") {
      response.status(200).json(demoReportPayload(reportFiltersFromQuery(request.query ?? {})));
      return;
    }

    if (endpoint === "report.csv") {
      response.setHeader("Content-Type", "text/csv; charset=utf-8");
      response.status(200).send(demoReportCsv(reportFiltersFromQuery(request.query ?? {})));
      return;
    }

    response.status(404).json({ error: "demo_endpoint_not_found" });
    return;
  }

  if (request.method === "POST") {
    const body = await readJsonBody(request);

    if (endpoint === "login") {
      if (!isRecord(body) || typeof body.email !== "string" || typeof body.accessCode !== "string") {
        response.status(400).json({ error: "invalid_login_payload" });
        return;
      }

      const authResult = authenticateDemoUser(body.email, body.accessCode);

      if (!authResult) {
        response.status(401).json({ error: "invalid_demo_credentials" });
        return;
      }

      response.status(200).json(authResult);
      return;
    }

    if (endpoint === "action") {
      if (!isRecord(body) || typeof body.role !== "string" || typeof body.action !== "string") {
        response.status(400).json({ error: "invalid_action_payload" });
        return;
      }

      const actionResult = runDemoAction(body.role as any, body.action as any);

      if (!actionResult) {
        response.status(403).json({ error: "action_not_allowed" });
        return;
      }

      response.status(200).json(actionResult);
      return;
    }
  }

  methodNotAllowed(response, ["GET", "POST", "OPTIONS"]);
}

function reportFiltersFromQuery(query: Record<string, unknown>) {
  return {
    cicloEscolar: queryValue(query.cicloEscolar),
    periodo: queryValue(query.periodo),
    plantel: queryValue(query.plantel),
    plantelId: queryValue(query.plantelId)
  };
}

function queryValue(value: unknown) {
  return Array.isArray(value) ? String(value[0] ?? "") : typeof value === "string" ? value : undefined;
}
