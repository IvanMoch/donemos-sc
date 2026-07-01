# Contributing — DonemosSC

Este documento es la fuente única para cómo colaborar en el repositorio. Todo lo que sigue **materializa los 8 principios de la Constitución** ([`.specify/memory/constitution.md`](./.specify/memory/constitution.md)) en pasos operativos.

---

## 1. Antes de empezar

Lee, en este orden:

1. La [Constitución](./.specify/memory/constitution.md) (8 principios NO-NEGOCIABLES).
2. La [especificación](./specs/001-blood-donation-scheduling/spec.md) de la feature actual.
3. El [plan](./specs/001-blood-donation-scheduling/plan.md) y las [tareas](./specs/001-blood-donation-scheduling/tasks.md).

Toda decisión de diseño se toma en un PR, no en Slack ni en cabeza. Si algo no está claro, se abre un `/speckit-clarify` o se pregunta en el PR.

---

## 2. Flujo Git (Git Flow — Principio VI)

### Ramas fijas

| Rama | Propósito | Regla de merge |
|------|-----------|----------------|
| `main` | Código en producción | Solo merges desde `release/*` o `hotfix/*` |
| `develop` | Integración continua | Solo merges desde `feature/*`, `release/*` o `hotfix/*` |
| `feature/<slug>` | Trabajo en una feature | Parte de `develop`, mergea a `develop` |
| `release/<x.y.z>` | Estabilización previa a release | Parte de `develop`, mergea a `main` y `develop` |
| `hotfix/<x.y.z>` | Corrección urgente en producción | Parte de `main`, mergea a `main` y `develop` |

### Naming de feature branches

Formato: `feature/<t-ids-o-bloque>-<slug-corto>`.

Ejemplos válidos:

- `feature/us1-tests` (bloque de tests de US1)
- `feature/T068-appointments-repo`
- `feature/us3-admin-auth`
- `feature/T140-retention-job`

**Regla**: una rama por *bloque coherente* de tareas, no una rama por T-ID individual. Un bloque coherente = algo que revisas en un PR sin fatigarte (~1 día de trabajo).

### Ciclo diario

```bash
git checkout develop && git pull
git checkout -b feature/us1-tests
# ... trabajo (con TDD: test primero, luego implementación) ...
git push -u origin feature/us1-tests
gh pr create --base develop
```

Nunca hagas `push --force` a `develop` ni `main`. Solo a tu propia rama de feature si necesitas amend/rebase local.

---

## 3. TDD (Principio V, NO-NEGOCIABLE)

Ningún cambio de comportamiento entra a `develop` sin que exista un test que **falló antes del código de producción**. En el PR debe verse el commit del test rojo antes del commit de la implementación.

Secuencia típica:

```bash
# 1. Escribir el test
git add backend/test/contract/appointments-create.spec.ts
git commit -m "test(us1): T046 contract test crear cita — happy path (rojo)"

# 2. Correr y confirmar que falla
pnpm --filter backend test:contract -- appointments-create

# 3. Implementar hasta que pase
git add backend/src/modules/appointments/*
git commit -m "feat(us1): T068 appointments repository + T069 service + T070 controller"
```

Excepciones (spikes exploratorios) se descartan o se reescriben bajo TDD **antes** de mergear.

---

## 4. Formato de commits

Convencional Commits:

- `feat(us1): T068 appointments repository`
- `fix(us2): T098 evita 500 cuando cédula tiene guion`
- `test(us1): T046 contract test crear cita (rojo)`
- `docs: actualizar README con setup local`
- `chore: bump prisma 5.20 → 5.21`
- `refactor(us3): T124 extraer slot-with-cancellation a método privado`

Cada commit menciona el T-ID cuando corresponde a una tarea de [`tasks.md`](./specs/001-blood-donation-scheduling/tasks.md).

---

## 5. Pull Requests — la regla dura

Todo PR contra `develop` MUST cumplir **la totalidad** de este checklist antes de ser mergeable. La plantilla del PR ya lo trae; no elimines items.

### Checklist obligatorio

- [ ] **Tests que fallaron antes**: en el historial del PR se ve al menos un commit con el test rojo previo al commit de implementación (Principio V).
- [ ] **CI en verde**: lint, tests backend (unit + contract + integration), tests frontend (Vitest + Playwright), axe-core AAA, Lighthouse mobile.
- [ ] **Accesibilidad AAA verificada** en las pantallas tocadas: contrastes 7:1, navegación por teclado, `prefers-reduced-motion` respetado (Principio III). Adjunta reporte de axe o captura.
- [ ] **Mobile-first**: capturas en 360×800 de cada pantalla nueva o modificada (Principio VIII).
- [ ] **Comentarios en español** con foco en el *porqué*, no el *qué* (Principio VII).
- [ ] **Contrato de API**: si cambió el shape público/admin, `contracts/*.openapi.yaml` actualizado en el mismo PR.
- [ ] **Sin datos personales en logs / URLs** (FR-027 de la spec).
- [ ] **T-IDs cerrados**: lista los T-IDs de `tasks.md` que este PR completa, y marca los checkboxes en un commit del mismo PR.
- [ ] **1 aprobación** del otro colaborador antes de mergear.

Si un PR no cumple uno de estos puntos, se rechaza. Sin excepciones.

### Excepción a la Constitución

Si algo del PR obliga a violar un principio, MUST documentarse en el bloque *Complexity Tracking* del `plan.md` con:

- Cuál principio se viola.
- Por qué la violación es necesaria.
- Qué alternativa más simple se rechazó y por qué.

Los principios NO-NEGOCIABLES (III accesibilidad AAA y V TDD) requieren aprobación explícita del mantenedor principal.

---

## 6. Code review — cómo revisar el PR de tu compañero

Antes de aprobar:

1. **Lee el PR completo** — no solo el diff. Lee la descripción, el checklist, los archivos tocados.
2. **Verifica el orden de commits** (TDD): ¿el test rojo llegó antes de la implementación?
3. **Corre el código** si toca UI:
   - `git fetch && git checkout <la-rama-del-pr>`
   - `pnpm install && pnpm dev`
   - Prueba el flujo en el emulador móvil de Chrome (360×800).
   - Verifica navegación por teclado (Tab + Enter, sin mouse).
4. **Revisa contrastes** con la extensión "WCAG Color contrast checker" o con axe DevTools si es una pantalla nueva.
5. **Pregunta en el PR** si algo no queda claro. Prefiere comentar > adivinar.

Aprueba solo cuando el checklist completo esté marcado y tu prueba manual pase.

---

## 7. Reparto del trabajo con dos personas

Base: [`tasks.md`](./specs/001-blood-donation-scheduling/tasks.md) tiene 150 tareas con etiquetas `[P]` (paralelizable) y `[US1]/[US2]/[US3]`. Recomendación:

- **Fases 1–2 (Setup + Foundational)**: en pareja, pair programming o Live Share. Se sientan las convenciones que van a durar todo el proyecto.
- **Fase 3 (US1 — MVP)**: uno backend, otro frontend. Se sincronizan por los contratos OpenAPI.
- **Fase 4 (US2)**: el mismo par que hizo US1 para no perder contexto.
- **Fase 5 (US3)**: se puede paralelizar por sub-módulo (auth + audit vs. slots + PDF + kill switch).

Cada quien toma tareas `[P]` sin bloquear al otro. Las tareas sin `[P]` requieren que la anterior esté cerrada.

**Nunca dos personas al mismo archivo al mismo tiempo.** Si es inevitable, coordinen por chat: uno espera al merge del otro.

---

## 8. Secretos y `.env`

- `.env`, `.env.local`, `.env.production` están en `.gitignore`. **Nunca los commiteés.**
- `backend/.env.example` y `frontend/.env.example` sí se versionan (sin valores reales).
- Secretos de CI/CD (JWT_SECRET, ADMIN_PASSWORD, REDACTION_PEPPER para prod) van en **GitHub Secrets** del repositorio, no en el código ni en Slack.
- Si alguna vez un secreto se filtra al repo por accidente: rotarlo inmediatamente y usar `git filter-repo` para limpiar el historial + `git push --force-with-lease` coordinado.

---

## 9. Issues y milestones

Cada tarea de `tasks.md` tiene un issue asociado en GitHub (creados al setear el repo). Milestones = fases del plan. Un PR debe:

- Enlazar el/los issue(s) que cierra con `Closes #123, #124`.
- Actualizar el checkbox del T-ID correspondiente en `tasks.md` (en el mismo PR o en uno de seguimiento).

Cuando el issue cierra automáticamente al mergear el PR, GitHub lo mueve del milestone. Así se ve el progreso por fase.

---

## 10. Comunicación asíncrona sana

- **Decisiones técnicas** en el PR (no en Slack). Deja huella auditable.
- **Cambios de scope** requieren `/speckit-clarify` (o edición explícita del spec) — no se meten "de contrabando" en un PR de otra cosa.
- **Preguntas urgentes** por el canal privado del equipo, pero acuerden dejar rastro en el PR/issue asociado.

---

## 11. Cuando estés atascado

1. Vuelve a la Constitución. La mitad de los atascos vienen de tratar de saltarse un principio.
2. Corre `pnpm test` local — a veces el fallo revela lo que faltaba.
3. Pide code review temprano (`gh pr create --draft`). No esperes a "terminar" para pedir opinión.
4. Si es un bloqueo real, abre un issue con la etiqueta `question` y menciona al otro colaborador.

Bienvenido al proyecto.
