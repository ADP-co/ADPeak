"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actorFromHeaders = actorFromHeaders;
exports.requireRole = requireRole;
const common_1 = require("@nestjs/common");
const ROLE_ALIASES = {
    admin: 'admin',
    administrador: 'admin',
    plantel: 'plantel',
    responsable: 'responsable',
};
function actorFromHeaders(headers) {
    const role = normalizeRole(headerValue(headers, 'x-role'));
    const userId = parseRequiredInt(headerValue(headers, 'x-user-id'), 'x-user-id');
    const actor = { userId, role };
    if (role === 'plantel') {
        actor.plantelId = parseRequiredInt(headerValue(headers, 'x-plantel-id'), 'x-plantel-id');
    }
    if (role === 'responsable') {
        actor.responsableId =
            parseOptionalInt(headerValue(headers, 'x-responsable-id')) ?? userId;
    }
    return actor;
}
function requireRole(actor, allowed) {
    if (!allowed.includes(actor.role)) {
        throw new common_1.ForbiddenException('El rol no tiene permiso para esta accion');
    }
}
function normalizeRole(value) {
    if (!value) {
        throw new common_1.UnauthorizedException('Falta header x-role');
    }
    const role = ROLE_ALIASES[value.trim().toLowerCase()];
    if (!role) {
        throw new common_1.ForbiddenException('Rol no soportado');
    }
    return role;
}
function headerValue(headers, name) {
    const direct = headers[name];
    const value = direct ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
    if (Array.isArray(value)) {
        return value[0];
    }
    return value;
}
function parseRequiredInt(value, name) {
    const parsed = parseOptionalInt(value);
    if (!parsed) {
        throw new common_1.UnauthorizedException(`Header ${name} debe ser entero positivo`);
    }
    return parsed;
}
function parseOptionalInt(value) {
    if (!value) {
        return undefined;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
        throw new common_1.UnauthorizedException('El alcance del actor debe ser entero positivo');
    }
    return parsed;
}
//# sourceMappingURL=request-actor.js.map