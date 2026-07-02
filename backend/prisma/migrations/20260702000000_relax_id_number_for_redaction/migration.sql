-- Polish (T140): la anonimización a 90 días reemplaza id_number por un hash
-- irreversible con prefijo 'H_' (data-model.md §3), que no cumple el patrón de
-- cédula. Se relaja el CHECK para permitir cualquier id_number en filas ya
-- redactadas (redacted_at NOT NULL), manteniendo el patrón para las vigentes.

ALTER TABLE "appointment" DROP CONSTRAINT "appointment_id_number_check";
ALTER TABLE "appointment"
  ADD CONSTRAINT "appointment_id_number_check"
  CHECK ("id_number" ~ '^[VE][0-9]{6,8}$' OR "redacted_at" IS NOT NULL);
