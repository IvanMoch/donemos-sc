/**
 * Tests para <Button /> — TDD (Principio V) + axe (Principio III).
 * Se escriben ANTES de la implementación y deben fallar en un commit previo.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axeUnit } from '../../../test/axe';
import { Button } from './Button';

describe('<Button />', () => {
  it('renderiza un <button> con el label como texto accesible', () => {
    render(<Button>Agendar cita</Button>);
    const btn = screen.getByRole('button', { name: 'Agendar cita' });
    expect(btn).toBeInTheDocument();
  });

  it('por defecto usa type="button" para no enviar formularios de forma implícita', () => {
    render(<Button>Cancelar</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('type', 'button');
  });

  it('respeta el type explícito cuando se pasa (submit para el paso final del wizard)', () => {
    render(<Button type="submit">Confirmar</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('aplica aria-busy y disabled cuando isLoading=true', () => {
    render(<Button isLoading>Guardando</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).toBeDisabled();
  });

  it('llama a onClick al recibir clic con el mouse', async () => {
    const user = userEvent.setup();
    let clicks = 0;
    render(<Button onClick={() => clicks++}>OK</Button>);
    await user.click(screen.getByRole('button'));
    expect(clicks).toBe(1);
  });

  it('llama a onClick al pulsar Enter con foco (navegación por teclado)', async () => {
    const user = userEvent.setup();
    let clicks = 0;
    render(<Button onClick={() => clicks++}>OK</Button>);
    const btn = screen.getByRole('button');
    btn.focus();
    await user.keyboard('{Enter}');
    expect(clicks).toBe(1);
  });

  it('cumple altura mínima AAA de 44px (SC 2.5.5) en el estilo aplicado', () => {
    render(<Button>OK</Button>);
    const btn = screen.getByRole('button');
    // Verificamos que la utility class touch min-height esté presente.
    expect(btn.className).toMatch(/min-h-touch|min-h-\[44px\]/);
  });

  it('no reporta violaciones de accesibilidad (axe, sin color-contrast)', async () => {
    const { container } = render(<Button>Continuar</Button>);
    const results = await axeUnit(container);
    expect(results).toHaveNoViolations();
  });
});
