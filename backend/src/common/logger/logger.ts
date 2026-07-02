/**
 * Logger pino compartido del backend (research §13).
 *
 * Salida JSON estructurada. El nivel se toma de LOG_LEVEL; en test queda en
 * `silent` para no ensuciar la salida de Jest. Nunca se registran datos
 * personales en claro (el filtro y el interceptor los enmascaran antes).
 */
import pino from 'pino';

function nivelPorDefecto(): pino.LevelWithSilent {
  if (process.env.LOG_LEVEL) return process.env.LOG_LEVEL as pino.LevelWithSilent;
  if (process.env.NODE_ENV === 'test') return 'silent';
  return 'info';
}

export const logger = pino({
  level: nivelPorDefecto(),
  base: { service: 'donemos-backend' },
});
