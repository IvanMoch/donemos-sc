/**
 * Tests para <Checkbox /> — TDD (Principio V) + axe (Principio III).
 *
 * Este componente es crítico: hospeda la auto-declaración de elegibilidad
 * (FR-011). Cualquier fallo de accesibilidad aquí bloquea a usuarios que
 * navegan por teclado o con lector de pantalla.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axeUnit } from '../../../test/axe';
import { Checkbox } from './Checkbox';

describe('<Checkbox />', () => {
  it('renderiza un checkbox accesible con el label asociado', () => {
    render(<Checkbox label="Declaro cumplir los requisitos" name="eligibility" />);
    const box = screen.getByLabelText('Declaro cumplir los requisitos');
    expect(box).toHaveAttribute('type', 'checkbox');
    expect(box).toHaveAttribute('name', 'eligibility');
  });

  it('marca aria-invalid + aria-describedby cuando hay error', () => {
    render(
      <Checkbox
        label="Declaro cumplir los requisitos"
        name="eligibility"
        error="Debes aceptar la declaración para continuar"
      />,
    );
    const box = screen.getByLabelText(/Declaro cumplir/);
    expect(box).toHaveAttribute('aria-invalid', 'true');
    const describedBy = box.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      'Debes aceptar la declaración para continuar',
    );
  });

  it('respeta el estado controlado desde el padre (checked/onChange)', async () => {
    const user = userEvent.setup();
    let checked = false;
    const { rerender } = render(
      <Checkbox
        label="Acepto"
        name="ok"
        checked={checked}
        onChange={(e) => {
          checked = e.currentTarget.checked;
        }}
      />,
    );
    const box = screen.getByLabelText('Acepto');
    await user.click(box);
    expect(checked).toBe(true);
    rerender(
      <Checkbox
        label="Acepto"
        name="ok"
        checked={checked}
        onChange={(e) => {
          checked = e.currentTarget.checked;
        }}
      />,
    );
    expect(screen.getByLabelText('Acepto')).toBeChecked();
  });

  it('permite marcar/desmarcar con Space (navegación por teclado)', async () => {
    const user = userEvent.setup();
    let clicks = 0;
    render(
      <Checkbox
        label="Acepto"
        name="ok"
        onChange={() => clicks++}
      />,
    );
    const box = screen.getByLabelText('Acepto');
    box.focus();
    await user.keyboard(' ');
    expect(clicks).toBe(1);
  });

  it('no reporta violaciones de accesibilidad (axe)', async () => {
    const { container } = render(
      <Checkbox
        label="Declaro cumplir los requisitos"
        name="eligibility"
        error="Debes aceptar la declaración"
      />,
    );
    const results = await axeUnit(container);
    expect(results).toHaveNoViolations();
  });
});
