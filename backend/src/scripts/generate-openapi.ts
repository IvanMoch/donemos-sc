/**
 * Generador del contrato OpenAPI público desde los esquemas Zod compartidos
 * (T072). Única fuente de verdad: los mismos schemas que validan las requests
 * derivan el documento. Escribe `contracts/public-api.generated.yaml`.
 *
 * Modos:
 *  - `pnpm --filter backend openapi:generate` → (re)escribe el YAML.
 *  - `pnpm --filter backend openapi:check` → falla (exit 1) si el YAML commiteado
 *     difiere del generado (drift). En CI lo consume T145 (Fase 6).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { generateSchema } from '@anatine/zod-openapi';
import {
  cancelSchema,
  createAppointmentSchema,
  lookupSchema,
  publicSlotSchema,
  rescheduleSchema,
  systemStatusSchema,
} from '@donemos/shared';
import { OpenApiBuilder } from 'openapi3-ts/oas31';
import { stringify } from 'yaml';

const DESTINO = join(__dirname, '..', '..', 'contracts', 'public-api.generated.yaml');

function construirDocumento(): string {
  const builder = OpenApiBuilder.create()
    .addInfo({
      title: 'Donemos San Cristóbal — Public API (generado desde Zod)',
      version: '1.0.0',
      description: 'Contrato derivado de los esquemas Zod compartidos. No editar a mano.',
    })
    .addServer({ url: '/api/v1' });

  // Schemas derivados de Zod (una sola fuente de verdad con la validación).
  builder.addSchema('CreateAppointmentRequest', generateSchema(createAppointmentSchema));
  builder.addSchema('LookupRequest', generateSchema(lookupSchema));
  builder.addSchema('CancelRequest', generateSchema(cancelSchema));
  builder.addSchema('RescheduleRequest', generateSchema(rescheduleSchema));
  builder.addSchema('PublicSlot', generateSchema(publicSlotSchema));
  builder.addSchema('SystemStatus', generateSchema(systemStatusSchema));

  const json = (ref: string) => ({ $ref: `#/components/schemas/${ref}` });

  builder.addPath('/health', {
    get: {
      summary: 'Health check',
      responses: { '200': { description: 'Servicio operativo' } },
    },
  });
  builder.addPath('/content/donation-info', {
    get: {
      summary: 'Requisitos y criterios de exclusión (FR-001, FR-002)',
      responses: { '200': { description: 'Contenido informativo' } },
    },
  });
  builder.addPath('/system/status', {
    get: {
      summary: 'Estado global del sistema (kill switch)',
      responses: {
        '200': {
          description: 'Estado',
          content: { 'application/json': { schema: json('SystemStatus') } },
        },
      },
    },
  });
  builder.addPath('/slots', {
    get: {
      summary: 'Franjas con cupo dentro de la ventana pública (FR-004, FR-013)',
      responses: {
        '200': {
          description: 'Lista de franjas',
          content: { 'application/json': { schema: { type: 'array', items: json('PublicSlot') } } },
        },
      },
    },
  });
  builder.addPath('/appointments', {
    post: {
      summary: 'Crear cita (FR-005..FR-008, FR-012)',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: json('CreateAppointmentRequest') } },
      },
      responses: {
        '201': { description: 'Cita creada' },
        '400': { description: 'Datos inválidos' },
        '409': { description: 'Cédula ya con cita activa, o franja sin cupo' },
        '429': { description: 'Rate limit excedido' },
        '503': { description: 'Kill switch activo' },
      },
    },
  });
  builder.addPath('/appointments/lookup', {
    post: {
      summary: 'Consultar cita por cédula + código (US2, FR-013, FR-016)',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: json('LookupRequest') } },
      },
      responses: {
        '200': { description: 'Detalle de la cita' },
        '404': { description: 'No existe (mensaje genérico)' },
        '429': { description: 'Rate limit excedido' },
      },
    },
  });
  builder.addPath('/appointments/{code}/cancel', {
    post: {
      summary: 'Cancelar cita (US2, FR-014). Funciona con kill switch activo.',
      parameters: [{ name: 'code', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: json('CancelRequest') } },
      },
      responses: {
        '200': { description: 'Cita cancelada' },
        '404': { description: 'No existe o cédula no coincide' },
      },
    },
  });
  builder.addPath('/appointments/{code}/reschedule', {
    patch: {
      summary: 'Reagendar cita (US2, FR-015). 409 kill_switch_active si el switch está activo.',
      parameters: [{ name: 'code', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: json('RescheduleRequest') } },
      },
      responses: {
        '200': { description: 'Reagendada' },
        '404': { description: 'No existe o cédula no coincide' },
        '409': { description: 'Nueva franja sin cupo o kill switch activo' },
      },
    },
  });

  return stringify(builder.getSpec());
}

function main(): void {
  const generado = construirDocumento();
  const modoCheck = process.argv.includes('--check');

  if (modoCheck) {
    let actual = '';
    try {
      actual = readFileSync(DESTINO, 'utf8');
    } catch {
      // El archivo no existe todavía: se trata como drift.
    }
    if (actual !== generado) {
      // eslint-disable-next-line no-console -- salida de herramienta CLI
      console.error(
        '❌ El contrato OpenAPI generado difiere del commiteado. Corre `pnpm --filter backend openapi:generate`.',
      );
      process.exit(1);
    }
    // eslint-disable-next-line no-console -- salida de herramienta CLI
    console.log('✅ Contrato OpenAPI al día.');
    return;
  }

  mkdirSync(dirname(DESTINO), { recursive: true });
  writeFileSync(DESTINO, generado, 'utf8');
  // eslint-disable-next-line no-console -- salida de herramienta CLI
  console.log(`Contrato OpenAPI generado en ${DESTINO}`);
}

main();
