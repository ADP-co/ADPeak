"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapturasService = void 0;
const common_1 = require("@nestjs/common");
const request_actor_1 = require("../auth/request-actor");
const database_service_1 = require("../database/database.service");
let CapturasService = class CapturasService {
    database;
    constructor(database) {
        this.database = database;
    }
    createDraft(actor, dto) {
        this.ensureCanCreateOrEdit(actor, dto.plantelId);
        const payload = JSON.stringify(dto.payload);
        const result = this.database.run(`INSERT INTO submissions
        (plantel_id, indicator_id, activity_id, period_id, responsable_id, status, current_version, current_payload)
       VALUES (?, ?, ?, ?, ?, 'borrador', 1, ?)`, [
            dto.plantelId,
            dto.indicadorId,
            dto.actividadId ?? null,
            dto.periodoId,
            dto.responsableId ?? null,
            payload,
        ]);
        const id = Number(result.lastInsertRowid);
        this.insertVersion(id, 1, payload, dto.motivoCambio ?? 'borrador inicial', actor.userId);
        this.insertAudit('submission', id, 'crear_borrador', actor.userId, 'payload', null, payload, 1);
        return this.findOneForActor(id, actor);
    }
    findOneForActor(id, actor) {
        const submission = this.findSubmission(id);
        this.ensureCanRead(actor, submission);
        return this.toDto(submission);
    }
    getStatus(id, actor) {
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
    getHistory(id, actor) {
        const submission = this.findSubmission(id);
        this.ensureCanRead(actor, submission);
        const versions = this.database.query(`SELECT id, submission_id, version_number, payload, change_reason, created_by_user_id, created_at
       FROM submission_versions
       WHERE submission_id = ?
       ORDER BY version_number ASC`, [id]);
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
    updateDraft(id, actor, dto) {
        const submission = this.findSubmission(id);
        this.ensureCanCreateOrEdit(actor, submission.plantel_id);
        this.ensureEditable(submission);
        const nextVersion = submission.current_version + 1;
        const payload = JSON.stringify(dto.payload);
        this.database.run(`UPDATE submissions
       SET current_payload = ?, current_version = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`, [payload, nextVersion, id]);
        this.insertVersion(id, nextVersion, payload, dto.motivoCambio ?? 'actualizacion de captura', actor.userId);
        this.insertAudit('submission', id, 'actualizar_borrador', actor.userId, 'payload', submission.current_payload, payload, nextVersion);
        return this.findOneForActor(id, actor);
    }
    sendToReview(id, actor) {
        const submission = this.findSubmission(id);
        this.ensureCanCreateOrEdit(actor, submission.plantel_id);
        this.ensureEditable(submission);
        this.database.run(`UPDATE submissions
       SET status = 'en_revision', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`, [id]);
        this.database.run(`INSERT INTO reviews (submission_id, reviewer_user_id, status, comments)
       VALUES (?, ?, 'en_revision', ?)`, [id, submission.responsable_id, 'Captura enviada a revision']);
        this.insertAudit('submission', id, 'enviar_revision', actor.userId, 'status', submission.status, 'en_revision', submission.current_version);
        return this.findOneForActor(id, actor);
    }
    listForReview(actor) {
        const where = [
            "status IN ('en_revision', 'correccion_solicitada', 'aprobado', 'cerrado')",
        ];
        const params = [];
        if (actor.role === 'responsable') {
            where.push('(responsable_id = ? OR EXISTS (SELECT 1 FROM assignments a WHERE a.indicator_id = submissions.indicator_id AND a.plantel_id = submissions.plantel_id AND a.responsable_id = ? AND a.active = 1))');
            params.push(actor.responsableId ?? actor.userId, actor.responsableId ?? actor.userId);
        }
        else if (actor.role === 'plantel') {
            where.push('plantel_id = ?');
            params.push(actor.plantelId);
        }
        const rows = this.database.query(`SELECT * FROM submissions WHERE ${where.join(' AND ')} ORDER BY updated_at DESC`, params);
        return rows.map((row) => this.toDto(row));
    }
    resolveReview(id, actor, status, comments) {
        (0, request_actor_1.requireRole)(actor, ['admin', 'responsable']);
        const submission = this.findSubmission(id);
        this.ensureCanRead(actor, submission);
        if (submission.status === 'cerrado') {
            throw new common_1.ForbiddenException('No se puede modificar una captura cerrada');
        }
        const closedAt = status === 'cerrado' ? new Date().toISOString() : null;
        this.database.run(`UPDATE submissions
       SET status = ?, closed_at = COALESCE(?, closed_at), updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`, [status, closedAt, id]);
        this.database.run(`INSERT INTO reviews (submission_id, reviewer_user_id, status, comments)
       VALUES (?, ?, ?, ?)`, [id, actor.userId, status, comments ?? null]);
        this.insertAudit('submission', id, 'resolver_revision', actor.userId, 'status', submission.status, status, submission.current_version);
        return this.findOneForActor(id, actor);
    }
    findSubmission(id) {
        const submission = this.database.get('SELECT * FROM submissions WHERE id = ? AND active = 1', [id]);
        if (!submission) {
            throw new common_1.NotFoundException('Captura no encontrada');
        }
        return submission;
    }
    ensureCanCreateOrEdit(actor, plantelId) {
        if (actor.role === 'admin') {
            return;
        }
        (0, request_actor_1.requireRole)(actor, ['plantel']);
        if (actor.plantelId !== plantelId) {
            throw new common_1.ForbiddenException('El plantel solo puede modificar capturas de su alcance');
        }
    }
    ensureCanRead(actor, submission) {
        if (actor.role === 'admin') {
            return;
        }
        if (actor.role === 'plantel') {
            if (actor.plantelId === submission.plantel_id) {
                return;
            }
            throw new common_1.ForbiddenException('El plantel no tiene acceso a esta captura');
        }
        const responsableId = actor.responsableId ?? actor.userId;
        if (submission.responsable_id === responsableId) {
            return;
        }
        const assignment = this.database.get(`SELECT id FROM assignments
       WHERE plantel_id = ? AND indicator_id = ? AND responsable_id = ? AND active = 1`, [submission.plantel_id, submission.indicator_id, responsableId]);
        if (!assignment) {
            throw new common_1.ForbiddenException('El responsable no tiene acceso a esta captura');
        }
    }
    ensureEditable(submission) {
        if (['en_revision', 'aprobado', 'cerrado'].includes(submission.status)) {
            throw new common_1.ForbiddenException('No se puede modificar una captura enviada, aprobada o cerrada');
        }
    }
    insertVersion(submissionId, version, payload, reason, userId) {
        this.database.run(`INSERT INTO submission_versions
        (submission_id, version_number, payload, change_reason, created_by_user_id)
       VALUES (?, ?, ?, ?, ?)`, [submissionId, version, payload, reason, userId]);
    }
    insertAudit(entityType, entityId, action, userId, fieldName, previousValue, newValue, version) {
        this.database.run(`INSERT INTO audit_logs
        (entity_type, entity_id, action, user_id, field_name, previous_value, new_value, value_type, version_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'json', ?)`, [
            entityType,
            entityId,
            action,
            userId,
            fieldName,
            previousValue,
            newValue,
            version,
        ]);
    }
    toDto(submission) {
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
};
exports.CapturasService = CapturasService;
exports.CapturasService = CapturasService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], CapturasService);
function parseJson(value) {
    try {
        return JSON.parse(value);
    }
    catch {
        return value;
    }
}
//# sourceMappingURL=capturas.service.js.map