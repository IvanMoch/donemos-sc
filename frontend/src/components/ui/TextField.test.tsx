/**
 * Tests para <TextField /> — TDD (Principio V) + axe (Principio III).
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axeUnit } from '../../../test/axe';
import { TextField } from './TextField';

describe('<TextField />', () => {
  it('renderiza un input con label asociado por htmlFor/id', () => {
    render(<TextField label="Cédula" name="idNumber" />);
    const input = screen.getByLabelText('Cédula');
    expect(input.tagName).toBe('INPUT');
    expect(input).toHaveAttribute('name', 'idNumber');
  });

  it('marca aria-invalid=true y aria-describedby cuando hay error', () => {
    render(
      <TextField
        label="Cédula"
        name="idNumber"
        error="Formato inválido (esperado V12345678)"
      />,
    );
    const input = screen.getByLabelText('Cédula');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const err = document.getElementById(describedBy!);
    expect(err).toHaveTextContent('Formato inválido (esperado V12345678)');
  });

  it('cuando NO hay error no expone aria-invalid ni aria-describedby', () => {
    render(<TextField label="Nombre" name="firstName" />);
    const input = screen.getByLabelText('Nombre');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-describedby');
  });

  it('marca aria-required cuando required=true', () => {
    render(<TextField label="Apellido" name="lastName" required />);
    const input = screen.getByLabelText(/Apellido/);
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toBeRequired();
  });

  it('deja escribir por teclado y llama onChange en cada tecla', async () => {
    const user = userEvent.setup();
    const seen: string[] = [];
    render(
      <TextField
        label="Nombre"
        name="firstName"
        onChange={(e) => seen.push(e.currentTarget.value)}
      />,
    );
    const input = screen.getByLabelText('Nombre');
    await user.type(input, 'Ana');
    expect(seen[seen.length - 1]).toBe('Ana');
  });

  it('no reporta violaciones de accesibilidad (axe)', async () => {
    const { container } = render(
      <TextField label="Cédula" name="idNumber" error="Requerido" />,
    );
    const results = await axeUnit(container);
    expect(results).toHaveNoViolations();
  });
});
