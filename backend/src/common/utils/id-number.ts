/**
 * Normalizador de cédula (T032, V2 de data-model.md).
 *
 * Deja la cédula en la forma canónica que se persiste y valida: mayúsculas,
 * sin guiones, sin espacios en los extremos. Es la contraparte imperativa del
 * `idNumberSchema` compartido; ambos deben producir el mismo resultado.
 */
export function normalizeIdNumber(raw: string): string {
  return raw.trim().toUpperCase().replace(/-/g, '');
}
