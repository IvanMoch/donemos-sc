/**
 * maskSensitive (T142) — enmascara los campos PII (nombre, apellido, cédula)
 * de un cuerpo antes de emitirlo a logs (FR-027). Devuelve una copia superficial;
 * tolera cuerpos que no son objetos.
 */
const CAMPOS_PII = ['firstName', 'lastName', 'idNumber'];

export function maskSensitive(body: unknown): unknown {
  if (typeof body !== 'object' || body === null) return body;
  const copia: Record<string, unknown> = { ...(body as Record<string, unknown>) };
  for (const campo of CAMPOS_PII) {
    if (campo in copia) copia[campo] = '***';
  }
  return copia;
}
