import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RequestActor, requireRole } from '../auth/request-actor';
import { DatabaseService } from '../database/database.service';
import { CreateCaptureDraftDto } from './dtos/create-capture-draft.dto';
import { UpdateCaptureDto } from './dtos/update-capture.dto';

type SubmissionStatus =
  | 'borrador'
  | 'enviado'
  | 'en_revision'
  | 'correccion_solicitada'
  | 'aprobado'
  | 'cerrado';

type SubmissionRow = {
  id: number;
  plantel_id: number;
  indicator_id: number;
  activity_id: number;
  period_id: number;
  responsable_id: number | null;
  status: SubmissionStatus;
  current_version: number;
  current_payload: string;
  closed_at: string | null;
  active: number;
  created_at: string;
  updated_at: string;
};

type VersionRow = {
  id: number;
  submission_id: number;
  version_number: number;
  payload: string;
  change_reason: string | null;
  created_by_user_id: number | null;
  created_at: string;
};

@Injectable()
export class CapturasService {
  constructor(private readonly database: DatabaseService) {}

  createDraft(actor: RequestActor, dto: CreateCaptureDraftDto) {
    this.ensureCanCreateOrEdit(actor, dto.plantelId);

    const payload = JSON.stringify(dto.payload);
    const result = this.database.run(
      `INSERT INTO submissions
        (plantel_id, indicator_id, activity_id, period_id, responsable_id, status, current_version, current_payload)
       VALUES (?, ?, ?, ?, ?, 'borrador', 1, ?)`,
      [
        dto.plantelId,
        dto.indicadorId,
        dto.actividadId,
        dto.periodoId,
        dto.responsableId ?? null,
        payload,
      ],
    );
    const id = Number(result.lastInsertRowid);

    this.insertVersion(
      id,
      1,
      payload,
      dto.motivoCambio ?? 'borrador inicial',
      actor.userId,
    );
    this.insertAudit(
      'submission',
      id,
      'crear_borrador',
      actor.userId,
      'payload',
      null,
      payload,
      1,
    );

    return this.findOneForActor(id, actor);
  }

  findOneForActor(id: number, actor: RequestActor) {
    const submission = this.findSubmission(id);
    this.ensureCanRead(actor, submission);
    return this.toDto(submission);
  }

  getStatus(id: number, actor: RequestActor) {
    const submission = this.findSubmission(id);
    this.ensureCanRead(actor, submission);

    return {
      id: submission.id,
      estado: submission.status,
      versionActual: submission.current_version,
      cerrado: submission.status === 'cerrado',
      actualizadoEn: submission.updated_at,
    };
  }

  getHistory(id: number, actor: RequestActor) {
    const submission = this.findSubmission(id);
    this.ensureCanRead(actor, submission);

    const versions = this.database.query<VersionRow>(
      `SELECT id, submission_id, version_number, payload, change_reason, created_by_user_id, created_at
       FROM submission_versions
       WHERE submission_id = ?
       ORDER BY version_number ASC`,
      [id],
    );

    return {
      capturaId: id,
      versionActual: submission.current_version,
      versiones: versions.map((version) => ({
        id: version.id,
        numero: version.version_number,
        payload: parseJson(version.payload),
        motivoCambio: version.change_reason,
        creadoPorUsuarioId: version.created_by_user_id,
        creadoEn: version.created_at,
      })),
    };
  }

  updateDraft(id: number, actor: RequestActor, dto: UpdateCaptureDto) {
    const submission = this.findSubmission(id);
    this.ensureCanCreateOrEdit(actor, submission.plantel_id);
    this.ensureEditable(submission);

    const nextVersion = submission.current_version + 1;
    const payload = JSON.stringify(dto.payload);

    this.database.run(
      `UPDATE submissions
       SET current_payload = ?, current_version = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [payload, nextVersion, id],
    );
    this.insertVersion(
      id,
      nextVersion,
      payload,
      dto.motivoCambio ?? 'actualizacion de captura',
      actor.userId,
    );
    this.insertAudit(
      'submission',
      id,
      'actualizar_borrador',
      actor.userId,
      'payload',
      submission.current_payload,
      payload,
      nextVersion,
    );

    return this.findOneForActor(id, actor);
  }

  sendToReview(id: number, actor: RequestActor) {
    const submission = this.findSubmission(id);
    this.ensureCanCreateOrEdit(actor, submission.plantel_id);
    this.ensureEditable(submission);

    this.database.run(
      `UPDATE submissions
       SET status = 'en_revision', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [id],
    );
    this.database.run(
      `INSERT INTO reviews (submission_id, reviewer_user_id, status, comments)
       VALUES (?, ?, 'en_revision', ?)`,
      [id, submission.responsable_id, 'Captura enviada a revision'],
    );
    this.insertAudit(
      'submission',
      id,
      'enviar_revision',
      actor.userId,
      'status',
      submission.status,
      'en_revision',
      submission.current_version,
    );

    return this.findOneForActor(id, actor);
  }

  listForReview(actor: RequestActor) {
    const where: string[] = [
      "status IN ('en_revision', 'correccion_solicitada', 'aprobado', 'cerrado')",
    ];
    const params: Array<string | number> = [];

    if (actor.role === 'responsable') {
      where.push(
        '(responsable_id = ? OR EXISTS (SELECT 1 FROM assignments a WHERE a.indicator_id = submissions.indicator_id AND a.plantel_id = submissions.plantel_id AND a.responsable_id = ? AND a.active = 1))',
      );
      params.push(
        actor.responsableId ?? actor.userId,
        actor.responsableId ?? actor.userId,
      );
    } else if (actor.role === 'plantel') {
      where.push('plantel_id = ?');
      params.push(actor.plantelId as number);
    }

    const rows = this.database.query<SubmissionRow>(
      `SELECT * FROM submissions WHERE ${where.join(' AND ')} ORDER BY updated_at DESC`,
      params,
    );

    return rows.map((row) => this.toDto(row));
  }

  resolveReview(
    id: number,
    actor: RequestActor,
    status: 'correccion_solicitada' | 'aprobado' | 'cerrado',
    comments?: string,
  ) {
    requireRole(actor, ['admin', 'responsable']);

    const submission = this.findSubmission(id);
    this.ensureCanRead(actor, submission);
    this.ensureValidReviewTransition(actor, submission, status);

    const closedAt = status === 'cerrado' ? new Date().toISOString() : null;
    this.database.run(
      `UPDATE submissions
       SET status = ?, closed_at = COALESCE(?, closed_at), updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, closedAt, id],
    );
    this.database.run(
      `INSERT INTO reviews (submission_id, reviewer_user_id, status, comments)
       VALUES (?, ?, ?, ?)`,
      [id, actor.userId, status, comments ?? null],
    );
    this.insertAudit(
      'submission',
      id,
      'resolver_revision',
      actor.userId,
      'status',
      submission.status,
      status,
      submission.current_version,
    );

    return this.findOneForActor(id, actor);
  }

  private findSubmission(id: number): SubmissionRow {
    const submission = this.database.get<SubmissionRow>(
      'SELECT * FROM submissions WHERE id = ? AND active = 1',
      [id],
    );

    if (!submission) {
      throw new NotFoundException('Captura no encontrada');
    }

    return submission;
  }

  private ensureCanCreateOrEdit(actor: RequestActor, plantelId: number) {
    if (actor.role === 'admin') {
      return;
    }

    requireRole(actor, ['plantel']);
    if (actor.plantelId !== plantelId) {
      throw new ForbiddenException(
        'El plantel solo puede modificar capturas de su alcance',
      );
    }
  }

  private ensureCanRead(actor: RequestActor, submission: SubmissionRow) {
    if (actor.role === 'admin') {
      return;
    }

    if (actor.role === 'plantel') {
      if (actor.plantelId === submission.plantel_id) {
        return;
      }

      throw new ForbiddenException('El plantel no tiene acceso a esta captura');
    }

    const responsableId = actor.responsableId ?? actor.userId;
    if (submission.responsable_id === responsableId) {
      return;
    }

    const assignment = this.database.get<{ id: number }>(
      `SELECT id FROM assignments
       WHERE plantel_id = ? AND indicator_id = ? AND responsable_id = ? AND active = 1`,
      [submission.plantel_id, submission.indicator_id, responsableId],
    );

    if (!assignment) {
      throw new ForbiddenException(
        'El responsable no tiene acceso a esta captura',
      );
    }
  }

  private ensureValidReviewTransition(
    actor: RequestActor,
    submission: SubmissionRow,
    nextStatus: 'correccion_solicitada' | 'aprobado' | 'cerrado',
  ) {
    if (submission.status === 'cerrado') {
      throw new ForbiddenException('No se puede modificar una captura cerrada');
    }

    if (nextStatus === 'cerrado') {
      requireRole(actor, ['admin']);

      if (submission.status !== 'aprobado') {
        throw new ForbiddenException(
          'Solo se puede cerrar una captura aprobada',
        );
      }

      return;
    }

    if (submission.status !== 'en_revision') {
      throw new ForbiddenException(
        'Solo se puede resolver una captura en revision',
      );
    }
  }

  private ensureEditable(submission: SubmissionRow) {
    if (['en_revision', 'aprobado', 'cerrado'].includes(submission.status)) {
      throw new ForbiddenException(
        'No se puede modificar una captura enviada, aprobada o cerrada',
      );
    }
  }

  private insertVersion(
    submissionId: number,
    version: number,
    payload: string,
    reason: string,
    userId: number,
  ) {
    this.database.run(
      `INSERT INTO submission_versions
        (submission_id, version_number, payload, change_reason, created_by_user_id)
       VALUES (?, ?, ?, ?, ?)`,
      [submissionId, version, payload, reason, userId],
    );
  }

  private insertAudit(
    entityType: string,
    entityId: number,
    action: string,
    userId: number,
    fieldName: string,
    previousValue: string | null,
    newValue: string,
    version: number,
  ) {
    this.database.run(
      `INSERT INTO audit_logs
        (entity_type, entity_id, action, user_id, field_name, previous_value, new_value, value_type, version_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'json', ?)`,
      [
        entityType,
        entityId,
        action,
        userId,
        fieldName,
        previousValue,
        newValue,
        version,
      ],
    );
  }

  private toDto(submission: SubmissionRow) {
    return {
      id: submission.id,
      plantelId: submission.plantel_id,
      indicadorId: submission.indicator_id,
      actividadId: submission.activity_id,
      periodoId: submission.period_id,
      responsableId: submission.responsable_id,
      estado: submission.status,
      versionActual: submission.current_version,
      payload: parseJson(submission.current_payload),
      cerradoEn: submission.closed_at,
      creadoEn: submission.created_at,
      actualizadoEn: submission.updated_at,
    };
  }
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
