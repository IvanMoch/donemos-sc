# Phase 1 — Data Model

**Feature**: Agendamiento de Citas para Donación de Sangre

**Storage**: PostgreSQL 16 — modelo relacional, normalizado a **3NF** (con nota sobre BCNF y decisiones justificadas).

**ORM**: Prisma 5.

**Convenciones**:

- Todas las tablas en `snake_case`, columnas también.
- Todas las llaves primarias son `UUID v4` (`gen_random_uuid()`), salvo `system_state` (singleton con `id = 1 SMALLINT`).
- Timestamps siempre `TIMESTAMPTZ` en UTC; la presentación América/Caracas la maneja el frontend.
- Los enums de PostgreSQL se materializan como `CHECK (col IN (...))` para simplificar migraciones (evita ALTER TYPE).
- Los timestamps de auditoría (`created_at`, `updated_at`) están en todas las tablas transaccionales.
- Ningún campo PII (nombre, apellido, cédula) aparece en URLs o logs — se enmascara en el interceptor de logging.

---

## Entidades

### 1. `admin_user`

Personal autorizado del banco de sangre. En el MVP hay un único registro (asumption de la spec + FR-023a); el esquema soporta múltiples para no requerir migración futura.

| Columna | Tipo | Restricciones | Notas |
|---------|------|---------------|-------|
| `id` | `UUID` | PK, default `gen_random_uuid()` | |
| `username` | `TEXT` | `UNIQUE NOT NULL`, `CHECK (length(username) BETWEEN 3 AND 32)` | Identificador de login |
| `password_hash` | `TEXT` | `NOT NULL` | bcrypt cost 12 |
| `full_name` | `TEXT` | `NOT NULL` | Para pie de página del PDF y logs de auditoría |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | Permite desactivar sin borrar |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Trigger de actualización |

**Índices**: `UNIQUE (username)`.

**Reglas**:

- El seed inicial crea un `admin_user` con credenciales pasadas por variable de entorno.
- FR-020, FR-023 y toda acción del panel se registran contra el `admin_user.id` responsable.

---

### 2. `slot` (Franja Horaria)

Intervalo de tiempo con capacidad configurable en el que el banco atiende donantes.

| Columna | Tipo | Restricciones | Notas |
|---------|------|---------------|-------|
| `id` | `UUID` | PK | |
| `date` | `DATE` | `NOT NULL` | Fecha local America/Caracas |
| `start_time` | `TIME` | `NOT NULL` | Hora local |
| `end_time` | `TIME` | `NOT NULL`, `CHECK (end_time > start_time)` | |
| `capacity` | `SMALLINT` | `NOT NULL CHECK (capacity BETWEEN 1 AND 100)` | Estaciones simultáneas |
| `is_disabled` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | FR-020: al deshabilitar, se cancelan citas activas |
| `disabled_at` | `TIMESTAMPTZ` | `NULL` | |
| `disabled_by_admin_id` | `UUID` | `NULL REFERENCES admin_user(id) ON DELETE SET NULL` | Trazabilidad |
| `disabled_reason` | `TEXT` | `NULL` | Opcional |
| `is_exception_hours` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | FR-018a: `TRUE` si sale del horario L–V 7:00–12:00 con aprobación explícita |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Índices**:

- `UNIQUE (date, start_time, end_time)` — evita franjas duplicadas exactas.
- `INDEX (date, is_disabled)` — usado por el listado público de horarios disponibles.
- `INDEX (date)` — para búsquedas por rango de fechas del panel.

**Reglas**:

- Al crear una franja fuera de L–V o de 7:00–12:00, el service la rechaza salvo que el DTO incluya `is_exception_hours = true` con confirmación del admin (FR-018a).
- Los cupos disponibles se derivan de: `capacity − COUNT(appointment WHERE slot_id = X AND status = 'active')`.

---

### 3. `appointment` (Cita)

Reserva de un donante en una franja.

| Columna | Tipo | Restricciones | Notas |
|---------|------|---------------|-------|
| `id` | `UUID` | PK | |
| `code` | `TEXT` | `UNIQUE NOT NULL`, `CHECK (length(code) = 10)` | Nano ID legible (research §14) |
| `slot_id` | `UUID` | `NOT NULL REFERENCES slot(id) ON DELETE RESTRICT` | |
| `first_name` | `TEXT` | `NOT NULL` | PII |
| `last_name` | `TEXT` | `NOT NULL` | PII |
| `id_number` | `TEXT` | `NOT NULL`, `CHECK (id_number ~ '^[VE][0-9]{6,8}$')` | Cédula normalizada sin guion; PII |
| `status` | `TEXT` | `NOT NULL CHECK (status IN ('active','attended','no_show','cancelled_by_donor','cancelled_by_bank'))` | Ver máquina de estados |
| `eligibility_declared_at` | `TIMESTAMPTZ` | `NOT NULL` | FR-012a: timestamp de la auto-declaración |
| `cancelled_at` | `TIMESTAMPTZ` | `NULL` | Se llena al cancelar |
| `cancelled_by_admin_id` | `UUID` | `NULL REFERENCES admin_user(id) ON DELETE SET NULL` | Solo si `status = 'cancelled_by_bank'` |
| `cancellation_reason` | `TEXT` | `NULL` | Opcional |
| `redacted_at` | `TIMESTAMPTZ` | `NULL` | Marca de anonimización (research §12) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Índices**:

- `UNIQUE (code)`.
- `UNIQUE (id_number) WHERE status = 'active'` — índice parcial que garantiza "una cita activa por cédula" (FR-007).
- `INDEX (slot_id, status)` — usado por el conteo de cupos ocupados.
- `INDEX (created_at)` — para reportes por rango.

**Reglas de anonimización** (aplicadas por job diario 90 días después de la fecha del slot para estados finales):

- `first_name` → `'***'`.
- `last_name` → `'***'`.
- `id_number` → `sha256(id_number || :pepper)` truncado a 20 chars con prefijo `H_` (mantiene formato pero irreversible).
- `redacted_at` = `NOW()`.

**Máquina de estados**:

```text
             ┌────────────────────────────┐
             │        (creación)          │
             │  eligibility_declared_at   │
             │        registered          │
             ▼                            │
        ┌────────┐                        │
        │ active │◀───────────────────────┘
        └────┬───┘
             │
             │ presencial en banco               ┌──────────────────────┐
             ├─────────────────────────────────▶ │ attended             │
             │                                   └──────────────────────┘
             │
             │ hora pasó sin asistir             ┌──────────────────────┐
             ├─────────────────────────────────▶ │ no_show              │
             │                                   └──────────────────────┘
             │
             │ donante cancela (US2)             ┌──────────────────────┐
             ├─────────────────────────────────▶ │ cancelled_by_donor   │
             │                                   └──────────────────────┘
             │
             │ admin deshabilita slot (FR-020)   ┌──────────────────────┐
             └─────────────────────────────────▶ │ cancelled_by_bank    │
                                                 └──────────────────────┘
```

Los estados finales (`attended`, `no_show`, `cancelled_by_donor`, `cancelled_by_bank`) son terminales; no permiten regresión. El reagendamiento (FR-015) es efectivamente `cancelled_by_donor` de la vieja + `active` de la nueva conservando el mismo `code` (transacción atómica).

---

### 4. `system_state` (Kill switch global — singleton)

| Columna | Tipo | Restricciones | Notas |
|---------|------|---------------|-------|
| `id` | `SMALLINT` | PK, `CHECK (id = 1)` | Fila única |
| `appointments_disabled` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | Cuando `TRUE`, flujo público bloqueado |
| `disabled_at` | `TIMESTAMPTZ` | `NULL` | |
| `disabled_by_admin_id` | `UUID` | `NULL REFERENCES admin_user(id) ON DELETE SET NULL` | Trazabilidad |
| `disabled_reason` | `TEXT` | `NULL` | Opcional |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Reglas**:

- El seed crea la fila con `id = 1, appointments_disabled = FALSE`.
- Solo `UPDATE`; nunca `INSERT` ni `DELETE`.
- El `KillSwitchGuard` lee este estado (con cache 5 s) y responde `503 Service Unavailable` para endpoints públicos de creación cuando está activo, dejando pasar `GET /consultar` y `POST /cancel`.

---

### 5. `admin_audit_log`

Registro append-only de acciones administrativas (creación/edición/deshabilitación de slot, cancelaciones masivas, activación del kill switch, exportaciones PDF). Facilita reconstruir "qué pasó" ante disputa.

| Columna | Tipo | Restricciones | Notas |
|---------|------|---------------|-------|
| `id` | `UUID` | PK | |
| `admin_id` | `UUID` | `NOT NULL REFERENCES admin_user(id) ON DELETE RESTRICT` | `RESTRICT` (no `SET NULL`): la columna es `NOT NULL`, así que no puede anularse; al ser un log append-only, se prohíbe borrar un admin con historial para preservar la traza |
| `action` | `TEXT` | `NOT NULL CHECK (action IN ('slot_created','slot_updated','slot_disabled','kill_switch_on','kill_switch_off','pdf_exported','login','failed_login'))` | |
| `target_type` | `TEXT` | `NULL CHECK (target_type IN ('slot','system_state','report','session') OR target_type IS NULL)` | |
| `target_id` | `UUID` | `NULL` | ID del recurso afectado si aplica |
| `payload` | `JSONB` | `NULL` | Diff antes/después; nunca contiene PII de donantes en texto plano |
| `ip_address` | `INET` | `NULL` | Del admin |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Índices**: `INDEX (admin_id, created_at)`, `INDEX (action, created_at)`.

**Nota de normalización**: `payload` es `JSONB` porque los diferentes tipos de acción tienen shapes distintos y crear una tabla por tipo generaría 8 tablas casi vacías — es la única excepción documentada a la normalización estricta, tolerada porque es log inmutable y no participa en joins operativos.

---

### 6. Contenido informativo (fuera de BD, versionado en repo)

Los textos autoritativos de FR-001 y FR-002 se almacenan como archivos JSON en `backend/src/modules/content/data/`:

```text
backend/src/modules/content/data/
├── requirements.es.json    # Requisitos
└── exclusions.es.json      # Consideraciones y criterios de exclusión
```

El endpoint `GET /api/v1/content/donation-info` los lee y los sirve; el panel admin NO los edita en el MVP (FR-003, FR-023a). Actualizar textos = editar el JSON y desplegar. Esto respeta la constraint de "no crece innecesariamente el modelo" del cliente.

---

## Diagrama ER (resumen textual)

```text
admin_user (1) ─────< slot.disabled_by_admin_id
admin_user (1) ─────< appointment.cancelled_by_admin_id
admin_user (1) ─────< system_state.disabled_by_admin_id
admin_user (1) ─────< admin_audit_log.admin_id

slot (1) ─────────< appointment.slot_id

system_state (singleton, sin relaciones outgoing)

admin_audit_log (append-only)
```

Sin relaciones muchos-a-muchos. No hay tablas intermedias. El modelo cumple 1NF (valores atómicos), 2NF (todas las columnas no-clave dependen de la clave completa: solo hay claves simples UUID), 3NF (sin dependencias transitivas — `disabled_by_admin_id` no depende de `is_disabled` sino de la acción del admin).

**Nota sobre BCNF**: todas las dependencias funcionales tienen como determinante una superclave (`id`), por lo que el modelo también cumple BCNF.

---

## Reglas de validación derivadas de la spec

| # | Regla | Origen |
|---|-------|--------|
| V1 | `first_name` y `last_name` no vacíos, entre 1 y 60 caracteres cada uno | FR-005 |
| V2 | `id_number` cumple `^[VE][0-9]{6,8}$` (mayúsculas, sin guion) | FR-006 |
| V3 | El `code` cumple el alfabeto de Nano ID definido en research §14 | FR-009 |
| V4 | `eligibility_declared_at` es obligatorio al crear una `appointment` | FR-012, FR-012a |
| V5 | La `slot.date` debe estar entre hoy y hoy+30 días para creación pública | FR-004 + Assumption ventana |
| V6 | Sin `slot` en sábado ni domingo, ni fuera de 7:00–12:00, salvo `is_exception_hours = true` | FR-018a |
| V7 | Al `INSERT INTO appointment`, la transacción SERIALIZABLE recuenta cupos y aborta si `used >= capacity` | FR-008, SC-009 |
| V8 | El endpoint `POST /api/v1/appointments` responde `503` si `system_state.appointments_disabled = TRUE` | FR-023 |
| V9 | `GET /api/v1/appointments/lookup` y `POST /api/v1/appointments/:code/cancel` funcionan con kill switch activo | FR-023b |
| V10 | `PATCH /api/v1/appointments/:code/reschedule` responde `409` si kill switch activo | FR-023b |

---

## Migraciones (orden lógico)

1. `20260701_00_init` — extensiones (`pgcrypto`), función `gen_random_uuid`.
2. `20260701_01_admin_user`.
3. `20260701_02_slot`.
4. `20260701_03_appointment`.
5. `20260701_04_system_state` + seed de fila singleton.
6. `20260701_05_admin_audit_log`.
7. `20260701_06_partial_unique_active_appointment_per_id_number`.

Los seeds (`prisma/seed.ts`) crean el `admin_user` inicial usando `ADMIN_USERNAME` y `ADMIN_PASSWORD` del entorno, y aseguran la fila `system_state`.
