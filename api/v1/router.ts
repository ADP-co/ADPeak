import {
  handleCaptureAction,
  handleCaptureDrafts,
  handleReviewCaptures,
  handleIndicatorAction,
  handleIndicatorHistory,
  handleIndicators,
  handleLogin,
  handleNotificationAction,
  handleNotifications,
  handleOfficialSources,
  handleReports,
  handleUpdatePassword,
  handleUserAction,
  handleUsers,
} from "../_lib/sigi-handlers";
import { applyCors, handleOptions } from "../_lib/http";

export default async function handler(request: any, response: any) {
  if (handleOptions(request, response)) {
    return;
  }

  applyCors(response);

  const path = routePath(request);

  if (path === "auth/login") {
    await handleLogin(request, response);
    return;
  }

  if (path === "auth/password") {
    await handleUpdatePassword(request, response);
    return;
  }

  if (path === "usuarios") {
    await handleUsers(request, response);
    return;
  }

  const userMatch = path.match(/^usuarios\/([^/]+)(?:\/(desactivar|password))?$/);
  if (userMatch) {
    await handleUserAction(withQuery(request, { id: userMatch[1], action: userMatch[2] }), response);
    return;
  }

  if (path === "indicadores") {
    await handleIndicators(request, response);
    return;
  }

  if (path === "indicadores/historial") {
    await handleIndicatorHistory(request, response);
    return;
  }

  const indicatorMatch = path.match(/^indicadores\/([^/]+)(?:\/(template|desactivar))?$/);
  if (indicatorMatch) {
    await handleIndicatorAction(withQuery(request, { id: indicatorMatch[1], action: indicatorMatch[2] }), response);
    return;
  }

  if (path === "reportes") {
    await handleReports(request, response);
    return;
  }

  if (path === "fuentes-oficiales") {
    await handleOfficialSources(request, response);
    return;
  }

  if (path === "notificaciones") {
    await handleNotifications(request, response);
    return;
  }

  const notificationMatch = path.match(/^notificaciones\/(\d+)\/leida$/);
  if (notificationMatch) {
    await handleNotificationAction(withQuery(request, { id: notificationMatch[1] }), response);
    return;
  }

  if (path === "capturas/borradores") {
    await handleCaptureDrafts(request, response);
    return;
  }

  if (path === "capturas/en-revision") {
    await handleReviewCaptures(request, response);
    return;
  }

  const captureMatch = path.match(/^capturas\/(\d+)(?:\/(enviar-revision|observar|aprobar))?$/);
  if (captureMatch) {
    await handleCaptureAction(withQuery(request, { id: captureMatch[1], action: captureMatch[2] }), response);
    return;
  }

  response.status(404).json({ error: "not_found", message: "Ruta no configurada." });
}

function routePath(request: any) {
  const path = request.query?.path;
  return Array.isArray(path) ? String(path[0] ?? "") : String(path ?? "").replace(/^\/+|\/+$/g, "");
}

function withQuery(request: any, query: Record<string, unknown>) {
  request.query = {
    ...(request.query ?? {}),
    ...query,
  };

  return request;
}
