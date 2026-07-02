/**
 * RescheduleForm — elige un nuevo slot y llama PATCH /appointments/:code/reschedule.
 *
 * Reutiliza `SlotPicker` (el mismo selector que usa el wizard US1, T077) para
 * mantener la UX consistente entre agendamiento y reagendamiento. Excluye el
 * slot actual del listado para no ofrecer un no-op.
 *
 * Manejo de errores:
 *  - 409 `slot_full`: mensaje de "ese horario acaba de agotarse".
 *  - 409 `kill_switch_active`: mensaje de "reagendamiento temporalmente cerrado".
 *  - 429: mensaje de rate limit.
 *  - Cualquier otro: mensaje genérico.
 */
import { useState } from 'react';
import type { PublicSlot } from '@donemos/shared';
import { publicApi, type AppointmentConfirmation } from '../../lib/api';
import { ApiError } from '../../lib/api-client';
import { Button } from '../ui/Button';
import { SlotPicker } from '../slots/SlotPicker';

interface RescheduleFormProps {
  appointmentCode: string;
  idNumber: string;
  currentSlotId: string;
  onRescheduled: (confirmation: AppointmentConfirmation) => void;
  onCancel: () => void;
}

function mensajeReschedule(err: unknown): string {
  if (err instanceof ApiError) {
    const payload = err.payload as { error?: string; code?: string } | null;
    const codigo = payload?.error ?? payload?.code;
    if (codigo === 'slot_full') {
      return 'Ese horario acaba de agotarse. Elige otro y vuelve a intentar.';
    }
    if (codigo === 'kill_switch_active' || codigo === 'appointments_disabled') {
      return 'El reagendamiento está temporalmente cerrado por el banco. Vuelve más tarde.';
    }
    if (err.status === 429) {
      return 'Demasiados intentos en poco tiempo. Espera un momento y vuelve a intentar.';
    }
  }
  return 'No pudimos reagendar la cita. Intenta de nuevo en unos segundos.';
}

export function RescheduleForm({
  appointmentCode,
  idNumber,
  currentSlotId,
  onRescheduled,
  onCancel,
}: RescheduleFormProps): JSX.Element {
  const [selected, setSelected] = useState<PublicSlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const onSubmit = async (): Promise<void> => {
    if (!selected) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const confirmacion = await publicApi.rescheduleAppointment(appointmentCode, {
        idNumber,
        newSlotId: selected.id,
      });
      onRescheduled(confirmacion);
    } catch (err) {
      setError(mensajeReschedule(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      aria-labelledby="reschedule-heading"
      className="mx-auto flex max-w-xl flex-col gap-4"
    >
      <h1 id="reschedule-heading" className="text-2xl font-bold text-ink">
        Elegir nuevo horario
      </h1>
      <p className="text-base text-ink">
        Se conservará tu código de cita: elige el nuevo horario y confirma.
      </p>

      <SlotPicker
        selectedSlotId={selected?.id ?? null}
        onSelect={setSelected}
        excludeSlotId={currentSlotId}
      />

      {error && (
        <p
          role="alert"
          className="rounded-md border border-primary bg-primary-50 p-3 text-sm text-primary-900"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="bg-paper-warm text-ink hover:bg-neutral-200 sm:min-w-[8rem]"
        >
          Volver
        </Button>
        <Button
          type="button"
          isLoading={isSubmitting}
          onClick={onSubmit}
          disabled={selected === null}
          className="sm:min-w-[12rem]"
        >
          Confirmar nuevo horario
        </Button>
      </div>
    </section>
  );
}
