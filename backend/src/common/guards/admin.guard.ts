/**
 * AdminGuard (T030) — protege las rutas /api/v1/admin/*.
 *
 * Valida la cookie `session` (JWT HS256, research §6). Si es válida, adjunta
 * `adminUser` al request para que los controladores registren la autoría en el
 * audit log; si falta o es inválida, responde SIEMPRE el mismo 401 genérico
 * (no distingue "falta" de "inválida" para no dar pistas a un atacante).
 */
import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

interface SessionPayload {
  sub: string;
  username: string;
}

export interface AdminUserContext {
  id: string;
  username: string;
}

/** Payload 401 único: mismo mensaje para "sin cookie" y "cookie inválida". */
const RESPUESTA_NO_AUTORIZADO = { error: 'unauthorized', message: 'No autorizado.' };

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { cookies?: Record<string, string>; adminUser?: AdminUserContext }>();
    const token = req.cookies?.session;

    if (!token) {
      throw new UnauthorizedException(RESPUESTA_NO_AUTORIZADO);
    }

    try {
      const payload = await this.jwt.verifyAsync<SessionPayload>(token);
      req.adminUser = { id: payload.sub, username: payload.username };
      return true;
    } catch {
      throw new UnauthorizedException(RESPUESTA_NO_AUTORIZADO);
    }
  }
}
