/**
 * SlotPicker — selector accesible de franja horaria.
 *
 * Se reutiliza en el wizard (StepSlot, US1) y en el flujo de reagendamiento
 * (RescheduleForm, US2). Consume `GET /api/v1/slots` a través de `publicApi`
 * y renderiza las opciones como radio cards grandes (área táctil ≥44px,
 * Principio VIII). Cada opción incluye fecha, rango horario y cupo restante.
 *
 * Estados manejados:
 *  - loading: `role="status"` con anuncio para lectores de pantalla.
 *  - error de red o del backend: bloque `role="alert"` con opción "Reintentar".
 *  - lista vacía: mensaje explicativo (no hay slots con cupo en la ventana).
 *
 * Notas de a11y:
 *  - `fieldset` + `legend` para agrupar los radios semánticamente.
 *  - El id excluido (`excludeSlotId`) se omite del render — evita el caso
 *    en reagendamiento de re-elegir el mismo slot y confundir al usuario.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PublicSlot } from '@donemos/shared';
import { publicApi } from '../../lib/api';
import { ApiError } from '../../lib/api-client';

export interface SlotPickerProps {
  selectedSlotId: string | null;
  onSelect: (slot: PublicSlot) => void;
  /** Slot que NO se debe mostrar (usado en reagendamiento para excluir el actual). */
  excludeSlotId?: string;
  /** Callback de error para que el padre lo muestre en un banner global. */
  onError?: (message: string) => void;
}

const formatterFecha = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
});

export function SlotPicker({
  selectedSlotId,
  onSelect,
  excludeSlotId,
  onError,
}: SlotPickerProps): JSX.Element {
  const [slots, setSlots] = useState<PublicSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    publicApi
      .listSlots()
      .then((resultado) => {
        if (cancelled) return;
        setSlots(resultado ?? []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Mensaje genérico al usuario; el detalle queda en la consola del navegador.
        const mensaje =
          err instanceof ApiError
            ? 'No pudimos cargar los horarios disponibles. Reintenta en unos segundos.'
            : 'No pudimos cargar los horarios disponibles. Revisa tu conexión e intenta de nuevo.';
        setError(mensaje);
        setLoading(false);
        onError?.(mensaje);
      });
    return () => {
      cancelled = true;
    };
  }, [retryTick, onError]);

  const visibleSlots = useMemo(
    () => (excludeSlotId ? slots.filter((s) => s.id !== excludeSlotId) : slots),
    [slots, excludeSlotId],
  );

  const handleRetry = useCallback(() => setRetryTick((t) => t + 1), []);

  if (loading) {
    return (
      <p role="status" aria-live="polite" className="text-sm text-ink-700">
        Cargando horarios disponibles…
      </p>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col gap-2 rounded-md border border-primary bg-primary-50 p-3 text-sm text-primary-900"
      >
        <p>{error}</p>
        <button
          type="button"
          onClick={handleRetry}
          className="self-start rounded-md bg-primary px-3 py-1 text-sm font-medium text-paper"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (visibleSlots.length === 0) {
    return (
      <p className="rounded-md border border-neutral-200 bg-paper-warm p-3 text-sm text-ink-700">
        No hay horarios con cupo disponible en este momento. Vuelve a intentarlo más tarde.
      </p>
    );
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-medium text-ink-700">Horarios disponibles</legend>
      {visibleSlots.map((slot) => {
        const fecha = new Date(`${slot.date}T${slot.startTime}:00`);
        const seleccionado = selectedSlotId === slot.id;
        return (
          <label
            key={slot.id}
            className={[
              'flex min-h-touch cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors duration-[220ms]',
              seleccionado
                ? 'border-primary bg-primary-50'
                : 'border-neutral-200 bg-paper hover:border-ink',
            ].join(' ')}
          >
            <input
              type="radio"
              name="slotId"
              value={slot.id}
              checked={seleccionado}
              onChange={() => onSelect(slot)}
              className="mt-1 h-5 w-5 shrink-0 accent-primary"
            />
            <span className="flex flex-1 flex-col gap-1">
              <span className="text-base font-medium text-ink capitalize">
                {formatterFecha.format(fecha)}
              </span>
              <span className="text-sm text-ink-700">
                {slot.startTime} – {slot.endTime} · Cupos restantes: {slot.remainingCapacity}
              </span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
