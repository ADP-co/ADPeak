export type SubmissionStatus = "draft" | "submitted" | "in_review" | "correction" | "approved" | "closed";
export type ActorRole = "admin" | "responsable" | "plantel";

export type SubmissionVersion = {
  versionNumber: number;
  status: SubmissionStatus;
  capturedValues: Record<string, unknown>;
  isCurrent: boolean;
};

export type SubmissionState = {
  id: string;
  status: SubmissionStatus;
  currentVersionNumber: number;
  versions: SubmissionVersion[];
};

export type AuditEntry = {
  eventType: string;
  entityType: "submission";
  entityId: string;
  fieldName: string;
  previousValue: unknown;
  newValue: unknown;
  versionNumber: number;
};

export class WorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowError";
  }
}

const allowedTransitions = new Map<string, { requiresObservation: boolean }>([
  [transitionKey("draft", "submitted", "plantel"), { requiresObservation: false }],
  [transitionKey("draft", "submitted", "admin"), { requiresObservation: false }],
  [transitionKey("submitted", "in_review", "responsable"), { requiresObservation: false }],
  [transitionKey("submitted", "in_review", "admin"), { requiresObservation: false }],
  [transitionKey("in_review", "correction", "responsable"), { requiresObservation: true }],
  [transitionKey("in_review", "correction", "admin"), { requiresObservation: true }],
  [transitionKey("correction", "draft", "plantel"), { requiresObservation: false }],
  [transitionKey("correction", "submitted", "plantel"), { requiresObservation: false }],
  [transitionKey("in_review", "approved", "responsable"), { requiresObservation: false }],
  [transitionKey("in_review", "approved", "admin"), { requiresObservation: false }],
  [transitionKey("approved", "closed", "admin"), { requiresObservation: false }]
]);

export function createDraftSubmission(id: string, capturedValues: Record<string, unknown>): {
  submission: SubmissionState;
  audit: AuditEntry;
} {
  const version: SubmissionVersion = {
    versionNumber: 1,
    status: "draft",
    capturedValues,
    isCurrent: true
  };

  return {
    submission: {
      id,
      status: "draft",
      currentVersionNumber: 1,
      versions: [version]
    },
    audit: buildAudit(id, "submission.created", "captured_values", null, capturedValues, 1)
  };
}

export function autosaveDraft(submission: SubmissionState, capturedValues: Record<string, unknown>): {
  submission: SubmissionState;
  audit: AuditEntry;
} {
  assertEditable(submission);

  const previousVersion = currentVersion(submission);
  const nextVersionNumber = submission.currentVersionNumber + 1;
  const nextVersion: SubmissionVersion = {
    versionNumber: nextVersionNumber,
    status: submission.status,
    capturedValues,
    isCurrent: true
  };

  return {
    submission: {
      ...submission,
      currentVersionNumber: nextVersionNumber,
      versions: [
        ...submission.versions.map((version) => ({ ...version, isCurrent: false })),
        nextVersion
      ]
    },
    audit: buildAudit(
      submission.id,
      "submission.autosaved",
      "captured_values",
      previousVersion.capturedValues,
      capturedValues,
      nextVersionNumber
    )
  };
}

export function transitionSubmission(
  submission: SubmissionState,
  toStatus: SubmissionStatus,
  actorRole: ActorRole,
  observation?: string
): {
  submission: SubmissionState;
  audit: AuditEntry;
} {
  if (submission.status === "closed") {
    throw new WorkflowError("No se puede modificar una captura cerrada.");
  }

  const transition = allowedTransitions.get(transitionKey(submission.status, toStatus, actorRole));

  if (!transition) {
    throw new WorkflowError(`Transicion no permitida: ${submission.status} -> ${toStatus} para ${actorRole}.`);
  }

  if (transition.requiresObservation && !observation?.trim()) {
    throw new WorkflowError("La correccion solicitada requiere observacion.");
  }

  return {
    submission: {
      ...submission,
      status: toStatus,
      versions: submission.versions.map((version) =>
        version.isCurrent
          ? {
              ...version,
              status: toStatus
            }
          : version
      )
    },
    audit: buildAudit(submission.id, "submission.status_changed", "status", submission.status, toStatus, submission.currentVersionNumber)
  };
}

export function currentVersion(submission: SubmissionState): SubmissionVersion {
  const version = submission.versions.find((candidate) => candidate.isCurrent);

  if (!version || version.versionNumber !== submission.currentVersionNumber) {
    throw new WorkflowError("La captura no tiene una version vigente consistente.");
  }

  return version;
}

function assertEditable(submission: SubmissionState): void {
  if (["submitted", "in_review", "approved", "closed"].includes(submission.status)) {
    throw new WorkflowError("No se puede sobrescribir una captura enviada, aprobada o cerrada.");
  }
}

function buildAudit(
  entityId: string,
  eventType: string,
  fieldName: string,
  previousValue: unknown,
  newValue: unknown,
  versionNumber: number
): AuditEntry {
  return {
    eventType,
    entityType: "submission",
    entityId,
    fieldName,
    previousValue,
    newValue,
    versionNumber
  };
}

function transitionKey(from: SubmissionStatus, to: SubmissionStatus, actorRole: ActorRole): string {
  return `${from}:${to}:${actorRole}`;
}
