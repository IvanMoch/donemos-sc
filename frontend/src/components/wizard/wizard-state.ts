/**
 * Máquina de estados del wizard de agendamiento US1.
 *
 * Se modela como un reducer puro (no XState) por dos razones:
 *  1. El grafo tiene solo 4 pasos lineales + una rama de submit → añadir una
 *     dependencia externa (XState pesa ~30 KB gzipped) violaría el Principio VIII
 *     (bundle mínimo) sin ganancia real.
 *  2. Un reducer es trivial de testear (tests puros sin renderizar React).
 *
 * Reglas de negocio codificadas aquí (documentadas en spec.md):
 *  - FR-011: sin checkbox de auto-declaración no se puede avanzar del paso intro.
 *  - Cada paso valida sus propios datos antes de habilitar 'Siguiente'.
 *  - 'Volver' siempre preserva los datos ingresados (research §7).
 *  - Al pulsar 'Confirmar' pasamos a status='submitting'; la respuesta del
 *    backend disparará submitSuccess (con el `code` de 10 chars) o submitError.
 */

export type StepId = 'intro' | 'slot' | 'identity' | 'confirm';

export interface WizardStepMeta {
  readonly id: StepId;
  readonly title: string;
}

export const STEPS: readonly WizardStepMeta[] = [
  { id: 'intro', title: 'Antes de continuar' },
  { id: 'slot', title: 'Elige tu horario' },
  { id: 'identity', title: 'Tus datos' },
  { id: 'confirm', title: 'Revisar y confirmar' },
] as const;

export interface WizardData {
  eligibilityDeclared: boolean;
  slotId: string | null;
  firstName: string;
  lastName: string;
  idNumber: string;
}

export interface WizardAppointment {
  code: string;
  slotDate: string;
  slotStart: string;
  slotEnd: string;
}

export type WizardStatus = 'editing' | 'submitting' | 'success';

export interface WizardState {
  currentStepId: StepId;
  data: WizardData;
  status: WizardStatus;
  error: string | null;
  appointment: WizardAppointment | null;
  canAdvanceFromCurrentStep: boolean;
}

// -- Actions --------------------------------------------------------------

type Action =
  | { type: 'setData'; patch: Partial<WizardData> }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'goTo'; stepId: StepId }
  | { type: 'submit' }
  | { type: 'submitSuccess'; appointment: WizardAppointment }
  | { type: 'submitError'; error: string };

export const wizardActions = {
  setData: (patch: Partial<WizardData>): Action => ({ type: 'setData', patch }),
  next: (): Action => ({ type: 'next' }),
  back: (): Action => ({ type: 'back' }),
  goTo: (stepId: StepId): Action => ({ type: 'goTo', stepId }),
  submit: (): Action => ({ type: 'submit' }),
  submitSuccess: (appointment: WizardAppointment): Action => ({
    type: 'submitSuccess',
    appointment,
  }),
  submitError: (error: string): Action => ({ type: 'submitError', error }),
};

// -- Selectors ------------------------------------------------------------

function canAdvanceFrom(stepId: StepId, data: WizardData): boolean {
  switch (stepId) {
    case 'intro':
      // FR-011: sin el checkbox marcado no se puede continuar.
      return data.eligibilityDeclared;
    case 'slot':
      return data.slotId !== null && data.slotId.length > 0;
    case 'identity':
      return (
        data.firstName.trim().length > 0 &&
        data.lastName.trim().length > 0 &&
        // Formato mínimo: V/E seguido de 6-8 dígitos. La validación exacta
        // vive en el schema Zod (StepIdentity); aquí solo alcanza para
        // habilitar el botón 'Siguiente'.
        /^[VE]\d{6,8}$/.test(data.idNumber.trim().toUpperCase())
      );
    case 'confirm':
      return true;
  }
}

function stepIndex(stepId: StepId): number {
  const index = STEPS.findIndex((s) => s.id === stepId);
  // Los tipos garantizan que StepId ∈ STEPS, así que index nunca es -1.
  return index >= 0 ? index : 0;
}

// -- Reducer --------------------------------------------------------------

export function createInitialState(): WizardState {
  const data: WizardData = {
    eligibilityDeclared: false,
    slotId: null,
    firstName: '',
    lastName: '',
    idNumber: '',
  };
  return {
    currentStepId: 'intro',
    data,
    status: 'editing',
    error: null,
    appointment: null,
    canAdvanceFromCurrentStep: canAdvanceFrom('intro', data),
  };
}

function withDerived(
  base: Omit<WizardState, 'canAdvanceFromCurrentStep'>,
): WizardState {
  return {
    ...base,
    canAdvanceFromCurrentStep: canAdvanceFrom(base.currentStepId, base.data),
  };
}

export function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case 'setData': {
      const data = { ...state.data, ...action.patch };
      return withDerived({ ...state, data, error: null });
    }
    case 'next': {
      if (!canAdvanceFrom(state.currentStepId, state.data)) {
        return state;
      }
      const nextIndex = Math.min(stepIndex(state.currentStepId) + 1, STEPS.length - 1);
      const nextStep = STEPS[nextIndex]!;
      return withDerived({ ...state, currentStepId: nextStep.id });
    }
    case 'back': {
      const prevIndex = Math.max(stepIndex(state.currentStepId) - 1, 0);
      const prevStep = STEPS[prevIndex]!;
      return withDerived({ ...state, currentStepId: prevStep.id });
    }
    case 'goTo': {
      return withDerived({ ...state, currentStepId: action.stepId });
    }
    case 'submit': {
      return withDerived({ ...state, status: 'submitting', error: null });
    }
    case 'submitSuccess': {
      return withDerived({
        ...state,
        status: 'success',
        appointment: action.appointment,
        error: null,
      });
    }
    case 'submitError': {
      return withDerived({
        ...state,
        status: 'editing',
        error: action.error,
      });
    }
  }
}
