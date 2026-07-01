# DonemosSC — Agendamiento de Citas para Donación de Sangre

Sistema web para el **Banco de Sangre del Hospital Central de San Cristóbal (Táchira, Venezuela)** que sustituye el sistema actual de atención por orden de llegada por un flujo de citas pre-agendadas: el donante entra al sitio, revisa requisitos y criterios de exclusión, elige un horario disponible, ingresa nombre + apellido + cédula, marca la auto-declaración de elegibilidad, y recibe un comprobante — todo en menos de 90 segundos.

## Documentos guía (leer en este orden)

1. [`/.specify/memory/constitution.md`](./.specify/memory/constitution.md) — los 8 principios NO-NEGOCIABLES del proyecto.
2. [`/specs/001-blood-donation-scheduling/spec.md`](./specs/001-blood-donation-scheduling/spec.md) — especificación funcional.
3. [`/specs/001-blood-donation-scheduling/plan.md`](./specs/001-blood-donation-scheduling/plan.md) — plan de implementación (stack, estructura, decisiones).
4. [`/specs/001-blood-donation-scheduling/tasks.md`](./specs/001-blood-donation-scheduling/tasks.md) — 150 tareas ordenadas por historia y en TDD.
5. [`/specs/001-blood-donation-scheduling/quickstart.md`](./specs/001-blood-donation-scheduling/quickstart.md) — 11 validaciones end-to-end.
6. [`/CONTRIBUTING.md`](./CONTRIBUTING.md) — cómo trabajar (ramas, PRs, checklist AAA + mobile).

## Stack

- **Frontend**: Astro 5 + Tailwind CSS + islas React puntuales (wizard, consulta, admin).
- **Backend**: NestJS 10 + TypeScript 5 + Prisma 5 + PostgreSQL 16.
- **Shared**: paquete `@donemos/shared` con esquemas Zod reutilizados por ambos lados.
- **Testing**: Jest + Supertest + testcontainers (backend), Vitest + Playwright + `@axe-core/playwright` (frontend).

Todo detallado en [plan.md § Technical Context](./specs/001-blood-donation-scheduling/plan.md#technical-context).

## Setup local (10 minutos)

### Requisitos previos

- **Node.js 20.18.1** (usa `nvm use` o `asdf` para respetar `.nvmrc` / `.tool-versions`).
- **pnpm 9.15.0** (`corepack enable && corepack prepare pnpm@9.15.0 --activate`).
- **Docker + Docker Compose** (para Postgres).
- **Git** con acceso SSH a este repo.

### Pasos

```bash
# 1) Clonar y entrar
git clone git@github.com:IvanMoch/donemos-sc.git
cd donemos-sc
git checkout develop

# 2) Instalar dependencias (una vez la Phase 1 del plan esté aplicada)
pnpm install

# 3) Levantar Postgres local
docker compose up -d postgres

# 4) Copiar plantillas de entorno
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Editar backend/.env con valores locales (JWT_SECRET, ADMIN_USERNAME, etc.)

# 5) Migraciones + seed
pnpm --filter backend prisma migrate deploy
pnpm --filter backend prisma db seed

# 6) Levantar el sistema (dos terminales)
pnpm --filter backend dev      # http://localhost:3001/api/v1/health
pnpm --filter frontend dev     # http://localhost:4321
```

> Mientras el proyecto está en construcción (Fases 1–2), varios de estos comandos aún no existen porque el scaffolding no está aplicado. Van entrando conforme se cierren las tareas T001–T041 del plan.

### Validación

Sigue las 11 validaciones de [quickstart.md](./specs/001-blood-donation-scheduling/quickstart.md) — cubren US1 (agendar), US2 (consultar/cancelar/reagendar), US3 (panel admin), accesibilidad AAA y política de retención.

## Convenciones importantes (resumen)

- **TDD obligatorio** (Constitución Principio V, NO-NEGOCIABLE). Cada test se escribe **antes** de la implementación y debe fallar en un commit previo.
- **WCAG 2.1 AAA** en toda UI pública (Principio III). `@axe-core/playwright` en CI, contrastes ≥ 7:1.
- **Mobile-first** (Principio VIII). Cada vista se diseña primero para 360×800.
- **Git Flow** (Principio VI). `main` = producción, `develop` = integración, `feature/*` = trabajo, `release/*`, `hotfix/*`.
- **Comentarios en español** con foco en el *porqué* (Principio VII).

Los detalles operativos (nombres de rama, formato de PR, checklist AAA para revisar) están en [CONTRIBUTING.md](./CONTRIBUTING.md).

## Estado del proyecto

- ✅ Constitución ratificada v1.0.0.
- ✅ Spec funcional + clarificaciones.
- ✅ Plan de implementación + contratos OpenAPI.
- ✅ 150 tareas planificadas en `tasks.md`.
- 🟡 **En construcción**: Fase 1 (Setup) — próximo hito.

## Licencia

Uso interno para el Hospital Central de San Cristóbal. Sin licencia pública en este momento.
