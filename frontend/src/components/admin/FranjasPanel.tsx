/**
 * FranjasPanel (T135) — gestión de franjas horarias.
 *
 * Vistas:
 *  - Listado con filtros por rango de fechas e `includeDisabled`.
 *  - Formulario "Crear franja" con validación de horario L–V 7–12 (schema
 *    compartido `createSlotSchema`); `isExceptionHours` habilita días/horas
 *    fuera de la ventana hábil (FR-018a).
 *  - Botón "Deshabilitar" por franja con modal de confirmación; al confirmar,
 *    el backend cancela todas las citas activas del slot (`cancelled_by_bank`)
 *    y devuelve el conteo → lo mostramos al admin.
 *  - Edición sencilla in-line: `capacity` con botones +/− (guardado optimista).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  createSlotSchema,
  type CreateSlotInput,
} from '@donemos/shared';
import { adminApi, type AdminSlot } from '../../lib/api';
import { ApiError } from '../../lib/api-client';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { Checkbox } from '../ui/Checkbox';

const formatterFecha = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
});

function mensajeApi(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const payload = err.payload as { message?: string; code?: string } | null;
    if (payload?.message) return payload.message;
    if (err.status === 401) {
      window.location.href = '/admin/login';
      return 'Sesión expirada.';
    }
    if (err.status === 429) return 'Demasiados intentos en poco tiempo.';
  }
  return fallback;
}

interface DisableModalState {
  open: boolean;
  slot: AdminSlot | null;
  reason: string;
  saving: boolean;
  result: number | null;
  error: string | null;
}

export function FranjasPanel(): JSX.Element {
  const [slots, setSlots] = useState<AdminSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [includeDisabled, setIncludeDisabled] = useState<boolean>(false);
  const [modal, setModal] = useState<DisableModalState>({
    open: false,
    slot: null,
    reason: '',
    saving: false,
    result: null,
    error: null,
  });

  const fetchSlots = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const rows = await adminApi.listSlots({ includeDisabled });
      setSlots(rows ?? []);
    } catch (err) {
      setError(mensajeApi(err, 'No pudimos cargar las franjas.'));
    } finally {
      setLoading(false);
    }
  }, [includeDisabled]);

  useEffect(() => {
    void fetchSlots();
  }, [fetchSlots]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateSlotInput>({
    resolver: zodResolver(createSlotSchema),
    mode: 'onBlur',
    defaultValues: {
      date: '',
      startTime: '07:00',
      endTime: '07:35',
      capacity: 3,
      isExceptionHours: false,
    },
  });

  const isExceptionHours = watch('isExceptionHours');

  const onCreate = useCallback(
    async (values: CreateSlotInput): Promise<void> => {
      setError(null);
      try {
        await adminApi.createSlot(values);
        reset({
          date: values.date,
          startTime: values.startTime,
          endTime: values.endTime,
          capacity: values.capacity,
          isExceptionHours: false,
        });
        await fetchSlots();
      } catch (err) {
        setError(mensajeApi(err, 'No pudimos crear la franja. Revisa los datos.'));
      }
    },
    [fetchSlots, reset],
  );

  const openDisable = useCallback((slot: AdminSlot) => {
    setModal({ open: true, slot, reason: '', saving: false, result: null, error: null });
  }, []);
  const closeDisable = useCallback(() => {
    setModal({ open: false, slot: null, reason: '', saving: false, result: null, error: null });
  }, []);

  const confirmDisable = useCallback(async (): Promise<void> => {
    if (!modal.slot) return;
    setModal((m) => ({ ...m, saving: true, error: null }));
    try {
      const resultado = await adminApi.disableSlot(modal.slot.id, {
        reason: modal.reason.trim() || null,
      });
      setModal((m) => ({
        ...m,
        saving: false,
        result: resultado.cancelledAppointments,
      }));
      await fetchSlots();
    } catch (err) {
      setModal((m) => ({
        ...m,
        saving: false,
        error: mensajeApi(err, 'No pudimos deshabilitar la franja.'),
      }));
    }
  }, [fetchSlots, modal.reason, modal.slot]);

  const updateCapacity = useCallback(
    async (slot: AdminSlot, delta: number): Promise<void> => {
      const nueva = Math.max(1, Math.min(100, slot.capacity + delta));
      if (nueva === slot.capacity) return;
      try {
        const actualizado = await adminApi.updateSlot(slot.id, { capacity: nueva });
        setSlots((prev) => prev.map((s) => (s.id === slot.id ? actualizado : s)));
      } catch (err) {
        setError(mensajeApi(err, 'No pudimos actualizar la capacidad.'));
      }
    },
    [],
  );

  const slotsOrdenados = useMemo(
    () =>
      [...slots].sort((a, b) =>
        `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`),
      ),
    [slots],
  );

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="crear-franja-heading" className="flex flex-col gap-4">
        <h2 id="crear-franja-heading" className="text-xl font-bold text-ink">
          Crear franja nueva
        </h2>
        <form
          onSubmit={handleSubmit(onCreate)}
          noValidate
          className="grid grid-cols-1 gap-4 rounded-md border border-neutral-200 bg-paper-warm p-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          <TextField
            label="Fecha"
            type="date"
            required
            {...register('date')}
            {...(errors.date?.message && { error: errors.date.message })}
          />
          <TextField
            label="Inicio"
            type="time"
            required
            {...register('startTime')}
            {...(errors.startTime?.message && { error: errors.startTime.message })}
          />
          <TextField
            label="Fin"
            type="time"
            required
            {...register('endTime')}
            {...(errors.endTime?.message && { error: errors.endTime.message })}
          />
          <TextField
            label="Capacidad"
            type="number"
            min={1}
            max={100}
            required
            {...register('capacity', { valueAsNumber: true })}
            {...(errors.capacity?.message && { error: errors.capacity.message })}
          />
          <div className="flex flex-col justify-end gap-2">
            <Checkbox
              label="Fuera de L–V 7–12"
              hint="Marcar sólo si es una excepción intencional"
              {...register('isExceptionHours')}
            />
            {isExceptionHours && (
              <p className="text-xs text-primary">
                Se registrará como excepción en el historial.
              </p>
            )}
          </div>
          <div className="sm:col-span-2 lg:col-span-5">
            <Button type="submit" isLoading={isSubmitting}>
              Crear franja
            </Button>
          </div>
        </form>
      </section>

      <section aria-labelledby="listado-heading" className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="listado-heading" className="text-xl font-bold text-ink">
            Franjas
          </h2>
          <Checkbox
            label="Incluir deshabilitadas"
            checked={includeDisabled}
            onChange={(e) => setIncludeDisabled(e.currentTarget.checked)}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-primary bg-primary-50 p-3 text-sm text-primary-900"
          >
            {error}
          </p>
        )}

        {loading ? (
          <p role="status" aria-live="polite" className="text-sm text-ink-700">
            Cargando franjas…
          </p>
        ) : slotsOrdenados.length === 0 ? (
          <p className="rounded-md border border-neutral-200 bg-paper-warm p-3 text-sm text-ink-700">
            No hay franjas registradas todavía.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-neutral-200">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <caption className="sr-only">Franjas horarias registradas</caption>
              <thead className="bg-paper-warm text-left">
                <tr>
                  <th scope="col" className="border-b p-3">Fecha</th>
                  <th scope="col" className="border-b p-3">Horario</th>
                  <th scope="col" className="border-b p-3">Capacidad</th>
                  <th scope="col" className="border-b p-3">Cupos usados</th>
                  <th scope="col" className="border-b p-3">Estado</th>
                  <th scope="col" className="border-b p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {slotsOrdenados.map((slot) => {
                  const fecha = new Date(`${slot.date}T${slot.startTime}:00`);
                  return (
                    <tr key={slot.id} className={slot.isDisabled ? 'opacity-60' : ''}>
                      <td className="border-b p-3 capitalize">
                        {formatterFecha.format(fecha)}
                        {slot.isExceptionHours && (
                          <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-paper">
                            Excepción
                          </span>
                        )}
                      </td>
                      <td className="border-b p-3">
                        {slot.startTime} – {slot.endTime}
                      </td>
                      <td className="border-b p-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateCapacity(slot, -1)}
                            disabled={slot.isDisabled || slot.capacity <= slot.usedCapacity}
                            aria-label={`Bajar capacidad del slot del ${slot.date} ${slot.startTime}`}
                            className="min-h-touch min-w-touch rounded-md border border-neutral-300 px-3 py-1 disabled:opacity-50"
                          >
                            −
                          </button>
                          <span aria-live="polite">{slot.capacity}</span>
                          <button
                            type="button"
                            onClick={() => updateCapacity(slot, +1)}
                            disabled={slot.isDisabled}
                            aria-label={`Subir capacidad del slot del ${slot.date} ${slot.startTime}`}
                            className="min-h-touch min-w-touch rounded-md border border-neutral-300 px-3 py-1 disabled:opacity-50"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="border-b p-3">{slot.usedCapacity}</td>
                      <td className="border-b p-3">
                        {slot.isDisabled ? 'Deshabilitada' : 'Activa'}
                      </td>
                      <td className="border-b p-3">
                        {!slot.isDisabled && (
                          <button
                            type="button"
                            onClick={() => openDisable(slot)}
                            className="min-h-touch rounded-md bg-primary px-3 py-1 text-sm font-medium text-paper"
                          >
                            Deshabilitar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modal.open && modal.slot && (
        <div
          role="alertdialog"
          aria-labelledby="disable-heading"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="flex w-full max-w-md flex-col gap-3 rounded-md border border-neutral-300 bg-paper p-6">
            <h2 id="disable-heading" className="text-xl font-bold text-ink">
              Deshabilitar franja
            </h2>
            <p className="text-base text-ink">
              Vas a deshabilitar la franja del <strong>{modal.slot.date}</strong>{' '}
              {modal.slot.startTime} – {modal.slot.endTime}. Todas las citas activas se cancelarán
              como <em>cancelled_by_bank</em>.
            </p>
            {modal.result === null ? (
              <>
                <label htmlFor="disable-reason" className="text-sm font-medium text-ink-700">
                  Motivo (opcional)
                </label>
                <textarea
                  id="disable-reason"
                  value={modal.reason}
                  onChange={(e) =>
                    setModal((m) => ({ ...m, reason: e.currentTarget.value.slice(0, 500) }))
                  }
                  rows={3}
                  className="rounded-md border border-neutral-300 bg-paper p-2 text-base text-ink"
                />
                {modal.error && (
                  <p
                    role="alert"
                    className="rounded-md border border-primary bg-primary-50 p-3 text-sm text-primary-900"
                  >
                    {modal.error}
                  </p>
                )}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={closeDisable}
                  >
                    Cancelar
                  </Button>
                  <Button type="button" isLoading={modal.saving} onClick={confirmDisable}>
                    Deshabilitar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p
                  role="status"
                  className="rounded-md border border-success-700 bg-success-50 p-3 text-sm text-ink"
                >
                  Franja deshabilitada. Se cancelaron <strong>{modal.result}</strong> citas activas.
                </p>
                <div className="flex justify-end">
                  <Button type="button" onClick={closeDisable}>
                    Cerrar
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
