/**
 * StepConfirm — paso 4 del wizard.
 *
 * Renderiza un resumen de los datos ingresados para que el donante los
 * revise antes de confirmar. El botón "Confirmar cita" vive en WizardShell
 * (el mismo botón cambia de "Siguiente" a "Confirmar" en el último paso).
 *
 * Muestra `error` cuando existe (por ejemplo cupos agotados o backend caído)
 * con role="alert" para que los lectores de pantalla lo anuncien.
 */
import type { WizardData } from './wizard-state';

interface StepConfirmProps {
  data: WizardData;
  isSubmitting: boolean;
  error: string | null;
}

const formatterFecha = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
});

function labelSlot(data: WizardData): string {
  if (!data.slotDate || !data.slotStart || !data.slotEnd) return '—';
  const fecha = new Date(`${data.slotDate}T${data.slotStart}:00`);
  return `${formatterFecha.format(fecha)} · ${data.slotStart} – ${data.slotEnd}`;
}

export function StepConfirm({ data, isSubmitting, error }: StepConfirmProps): JSX.Element {
  const slotLabel = labelSlot(data);
  return (
    <div className="mt-4 flex flex-col gap-4">
      <p className="text-base text-ink">
        Revisa que tus datos estén correctos antes de confirmar la cita:
      </p>
      <dl className="rounded-md border border-neutral-200 bg-paper-warm p-4 text-base text-ink">
        <div className="flex flex-col gap-1 py-2">
          <dt className="text-sm font-medium text-ink-700">Horario</dt>
          <dd className="text-base capitalize">{slotLabel}</dd>
        </div>
        <div className="flex flex-col gap-1 border-t border-neutral-200 py-2">
          <dt className="text-sm font-medium text-ink-700">Nombre completo</dt>
          <dd className="text-base">
            {data.firstName} {data.lastName}
          </dd>
        </div>
        <div className="flex flex-col gap-1 border-t border-neutral-200 py-2">
          <dt className="text-sm font-medium text-ink-700">Cédula</dt>
          <dd className="text-base">{data.idNumber}</dd>
        </div>
        <div className="flex flex-col gap-1 border-t border-neutral-200 py-2">
          <dt className="text-sm font-medium text-ink-700">Auto-declaración</dt>
          <dd className="text-base">
            {data.eligibilityDeclared
              ? 'Confirmada — cumplo requisitos y no aplico a criterios de exclusión.'
              : 'Pendiente — no puedes continuar sin marcarla en el paso inicial.'}
          </dd>
        </div>
      </dl>

      {isSubmitting && (
        <p className="text-sm text-ink-700" role="status" aria-live="polite">
          Enviando tu cita al servidor…
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-md border border-primary bg-primary-50 p-3 text-sm text-primary-900"
        >
          {error}
        </p>
      )}
    </div>
  );
}
