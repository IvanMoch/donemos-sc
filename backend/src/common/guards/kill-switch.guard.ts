/**
 * KillSwitchGuard (T029) — bloquea con 503 las rutas marcadas con
 * @ProtectedByKillSwitch cuando el kill switch global está activo (V8).
 *
 * Las rutas sin la marca (consulta, cancelación) pasan siempre, incluso con el
 * switch activo (FR-023b). Consulta el estado vía SystemStateService, que
 * cachea 5 s, así que el guard no añade una consulta a BD por request.
 */
import {
  Injectable,
  ServiceUnavailableException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { KILL_SWITCH_KEY } from '../decorators/protected-by-kill-switch.decorator';
import { SystemStateService } from '../../modules/system-state/system-state.service';

@Injectable()
export class KillSwitchGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly systemState: SystemStateService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const protegida = this.reflector.getAllAndOverride<boolean>(KILL_SWITCH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!protegida) return true;

    const { appointmentsDisabled } = await this.systemState.getState();
    if (appointmentsDisabled) {
      throw new ServiceUnavailableException({
        error: 'appointments_disabled',
        message: 'El agendamiento está temporalmente cerrado.',
      });
    }
    return true;
  }
}
