/**
 * Test del SystemStateService (T028). Rojo antes de la implementación.
 * Verifica la lectura del singleton y el cacheo de 5 s (research §5).
 */
import { PrismaService } from '../../common/prisma/prisma.service';
import { SystemStateService } from './system-state.service';

function prismaMock(row: { appointmentsDisabled: boolean; disabledReason: string | null } | null) {
  return {
    systemState: { findUnique: jest.fn().mockResolvedValue(row) },
  } as unknown as PrismaService;
}

describe('SystemStateService', () => {
  afterEach(() => jest.useRealTimers());

  it('lee el estado del singleton', async () => {
    const prisma = prismaMock({ appointmentsDisabled: true, disabledReason: 'Mantenimiento' });
    const service = new SystemStateService(prisma);
    await expect(service.getState()).resolves.toEqual({
      appointmentsDisabled: true,
      reason: 'Mantenimiento',
    });
  });

  it('devuelve estado por defecto (habilitado) si no hay fila', async () => {
    const service = new SystemStateService(prismaMock(null));
    await expect(service.getState()).resolves.toEqual({ appointmentsDisabled: false, reason: null });
  });

  it('cachea la lectura durante 5 s (una sola consulta)', async () => {
    jest.useFakeTimers();
    const prisma = prismaMock({ appointmentsDisabled: false, disabledReason: null });
    const service = new SystemStateService(prisma);

    await service.getState();
    jest.advanceTimersByTime(4000);
    await service.getState();
    expect(prisma.systemState.findUnique).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(2000); // supera el TTL de 5 s
    await service.getState();
    expect(prisma.systemState.findUnique).toHaveBeenCalledTimes(2);
  });

  it('invalidate() fuerza una relectura inmediata', async () => {
    const prisma = prismaMock({ appointmentsDisabled: false, disabledReason: null });
    const service = new SystemStateService(prisma);
    await service.getState();
    service.invalidate();
    await service.getState();
    expect(prisma.systemState.findUnique).toHaveBeenCalledTimes(2);
  });
});
