/**
 * @ProtectedByKillSwitch (T029) — marca un handler o controlador como sujeto al
 * kill switch. El KillSwitchGuard solo responde 503 en rutas con esta marca
 * (p. ej. POST /appointments), dejando pasar consulta y cancelación (FR-023b).
 */
import { SetMetadata, type CustomDecorator } from '@nestjs/common';

export const KILL_SWITCH_KEY = 'protectedByKillSwitch';

export const ProtectedByKillSwitch = (): CustomDecorator => SetMetadata(KILL_SWITCH_KEY, true);
