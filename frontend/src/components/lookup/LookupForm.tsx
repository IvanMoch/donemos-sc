/**
 * LookupForm — isla React para consultar / cancelar / reagendar una cita (US2).
 *
 * Flujo en dos pasos:
 *  1. `lookup`: pide cédula + código y llama POST /appointments/lookup.
 *  2. `detail`: muestra la cita encontrada y ofrece botones "Cancelar" y
 *     "Reagendar". "Reagendar" desemboca en un tercer paso (`reschedule`)
 *     con `RescheduleForm`.
 *
 * Reglas de accesibilidad y UX:
 *  - Todos los mensajes de error/estado usan `role="alert"` o `role="status"`.
 *  - El botón "Reagendar" queda deshabilitado si el kill switch está activo
 *    (`rescheduleDisabled` viene del server) — FR-023b.
 *  - Al cancelar mostramos la confirmación inline (no navegamos) para no
 *    perder el contexto y permitir que el donante lea el estado final.
 *  - Errores de lookup no revelan si la cédula existe o no (FR-016): mensaje
 *    genérico "No encontramos una cita con esos datos".
 */
import { useCallback, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { lookupSchema, type LookupInput } from '@donemos/shared';
import { publicApi, type AppointmentDetail, type AppointmentConfirmation } from '../../lib/api';
import { ApiError } from '../../lib/api-client';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { RescheduleForm } from './RescheduleForm';

interface LookupFormProps {
  rescheduleDisabled: boolean;
}

type View =
  | { name: 'lookup' }
  | { name: 'detail'; detail: AppointmentDetail; credentials: LookupInput }
  | { name: 'reschedule'; detail: AppointmentDetail; credentials: LookupInput }
  | { name: 'rescheduled'; confirmation: AppointmentConfirmation; credentials: LookupInput };

const formatterFecha = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

function mensajeLookup(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) {
      return 'Demasiados intentos en poco tiempo. Espera un momento y vuelve a intentar.';
    }
    if (err.status === 404) {
      return 'No encontramos una cita con esos datos. Revisa la cédula y el código.';
    }
    if (err.status === 400) {
      return 'Los datos ingresados no tienen el formato esperado.';
    }
  }
  return 'No pudimos consultar la cita. Intenta de nuevo en unos segundos.';
}

function mensajeCancel(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) return 'Demasiados intentos. Espera un momento.';
  }
  return 'No pudimos cancelar la cita. Intenta de nuevo en unos segundos.';
}

export function LookupForm({ rescheduleDisabled }: LookupFormProps): JSX.Element {
  const [view, setView] = useState<View>({ name: 'lookup' });
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LookupInput>({
    resolver: zodResolver(lookupSchema),
    mode: 'onBlur',
    defaultValues: { code: '', idNumber: '' },
  });

  const onLookup = useCallback(async (data: LookupInput) => {
    setLookupError(null);
    setIsSubmitting(true);
    try {
      const detalle = await publicApi.lookupAppointment(data);
      setView({ name: 'detail', detail: detalle, credentials: data });
    } catch (err) {
      setLookupError(mensajeLookup(err));
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const onCancel = useCallback(async () => {
    if (view.name !== 'detail') return;
    setDetailError(null);
    setIsCancelling(true);
    try {
      const actualizada = await publicApi.cancelAppointment(view.detail.code, {
        idNumber: view.credentials.idNumber,
      });
      setView({ name: 'detail', detail: actualizada, credentials: view.credentials });
    } catch (err) {
      setDetailError(mensajeCancel(err));
    } finally {
      setIsCancelling(false);
    }
  }, [view]);

  const onRescheduled = useCallback((confirmation: AppointmentConfirmation) => {
    setView((prev) =>
      prev.name === 'reschedule'
        ? { name: 'rescheduled', confirmation, credentials: prev.credentials }
        : prev,
    );
  }, []);

  const goBackToLookup = useCallback(() => {
    setView({ name: 'lookup' });
    setLookupError(null);
    setDetailError(null);
  }, []);

  if (view.name === 'reschedule') {
    return (
      <RescheduleForm
        appointmentCode={view.detail.code}
        idNumber={view.credentials.idNumber}
        currentSlotId={view.detail.slot.id}
        onRescheduled={onRescheduled}
        onCancel={() => setView({ name: 'detail', detail: view.detail, credentials: view.credentials })}
      />
    );
  }

  if (view.name === 'rescheduled') {
    const fecha = new Date(`${view.confirmation.slot.date}T${view.confirmation.slot.startTime}:00`);
    return (
      <section
        aria-labelledby="reschedule-success-heading"
        className="mx-auto flex max-w-xl flex-col gap-4 rounded-md border border-success-700 bg-success-50 p-6"
      >
        <h1 id="reschedule-success-heading" className="text-2xl font-bold text-ink">
          Cita reagendada
        </h1>
        <p className="text-base text-ink">
          Se conservó tu código de cita:{' '}
          <strong className="font-mono text-lg tracking-widest text-primary">
            {view.confirmation.code}
          </strong>
        </p>
        <dl className="rounded-md border border-neutral-200 bg-paper p-4 text-base text-ink">
          <div className="flex flex-col gap-1 py-2">
            <dt className="text-sm font-medium text-ink-700">Nuevo horario</dt>
            <dd className="capitalize">
              {formatterFecha.format(fecha)} · {view.confirmation.slot.startTime} –{' '}
              {view.confirmation.slot.endTime}
            </dd>
          </div>
        </dl>
        <Button type="button" onClick={goBackToLookup}>
          Consultar otra cita
        </Button>
      </section>
    );
  }

  if (view.name === 'detail') {
    const detalle = view.detail;
    const fecha = new Date(`${detalle.slot.date}T${detalle.slot.startTime}:00`);
    const estadoActivo = detalle.status === 'active';
    return (
      <section
        aria-labelledby="detail-heading"
        className="mx-auto flex max-w-xl flex-col gap-4"
      >
        <h1 id="detail-heading" className="text-2xl font-bold text-ink">
          Tu cita
        </h1>

        <dl className="rounded-md border border-neutral-200 bg-paper-warm p-4 text-base text-ink">
          <div className="flex flex-col gap-1 py-2">
            <dt className="text-sm font-medium text-ink-700">Código</dt>
            <dd className="font-mono text-lg tracking-widest text-primary">{detalle.code}</dd>
          </div>
          <div className="flex flex-col gap-1 border-t border-neutral-200 py-2">
            <dt className="text-sm font-medium text-ink-700">Estado</dt>
            <dd>{describirEstado(detalle.status)}</dd>
          </div>
          <div className="flex flex-col gap-1 border-t border-neutral-200 py-2">
            <dt className="text-sm font-medium text-ink-700">Horario</dt>
            <dd className="capitalize">
              {formatterFecha.format(fecha)} · {detalle.slot.startTime} – {detalle.slot.endTime}
            </dd>
          </div>
          <div className="flex flex-col gap-1 border-t border-neutral-200 py-2">
            <dt className="text-sm font-medium text-ink-700">Lugar</dt>
            <dd>{detalle.hospital.name}</dd>
          </div>
        </dl>

        {detailError && (
          <p
            role="alert"
            className="rounded-md border border-primary bg-primary-50 p-3 text-sm text-primary-900"
          >
            {detailError}
          </p>
        )}

        {estadoActivo && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              isLoading={isCancelling}
              onClick={onCancel}
              className="bg-primary-50 text-primary hover:bg-primary-100 sm:min-w-[10rem]"
            >
              Cancelar cita
            </Button>
            <Button
              type="button"
              disabled={rescheduleDisabled}
              onClick={() =>
                setView({ name: 'reschedule', detail: detalle, credentials: view.credentials })
              }
              aria-describedby={rescheduleDisabled ? 'reschedule-disabled-note' : undefined}
              className="sm:min-w-[10rem]"
            >
              Reagendar
            </Button>
          </div>
        )}

        {estadoActivo && rescheduleDisabled && (
          <p id="reschedule-disabled-note" className="text-sm text-ink-700">
            El reagendamiento está temporalmente cerrado por el banco. Puedes cancelar la cita si no
            podrás asistir.
          </p>
        )}

        <div className="flex">
          <button
            type="button"
            onClick={goBackToLookup}
            className="rounded-md px-2 py-1 text-sm font-medium text-primary underline hover:no-underline"
          >
            Consultar otra cita
          </button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="lookup-heading" className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 id="lookup-heading" className="text-2xl font-bold text-ink">
        Consultar mi cita
      </h1>
      <p className="text-base text-ink">
        Ingresa la cédula con la que agendaste y el código de 10 caracteres que recibiste al
        confirmar.
      </p>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onLookup)} noValidate>
        <TextField
          label="Cédula de identidad"
          autoComplete="off"
          inputMode="text"
          required
          placeholder="V12345678"
          hint="Debe empezar por V o E seguidos de 6 a 8 dígitos, sin guion."
          {...register('idNumber')}
          {...(errors.idNumber?.message && { error: errors.idNumber.message })}
        />
        <TextField
          label="Código de cita"
          autoComplete="off"
          required
          placeholder="Ej: K7P3M9XQ2R"
          hint="10 caracteres alfanuméricos."
          {...register('code')}
          {...(errors.code?.message && { error: errors.code.message })}
        />

        {lookupError && (
          <p
            role="alert"
            className="rounded-md border border-primary bg-primary-50 p-3 text-sm text-primary-900"
          >
            {lookupError}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <a
            href="/"
            className="inline-flex min-h-touch items-center justify-center rounded-md bg-paper-warm px-6 py-2 text-base font-medium text-ink transition-colors duration-[220ms] hover:bg-neutral-200 sm:min-w-[8rem]"
          >
            Volver
          </a>
          <Button type="submit" isLoading={isSubmitting} className="sm:min-w-[10rem]">
            Consultar cita
          </Button>
        </div>
      </form>
    </section>
  );
}

function describirEstado(status: AppointmentDetail['status']): string {
  switch (status) {
    case 'active':
      return 'Activa — te esperamos en el banco de sangre.';
    case 'cancelled_by_donor':
      return 'Cancelada por ti.';
    case 'cancelled_by_bank':
      return 'Cancelada por el banco. Puedes agendar una nueva cita cuando quieras.';
    case 'attended':
      return 'Asistida. ¡Gracias por donar!';
    case 'no_show':
      return 'No asistida.';
  }
}
