/**
 * Test del KillSwitchGuard (T029). Rojo antes de la implementación.
 * Solo bloquea rutas marcadas con @ProtectedByKillSwitch cuando el switch está
 * activo, respondiendo 503 appointments_disabled (V8 de data-model.md).
 */
import { ServiceUnavailableException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { SystemStateService } from '../../modules/system-state/system-state.service';
import { KillSwitchGuard } from './kill-switch.guard';

function contexto(): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

function systemStateMock(appointmentsDisabled: boolean): SystemStateService {
  return { getState: jest.fn().mockResolvedValue({ appointmentsDisabled, reason: null }) } as unknown as SystemStateService;
}

describe('KillSwitchGuard', () => {
  it('deja pasar rutas no protegidas aunque el switch esté activo', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const guard = new KillSwitchGuard(reflector, systemStateMock(true));
    await expect(guard.canActivate(contexto())).resolves.toBe(true);
  });

  it('deja pasar rutas protegidas cuando el switch está inactivo', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(true) } as unknown as Reflector;
    const guard = new KillSwitchGuard(reflector, systemStateMock(false));
    await expect(guard.canActivate(contexto())).resolves.toBe(true);
  });

  it('responde 503 en rutas protegidas cuando el switch está activo', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(true) } as unknown as Reflector;
    const guard = new KillSwitchGuard(reflector, systemStateMock(true));
    await expect(guard.canActivate(contexto())).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
