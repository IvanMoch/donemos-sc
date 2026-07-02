/**
 * Esquema de cédula de identidad (FR-006, V2 de data-model.md).
 *
 * Normaliza a mayúsculas y elimina guiones ANTES de validar el patrón, de modo
 * que tanto el frontend como el backend acepten "v-12345678" y persistan
 * "V12345678". El mismo esquema alimenta creación, consulta y cancelación.
 */
import { z } from 'zod';

export const idNumberSchema = z
  .string()
  // trim() incluido para no divergir del normalizador imperativo del backend
  // (normalizeIdNumber): ambos deben producir el mismo valor canónico.
  .transform((v) => v.trim().toUpperCase().replace(/-/g, ''))
  .pipe(z.string().regex(/^[VE][0-9]{6,8}$/, 'Cédula inválida: usa V o E seguido de 6 a 8 dígitos.'));

export type IdNumber = z.infer<typeof idNumberSchema>;
