# Implementation Plan: Agendamiento de Citas para Donación de Sangre

**Branch**: `001-blood-donation-scheduling` | **Date**: 2026-07-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-blood-donation-scheduling/spec.md`

## Summary

Sitio público mobile-first para el Banco de Sangre del **Hospital Central de San Cristóbal** que sustituye la cola por orden de llegada por un sistema de citas con auto-declaración de elegibilidad. El donante entra al sitio, revisa requisitos y criterios de exclusión, elige un horario con cupo, ingresa nombre / apellido / cédula, marca el checkbox de auto-declaración, y recibe una pantalla + comprobante descargable — todo en menos de 90 segundos. El personal del banco administra franjas horarias (35 min, L–V 7–12), descarga la lista del día o de un intervalo en PDF, y dispone de un **kill switch** global para pausar el flujo público cuando lo necesite.

**Enfoque técnico**: monolito de un solo repositorio con `frontend/` (Astro puro + Tailwind CSS + islas React puntuales para el wizard interactivo) y `backend/` (NestJS + TypeScript + PostgreSQL relacional 3NF). El frontend solo consume la API propia del backend (Principio I). El wizard multi-paso reduce la carga cognitiva mostrando un solo campo/decisión por pantalla; las animaciones son sutiles, respetan `prefers-reduced-motion` y contribuyen a la accesibilidad (transiciones que orientan el foco). El backend expone REST versionado en `/api/v1/*` con contratos OpenAPI generados desde los DTOs.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js 20 LTS (frontend build y backend runtime).

**Primary Dependencies**:

- **Frontend**: Astro 5.x (renderizado estático + islas), Tailwind CSS 3.x, React 18 (solo para el wizard de agendamiento y el panel administrativo — el resto es HTML estático de Astro), `@astrojs/react`, animaciones vía CSS transitions + `View Transitions API` de Astro (con fallback y respeto a `prefers-reduced-motion`), `zod` para validación de formularios en cliente.
- **Backend**: NestJS 10, TypeORM 0.3 (o Prisma 5 — se decide en Phase 0), `class-validator` + `class-transformer`, `bcrypt` para hashing de contraseña del admin, `@nestjs/jwt` para sesión admin, `pino` para logging estructurado, `helmet` y `@nestjs/throttler` para hardening HTTP, `pdfkit` para generación de PDF server-side.
- **Compartido**: `zod` schemas + tipos TS derivados vía `packages/shared` para reutilizar el contrato entre frontend y backend sin duplicar (respeta Principio II — monolito cohesivo).

**Storage**: PostgreSQL 16 (relacional puro, normalizado a 3NF; sin JSONB salvo el log de auditoría de acciones administrativas).

**Testing**:

- **Backend**: Jest (unit) + `@nestjs/testing` + Supertest (integración/contract). Tests de integración corren contra un Postgres real vía `testcontainers` (no mocks — respeta Principio V y "solo API propia").
- **Frontend**: Vitest + Testing Library para componentes React; Playwright para E2E del wizard y del panel; `@axe-core/playwright` para auditoría AAA en cada test E2E crítico.

**Target Platform**: navegadores modernos móviles (iOS Safari 15+, Chrome Android últimas 2 versiones) y desktop para el panel admin. Backend en Linux (contenedor).

**Project Type**: aplicación web (monolito con `backend/` y `frontend/` en el mismo repo — Principio II).

**Performance Goals**:

- Lighthouse Performance ≥ 90 en perfil móvil para landing y wizard.
- Time to Interactive < 5 s en 3G lenta (SC-007).
- 200 confirmaciones concurrentes sin sobrevenderse cupos (SC-006, SC-009).
- Endpoint de listar horarios disponibles: p95 < 200 ms bajo carga esperada.

**Constraints**:

- WCAG 2.1 nivel **AAA** (Principio III de la Constitución): contraste 7:1 texto normal / 4.5:1 texto grande, navegación teclado completa, `prefers-reduced-motion` respetado, targets táctiles ≥ 44×44 px.
- Solo API propia (Principio I): sin dependencias externas para notificar, mapear o autenticar (el enlace al mapa es un `href` estático a Google Maps, no una integración).
- Ventana temporal America/Caracas, horario L–V 7:00–12:00, sesión de 35 min.
- Un solo administrador en el MVP (autenticación básica usuario + contraseña).
- Confirmación 100% dentro del sitio (sin SMS/email).

**Scale/Scope**:

- ~1 hospital, ~200 agendamientos concurrentes pico, ~50–150 citas/día.
- ~5 endpoints públicos + ~8 endpoints administrativos.
- ~5 entidades relacionales principales.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluación contra los 8 principios de `.specify/memory/constitution.md` v1.0.0.

| Principio | Cumplimiento | Evidencia |
|-----------|--------------|-----------|
| I. API Propia y Única | ✅ | Frontend Astro consume solo `/api/v1/*` del backend NestJS del mismo repo. Sin proveedores externos (mapas se abren en pestaña nueva vía `href`; no hay SDK). |
| II. Monolito Cohesivo | ✅ | Un solo repo con `backend/`, `frontend/`, `packages/shared/`. Tipos y validación se comparten mediante `packages/shared` sin duplicación. |
| III. Accesibilidad AAA (NO-NEGOCIABLE) | ✅ | Tailwind con paleta AAA (documentada en `frontend/tailwind.config.mjs`), `@axe-core/playwright` en CI, animaciones respetan `prefers-reduced-motion`, wizard multi-paso con foco explícito. |
| IV. SOLID | ✅ | NestJS por módulos (AppointmentsModule, SlotsModule, AdminModule, ContentModule); repositorios inyectados por interfaz; componentes React de responsabilidad única por paso del wizard. |
| V. TDD (NO-NEGOCIABLE) | ✅ | Contract tests + integration tests contra Postgres real (testcontainers) escritos antes de handlers. Vitest + Playwright para frontend antes de UI. |
| VI. Git Flow | ✅ | Ya adoptado en el repo (`main`, `develop`). Feature branch `feature/001-blood-donation-scheduling` derivada de `develop`. |
| VII. Comentarios para Visibilidad | ✅ | Convención: cabecera de 1–3 líneas por archivo público explicando su responsabilidad; comentarios de *por qué* en decisiones no obvias (concurrencia de cupos, kill switch semantics). En español. |
| VIII. Mobile-First | ✅ | Tailwind con `min-width` media queries, wizard diseñado para 360 px, áreas táctiles ≥ 44 px, Lighthouse móvil en CI. |

**Resultado**: PASA. No hay violaciones que justificar en *Complexity Tracking*.

## Project Structure

### Documentation (this feature)

```text
specs/001-blood-donation-scheduling/
├── plan.md              # Este archivo
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI + esquemas)
│   ├── public-api.openapi.yaml
│   ├── admin-api.openapi.yaml
│   └── shared-schemas.md
└── checklists/
    └── requirements.md  # Ya existe
```

### Source Code (repository root)

Estructura monolítica seleccionada (Option 2 del template — "web application"), con un paquete compartido adicional para tipos y esquemas:

```text
backend/
├── src/
│   ├── main.ts                       # Bootstrap NestJS
│   ├── app.module.ts
│   ├── modules/
│   │   ├── appointments/             # Citas: crear, consultar, cancelar, reagendar
│   │   │   ├── appointments.module.ts
│   │   │   ├── appointments.controller.ts
│   │   │   ├── appointments.service.ts
│   │   │   ├── entities/
│   │   │   ├── dto/
│   │   │   └── repositories/
│   │   ├── slots/                    # Franjas horarias (público + admin)
│   │   ├── admin/                    # Autenticación admin, kill switch, PDF export
│   │   │   ├── auth/
│   │   │   ├── system-state/         # Kill switch
│   │   │   └── reports/              # PDF export
│   │   ├── content/                  # Requisitos y criterios (lectura pública)
│   │   └── health/                   # Endpoint /health
│   ├── common/
│   │   ├── filters/                  # Exception filter que oculta detalles internos
│   │   ├── interceptors/             # Logging, request-id
│   │   ├── guards/                   # AdminGuard (JWT), KillSwitchGuard
│   │   ├── pipes/                    # ZodValidationPipe
│   │   └── decorators/
│   └── database/
│       ├── migrations/               # Migraciones TypeORM/Prisma
│       └── seeds/                    # Admin inicial + contenido informativo
└── test/
    ├── contract/                     # Contract tests por endpoint
    ├── integration/                  # E2E contra Postgres real (testcontainers)
    └── unit/

frontend/
├── astro.config.mjs
├── tailwind.config.mjs
├── src/
│   ├── pages/
│   │   ├── index.astro               # Landing: requisitos + exclusiones + CTA
│   │   ├── agendar/                  # Wizard multi-paso
│   │   │   └── index.astro
│   │   ├── consultar/                # Consultar / cancelar / reagendar
│   │   │   └── index.astro
│   │   ├── kill-switch-activo.astro  # Página mostrada cuando el flujo está cerrado
│   │   └── admin/
│   │       ├── login.astro
│   │       ├── franjas.astro
│   │       ├── citas.astro
│   │       └── panel.astro
│   ├── components/
│   │   ├── ui/                       # Botones, inputs, checkboxes accesibles
│   │   ├── wizard/                   # Islas React: pasos del wizard
│   │   │   ├── StepIntro.tsx
│   │   │   ├── StepEligibility.tsx
│   │   │   ├── StepSlot.tsx
│   │   │   ├── StepIdentity.tsx
│   │   │   └── StepConfirm.tsx
│   │   └── admin/                    # Islas React del panel admin
│   ├── layouts/
│   ├── styles/
│   │   └── tokens.css                # Tokens de color AAA médicos
│   └── lib/
│       ├── api-client.ts             # Cliente hacia backend
│       └── validation/               # Reutiliza esquemas de packages/shared
└── test/
    ├── unit/                         # Vitest
    └── e2e/                          # Playwright + axe-core

packages/
└── shared/
    ├── src/
    │   ├── schemas/                  # Zod: appointment, slot, admin, kill-switch
    │   └── types/                    # Tipos TS derivados
    └── package.json

.github/workflows/                    # CI: lint, test, a11y, lighthouse mobile
docker-compose.yml                    # Postgres local + pgAdmin
```

**Structure Decision**: **Web application (monolito con paquete compartido)**. `backend/` y `frontend/` conviven en el mismo repo (Principio II). El paquete `packages/shared/` con esquemas Zod y tipos evita duplicar la definición del contrato — el frontend importa las mismas piezas que el backend usa para validar, garantizando "una sola fuente de verdad" en un mono-repo. Los tests del backend usan Postgres real vía testcontainers; los del frontend combinan Vitest (islas React) y Playwright + axe-core (E2E accesible).

## Complexity Tracking

*No hay violaciones a la Constitución que justificar. Esta sección queda intencionalmente vacía.*
