-- Migración inicial de DonemosSC (T022).
-- Generada con `prisma migrate diff` y aumentada a mano con las invariantes que
-- Prisma 5 no expresa declarativamente: CHECK constraints, índice parcial único
-- y la siembra del singleton system_state (data-model.md). El test de
-- integración schema.spec.ts (T024) verifica estas invariantes.

-- Extensión para gen_random_uuid() por si se generan UUIDs del lado del servidor.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateTable
CREATE TABLE "admin_user" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "admin_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slot" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TIME(0) NOT NULL,
    "end_time" TIME(0) NOT NULL,
    "capacity" SMALLINT NOT NULL,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "disabled_at" TIMESTAMPTZ(6),
    "disabled_by_admin_id" UUID,
    "disabled_reason" TEXT,
    "is_exception_hours" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "slot_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "id_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "eligibility_declared_at" TIMESTAMPTZ(6) NOT NULL,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancelled_by_admin_id" UUID,
    "cancellation_reason" TEXT,
    "redacted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_state" (
    "id" SMALLINT NOT NULL DEFAULT 1,
    "appointments_disabled" BOOLEAN NOT NULL DEFAULT false,
    "disabled_at" TIMESTAMPTZ(6),
    "disabled_by_admin_id" UUID,
    "disabled_reason" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "system_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_log" (
    "id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" UUID,
    "payload" JSONB,
    "ip_address" INET,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_user_username_key" ON "admin_user"("username");

-- CreateIndex
CREATE INDEX "slot_date_is_disabled_idx" ON "slot"("date", "is_disabled");

-- CreateIndex
CREATE INDEX "slot_date_idx" ON "slot"("date");

-- CreateIndex
CREATE UNIQUE INDEX "slot_date_start_time_end_time_key" ON "slot"("date", "start_time", "end_time");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_code_key" ON "appointment"("code");

-- CreateIndex
CREATE INDEX "appointment_slot_id_status_idx" ON "appointment"("slot_id", "status");

-- CreateIndex
CREATE INDEX "appointment_created_at_idx" ON "appointment"("created_at");

-- CreateIndex
CREATE INDEX "admin_audit_log_admin_id_created_at_idx" ON "admin_audit_log"("admin_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_log_action_created_at_idx" ON "admin_audit_log"("action", "created_at");

-- AddForeignKey
ALTER TABLE "slot" ADD CONSTRAINT "slot_disabled_by_admin_id_fkey" FOREIGN KEY ("disabled_by_admin_id") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "slot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_cancelled_by_admin_id_fkey" FOREIGN KEY ("cancelled_by_admin_id") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_state" ADD CONSTRAINT "system_state_disabled_by_admin_id_fkey" FOREIGN KEY ("disabled_by_admin_id") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Aumentos manuales (invariantes de data-model.md que Prisma no expresa)
-- ─────────────────────────────────────────────────────────────────────────────

-- CHECK: longitud de username (data-model.md §1).
ALTER TABLE "admin_user"
  ADD CONSTRAINT "admin_user_username_length_check"
  CHECK (length("username") BETWEEN 3 AND 32);

-- CHECK: horas y capacidad de la franja (data-model.md §2).
ALTER TABLE "slot"
  ADD CONSTRAINT "slot_end_after_start_check" CHECK ("end_time" > "start_time");
ALTER TABLE "slot"
  ADD CONSTRAINT "slot_capacity_range_check" CHECK ("capacity" BETWEEN 1 AND 100);

-- CHECK: patrón de cédula, longitud del código y enum de status (data-model.md §3).
ALTER TABLE "appointment"
  ADD CONSTRAINT "appointment_id_number_check" CHECK ("id_number" ~ '^[VE][0-9]{6,8}$');
ALTER TABLE "appointment"
  ADD CONSTRAINT "appointment_code_length_check" CHECK (length("code") = 10);
ALTER TABLE "appointment"
  ADD CONSTRAINT "appointment_status_check"
  CHECK ("status" IN ('active', 'attended', 'no_show', 'cancelled_by_donor', 'cancelled_by_bank'));

-- Índice parcial único: una sola cita activa por cédula (FR-007, V7).
CREATE UNIQUE INDEX "appointment_active_id_number_key"
  ON "appointment" ("id_number")
  WHERE "status" = 'active';

-- CHECK: system_state es singleton (id = 1) (data-model.md §4).
ALTER TABLE "system_state"
  ADD CONSTRAINT "system_state_singleton_check" CHECK ("id" = 1);

-- CHECK: enum de acción y de tipo de objetivo del audit log (data-model.md §5).
ALTER TABLE "admin_audit_log"
  ADD CONSTRAINT "admin_audit_log_action_check"
  CHECK ("action" IN ('slot_created', 'slot_updated', 'slot_disabled', 'kill_switch_on', 'kill_switch_off', 'pdf_exported', 'login', 'failed_login'));
ALTER TABLE "admin_audit_log"
  ADD CONSTRAINT "admin_audit_log_target_type_check"
  CHECK ("target_type" IN ('slot', 'system_state', 'report', 'session') OR "target_type" IS NULL);

-- Siembra del singleton system_state (id = 1). Idempotente.
INSERT INTO "system_state" ("id", "appointments_disabled", "updated_at")
VALUES (1, false, NOW())
ON CONFLICT ("id") DO NOTHING;
