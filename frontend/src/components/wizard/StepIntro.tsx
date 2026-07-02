/**
 * StepIntro — paso 1 del wizard.
 *
 * Muestra un recordatorio breve de los puntos críticos de elegibilidad
 * (los textos completos viven en la landing, T073) y hospeda el checkbox
 * de auto-declaración obligatorio (FR-011).
 *
 * El componente es controlado: recibe `data` y notifica al shell con
 * `onChange` — no mantiene estado local.
 */
import { Checkbox } from '../ui/Checkbox';
import type { WizardData } from './wizard-state';

interface StepIntroProps {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}

const RECORDATORIO = [
  'Traer cédula de identidad vigente.',
  'Estar entre 18 y 60 años, con peso mínimo 50 kg.',
  'Venir bien desayunado (no en ayunas) y haber dormido bien.',
  'No haber consumido alcohol en las últimas 48-72 horas.',
];

export function StepIntro({ data, onChange }: StepIntroProps): JSX.Element {
  return (
    <div className="mt-4 flex flex-col gap-6">
      <div>
        <p className="text-base text-ink">
          Antes de agendar, recordá que para donar sangre necesitás:
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {RECORDATORIO.map((punto) => (
            <li key={punto} className="flex items-start gap-2 text-ink">
              <span aria-hidden="true" className="mt-1 text-primary">
                •
              </span>
              <span>{punto}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-ink-700">
          Podés revisar los <strong>6 requisitos completos</strong> y los criterios de exclusión en la
          página anterior. La verificación clínica final la hace el personal del banco.
        </p>
      </div>

      <Checkbox
        name="eligibilityDeclared"
        checked={data.eligibilityDeclared}
        onChange={(e) => onChange({ eligibilityDeclared: e.currentTarget.checked })}
        label="Declaro que cumplo con los requisitos para donar sangre y no aplico a ningún criterio de exclusión listados en la página."
        hint="Sin esta declaración no podés continuar con el agendamiento."
      />
    </div>
  );
}
