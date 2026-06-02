import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

export type ActorRole = 'admin' | 'plantel' | 'responsable';

export type RequestActor = {
  userId: number;
  role: ActorRole;
  plantelId?: number;
  responsableId?: number;
};

type RawHeaders = Record<string, string | string[] | undefined>;

const ROLE_ALIASES: Record<string, ActorRole> = {
  admin: 'admin',
  administrador: 'admin',
  plantel: 'plantel',
  responsable: 'responsable',
};

export function actorFromHeaders(headers: RawHeaders): RequestActor {
  const role = normalizeRole(headerValue(headers, 'x-role'));
  const userId = parseRequiredInt(
    headerValue(headers, 'x-user-id'),
    'x-user-id',
  );

  const actor: RequestActor = { userId, role };

  if (role === 'plantel') {
    actor.plantelId = parseRequiredInt(
      headerValue(headers, 'x-plantel-id'),
      'x-plantel-id',
    );
  }

  if (role === 'responsable') {
    actor.responsableId =
      parseOptionalInt(headerValue(headers, 'x-responsable-id')) ?? userId;
  }

  return actor;
}

export function requireRole(actor: RequestActor, allowed: ActorRole[]) {
  if (!allowed.includes(actor.role)) {
    throw new ForbiddenException('El rol no tiene permiso para esta accion');
  }
}

function normalizeRole(value: string | undefined): ActorRole {
  if (!value) {
    throw new UnauthorizedException('Falta header x-role');
  }

  const role = ROLE_ALIASES[value.trim().toLowerCase()];
  if (!role) {
    throw new ForbiddenException('Rol no soportado');
  }

  return role;
}

function headerValue(headers: RawHeaders, name: string): string | undefined {
  const direct = headers[name];
  const value =
    direct ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parseRequiredInt(value: string | undefined, name: string): number {
  const parsed = parseOptionalInt(value);
  if (!parsed) {
    throw new UnauthorizedException(`Header ${name} debe ser entero positivo`);
  }

  return parsed;
}

function parseOptionalInt(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new UnauthorizedException(
      'El alcance del actor debe ser entero positivo',
    );
  }

  return parsed;
}
