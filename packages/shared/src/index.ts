/**
 * Barrel del contrato compartido DonemosSC.
 *
 * Re-exporta todos los esquemas Zod y los tipos derivados (z.infer) que definen
 * el contrato entre backend y frontend. Consumir siempre desde `@donemos/shared`
 * — nunca importar archivos internos de `src/` directamente.
 */
export * from './schemas/id-number';
export * from './schemas/appointment-code';
export * from './schemas/appointments';
export * from './schemas/slots';
export * from './schemas/system';
export * from './schemas/admin';
