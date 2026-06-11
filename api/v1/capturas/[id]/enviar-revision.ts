import { buildCaptureDraft } from "../../../_lib/captures";
import { applyCors, handleOptions, methodNotAllowed, positiveInteger } from "../../../_lib/http";

function captureIdFromRequest(request: any) {
  const value = Number(request.query?.id);
  return positiveInteger(value) ? value : undefined;
}

export default function handler(request: any, response: any) {
  if (handleOptions(request, response)) {
    return;
  }

  applyCors(response);

  if (request.method !== "POST") {
    methodNotAllowed(response, ["POST", "OPTIONS"]);
    return;
  }

  const id = captureIdFromRequest(request);

  if (!id) {
    response.status(400).json({ error: "invalid_capture_id" });
    return;
  }

  response.status(200).json(buildCaptureDraft({ id, estado: "en_revision", versionActual: 3 }));
}
