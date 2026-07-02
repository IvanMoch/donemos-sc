/**
 * StepSlot — paso 2 del wizard.
 *
 * Consume `GET /api/v1/slots` (a través del `SlotPicker` compartido) para
 * mostrar los horarios disponibles como radio cards grandes (área táctil
 * ≥ 44px, Principio VIII). Se muestran la fecha, el rango horario y el cupo
 * restante. El picker maneja loading / error / vacío internamente.
 */
import { SlotPicker } from '../slots/SlotPicker';
import type { WizardData } from './wizard-state';

interface StepSlotProps {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}

export function StepSlot({ data, onChange }: StepSlotProps): JSX.Element {
  return (
    <div className="mt-4 flex flex-col gap-4">
      <SlotPicker
        selectedSlotId={data.slotId}
        onSelect={(slot) =>
          onChange({
            slotId: slot.id,
            slotDate: slot.date,
            slotStart: slot.startTime,
            slotEnd: slot.endTime,
          })
        }
      />
    </div>
  );
}
