# Shared Schemas

**Feature**: Agendamiento de Citas para Donación de Sangre

Los siguientes esquemas viven en `packages/shared/src/schemas/` y se importan tanto desde el frontend (para validación en cliente antes de llamar al API) como desde el backend (para validación en el DTO). Un solo cambio propaga a ambos lados — respeta Principio II (monolito cohesivo).

## Formato

Definidos en **Zod** para poder derivar tipos TS automáticamente y para poder generar JSON Schema para OpenAPI.

## Esquemas

### `idNumberSchema`

```ts
export const idNumberSchema = z
  .string()
  .transform((v) => v.toUpperCase().replace(/-/g, ''))
  .pipe(z.string().regex(/^[VE][0-9]{6,8}$/));
```

- Normaliza a mayúsculas y sin guion antes de validar el patrón.
- Reutilizado por creación, lookup y cancelación.

### `appointmentCodeSchema`

```ts
export const appointmentCodeSchema = z
  .string()
  .length(10)
  .regex(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/);
```

- Alfabeto sin ambigüedades (research §14).

### `createAppointmentSchema`

```ts
export const createAppointmentSchema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  idNumber: idNumberSchema,
  slotId: z.string().uuid(),
  eligibilityDeclared: z.literal(true, {
    errorMap: () => ({ message: 'Debes declarar tu elegibilidad para continuar.' }),
  }),
});
```

- La única forma válida es `eligibilityDeclared: true`. `false` falla en cliente y en servidor (FR-012).

### `lookupSchema`, `cancelSchema`, `rescheduleSchema`

Definiciones análogas con `code` + `idNumber` como pareja de autorización.

### `slotSchema` (público)

```ts
export const publicSlotSchema = z.object({
  id: z.string().uuid(),
  date: z.string().date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  remainingCapacity: z.number().int().nonnegative(),
});
```

### `systemStatusSchema`

```ts
export const systemStatusSchema = z.object({
  appointmentsDisabled: z.boolean(),
  reason: z.string().nullable().optional(),
});
```

## Convenciones de error

Errores del backend siguen la forma:

```json
{ "error": "<slug>", "message": "<texto legible>", "issues"?: [...] }
```

Slugs bajo `snake_case`. Los slugs se mapean a copys en cliente para mostrar textos amigables al donante.

## Reglas de generación

- **Backend → OpenAPI**: los DTOs de NestJS heredan tipos derivados con `z.infer<typeof schema>`; se usa `@anatine/zod-openapi` para producir el YAML.
- **Frontend**: los mismos esquemas se usan en los steps del wizard React con `zodResolver` (React Hook Form) para validar antes de enviar al backend.
