import { assertServerlessCaptureScope, buildCaptureDraft, isCapturePayload } from "../../_lib/captures";
import { applyCors, handleOptions, methodNotAllowed, positiveInteger, readJsonBody } from "../../_lib/http";

function captureIdFromRequest(request: any) {
  const value = Number(request.query?.id);
  return positiveInteger(value) ? value : undefined;
}

export default async function handler(request: any, response: any) {
  if (handleOptions(request, response)) {
    return;
  }

  applyCors(response);

  const id = captureIdFromRequest(request);

  if (!id) {
    response.status(400).json({ error: "invalid_capture_id" });
    return;
  }

  if (request.method === "GET") {
    const scope = assertServerlessCaptureScope(request, 1);

    if (!scope.ok) {
      response.status(scope.status).json({ error: scope.error });
      return;
    }

    response.status(200).json(buildCaptureDraft({ id }));
    return;
  }

  if (request.method === "PUT") {
    try {
      const body = await readJsonBody(request);

      if (!isCapturePayload(body.payload)) {
        response.status(400).json({ error: "invalid_capture_payload" });
        return;
      }

      const scope = assertServerlessCaptureScope(request, 1);

      if (!scope.ok) {
        response.status(scope.status).json({ error: scope.error });
        return;
      }

      response.status(200).json(buildCaptureDraft({ id, payload: body.payload, versionActual: 2 }));
    } catch {
      response.status(400).json({ error: "invalid_json_body" });
    }
    return;
  }

  methodNotAllowed(response, ["GET", "PUT", "OPTIONS"]);
}
