/**
 * Tests para la máquina de estados del wizard de agendamiento (US1).
 * TDD (Principio V): describen el contrato antes de la implementación.
 *
 * La state machine controla los 4 pasos del wizard (intro → slot → identity →
 * confirm → success), la validación por paso, la navegación bidireccional
 * (siguiente / volver) y el bloqueo del avance si el checkbox de
 * auto-declaración (paso intro) no está marcado (FR-011 + spec § clarifications).
 */
import { describe, expect, it } from 'vitest';
import {
  type WizardData,
  createInitialState,
  reducer,
  wizardActions,
  STEPS,
} from './wizard-state';

const emptyData: WizardData = {
  eligibilityDeclared: false,
  slotId: null,
  slotDate: null,
  slotStart: null,
  slotEnd: null,
  firstName: '',
  lastName: '',
  idNumber: '',
};

describe('wizard-state — máquina de estados del wizard US1', () => {
  it('el estado inicial arranca en el paso "intro" con datos vacíos', () => {
    const state = createInitialState();
    expect(state.currentStepId).toBe('intro');
    expect(state.data).toEqual(emptyData);
    expect(state.status).toBe('editing');
  });

  it('STEPS lista los 4 pasos del wizard en orden intro → slot → identity → confirm', () => {
    expect(STEPS.map((s) => s.id)).toEqual(['intro', 'slot', 'identity', 'confirm']);
  });

  it('avanzar desde intro sin marcar el checkbox no cambia de paso (FR-011)', () => {
    let state = createInitialState();
    state = reducer(state, wizardActions.next());
    expect(state.currentStepId).toBe('intro');
  });

  it('avanzar desde intro con checkbox marcado pasa a slot', () => {
    let state = createInitialState();
    state = reducer(state, wizardActions.setData({ eligibilityDeclared: true }));
    state = reducer(state, wizardActions.next());
    expect(state.currentStepId).toBe('slot');
  });

  it('avanzar desde slot sin slotId no cambia de paso', () => {
    let state = createInitialState();
    state = reducer(state, wizardActions.setData({ eligibilityDeclared: true }));
    state = reducer(state, wizardActions.next());
    // ahora en slot
    state = reducer(state, wizardActions.next());
    expect(state.currentStepId).toBe('slot');
  });

  it('avanzar desde slot con slotId pasa a identity', () => {
    let state = createInitialState();
    state = reducer(state, wizardActions.setData({ eligibilityDeclared: true }));
    state = reducer(state, wizardActions.next());
    state = reducer(state, wizardActions.setData({ slotId: 'slot-abc' }));
    state = reducer(state, wizardActions.next());
    expect(state.currentStepId).toBe('identity');
  });

  it('avanzar desde identity con datos válidos pasa a confirm', () => {
    let state = createInitialState();
    state = reducer(state, wizardActions.setData({ eligibilityDeclared: true }));
    state = reducer(state, wizardActions.next());
    state = reducer(state, wizardActions.setData({ slotId: 'slot-abc' }));
    state = reducer(state, wizardActions.next());
    state = reducer(state, wizardActions.setData({
      firstName: 'Ana',
      lastName: 'Barreras',
      idNumber: 'V12345678',
    }));
    state = reducer(state, wizardActions.next());
    expect(state.currentStepId).toBe('confirm');
  });

  it('back desde identity vuelve a slot preservando los datos ingresados', () => {
    let state = createInitialState();
    state = reducer(state, wizardActions.setData({
      eligibilityDeclared: true,
      slotId: 'slot-abc',
    }));
    state = reducer(state, wizardActions.goTo('identity'));
    state = reducer(state, wizardActions.setData({ firstName: 'Ana' }));
    state = reducer(state, wizardActions.back());
    expect(state.currentStepId).toBe('slot');
    expect(state.data.firstName).toBe('Ana');
    expect(state.data.slotId).toBe('slot-abc');
  });

  it('back desde intro no cambia (no hay paso anterior)', () => {
    let state = createInitialState();
    state = reducer(state, wizardActions.back());
    expect(state.currentStepId).toBe('intro');
  });

  it('submit disparado desde confirm marca status="submitting"', () => {
    let state = createInitialState();
    state = reducer(state, wizardActions.goTo('confirm'));
    state = reducer(state, wizardActions.submit());
    expect(state.status).toBe('submitting');
  });

  it('submitSuccess mueve a status="success" con el appointmentCode', () => {
    let state = createInitialState();
    state = reducer(state, wizardActions.goTo('confirm'));
    state = reducer(state, wizardActions.submit());
    state = reducer(state, wizardActions.submitSuccess({
      code: 'K7P3M9XQ2R',
      slotDate: '2026-07-05',
      slotStart: '07:00',
      slotEnd: '07:35',
    }));
    expect(state.status).toBe('success');
    expect(state.appointment?.code).toBe('K7P3M9XQ2R');
  });

  it('submitError vuelve a editing con el mensaje de error visible', () => {
    let state = createInitialState();
    state = reducer(state, wizardActions.goTo('confirm'));
    state = reducer(state, wizardActions.submit());
    state = reducer(state, wizardActions.submitError('El servidor no está disponible.'));
    expect(state.status).toBe('editing');
    expect(state.error).toBe('El servidor no está disponible.');
  });

  it('canAdvanceFrom devuelve el motivo por el que un paso no puede avanzar', () => {
    let state = createInitialState();
    // intro sin checkbox
    expect(state.canAdvanceFromCurrentStep).toBe(false);
    state = reducer(state, wizardActions.setData({ eligibilityDeclared: true }));
    expect(state.canAdvanceFromCurrentStep).toBe(true);
  });
});
