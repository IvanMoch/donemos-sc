# Quickstart — Agendamiento de Citas para Donación de Sangre

**Feature**: `001-blood-donation-scheduling`

Esta guía valida la feature de extremo a extremo en local. Está pensada para cubrir el flujo del donante (US1, US2) y del administrador (US3) sobre una instancia recién levantada.

## Prerequisitos

- Node.js 20 LTS.
- Docker + Docker Compose (para Postgres local y testcontainers).
- `pnpm` 9 (o npm/yarn, ajustar comandos).
- Navegador Chromium moderno para el flujo manual.

## Setup inicial (una sola vez)

```bash
# desde la raíz del repo (rama feature/001-blood-donation-scheduling)
pnpm install
docker compose up -d postgres
pnpm --filter backend prisma migrate deploy
pnpm --filter backend prisma db seed   # crea admin_user y system_state
```

Variables mínimas del `.env` del backend (ver `backend/.env.example`):

```dotenv
DATABASE_URL="postgres://donemos:donemos@localhost:5432/donemos"
JWT_SECRET="cambia-esto-en-produccion"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="Adm1n#Local"
REDACTION_PEPPER="cambia-esto-para-anonimizacion"
PORT=3001
```

Variables del `.env` del frontend:

```dotenv
PUBLIC_API_BASE_URL="http://localhost:3001/api/v1"
```

## Levantar el sistema

```bash
# Terminal 1 — Backend
pnpm --filter backend dev            # nest start --watch

# Terminal 2 — Frontend
pnpm --filter frontend dev           # astro dev

# Frontend: http://localhost:4321
# Backend:  http://localhost:3001/api/v1/health
```

## Validación 1 — US1 (donante agenda cita en <90 s)

1. Abrir `http://localhost:4321` en el emulador móvil de Chrome (360×800, red 3G lenta).
2. Verificar que la landing muestra los seis requisitos (`Contenido Informativo > Requisitos`) y las cinco consideraciones (`Contenido Informativo > ¿Puedo donar si...?`) sin scroll horizontal.
3. Tocar "Agendar cita".
4. Paso 1 (intro/elegibilidad): revisar recordatorio, marcar checkbox de auto-declaración. El botón "Siguiente" MUST habilitarse solo al marcar (FR-012).
5. Paso 2 (slot): elegir un slot con `remainingCapacity > 0`.
6. Paso 3 (identidad): nombre, apellido, cédula `V12345678`.
7. Paso 4 (revisión): confirmar.
8. **Verificar**:
   - HTTP 201 con `code` de 10 caracteres del alfabeto Nano ID.
   - La pantalla de éxito muestra Hospital Central de San Cristóbal, link al mapa, recordatorios de cédula + desayuno (FR-009).
   - `remainingCapacity` del slot elegido baja en 1 al recargar `/slots`.
9. Cronometrar: desde la landing a la pantalla de éxito el flujo MUST completarse en < 90 s (SC-001).

### Comando Playwright equivalente

```bash
pnpm --filter frontend test:e2e -- appointments/happy-path.spec.ts
```

Ese test también corre `@axe-core/playwright` en cada pantalla del wizard y falla si hay violación AAA.

## Validación 2 — US1 error: cédula ya con cita activa

1. Repetir Validación 1 con la misma cédula.
2. **Verificar**: HTTP 409 con `code = duplicate_active_appointment`. La UI redirige al donante a "Consultar mi cita" (US2) mostrando el código previo.

## Validación 3 — US1 concurrencia sobre el último cupo

```bash
pnpm --filter backend test:integration -- appointments/concurrency.spec.ts
```

El test crea un slot con `capacity = 1`, dispara dos POST simultáneos y verifica: uno responde 201, el otro 409 (`slot_full`). En BD queda una sola `appointment` con estado `active` (SC-009).

## Validación 4 — US2 consultar y cancelar

1. Con la cita creada en Validación 1, ir a `/consultar`.
2. Ingresar cédula + código.
3. Ver detalles → tocar "Cancelar" → confirmar.
4. **Verificar**:
   - `status = cancelled_by_donor` en BD.
   - `remainingCapacity` del slot original vuelve a subir en 1.
5. Repetir con cédula incorrecta y código correcto → HTTP 404 con mensaje genérico (FR-016).

## Validación 5 — US2 reagendar

1. Crear una nueva cita (nueva cédula).
2. En `/consultar`, cambiar a otro slot disponible.
3. **Verificar**: `code` se conserva; el slot anterior libera cupo; el nuevo lo consume.

## Validación 6 — US3 login admin y crear franja

1. Ir a `http://localhost:4321/admin/login`.
2. Login con `admin / Adm1n#Local`.
3. Crear una franja para mañana, 07:00–07:35, capacidad 5.
4. **Verificar** en BD y en `/slots` público.
5. Intentar crear franja el sábado → HTTP 400 salvo que `isExceptionHours = true` (FR-018a).

## Validación 7 — US3 descargar PDF

1. En el panel admin, elegir rango "hoy" y tocar "Descargar PDF".
2. Verificar cabecera "Hospital Central de San Cristóbal — Citas 2026-07-01".
3. Verificar tabla con las columnas: hora, nombre, apellido, cédula, código, estado.
4. Repetir con rango de 7 días para comprobar agrupación por día (Acceptance Scenario 5 de US3).

## Validación 8 — US3 kill switch

1. Panel admin → toggle "Cerrar agendamiento" con razón "Falta de insumos".
2. **Verificar**:
   - `GET /api/v1/system/status` responde `appointmentsDisabled: true`.
   - `POST /api/v1/appointments` responde 503.
   - La landing pública muestra el mensaje de pausa.
   - `POST /api/v1/appointments/lookup` sigue respondiendo 200/404 según el caso (FR-023b).
   - `POST /api/v1/appointments/{code}/cancel` sigue funcionando.
   - `PATCH /api/v1/appointments/{code}/reschedule` responde 409 con `code = kill_switch_active`.
3. Desactivar el kill switch → flujo público vuelve a operar sin cambios adicionales.

## Validación 9 — US3 deshabilitar franja con citas activas

1. Crear un slot y agendar 2 citas en él.
2. Panel admin → deshabilitar ese slot con razón "Cambio de jornada".
3. **Verificar**:
   - HTTP 200 con `cancelledAppointments = 2`.
   - Las 2 citas quedan con `status = cancelled_by_bank` y `cancelled_by_admin_id` = admin logueado.
   - El donante que consulte su código ve el estado nuevo (FR-020).

## Validación 10 — Accesibilidad AAA

```bash
pnpm --filter frontend test:a11y
```

Corre `@axe-core/playwright` sobre landing, wizard (todos los pasos), consulta, panel admin. Cualquier violación AAA rompe la suite.

**Verificación manual complementaria** en el emulador móvil:

- Tab desde el inicio del wizard hasta el final sin usar mouse.
- Contraste medido con la extensión "WCAG Color contrast checker" — todos los pares texto/fondo deben pasar 7:1 (o 4.5:1 texto grande).
- Activar `Reduced motion` en accesibilidad del sistema y recargar → transiciones deben quedar instantáneas.
- Encender lector de pantalla (VoiceOver iOS o NVDA Windows) y navegar los 4 pasos del wizard: se anuncia el título del paso al entrar (aria-live).

## Validación 11 — Retención de datos

Con `TEST_REDACTION_DAYS=1` en `.env` de test para no esperar 90 días:

```bash
pnpm --filter backend test:integration -- retention/redact-old-appointments.spec.ts
```

Crea una `appointment` con `updated_at` de hace 2 días y estado `attended`, corre el job manualmente, verifica que `first_name`, `last_name`, `id_number` quedaron enmascarados y `redacted_at` seteado.

## Suite de humo unificada

```bash
# desde raíz
pnpm test:smoke
```

Ejecuta secuencialmente: backend integration (todas), Playwright (Validación 1, 4, 6, 8), axe (Validación 10), retention (Validación 11).

## Referencias

- Contratos: `contracts/public-api.openapi.yaml`, `contracts/admin-api.openapi.yaml`.
- Modelo de datos: `data-model.md`.
- Decisiones técnicas: `research.md`.
