---

description: "Task list for feature 001-blood-donation-scheduling — implementation, dependency-ordered, TDD (per Constitution Principle V)"
---

# Tasks: Agendamiento de Citas para Donación de Sangre

**Input**: Design documents from `specs/001-blood-donation-scheduling/`

**Prerequisites**: plan.md, spec.md (con 3 user stories: US1 P1, US2 P2, US3 P3), research.md, data-model.md, contracts/ (public + admin OpenAPI + shared schemas), quickstart.md

**Tests**: **OBLIGATORIOS** para DonemosSC. La Constitución (Principio V, NO-NEGOCIABLE) exige TDD: todo test se escribe ANTES de la implementación y debe fallar en un commit previo al de la implementación.

**Organization**: Fases 1–2 son shared setup + foundational. Fases 3–5 corresponden 1:1 a US1, US2, US3 en orden de prioridad. Fase 6 es polish.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (distinto archivo, sin dependencias abiertas).
- **[Story]**: US1/US2/US3 en fases 3–5. Sin etiqueta en Setup, Foundational y Polish.

## Path Conventions

- `backend/src/...`, `backend/test/...`
- `frontend/src/...`, `frontend/test/...`
- `packages/shared/src/...`
- Configuración raíz: `package.json`, `pnpm-workspace.yaml`, `docker-compose.yml`, `.github/workflows/*`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Estructura monolítica pnpm workspaces + tooling común.

- [X] T001 Crear estructura de carpetas raíz: `backend/`, `frontend/`, `packages/shared/`, `.github/workflows/`, y esqueleto de `docker-compose.yml` en la raíz del repo
- [X] T002 Inicializar workspace pnpm con `pnpm-workspace.yaml` en la raíz declarando `backend`, `frontend`, `packages/*`; crear `package.json` raíz con scripts `dev`, `test`, `test:smoke`, `lint`
- [X] T003 [P] Escribir `.gitignore` en la raíz cubriendo `node_modules/`, `dist/`, `.env`, `.env.*`, `coverage/`, `playwright-report/`, `.claude/`, `*.pdf` (adjuntos generados), `.turbo/`
- [X] T004 [P] Configurar TypeScript base compartido en `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`, `paths` para `@donemos/shared/*`)
- [X] T005 [P] Configurar ESLint + Prettier compartidos en `.eslintrc.cjs` y `.prettierrc` raíz; regla obligatoria: comentario de cabecera de responsabilidad en archivos públicos (Principio VII)
- [X] T006 [P] Scaffolding NestJS en `backend/` con `nest new backend --skip-install --package-manager pnpm`; `backend/package.json` con NestJS 10, TypeScript 5, `pino`, `helmet`, `@nestjs/throttler`, `@nestjs/jwt`, `@nestjs/config`, `cookie-parser`, `bcrypt`, `nanoid`, `pdfkit`, `prisma`, `@prisma/client`, `zod`, `@anatine/zod-openapi`, Jest, Supertest, `@testcontainers/postgresql`
- [X] T007 [P] Scaffolding Astro en `frontend/` con `pnpm create astro@latest frontend`; instalar `@astrojs/react`, `@astrojs/tailwind`, `tailwindcss`, `react`, `react-dom`, `react-hook-form`, `@hookform/resolvers`, `zod`, Vitest, `@testing-library/react`, Playwright, `@axe-core/playwright`
- [X] T008 [P] Inicializar `packages/shared/` con `package.json` (`@donemos/shared`), `tsconfig.json` (referencia a `tsconfig.base.json`), `src/index.ts` vacío
- [X] T009 Configurar `docker-compose.yml` en la raíz con servicio `postgres:16` (usuario `donemos`, DB `donemos`, puerto 5432) y volumen persistente `donemos-pg-data`
- [X] T010 Inicializar Prisma en `backend/`: `backend/prisma/schema.prisma` con `provider = "postgresql"`, `datasource db` desde `env("DATABASE_URL")`, generator client
- [X] T011 [P] Crear `backend/.env.example` con `DATABASE_URL`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `REDACTION_PEPPER`, `PORT`; agregar `frontend/.env.example` con `PUBLIC_API_BASE_URL`
- [X] T012 [P] Configurar Jest en `backend/jest.config.ts` (proyectos: `unit`, `contract`, `integration`) con setup para `@testcontainers/postgresql` en `integration`
- [X] T013 [P] Configurar Vitest en `frontend/vitest.config.ts` y Playwright en `frontend/playwright.config.ts` (device: `Pixel 5` como default móvil; base URL `http://localhost:4321`)
- [X] T014 Crear workflow CI `.github/workflows/ci.yml` con jobs: `lint`, `test-backend` (unit + contract + integration con testcontainers), `test-frontend` (Vitest + Playwright + axe-core), `lighthouse-mobile` (target ≥90), `build`
- [X] T015 [P] Añadir `README.md` mínimo en la raíz apuntando a `specs/001-blood-donation-scheduling/quickstart.md` para instrucciones de desarrollo

**Checkpoint**: Repo compila (`pnpm install && pnpm build`), Postgres arranca vía Docker, CI corre en verde con suites vacías.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Esquemas compartidos, migraciones, infraestructura backend/frontend transversal. **BLOQUEA todas las user stories.**

**⚠️ CRITICAL**: Ninguna US puede empezar hasta que esta fase esté completa.

### Shared package (packages/shared)

- [ ] T016 [P] Escribir esquemas Zod compartidos en `packages/shared/src/schemas/id-number.ts` (normalización + regex `^[VE][0-9]{6,8}$`), `packages/shared/src/schemas/appointment-code.ts` (alfabeto Nano ID 10 chars) — con tests Vitest en `packages/shared/src/schemas/id-number.test.ts` y `appointment-code.test.ts` que fallen antes de escribir el schema
- [ ] T017 [P] Escribir esquemas Zod para creación y consulta en `packages/shared/src/schemas/appointments.ts` (`createAppointmentSchema`, `lookupSchema`, `cancelSchema`, `rescheduleSchema`) — precedidos por tests que verifiquen que `eligibilityDeclared: false` falla
- [ ] T018 [P] Escribir esquemas Zod para slots y system status en `packages/shared/src/schemas/slots.ts` y `packages/shared/src/schemas/system.ts` — con tests
- [ ] T019 [P] Escribir esquemas Zod admin (`loginSchema`, `createSlotSchema` con `isExceptionHours`, `updateSlotSchema`, `disableSlotSchema`, `toggleKillSwitchSchema`) en `packages/shared/src/schemas/admin.ts` con tests que verifiquen rechazo de fecha fuera de L–V 7–12 sin `isExceptionHours=true`
- [ ] T020 Exportar todo desde `packages/shared/src/index.ts` (barrel) y publicar tipos derivados con `z.infer`

### Prisma schema y migraciones

- [ ] T021 Añadir modelos Prisma en `backend/prisma/schema.prisma`: `AdminUser`, `Slot`, `Appointment`, `SystemState`, `AdminAuditLog` conforme a `data-model.md` (con `@db.` explícitos, checks vía `@db.Check`, índice parcial `UNIQUE (id_number) WHERE status = 'active'`)
- [ ] T022 Generar y aplicar migración inicial: `pnpm --filter backend prisma migrate dev --name init` — archivo resultante bajo `backend/prisma/migrations/*_init/migration.sql`
- [ ] T023 [P] Añadir seed en `backend/prisma/seed.ts` que cree el registro `system_state` singleton (id=1) y el `admin_user` inicial (`ADMIN_USERNAME`/`ADMIN_PASSWORD` desde env, bcrypt cost 12); registrar el comando en `package.json` (`prisma.seed`)
- [ ] T024 [P] Test de integración de migraciones en `backend/test/integration/schema.spec.ts` que verifique: presencia de índice parcial único, singleton `system_state`, constraints CHECK del `id_number`

### Backend common infra

- [ ] T025 [P] Crear `backend/src/common/pipes/zod-validation.pipe.ts` que consuma esquemas Zod compartidos y devuelva `400` con `error: 'validation_failed', issues: [...]`; test unitario en el mismo directorio (`*.spec.ts`) previo
- [ ] T026 [P] Crear `backend/src/common/filters/global-exception.filter.ts` que enmascare PII en logs (nombre/apellido/cédula → `***`) y devuelva el shape estándar `{ error, message, code? }`; test unitario previo
- [ ] T027 [P] Crear `backend/src/common/interceptors/logging.interceptor.ts` con `pino` estructurado (`request_id`, `route`, `status`, `duration_ms`); test previo
- [ ] T028 [P] Crear `backend/src/modules/system-state/system-state.service.ts` con lectura cacheada 5s del kill switch (research §5); test unitario previo
- [ ] T029 [P] Crear `backend/src/common/guards/kill-switch.guard.ts` que consulte `SystemStateService` y responda 503 en endpoints marcados con `@ProtectedByKillSwitch()`; test unitario previo
- [ ] T030 [P] Crear `backend/src/common/guards/admin.guard.ts` que valide cookie `session` con JWT (`@nestjs/jwt`) y adjunte `admin_user` al request; test unitario previo
- [ ] T031 [P] Crear `backend/src/common/utils/appointment-code.ts` generador Nano ID 10 chars alfabeto sin ambigüedades (research §14); test unitario previo verificando alfabeto y longitud
- [ ] T032 [P] Crear `backend/src/common/utils/id-number.ts` normalizador (uppercase, sin guion); test unitario previo
- [ ] T033 Wire completo en `backend/src/main.ts`: bootstrap NestJS, `helmet`, `cookie-parser`, `@nestjs/throttler` con dos buckets (público 30/min; lookup 10/min — research §10), `pino` como logger global, `ZodValidationPipe` global, `GlobalExceptionFilter` global, `LoggingInterceptor` global, listen en `PORT`

### Frontend foundational

- [X] T034 [P] Configurar `frontend/tailwind.config.mjs` con tokens de color AAA (research §9): `primary #8B1E2D`, `ink #0F172A`, `paper #FFFFFF`, `paper-warm #FAF7F5`, `success #0F5132`; extender `screens` para asegurar mobile-first; agregar plugin custom que aplica `focus-visible: outline 3px offset 2px`
- [X] T035 [P] Crear `frontend/src/styles/tokens.css` con variables CSS de la paleta y un bloque `@media (prefers-reduced-motion: reduce)` que reduzca todas las transiciones a `0.01s` y elimine `transform`
- [X] T036 [P] Configurar `frontend/astro.config.mjs` con `@astrojs/react`, `@astrojs/tailwind`, `experimental.viewTransitions: true`, `output: 'server'` (SSR necesario para leer estado del kill switch en el server)
- [X] T037 [P] Crear `frontend/src/lib/api-client.ts` con `fetch` tipado que use `PUBLIC_API_BASE_URL`, incluya `credentials: 'include'` para endpoints admin y maneje errores estándar; test Vitest previo
- [X] T038 [P] Crear `frontend/src/layouts/BaseLayout.astro` con `<html lang="es">`, `<meta viewport>` correcto, tokens CSS incluidos, `skip-to-content` link, encabezado con el nombre del banco
- [X] T039 [P] Crear componente `frontend/src/components/ui/Button.tsx` accesible (`type` correcto, `aria-busy` en loading, focus visible AAA, area ≥44×44); test Vitest + Testing Library previo con axe
- [X] T040 [P] Crear `frontend/src/components/ui/TextField.tsx` accesible (label asociado, `aria-invalid`, `aria-describedby` para error); test previo con axe
- [X] T041 [P] Crear `frontend/src/components/ui/Checkbox.tsx` accesible (misma cobertura); test previo con axe

**Checkpoint**: Fundamentos listos. Backend levanta y responde `/health`. Frontend renderiza layout vacío. Zod schemas y utilidades tienen tests verdes.

---

## Phase 3: User Story 1 — Agendar cita en <90 s (P1) 🎯 MVP

**Goal**: Donante entra al sitio, ve requisitos/exclusiones, agenda una cita con nombre + apellido + cédula + checkbox de elegibilidad, y recibe pantalla + comprobante — todo en menos de 90 segundos, WCAG AAA, mobile-first.

**Independent Test**: Con Postgres seed + 3 slots poblados manualmente, un donante ficticio completa el flujo de agendar en el emulador móvil de Chrome bajo 90 s, `POST /api/v1/appointments` responde 201 con `code` de 10 chars, y `remainingCapacity` del slot baja en 1.

### Tests for User Story 1 (TDD — escribir primero, deben fallar) ⚠️

**Backend**

- [ ] T042 [P] [US1] Contract test `GET /api/v1/health` en `backend/test/contract/health.spec.ts`
- [ ] T043 [P] [US1] Contract test `GET /api/v1/content/donation-info` en `backend/test/contract/content.spec.ts` que verifique presencia de 6 requisitos + 5 consideraciones, hospital name = "Hospital Central de San Cristóbal", mapUrl y schedule
- [ ] T044 [P] [US1] Contract test `GET /api/v1/system/status` en `backend/test/contract/system-status-public.spec.ts`
- [ ] T045 [P] [US1] Contract test `GET /api/v1/slots` en `backend/test/contract/slots-public.spec.ts` (filtros `from`/`to`, orden por fecha/hora, solo `is_disabled=false` y con cupo)
- [ ] T046 [P] [US1] Contract test `POST /api/v1/appointments` happy path en `backend/test/contract/appointments-create.spec.ts` (201 con `code` regex, decremento de capacidad, `eligibility_declared_at` persistido)
- [ ] T047 [P] [US1] Contract test `POST /api/v1/appointments` error 409 `duplicate_active_appointment` en `backend/test/contract/appointments-duplicate.spec.ts`
- [ ] T048 [P] [US1] Contract test `POST /api/v1/appointments` error 409 `slot_full` en `backend/test/contract/appointments-full.spec.ts`
- [ ] T049 [P] [US1] Contract test `POST /api/v1/appointments` error 503 `appointments_disabled` cuando kill switch activo en `backend/test/contract/appointments-kill-switch.spec.ts`
- [ ] T050 [P] [US1] Contract test `POST /api/v1/appointments` error 400 cuando `eligibilityDeclared=false` en `backend/test/contract/appointments-eligibility.spec.ts`
- [ ] T051 [P] [US1] Contract test rate limit `POST /api/v1/appointments` en `backend/test/contract/appointments-throttle.spec.ts` (31ª request/min → 429)
- [ ] T052 [P] [US1] Integration test de **concurrencia** SERIALIZABLE en `backend/test/integration/appointments-concurrency.spec.ts` (slot capacity=1, dos POST simultáneos → uno 201, otro 409; SC-009)

**Frontend**

- [ ] T053 [P] [US1] Vitest unit para `Wizard` state machine en `frontend/src/components/wizard/wizard-state.test.ts`
- [ ] T054 [P] [US1] Playwright E2E happy path `<90s` en `frontend/test/e2e/us1-happy-path.spec.ts` (emulador Pixel 5, red 3G lenta, incluye assertion de tiempo)
- [ ] T055 [P] [US1] Playwright E2E checkbox de elegibilidad obligatorio en `frontend/test/e2e/us1-eligibility-required.spec.ts` (botón "Confirmar" queda deshabilitado sin marcar)
- [ ] T056 [P] [US1] Playwright E2E kill switch redirect en `frontend/test/e2e/us1-kill-switch.spec.ts` (con kill switch activo, `/agendar` redirige a `/kill-switch-activo`)
- [ ] T057 [P] [US1] axe-core AAA test en `frontend/test/e2e/us1-a11y.spec.ts` (landing, cada paso del wizard, pantalla de éxito, kill switch)

### Implementation for User Story 1

**Backend — Content module**

- [ ] T058 [P] [US1] Crear archivos JSON de contenido en `backend/src/modules/content/data/requirements.es.json` y `backend/src/modules/content/data/exclusions.es.json` con los textos exactos de `spec.md > Contenido Informativo`
- [ ] T059 [P] [US1] Crear `backend/src/modules/content/content.service.ts` que lee los JSON y expone `getDonationInfo()`; incluir hospital name, mapUrl, schedule constantes
- [ ] T060 [US1] Crear `backend/src/modules/content/content.controller.ts` con `GET /content/donation-info`
- [ ] T061 [US1] Registrar `ContentModule` en `AppModule` (`backend/src/modules/content/content.module.ts` + import en `backend/src/app.module.ts`)

**Backend — System status público**

- [ ] T062 [US1] Crear `backend/src/modules/system-state/system-state.controller.ts` con `GET /system/status` que consume `SystemStateService` (T028)
- [ ] T063 [US1] Registrar `SystemStateModule` en `AppModule`

**Backend — Slots público**

- [ ] T064 [P] [US1] Crear `backend/src/modules/slots/slots.repository.ts` con método `findPublic({ from, to })` que devuelve slots con `remainingCapacity` computado; test unitario previo con mock Prisma
- [ ] T065 [US1] Crear `backend/src/modules/slots/slots.service.ts` que orquesta el repo y aplica ventana hoy+30d default
- [ ] T066 [US1] Crear `backend/src/modules/slots/slots.controller.ts` con `GET /slots`
- [ ] T067 [US1] Health module + endpoint `GET /health` en `backend/src/modules/health/*` (Postgres ping)

**Backend — Appointments público (creación)**

- [ ] T068 [P] [US1] Crear `backend/src/modules/appointments/appointments.repository.ts` con método `createInTransaction(dto, generatedCode)` que abre transacción SERIALIZABLE, `SELECT ... FOR UPDATE`, valida cupo, valida único activo por cédula, inserta cita — test unitario con transaction abstraction previo
- [ ] T069 [US1] Crear `backend/src/modules/appointments/appointments.service.ts` orquestando: normalización de cédula (T032), generación de `code` (T031), llamada al repo, mapeo del error a 409 `duplicate_active_appointment` o `slot_full`
- [ ] T070 [US1] Crear `backend/src/modules/appointments/appointments.controller.ts` con `POST /appointments` protegido por `@ProtectedByKillSwitch()` y `@Throttle(30, 60)`
- [ ] T071 [US1] Registrar `SlotsModule` y `AppointmentsModule` en `AppModule`

**Backend — OpenAPI generation**

- [ ] T072 [US1] Configurar generación de `contracts/public-api.openapi.yaml` verificado desde los DTOs Zod en `backend/src/scripts/generate-openapi.ts` (uso de `@anatine/zod-openapi`); añadir script `pnpm --filter backend openapi:check` que falla si el YAML actual no coincide con el generado

**Frontend — Landing**

- [ ] T073 [P] [US1] Crear `frontend/src/pages/index.astro` (landing) con encabezado hospital, botón CTA "Agendar cita", 6 requisitos y 5 consideraciones en dos secciones, link al mapa, todo hidratado desde `GET /content/donation-info` en tiempo de build (SSG parcial) con revalidación a runtime si el flag lo requiere
- [ ] T074 [P] [US1] Crear `frontend/src/pages/kill-switch-activo.astro` (mensaje "Agendamiento temporalmente cerrado" + explicación breve)

**Frontend — Wizard**

- [ ] T075 [P] [US1] Crear `frontend/src/components/wizard/WizardShell.tsx` (isla React) con máquina de estados por pasos, barra `role="progressbar"`, región `aria-live="polite"` y manejo de foco al `<h1>` de cada paso (research §7)
- [ ] T076 [P] [US1] Crear `frontend/src/components/wizard/StepIntro.tsx` (paso 1: recordatorio + checkbox de auto-declaración) usando `Checkbox` (T041)
- [ ] T077 [P] [US1] Crear `frontend/src/components/wizard/StepSlot.tsx` (paso 2: listado de slots consumiendo `GET /slots` con `remainingCapacity`) — sin dropdown; opciones tipo radio card grandes (target ≥44px)
- [ ] T078 [P] [US1] Crear `frontend/src/components/wizard/StepIdentity.tsx` (paso 3: nombre, apellido, cédula) usando `TextField` (T040) + `react-hook-form` con `zodResolver` de esquema compartido
- [ ] T079 [P] [US1] Crear `frontend/src/components/wizard/StepConfirm.tsx` (paso 4: revisión + botón confirmar; ejecuta POST a `/appointments`)
- [ ] T080 [US1] Crear `frontend/src/pages/agendar/index.astro` que renderiza `WizardShell` en el server e hidrata en el client; server-side chequea `GET /system/status`, redirige a `/kill-switch-activo` si `appointmentsDisabled=true`
- [ ] T081 [P] [US1] Crear `frontend/src/components/wizard/SuccessScreen.tsx` con: código en fuente monospace grande, botón "Descargar comprobante" (usa `window.print()` con hoja `@media print` optimizada), datos de hospital + mapa + recordatorios (FR-009)
- [ ] T082 [P] [US1] Crear `frontend/src/styles/print.css` que oculta navegación e imprime solo el bloque del comprobante

**Frontend — Animaciones + a11y**

- [ ] T083 [US1] Añadir transiciones CSS en `frontend/src/components/wizard/WizardShell.tsx` con `translate + opacity` de 220ms + fallback a `prefers-reduced-motion`; documentar en cabecera del archivo el porqué de no usar Framer Motion (research §8)

**Checkpoint MVP**: US1 completo. El flujo público funciona end-to-end, cumple <90s, AAA, mobile-first, y se puede demostrar independientemente. Es el MVP entregable.

---

## Phase 4: User Story 2 — Consultar / Cancelar / Reagendar mi cita (P2)

**Goal**: El donante consulta su cita con cédula + código, la ve, puede cancelar (libera cupo) o reagendar (mismo código, otro slot).

**Independent Test**: Con una cita creada por US1, ingresar cédula + código en `/consultar` muestra la cita; cancelar → cupo del slot original vuelve a subir; reagendar a otro slot → código conservado, cupo antiguo libre, cupo nuevo consumido.

### Tests for User Story 2 (TDD) ⚠️

- [ ] T084 [P] [US2] Contract test `POST /api/v1/appointments/lookup` happy path en `backend/test/contract/appointments-lookup.spec.ts`
- [ ] T085 [P] [US2] Contract test `POST /api/v1/appointments/lookup` cédula/código incorrectos → 404 genérico en `backend/test/contract/appointments-lookup-notfound.spec.ts` (FR-016)
- [ ] T086 [P] [US2] Contract test rate limit lookup en `backend/test/contract/appointments-lookup-throttle.spec.ts` (11ª request/min → 429)
- [ ] T087 [P] [US2] Contract test `POST /api/v1/appointments/{code}/cancel` en `backend/test/contract/appointments-cancel.spec.ts` (estado `cancelled_by_donor`, cupo liberado)
- [ ] T088 [P] [US2] Contract test `cancel` con kill switch activo sigue funcionando (FR-023b) en `backend/test/contract/appointments-cancel-with-kill-switch.spec.ts`
- [ ] T089 [P] [US2] Contract test `PATCH /api/v1/appointments/{code}/reschedule` happy path en `backend/test/contract/appointments-reschedule.spec.ts` (código conservado, cupo viejo libre, cupo nuevo consumido)
- [ ] T090 [P] [US2] Contract test `reschedule` con kill switch activo → 409 `kill_switch_active` en `backend/test/contract/appointments-reschedule-kill-switch.spec.ts`
- [ ] T091 [P] [US2] Contract test `reschedule` sin cupo en nuevo slot → 409 `slot_full` en `backend/test/contract/appointments-reschedule-full.spec.ts`
- [ ] T092 [P] [US2] Integration test de concurrencia en reschedule (dos reagendamientos al mismo slot con 1 cupo) en `backend/test/integration/appointments-reschedule-concurrency.spec.ts`
- [ ] T093 [P] [US2] Playwright E2E consulta + cancelación en `frontend/test/e2e/us2-cancel.spec.ts`
- [ ] T094 [P] [US2] Playwright E2E reagendamiento en `frontend/test/e2e/us2-reschedule.spec.ts`
- [ ] T095 [P] [US2] axe-core AAA test de `/consultar` en `frontend/test/e2e/us2-a11y.spec.ts`

### Implementation for User Story 2

**Backend**

- [ ] T096 [P] [US2] Añadir métodos `findByCodeAndIdNumber(code, idNumber)`, `cancelByDonor(appointment)`, `rescheduleInTransaction(appointment, newSlotId)` en `backend/src/modules/appointments/appointments.repository.ts` — cada método con test unitario previo (mock Prisma)
- [ ] T097 [US2] Ampliar `backend/src/modules/appointments/appointments.service.ts` con métodos `lookup`, `cancel`, `reschedule` (normaliza cédula, maneja not-found genérico, `reschedule` valida kill switch)
- [ ] T098 [US2] Ampliar `backend/src/modules/appointments/appointments.controller.ts` con `POST /appointments/lookup` (throttle 10/min), `POST /appointments/:code/cancel`, `PATCH /appointments/:code/reschedule` (protegido por `@ProtectedByKillSwitch()`)

**Frontend**

- [ ] T099 [P] [US2] Crear `frontend/src/pages/consultar/index.astro` que en SSR chequea el kill switch y muestra el flujo completo pero deshabilita el botón "Reagendar" cuando `appointmentsDisabled=true`
- [ ] T100 [P] [US2] Crear `frontend/src/components/lookup/LookupForm.tsx` (isla React) con dos pasos: (1) form cédula+código, (2) detalle con botones "Cancelar" y "Reagendar" — accesible AAA
- [ ] T101 [P] [US2] Crear `frontend/src/components/lookup/RescheduleForm.tsx` reutilizando `StepSlot.tsx` (T077) para elegir nuevo slot y llamando al `PATCH .../reschedule`
- [ ] T102 [P] [US2] Actualizar OpenAPI YAML verificando que el generado desde Zod (T072) sigue coincidiendo tras los nuevos endpoints

**Checkpoint**: US1 + US2 funcionan de manera independiente y en conjunto.

---

## Phase 5: User Story 3 — Panel administrativo (P3)

**Goal**: Admin autenticado gestiona franjas (crear/editar/deshabilitar auto-cancelando citas), lista citas por fecha, descarga PDF por día o intervalo, y activa/desactiva el kill switch global.

**Independent Test**: Login admin → crear franja mañana 07:00–07:35 cap=3 → US1 la ve y agenda → admin desde `/admin/citas` la lista, descarga PDF, y activa el kill switch (US1 queda bloqueado; consulta en US2 aún permite cancelar).

### Tests for User Story 3 (TDD) ⚠️

**Auth**

- [ ] T103 [P] [US3] Contract test `POST /api/v1/admin/auth/login` happy path (Set-Cookie con HttpOnly, Secure, SameSite=Strict, TTL 8h) en `backend/test/contract/admin-login.spec.ts`
- [ ] T104 [P] [US3] Contract test login fallido → 401 en `backend/test/contract/admin-login-invalid.spec.ts`
- [ ] T105 [P] [US3] Contract test rate limit login (5ª failed request/min → 429) en `backend/test/contract/admin-login-throttle.spec.ts`
- [ ] T106 [P] [US3] Contract test `POST /admin/auth/logout` y `GET /admin/me` en `backend/test/contract/admin-me.spec.ts`
- [ ] T107 [P] [US3] Integration test bcrypt cost 12 y hashing seguro en `backend/test/integration/admin-password-hashing.spec.ts`

**Slots admin**

- [ ] T108 [P] [US3] Contract test `GET /admin/slots` con filtros y `includeDisabled` en `backend/test/contract/admin-slots-list.spec.ts`
- [ ] T109 [P] [US3] Contract test `POST /admin/slots` happy path L–V 7:00–12:00 en `backend/test/contract/admin-slots-create.spec.ts`
- [ ] T110 [P] [US3] Contract test `POST /admin/slots` fuera de horario sin `isExceptionHours` → 400 en `backend/test/contract/admin-slots-out-of-hours.spec.ts`
- [ ] T111 [P] [US3] Contract test `POST /admin/slots` con `isExceptionHours=true` acepta sábado y registra excepción en `backend/test/contract/admin-slots-exception.spec.ts`
- [ ] T112 [P] [US3] Contract test `PATCH /admin/slots/:id` con `capacity < usedCapacity` → 409 en `backend/test/contract/admin-slots-update-conflict.spec.ts`
- [ ] T113 [P] [US3] Contract test `POST /admin/slots/:id/disable` con citas activas → todas quedan `cancelled_by_bank` y `cancelledAppointments` correcto en `backend/test/contract/admin-slots-disable.spec.ts`

**Appointments admin y PDF**

- [ ] T114 [P] [US3] Contract test `GET /admin/appointments` con rango y filtro por status en `backend/test/contract/admin-appointments-list.spec.ts`
- [ ] T115 [P] [US3] Contract test `GET /admin/appointments/export.pdf` en `backend/test/contract/admin-appointments-pdf.spec.ts` (verificar `Content-Type: application/pdf`, magic bytes `%PDF-`, y que el PDF contiene el nombre del hospital y las cabeceras de columnas)

**Kill switch**

- [ ] T116 [P] [US3] Contract test `GET /admin/system-state` en `backend/test/contract/admin-system-state.spec.ts`
- [ ] T117 [P] [US3] Contract test `POST /admin/system-state/kill-switch` activar/desactivar en `backend/test/contract/admin-kill-switch.spec.ts`

**Audit log**

- [ ] T118 [P] [US3] Integration test que verifica que cada mutación admin (login, create slot, disable slot, kill switch on/off, PDF export) inserta una fila en `admin_audit_log` en `backend/test/integration/admin-audit-log.spec.ts`

**E2E frontend**

- [ ] T119 [P] [US3] Playwright E2E flujo admin completo en `frontend/test/e2e/us3-admin-flow.spec.ts` (login → crear slot → listar citas → descargar PDF → activar/desactivar kill switch)
- [ ] T120 [P] [US3] axe-core AAA test de todo `/admin/**` en `frontend/test/e2e/us3-a11y.spec.ts`

### Implementation for User Story 3

**Backend — Auth**

- [ ] T121 [P] [US3] Crear `backend/src/modules/admin/auth/admin-auth.service.ts` con `login(username, password)` bcrypt-verify + JWT firm; test unitario previo
- [ ] T122 [US3] Crear `backend/src/modules/admin/auth/admin-auth.controller.ts` con `POST /admin/auth/login`, `POST /admin/auth/logout`, `GET /admin/me`; setear cookie HttpOnly Secure SameSite=Strict TTL 8h
- [ ] T123 [US3] Registrar `AdminAuthModule` en `AppModule` con `@nestjs/jwt` configurado desde env

**Backend — Slots admin**

- [ ] T124 [P] [US3] Añadir en `backend/src/modules/slots/slots.repository.ts` los métodos admin `create`, `update`, `disable(withCancellation)` (transacción SERIALIZABLE que cambia estado de citas activas a `cancelled_by_bank`); test unitario previo
- [ ] T125 [US3] Crear `backend/src/modules/admin/slots/admin-slots.controller.ts` con `GET /admin/slots`, `POST /admin/slots`, `PATCH /admin/slots/:id`, `POST /admin/slots/:id/disable`, todos protegidos por `AdminGuard`

**Backend — Appointments admin + PDF**

- [ ] T126 [P] [US3] Añadir en `backend/src/modules/appointments/appointments.repository.ts` método `findByDateRange({ from, to, status? })`; test unitario previo
- [ ] T127 [P] [US3] Crear `backend/src/modules/admin/reports/pdf-report.service.ts` que usa `pdfkit` para generar un PDF con cabecera "Hospital Central de San Cristóbal", rango de fechas, tabla ordenada por fecha/hora con columnas hora / nombre / apellido / cédula / código / estado; test unitario previo con inspección de bytes generados
- [ ] T128 [US3] Crear `backend/src/modules/admin/reports/admin-reports.controller.ts` con `GET /admin/appointments` y `GET /admin/appointments/export.pdf` (protegidos por `AdminGuard`); registrar acción `pdf_exported` en `admin_audit_log`

**Backend — System state admin (kill switch)**

- [ ] T129 [US3] Ampliar `backend/src/modules/system-state/system-state.service.ts` con `toggle(adminId, enabled, reason)` que actualiza singleton y registra `kill_switch_on`/`kill_switch_off` en audit log
- [ ] T130 [US3] Crear `backend/src/modules/admin/system-state/admin-system-state.controller.ts` con `GET /admin/system-state` y `POST /admin/system-state/kill-switch`

**Backend — Audit log wire**

- [ ] T131 [P] [US3] Crear `backend/src/modules/admin/audit/admin-audit-log.service.ts` inyectable; test unitario previo
- [ ] T132 [US3] Inyectar `AdminAuditLogService` en los servicios de auth, slots admin, appointments admin y system-state admin, registrando la acción correspondiente en cada mutación

**Frontend — Panel admin**

- [ ] T133 [P] [US3] Crear `frontend/src/pages/admin/login.astro` con `AdminLoginForm.tsx` (isla React accesible, autofocus, muestra error genérico en 401)
- [ ] T134 [P] [US3] Crear `frontend/src/layouts/AdminLayout.astro` con navegación entre "Franjas", "Citas" y "Estado del sistema"; en el `<head>` marca `<meta name="robots" content="noindex">`
- [ ] T135 [P] [US3] Crear `frontend/src/pages/admin/franjas.astro` + isla `FranjasPanel.tsx` (listar, crear con validación de horario, editar, deshabilitar con modal que muestra `cancelledAppointments`)
- [ ] T136 [P] [US3] Crear `frontend/src/pages/admin/citas.astro` + isla `CitasPanel.tsx` con filtro por rango, tabla accesible (`<table>` con `<caption>`, `scope="col"`) y botón "Descargar PDF" que consume el endpoint
- [ ] T137 [P] [US3] Crear `frontend/src/pages/admin/panel.astro` (home del panel) con tarjeta grande de kill switch (toggle con confirmación) y estado actual visible
- [ ] T138 [P] [US3] Actualizar `frontend/src/lib/api-client.ts` con wrappers admin (`adminLogin`, `adminLogout`, CRUD franjas, listar citas, exportar PDF, toggle kill switch) usando `credentials: 'include'`
- [ ] T139 [US3] Wire de guards de ruta en frontend: middleware Astro que redirige `/admin/*` a `/admin/login` cuando `GET /admin/me` responde 401

**Checkpoint US3**: Panel admin operativo. US1 + US2 + US3 son plenamente funcionales.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Retención, hardening, performance, observabilidad, documentación.

- [ ] T140 [P] Job de retención en `backend/src/modules/appointments/retention.job.ts` que corre cron diario (`@nestjs/schedule`) y anonimiza citas finales con `date` >90 días atrás (research §12); test integration previo en `backend/test/integration/retention.spec.ts` con override `TEST_REDACTION_DAYS`
- [ ] T141 [P] Job de estados en `backend/src/modules/appointments/expire-active.job.ts` que marca como `no_show` las citas `active` cuyo slot ya pasó (por defecto 2h después de `end_time`); test integration previo
- [ ] T142 [P] Log masking en `backend/src/common/interceptors/logging.interceptor.ts` (extender T027) — sanitizar `firstName`, `lastName`, `idNumber` en request bodies antes de emitir el log; test unitario previo
- [ ] T143 [P] Añadir headers de seguridad en `backend/src/main.ts` con `helmet` (CSP restrictivo, HSTS solo prod); test integration verificando presencia de headers
- [ ] T144 [P] Endpoint `/health/live` y `/health/ready` diferenciados en `backend/src/modules/health/health.controller.ts` (ready incluye ping Postgres, live solo proceso vivo)
- [ ] T145 [P] Snapshot del OpenAPI generado contra `contracts/public-api.openapi.yaml` y `contracts/admin-api.openapi.yaml` en CI (job `openapi-check` en `.github/workflows/ci.yml`) — falla el build si divergen
- [ ] T146 [P] Lighthouse mobile budget en `.github/workflows/ci.yml` con umbrales: Performance ≥90, Accessibility ≥95, Best Practices ≥90; corre sobre landing y `/agendar`
- [ ] T147 [P] Actualizar `README.md` raíz con: comandos `pnpm dev`/`pnpm test`/`pnpm build`, referencia a `specs/001-blood-donation-scheduling/quickstart.md`, y política de branches (Git Flow) según Constitución Principio VI
- [ ] T148 [P] Añadir `CONTRIBUTING.md` breve indicando: TDD obligatorio, comentarios en español, checklist AAA + mobile antes de PR
- [ ] T149 Correr `pnpm test:smoke` (Validaciones 1, 4, 6, 8, 10, 11 de `quickstart.md`) en verde end-to-end
- [ ] T150 Verificar contrastes finales de la paleta con `pa11y` sobre landing, wizard, admin (ampliación de T146) y ajustar tokens si algún pair queda bajo 7:1

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: sin dependencias — arranca ya.
- **Phase 2 (Foundational)**: depende de Phase 1. **BLOQUEA todas las user stories**.
- **Phase 3 (US1 — MVP)**: depende de Phase 2. Puede completarse y desplegarse sola.
- **Phase 4 (US2)**: depende de Phase 2 (y de que exista una `appointment` para probar; los tests siembran datos por sí mismos).
- **Phase 5 (US3)**: depende de Phase 2. Los tests siembran slots y citas para no depender de US1.
- **Phase 6 (Polish)**: depende de al menos una US en producción — se recomienda tras US3 pero varias tareas de Polish [P] pueden empezar antes.

### User Story Dependencies

- **US1 (P1)**: independiente. Es el MVP.
- **US2 (P2)**: comparte modelo `appointment` y `slot` con US1, pero sus endpoints son distintos. Sus tests sembran datos → independiente.
- **US3 (P3)**: comparte todo el modelo. `AdminGuard` + `AdminAuditLog` son ortogonales al flujo público. Independiente.

### Within Each User Story

- Tests MUST fallar antes de escribir la implementación (Principio V).
- Modelos/repos antes de servicios; servicios antes de controllers; contract test antes de service; E2E después de que el controller y el frontend estén en pie.

### Parallel Opportunities

- **Setup**: T003–T015 casi todos [P] (distintos archivos de configuración).
- **Foundational**: T016–T041 mayormente [P] agrupados por área (shared schemas, common backend, tokens/frontend UI).
- **US1 tests**: T042–T057 casi todos [P] (archivos distintos).
- **US1 impl**: contenido (T058–T061), slots (T064–T067) y wizard frontend (T075–T082) pueden ir en paralelo entre áreas.
- **US2 tests**: T084–T095 casi todos [P].
- **US3 tests**: T103–T120 casi todos [P].
- **Polish**: T140–T148 casi todos [P].

---

## Parallel Example — User Story 1 (kick-off)

Comandos que pueden lanzarse en paralelo justo después de terminar Phase 2:

```text
Task: "Contract test GET /api/v1/health en backend/test/contract/health.spec.ts"
Task: "Contract test GET /api/v1/content/donation-info en backend/test/contract/content.spec.ts"
Task: "Contract test GET /api/v1/system/status en backend/test/contract/system-status-public.spec.ts"
Task: "Contract test GET /api/v1/slots en backend/test/contract/slots-public.spec.ts"
Task: "Contract test POST /api/v1/appointments (happy) en backend/test/contract/appointments-create.spec.ts"
Task: "Playwright E2E happy path <90s en frontend/test/e2e/us1-happy-path.spec.ts"
Task: "axe-core AAA test en frontend/test/e2e/us1-a11y.spec.ts"
```

Una vez rojos, cada implementación puede repartirse:

```text
Task: "Backend ContentModule en backend/src/modules/content/*"
Task: "Backend SlotsModule público en backend/src/modules/slots/*"
Task: "Frontend Landing en frontend/src/pages/index.astro"
Task: "Frontend WizardShell en frontend/src/components/wizard/WizardShell.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1 (Setup).
2. Completar Phase 2 (Foundational). **Crítico** — bloquea todo lo demás.
3. Completar Phase 3 (US1).
4. **PARAR y VALIDAR** con Validaciones 1, 2, 3 y 10 de `quickstart.md`. Demo al banco de sangre.
5. Desplegar como MVP si se aprueba.

### Incremental Delivery

1. Setup + Foundational → base sólida.
2. **US1** → MVP demostrable (agendar cita con AAA + mobile-first).
3. **US2** → añade consulta/cancelación/reagendamiento; reduce no-shows.
4. **US3** → añade panel admin, PDF, kill switch; da autonomía operativa al banco.
5. **Polish** → retención, hardening, budgets Lighthouse; producción real.

### Parallel Team Strategy

Con 2+ desarrolladores tras Foundational:

- Dev A: US1 backend (contenido + slots + appointments).
- Dev B: US1 frontend (landing + wizard).
- Dev C: US3 backend auth + admin infra (puede comenzar en paralelo aunque se merge después).

Merge por PRs a `develop` (Git Flow, Principio VI). Solo se avanza a la siguiente US cuando la anterior pasa Validaciones + a11y en `develop`.

---

## Notes

- **Tests obligatorios por Constitución (Principio V)**. Cada test MUST fallar antes de su implementación pareja (evidencia en historial git). Este es el único requisito no negociable adicional al template genérico.
- **Comentarios en español** en el código (Principio VII).
- **Mobile-first + AAA** verificados por CI (Lighthouse mobile + axe-core). Nada llega a `develop` con violaciones.
- **`[P]`** = archivo distinto, sin dependencias en tareas abiertas. No `[P]` = requiere que la tarea anterior esté completa por dependencia funcional o mismo archivo.
- Commit por tarea o grupo lógico, con mensaje que referencie el ID (`feat(us1): T068 slot repository`).
- Cualquier violación a la Constitución encontrada en el camino MUST volver al plan y quedar en `Complexity Tracking`.
