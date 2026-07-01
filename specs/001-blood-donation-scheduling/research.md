# Phase 0 — Research

**Feature**: Agendamiento de Citas para Donación de Sangre

**Date**: 2026-07-01

Este documento resuelve las decisiones técnicas abiertas por la spec, los deferrals de `/speckit-clarify` y las mejores prácticas para el stack elegido.

---

## 1. Uso de React dentro de Astro (islas mínimas)

- **Decision**: Astro renderiza todo el contenido estático (landing, pantallas de éxito, mensaje de kill switch, layouts). Las **islas React** se limitan a: (a) el wizard de agendamiento (`/agendar`), (b) el formulario de consulta/cancelación (`/consultar`), (c) el panel administrativo (`/admin/**`).
- **Rationale**: Astro reduce el JS enviado al mínimo (crítico para SC-007, TTI < 5 s en 3G). React se justifica solo donde hay estado de UI complejo (wizard multi-paso, validación en vivo, cambios optimistas). El resto se sirve como HTML plano — más rápido y más accesible por defecto.
- **Alternatives considered**:
  - *Todo React con Next.js*: descartado; incumple la instrucción del cliente ("Astro puro y como máximo algún componente React") y añade JS innecesario a la landing.
  - *Todo Astro puro (sin React)*: viable para landing y consulta simple, pero el wizard con validación cruzada entre pasos y feedback inmediato se vuelve engorroso sin un framework reactivo.

---

## 2. ORM: TypeORM vs. Prisma

- **Decision**: **Prisma 5**.
- **Rationale**:
  - Migraciones declarativas más simples de auditar (una sola fuente de verdad en `schema.prisma`), alineado con "código lo más simple posible" del cliente.
  - Cliente tipado end-to-end que se integra sin fricción con `zod` para validación.
  - Herramientas de introspección de esquema y `prisma studio` facilitan al equipo del banco revisar datos si hiciera falta.
  - Constraint FKs, checks y índices se expresan directo en el esquema Prisma → alineado con el requisito de BD completamente normalizada.
- **Alternatives considered**:
  - *TypeORM*: más idiomático en NestJS pero con historial de bugs en migraciones y peor DX. La decoración de entidades duplica lo que ya está en el esquema.
  - *Kysely / SQL crudo*: máximo control pero fricción alta para el tamaño del equipo y del proyecto.

---

## 3. Generación de PDF (server-side)

- **Decision**: **`pdfkit`** en el backend NestJS, invocado desde el módulo `admin/reports`.
- **Rationale**:
  - Ligero, sin dependencias binarias externas (a diferencia de Puppeteer/Chromium que exigen ~200 MB en el contenedor).
  - Suficiente para tablas ordenadas con cabecera del banco y paginación básica.
  - Se compone imperativamente, fácil de testear (contenido inspeccionable).
- **Alternatives considered**:
  - *Puppeteer + HTML→PDF*: mejor tipografía y layout, pero pesa mucho y complica el pipeline de despliegue.
  - *Generación en el cliente (`jsPDF`)*: descartado porque el admin necesita rangos amplios y el cliente puede quedarse sin memoria; además el PDF debe reflejar el estado autoritativo del backend en el momento del click.

---

## 4. Control de concurrencia sobre cupos (SC-009)

- **Decision**: **Transacción `SERIALIZABLE`** con reintento controlado y un `UNIQUE` constraint compuesto `(slot_id, appointment_id)` no aplica directamente porque necesitamos "no exceder capacidad". Implementación:
  1. `BEGIN; SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;`
  2. `SELECT capacity, (SELECT COUNT(*) FROM appointment WHERE slot_id = $1 AND status IN ('active')) AS used FROM slot WHERE id = $1 FOR UPDATE;`
  3. Si `used < capacity`, `INSERT INTO appointment ...` y `COMMIT`.
  4. Si `used >= capacity` o `used` cambia por concurrencia, abortar y devolver 409.
- **Rationale**:
  - `FOR UPDATE` con `SERIALIZABLE` garantiza que Postgres detecte anomalías de escritura concurrente y aborte una de las dos transacciones — cero sobreventas (SC-009).
  - Simple, sin caches externos ni colas.
- **Alternatives considered**:
  - *Locks pesimistas por advisory lock (`pg_advisory_xact_lock(slot_id)`)*: funciona pero introduce estado global que puede confundir a un equipo pequeño; SERIALIZABLE es más idiomático.
  - *Optimistic concurrency con versión*: requiere reintentos manuales complicados en NestJS.

---

## 5. Persistencia del kill switch

- **Decision**: Fila única en tabla `system_state` con constraint `id = 1` (singleton) y columnas `appointments_disabled BOOLEAN`, `disabled_at TIMESTAMPTZ NULL`, `disabled_by_admin_id UUID NULL`, `reason TEXT NULL`.
- **Rationale**:
  - Sobrevive reinicios sin depender de Redis u otro servicio (Principio I: solo la BD interna).
  - Auditable: quién, cuándo, por qué.
  - Consultado por un `KillSwitchGuard` de NestJS con cache en memoria de 5 s (TTL corto para no sobrecargar la BD y a la vez propagar cambios rápido).
- **Alternatives considered**:
  - *Env var*: no dinámico, requiere redeploy.
  - *Redis*: viola Principio I al añadir un servicio externo para lo que la BD ya resuelve.

---

## 6. Autenticación del administrador

- **Decision**: **Cookie HttpOnly** con **JWT** firmado (HS256) y tiempo de vida de 8 h; contraseña con **bcrypt cost 12**; endpoint `POST /api/v1/admin/auth/login` responde con la cookie. Guard `AdminGuard` valida la cookie en cada request al `/api/v1/admin/*`.
- **Rationale**:
  - Cookie HttpOnly evita XSS-driven token theft; suficiente para un admin único en MVP.
  - No hay refresh token para minimizar superficie; al expirar la cookie el admin vuelve a loguear.
  - bcrypt cost 12 balancea seguridad y latencia (< 250 ms por verificación en hardware típico).
- **Alternatives considered**:
  - *OAuth2 / SSO*: sobre-ingeniería para 1 admin.
  - *Sesión server-side en Redis*: descartado por Principio I y por complejidad innecesaria.
  - *Basic Auth*: expone la contraseña en cada request, mala UX.

---

## 7. Manejo de foco y accesibilidad en el wizard multi-paso

- **Decision**:
  - Al cambiar de paso, mover el foco programáticamente al `<h1>` del nuevo paso (con `tabindex="-1"` para permitir focus sin ser tabbable después).
  - Anunciar el cambio con `aria-live="polite"` en una región oculta que dice "Paso 3 de 5: elige tu horario".
  - Cada paso es un `<form>` autocontenido con validación local; los errores se anuncian con `aria-describedby` y `aria-invalid`.
  - Barra de progreso `role="progressbar"` con `aria-valuenow/min/max/valuetext`.
  - Botón "Volver" siempre visible como primer elemento tabbable del paso.
- **Rationale**: Cumple WCAG 2.1 AAA en un flujo multi-paso, patrón validado en apps sanitarias (NHS, HealthCare.gov). Reduce carga cognitiva mostrando un solo campo/decisión por pantalla (petición explícita del cliente).
- **Alternatives considered**:
  - *Todo en una sola página con secciones colapsables*: peor para móviles y para lectores de pantalla que se pierden en formularios largos.

---

## 8. Animaciones y `prefers-reduced-motion`

- **Decision**:
  - **Transiciones CSS** (no librería) para todo lo que sea entrada/salida de pasos del wizard: `transform: translateX()` + `opacity` con `transition: 220ms cubic-bezier(0.4, 0, 0.2, 1)`.
  - **View Transitions API** de Astro para navegación entre páginas donde el navegador la soporte.
  - Media query `@media (prefers-reduced-motion: reduce)` que reduce toda transición a `< 0.01s` y elimina `translate`, dejando solo el cambio instantáneo.
  - Feedback de "cita confirmada" con un pulso suave (una sola iteración, 400 ms) — no bucles infinitos.
- **Rationale**: Cliente pidió animaciones sutiles, no exageradas. CSS puro mantiene el bundle mínimo (Principio VIII). `prefers-reduced-motion` es exigencia de AAA (SC 2.3.3).
- **Alternatives considered**:
  - *Framer Motion*: potente pero añade ~40 KB gzipped, innecesario para transiciones simples.
  - *GSAP*: overkill y con licencia comercial en algunos escenarios.

---

## 9. Paleta de colores AAA para el sector salud

- **Decision**: Paleta minimalista médica con **rojo sangre + neutros cálidos**:
  - Primario: `#8B1E2D` (rojo sangre oscuro) — sobre fondo `#FFFFFF` da contraste 8.7:1 (AAA).
  - Secundario: `#0F172A` (grafito) para texto — contraste 16:1 sobre blanco.
  - Neutro cálido: `#FAF7F5` para fondos secundarios (sensación clínica-amable).
  - Éxito: `#0F5132` (verde bosque) — contraste 8.4:1 sobre blanco.
  - Error: `#8B1E2D` reutilizado; el error se comunica también con icono y texto, no solo color (SC 1.4.1).
  - Foco: outline `#0F172A` de 3 px con offset 2 px — visible sobre cualquier fondo.
- **Rationale**: Rojo sangre semánticamente vinculado a donación, contrastes AAA verificados en pares críticos texto/fondo, evita la típica saturación azul-clínico "corporativo" para transmitir cercanía. Se documenta el token en `frontend/src/styles/tokens.css` y en `tailwind.config.mjs`.
- **Alternatives considered**:
  - *Rojo brillante `#DC2626`*: contraste 5.9:1 sobre blanco — pasa AA pero no AAA para texto normal.
  - *Verde clínico*: menor asociación semántica con sangre; se reserva para éxito.

---

## 10. Rate limiting y protección de endpoints públicos

- **Decision**:
  - `@nestjs/throttler` con dos buckets:
    - Público (endpoints `/api/v1/appointments`, `/api/v1/slots`): 30 req/min por IP.
    - Consulta de cita (`POST /api/v1/appointments/lookup`): 10 req/min por IP para dificultar enumeración de cédulas.
  - Retornos genéricos en `lookup` (FR-016) para no revelar existencia de cédula.
- **Rationale**: MVP no expone endpoint de "listar donantes" ni de "buscar por cédula parcial"; el bucket restrictivo en `lookup` mitiga fuerza bruta.
- **Alternatives considered**:
  - *CAPTCHA*: fricción alta, mala UX en móvil; se reserva para v2 si aparece abuso.

---

## 11. Testing de integración con Postgres real

- **Decision**: **Testcontainers for Node** (`@testcontainers/postgresql`) levanta un Postgres 16 por suite; migraciones Prisma se aplican al arrancar. Cada test corre dentro de una transacción que se rollback al final.
- **Rationale**: Cumple Principio V ("integration tests deben ejercitar el contrato API real, sin mocks del backend propio"). El aislamiento por transacción mantiene la suite rápida.
- **Alternatives considered**:
  - *SQLite en memoria*: dialect distinto (sin `FOR UPDATE`, `SERIALIZABLE` diferente) — falso sentido de seguridad.
  - *Postgres compartido en CI*: acopla suites, tests flaky.

---

## 12. Política de retención de datos personales *(deferral resuelto)*

- **Decision**:
  - **Citas activas**: se conservan mientras estén en estado `active`.
  - **Citas finalizadas** (`attended`, `no_show`, `cancelled_by_donor`, `cancelled_by_bank`): se conservan **90 días** desde la fecha de la cita, luego un job diario del backend anonimiza los campos identificatorios (`first_name`, `last_name`, `id_number` → hash irreversible + `redacted_at`) manteniendo el registro para estadísticas agregadas.
- **Rationale**:
  - 90 días permite al banco reconciliar cualquier reclamo o auditoría interna del mes anterior y el actual.
  - Anonimizar en lugar de borrar preserva `slot_id`, `status` y timestamps para métricas agregadas futuras sin conservar PII.
  - Consistente con buenas prácticas de minimización de datos (spec-driven, no imposición legal externa).
- **Alternatives considered**:
  - *Borrar completamente a los 90 días*: pierde datos operativos útiles.
  - *Nunca borrar*: acumula PII innecesaria contra el principio de minimización.

---

## 13. Health check y observabilidad mínima

- **Decision**:
  - `GET /api/v1/health` responde `{ status: 'ok', db: 'ok'|'down' }` verificando ping a Postgres.
  - Logging estructurado con `pino` en formato JSON; campos: `request_id`, `route`, `status`, `duration_ms`. Sin PII en logs (nombre/cédula se enmascaran a `***`).
- **Rationale**: MVP no necesita OpenTelemetry ni APM; los logs estructurados son suficientes para post-mortem simples. FR-027 exige que datos personales no aparezcan en logs.
- **Alternatives considered**:
  - *Sentry + tracing*: reservado para post-MVP si aparece necesidad.

---

## 14. Selección de identificador para el "código de cita"

- **Decision**: **Nano ID de 10 caracteres** en alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (sin `I`, `O`, `0`, `1` para evitar ambigüedades al leer/dictar). Ejemplo: `K7P3M9XQ2R`.
- **Rationale**:
  - Corto y fácil de dictar por teléfono si el donante llama al hospital.
  - Espacio de ~32^10 ≈ 10^15, colisión despreciable para <10⁵ citas/año.
  - Al ser aleatorio, evita enumerar códigos secuencialmente.
- **Alternatives considered**:
  - *UUID v4*: demasiado largo para dictarse.
  - *ID numérico autoincremental*: enumerable, riesgo de fuga por prueba secuencial.

---

## 15. Alcance del `.gitignore` y directorio `.claude/`

- **Decision**: `.claude/` (perfil local del asistente) queda **fuera de git** vía `.gitignore`. `.specify/` sí se versiona porque contiene templates, plan de trabajo, memoria del proyecto y hooks — es artefacto del repo. Archivos generados como `dist/`, `node_modules/`, `coverage/`, `*.env`, `*.pdf`, cachés de Prisma también se ignoran.
- **Rationale**: `.claude/` es específico del entorno del desarrollador y no aporta valor compartido; incluirlo generaría diffs ruidosos.

---

## Resumen ejecutivo de decisiones

| # | Área | Decisión |
|---|------|----------|
| 1 | Framework frontend | Astro + islas React mínimas en wizard/consulta/admin |
| 2 | ORM | Prisma 5 |
| 3 | PDF | pdfkit server-side |
| 4 | Concurrencia cupos | SERIALIZABLE + FOR UPDATE |
| 5 | Kill switch | Fila singleton en tabla `system_state` |
| 6 | Auth admin | Cookie HttpOnly + JWT HS256, 8 h, bcrypt cost 12 |
| 7 | Foco / a11y wizard | Foco a `<h1>` + `aria-live` + `role="progressbar"` |
| 8 | Animaciones | CSS transitions + View Transitions API + `prefers-reduced-motion` |
| 9 | Paleta | Rojo sangre `#8B1E2D` + grafito, contrastes AAA |
| 10 | Rate limit | Throttler dos buckets; lookup restrictivo |
| 11 | Integration testing | Testcontainers Postgres, transacción por test |
| 12 | Retención PII | 90 días luego anonimizar |
| 13 | Observabilidad | `pino` JSON, health check simple |
| 14 | Código de cita | Nano ID 10 chars alfabeto sin ambigüedades |
| 15 | Gitignore | `.claude/` ignorado, `.specify/` versionado |

Todas las decisiones respetan los 8 principios de la Constitución. Ninguna requiere entrada en *Complexity Tracking*.
