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

## Ejecutar la aplicación en local

### Requisitos previos (una sola vez)

| Herramienta | Versión mínima | Cómo verificar |
|---|---|---|
| **Node.js** | 20.18.1 (leé `.nvmrc`) | `node --version` |
| **pnpm** | 9.15.0 | `pnpm --version` |
| **Docker + Docker Compose** | reciente | `docker --version && docker compose version` |
| **Git** | reciente | `git --version` |

Si te falta pnpm: `corepack enable && corepack prepare pnpm@9.15.0 --activate`.
Si te falta Node en la versión correcta: `nvm install 20.18.1 && nvm use` (o `mise`/`asdf` — el repo trae `.nvmrc` y `.tool-versions`).

### Pasos para arrancar (desde la raíz del repo, en `develop`)

```bash
# 1. Instalar dependencias del monorepo
pnpm install

# 2. Copiar las plantillas de entorno
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Los valores por defecto ya funcionan en local. En prod: rotar JWT_SECRET y REDACTION_PEPPER.

# 3. Levantar Postgres 16 vía Docker
docker compose up -d postgres
# Confirmá que arrancó sano — el STATUS debe decir "(healthy)":
docker compose ps

# 4. Preparar la base de datos
pnpm --filter backend prisma generate
pnpm --filter backend prisma migrate dev
# Nota: hoy no hay modelos Prisma reales (T021 los añade en Fase 2). El comando
# crea una BD vacía sin migraciones — es esperado.
```

Ahora, **en dos terminales separadas**:

```bash
# Terminal 1 — backend NestJS
pnpm --filter backend dev
# → http://localhost:3001/api/v1  (endpoints reales llegan con T042+)

# Terminal 2 — frontend Astro
pnpm --filter frontend dev
# → http://localhost:4321
```

Abrí **http://localhost:4321** en el navegador móvil (Chrome DevTools con emulador Pixel 5 es lo recomendado — el diseño es mobile-first, Principio VIII).

### ¿Qué se ve hoy vs. qué llega después?

El proyecto está **en construcción activa**. Según en qué rama estés:

| Rama | Landing (`/`) | Backend | Wizard (`/agendar`) |
|---|---|---|---|
| `develop` (mergeado) | Placeholder `Scaffolding inicial` | NestJS arranca sin controllers reales | 404 |
| Ramas con PR abierto | Landing completa, wizard, éxito | Ídem develop hasta Fase 2 backend | Wizard 4 pasos con slots demo |

Para probar el trabajo en curso de una rama con PR abierto:

```bash
git fetch
git checkout feature/us1-frontend-mvp     # ejemplo — la rama del PR que quieras probar
pnpm install                              # por si esa rama tiene deps nuevas
pnpm --filter frontend dev
# Al terminar, volvé a develop:
git checkout develop
```

### Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| `pnpm install` warns de `deprecated` | Normal, no bloquea el install | Ignoralo |
| `docker compose up` dice `port 5432 already in use` | Ya tenés Postgres local corriendo fuera de Docker | `lsof -i :5432` (mac/linux) o `netstat -ano \| findstr :5432` (Windows) para identificar el proceso, o cambiá el puerto en `docker-compose.yml` |
| `prisma migrate dev` pide `DATABASE_URL` | No copiaste `backend/.env.example` a `backend/.env` | `cp backend/.env.example backend/.env` |
| `pnpm --filter frontend dev` explota con `Cannot find package @astrojs/node` | El `pnpm install` no corrió sobre el lockfile actual (rebaste rama) | `rm -rf node_modules && pnpm install` |
| Backend responde 404 en `/api/v1/*` | Los controllers llegan con Fase 2 backend (T025+) | Es esperado — hasta que Fase 2 backend cierre, solo el frontend es útil |
| `astro check` falla con errores de tipos | Un archivo de `.env.d.ts` o `tsconfig` cambió | `pnpm --filter frontend exec astro sync` para regenerar los tipos |

## Comandos frecuentes

```bash
# Instalación
pnpm install

# Dev servers (dos terminales)
pnpm --filter backend dev
pnpm --filter frontend dev

# Testing
pnpm test                          # todos los workspaces
pnpm --filter frontend test        # Vitest (unit + componentes)
pnpm --filter backend test         # Jest (unit + contract + integration)
pnpm --filter frontend exec playwright test   # E2E (llega con US1)

# Calidad
pnpm lint                          # ESLint + astro check en todos los workspaces
pnpm --filter frontend build       # Astro build (SSR + prerender)
pnpm --filter backend build        # nest build → dist/

# Prisma
pnpm --filter backend prisma generate
pnpm --filter backend prisma migrate dev
pnpm --filter backend prisma studio    # UI web para inspeccionar la BD
```

## Validación funcional

Cuando la aplicación esté completa, seguí las 11 validaciones de [quickstart.md](./specs/001-blood-donation-scheduling/quickstart.md) — cubren US1 (agendar), US2 (consultar/cancelar/reagendar), US3 (panel admin), accesibilidad AAA y política de retención.

## Convenciones importantes (resumen)

- **TDD obligatorio** (Constitución Principio V, NO-NEGOCIABLE). Cada test se escribe **antes** de la implementación y debe fallar en un commit previo.
- **WCAG 2.1 AAA** en toda UI pública (Principio III). `@axe-core/playwright` en CI, contrastes ≥ 7:1.
- **Mobile-first** (Principio VIII). Cada vista se diseña primero para 360×800.
- **Comentarios en español** con foco en el *porqué* (Principio VII).
- **Solo API propia** (Principio I). El frontend consume únicamente `/api/v1/*` del backend; los enlaces externos (Google Maps) son `href` estáticos.
- **Monolito cohesivo** (Principio II). Un solo repo con `backend/`, `frontend/`, `packages/shared/`.
- **UI en español de Colombia** (tuteo). El hospital sigue físicamente en Táchira → `timezoneId` = `America/Caracas`.

### Git Flow (Principio VI)

| Rama | Propósito | Regla de merge |
|---|---|---|
| `main` | Código en producción | Solo desde `release/*` o `hotfix/*` |
| `develop` | Integración continua | Solo desde `feature/*`, `release/*` o `hotfix/*` |
| `feature/<T-ID>-<slug>` | Trabajo en una feature | Parte de `develop`, mergea a `develop` |
| `release/<x.y.z>` | Estabilización previa a release | Parte de `develop`, mergea a `main` y `develop` |
| `hotfix/<x.y.z>` | Corrección urgente en producción | Parte de `main`, mergea a `main` y `develop` |

Reglas duras (protección de rama activa en `main` y `develop`):
- No se puede pushear directo — solo vía PR con **1 approve** + **CI verde** (los 6 checks) + **todas las conversaciones resueltas**.
- Los detalles operativos (nombres de rama, formato de PR, checklist AAA para revisar) están en [CONTRIBUTING.md](./CONTRIBUTING.md).

## Estado del proyecto

- ✅ Constitución ratificada v1.0.0.
- ✅ Spec funcional + clarificaciones.
- ✅ Plan de implementación + contratos OpenAPI.
- ✅ 150 tareas planificadas en `tasks.md`.
- ✅ **Fase 1 (Setup)** — 15/15 cerradas.
- 🟡 **Fase 2 (Foundational)** — 8/26 cerradas (todas frontend). Falta Zod compartido + Prisma + guards del backend.
- 🟡 **Fase 3 (US1 — MVP)** — trabajo en curso: frontend end-to-end abierto en PR, endpoints backend pendientes.

## Licencia

Uso interno para el Hospital Central de San Cristóbal. Sin licencia pública en este momento.
