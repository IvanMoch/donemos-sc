/**
 * WizardShell — isla React que orquesta el wizard de agendamiento (US1).
 *
 * Responsabilidades:
 *  - Mantiene el estado del wizard vía el reducer puro `wizard-state.ts`
 *    (testeado en aislamiento; el shell solo hace bindings a React).
 *  - Renderiza el paso actual + barra de progreso accesible + botones de
 *    navegación (Volver siempre primero para cumplir research §7).
 *  - Mueve el foco al <h1> del paso al cambiar (Principio III, WCAG 2.4.3),
 *    y anuncia el cambio con aria-live="polite" en una región oculta.
 *  - En status='success' renderiza <SuccessScreen /> (T081).
 *
 * NOTA sobre backend: mientras Fase 2 backend no exista, StepSlot muestra un
 * placeholder y StepConfirm no llama a POST /appointments. El submit fake
 * dispara submitError con un mensaje explicativo. Cuando el backend esté,
 * basta con conectar el fetch real en handleSubmit sin tocar el shell.
 */
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { Button } from '../ui/Button';
import { StepConfirm } from './StepConfirm';
import { StepIdentity } from './StepIdentity';
import { StepIntro } from './StepIntro';
import { StepSlot } from './StepSlot';
import { SuccessScreen } from './SuccessScreen';
import {
  STEPS,
  createInitialState,
  reducer,
  wizardActions,
  type StepId,
  type WizardData,
} from './wizard-state';

export interface WizardShellProps {
  // Placeholder para cuando el backend exista (T077 conecta GET /slots).
  // Por ahora WizardShell no consume nada del backend.
}

export function WizardShell(_props: WizardShellProps): JSX.Element {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  // Mover foco al <h1> cada vez que cambie de paso (research §7 + WCAG 2.4.3).
  useEffect(() => {
    headingRef.current?.focus();
  }, [state.currentStepId, state.status]);

  const handleFieldChange = useCallback(
    (patch: Partial<WizardData>) => {
      dispatch(wizardActions.setData(patch));
    },
    [dispatch],
  );

  const handleNext = useCallback(() => {
    dispatch(wizardActions.next());
  }, [dispatch]);

  const handleBack = useCallback(() => {
    dispatch(wizardActions.back());
  }, [dispatch]);

  const handleSubmit = useCallback(async () => {
    dispatch(wizardActions.submit());
    // TODO(US1 backend): reemplazar por POST /api/v1/appointments cuando
    // Fase 2 backend cierre. El client apiClient() ya está listo (T037).
    // Mientras tanto, emulamos el estado 'submitting' brevemente y
    // devolvemos un error explícito para que el flujo se entienda al mirarlo
    // en el navegador sin backend.
    await new Promise((r) => setTimeout(r, 400));
    dispatch(
      wizardActions.submitError(
        'El backend aún no está desplegado. La confirmación real llega cuando cierre la Fase 2 backend.',
      ),
    );
  }, [dispatch]);

  if (state.status === 'success' && state.appointment !== null) {
    return (
      <SuccessScreen
        appointment={state.appointment}
        donorName={`${state.data.firstName} ${state.data.lastName}`.trim()}
      />
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.id === state.currentStepId);
  const currentStep = STEPS[currentIndex]!;
  const totalSteps = STEPS.length;
  const stepNumber = currentIndex + 1;
  const progressLabel = `Paso ${stepNumber} de ${totalSteps}: ${currentStep.title}`;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      {/* Región oculta que anuncia el cambio de paso a lectores de pantalla. */}
      <p className="sr-only" aria-live="polite" role="status">
        {progressLabel}
      </p>

      <div
        role="progressbar"
        aria-valuenow={stepNumber}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-valuetext={progressLabel}
        className="flex items-center gap-2"
      >
        {STEPS.map((step, idx) => (
          <span
            key={step.id}
            aria-hidden="true"
            className={[
              'h-2 flex-1 rounded-full transition-colors duration-[220ms]',
              idx <= currentIndex ? 'bg-primary' : 'bg-neutral-200',
            ].join(' ')}
          />
        ))}
      </div>

      <div className="wizard-step">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-bold text-ink outline-none"
        >
          {currentStep.title}
        </h1>

        <StepPanel
          stepId={currentStep.id}
          data={state.data}
          onChange={handleFieldChange}
          isSubmitting={state.status === 'submitting'}
          error={state.error}
        />
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button
          type="button"
          onClick={handleBack}
          disabled={currentIndex === 0 || state.status === 'submitting'}
          className="bg-paper-warm text-ink hover:bg-neutral-200 sm:min-w-[8rem]"
        >
          Volver
        </Button>
        {currentStep.id === 'confirm' ? (
          <Button
            type="button"
            isLoading={state.status === 'submitting'}
            onClick={handleSubmit}
            className="sm:min-w-[10rem]"
          >
            Confirmar cita
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleNext}
            disabled={!state.canAdvanceFromCurrentStep}
            className="sm:min-w-[8rem]"
          >
            Siguiente
          </Button>
        )}
      </div>
    </div>
  );
}

interface StepPanelProps {
  stepId: StepId;
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
  isSubmitting: boolean;
  error: string | null;
}

function StepPanel({ stepId, data, onChange, isSubmitting, error }: StepPanelProps): JSX.Element {
  switch (stepId) {
    case 'intro':
      return <StepIntro data={data} onChange={onChange} />;
    case 'slot':
      return <StepSlot data={data} onChange={onChange} />;
    case 'identity':
      return <StepIdentity data={data} onChange={onChange} />;
    case 'confirm':
      return <StepConfirm data={data} isSubmitting={isSubmitting} error={error} />;
  }
}
