import { assertServerlessCaptureScope, buildCaptureDraft, isCaptureDraftRequest, nextCaptureId } from "../../_lib/captures";
import { applyCors, handleOptions, methodNotAllowed, readJsonBody } from "../../_lib/http";

export default async function handler(request: any, response: any) {
  if (handleOptions(request, response)) {
    return;
  }

  applyCors(response);

  if (request.method !== "POST") {
    methodNotAllowed(response, ["POST", "OPTIONS"]);
    return;
  }

  try {
    const body = await readJsonBody(request);

    if (!isCaptureDraftRequest(body)) {
      response.status(400).json({ error: "invalid_capture_payload" });
      return;
    }

    const scope = assertServerlessCaptureScope(request, body.plantelId);

    if (!scope.ok) {
      response.status(scope.status).json({ error: scope.error });
      return;
    }

    response.status(201).json(buildCaptureDraft({ id: nextCaptureId(), request: body }));
  } catch {
    response.status(400).json({ error: "invalid_json_body" });
  }
}
