/**
 * StepSlot — paso 2 del wizard.
 *
 * Debe consumir `GET /api/v1/slots` para mostrar los horarios disponibles
 * como radio cards grandes (área táctil ≥ 44px, Principio VIII). Se muestran
 * la fecha, el rango horario y el cupo restante.
 *
 * NOTA sobre backend: mientras Fase 2 backend no exista, este paso muestra
 * una explicación visible en pantalla + un slot de ejemplo seleccionable
 * para que se pueda navegar el resto del flujo end-to-end. El TODO de abajo
 * marca dónde ir cuando llegue el endpoint real.
 */
import { useMemo } from 'react';
import type { WizardData } from './wizard-state';

interface StepSlotProps {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}

interface DemoSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  remainingCapacity: number;
}

// TODO(US1 backend): reemplazar por respuesta de apiClient('/slots').
// Estos slots demo permiten navegar el wizard end-to-end sin backend.
const DEMO_SLOTS: readonly DemoSlot[] = [
  { id: 'demo-1', date: '2026-07-06', startTime: '07:00', endTime: '07:35', remainingCapacity: 3 },
  { id: 'demo-2', date: '2026-07-06', startTime: '07:40', endTime: '08:15', remainingCapacity: 2 },
  { id: 'demo-3', date: '2026-07-07', startTime: '09:00', endTime: '09:35', remainingCapacity: 1 },
];

const formatterFecha = new Intl.DateTimeFormat('es-VE', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
});

export function StepSlot({ data, onChange }: StepSlotProps): JSX.Element {
  const slots = useMemo(() => DEMO_SLOTS, []);

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div
        role="note"
        className="rounded-md border border-primary-100 bg-primary-50 p-3 text-sm text-primary-900"
      >
        <strong>Nota de desarrollo:</strong> el listado real de horarios llegará cuando el backend
        exponga <code>/api/v1/slots</code>. Por ahora podés seleccionar uno de estos slots de
        ejemplo para navegar el resto del flujo.
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-ink-700">Horarios disponibles</legend>
        {slots.map((slot) => {
          const fecha = new Date(`${slot.date}T${slot.startTime}:00`);
          const seleccionado = data.slotId === slot.id;
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
                onChange={() => onChange({ slotId: slot.id })}
                className="mt-1 h-5 w-5 shrink-0 accent-primary"
              />
              <span className="flex flex-1 flex-col gap-1">
                <span className="text-base font-medium text-ink">
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
    </div>
  );
}
