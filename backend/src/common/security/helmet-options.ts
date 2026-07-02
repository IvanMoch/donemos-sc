/**
 * Opciones de helmet (T143) compartidas por el bootstrap y los tests.
 *
 * CSP restrictivo (API: solo 'self'; sin scripts/estilos inline). HSTS se activa
 * únicamente en producción (en HTTP local/test forzar HTTPS rompería el acceso).
 */
import type { HelmetOptions } from 'helmet';

export function helmetOptions(): HelmetOptions {
  const esProduccion = process.env.NODE_ENV === 'production';
  return {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    // HSTS solo en producción (research §hardening).
    hsts: esProduccion ? { maxAge: 15_552_000, includeSubDomains: true } : false,
  };
}
