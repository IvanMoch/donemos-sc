/**
 * Test del AdminGuard (T030). Rojo antes de la implementación.
 * Valida la cookie `session` (JWT) y adjunta el admin al request; 401 si falta
 * o es inválida (research §6).
 */
import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { AdminGuard } from './admin.guard';

function contexto(cookies: Record<string, string>): { ctx: ExecutionContext; req: Record<string, unknown> } {
  const req: Record<string, unknown> = { cookies };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { ctx, req };
}

describe('AdminGuard', () => {
  it('rechaza con 401 si no hay cookie de sesión', async () => {
    const jwt = { verifyAsync: jest.fn() } as unknown as JwtService;
    const guard = new AdminGuard(jwt);
    const { ctx } = contexto({});
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('adjunta el admin al request cuando el JWT es válido', async () => {
    const jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: 'admin-id', username: 'admin' }) } as unknown as JwtService;
    const guard = new AdminGuard(jwt);
    const { ctx, req } = contexto({ session: 'token-valido' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.adminUser).toEqual({ id: 'admin-id', username: 'admin' });
  });

  it('rechaza con 401 si el JWT es inválido', async () => {
    const jwt = { verifyAsync: jest.fn().mockRejectedValue(new Error('bad token')) } as unknown as JwtService;
    const guard = new AdminGuard(jwt);
    const { ctx } = contexto({ session: 'token-corrupto' });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
