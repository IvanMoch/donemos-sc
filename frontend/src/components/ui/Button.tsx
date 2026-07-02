/**
 * <Button /> — botón accesible base de DonemosSC.
 *
 * Cumple los requisitos AAA del Principio III:
 *  - type='button' por defecto para no disparar submit implícito de formularios
 *    (patrón común de bug con botones de "Cancelar" o "Volver" dentro de <form>).
 *  - Altura mínima táctil de 44px (SC 2.5.5 + Principio VIII).
 *  - aria-busy + disabled en estado de carga: los lectores de pantalla anuncian
 *    "ocupado" y el usuario no puede volver a disparar la acción.
 *  - Foco visible AAA lo aporta el plugin del tailwind.config.mjs
 *    (*:focus-visible: outline 3px offset 2px) — no hace falta duplicar aquí.
 *
 * Variantes: `primary` (default, primary sobre paper, AAA 8.71:1),
 * `secondary` (paper-warm sobre ink, AAA 15+), y `soft` (primary-50 sobre
 * primary, AAA con dark red text sobre light pink). Cada variante define su
 * propio color de fondo/texto/hover para que un consumidor NO tenga que
 * pisar utilidades del layout base — pisar utilidades de misma categoría
 * genera colisiones donde el navegador aplica la que quede última en el CSS
 * generado (color contrast axe fallaba en el botón Cancelar de LookupForm
 * porque `className="bg-primary-50 text-primary"` competía con las bases
 * `bg-primary text-paper` sin ganar por especificidad).
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'soft';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
  variant?: ButtonVariant;
}

const LAYOUT_CLASSES = [
  'inline-flex items-center justify-center',
  'min-h-touch min-w-touch px-6 py-2',
  'rounded-md',
  'font-medium text-base',
  'transition-colors duration-[220ms] ease-in-out',
  'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-paper hover:bg-primary-800',
  secondary: 'bg-paper-warm text-ink hover:bg-neutral-200',
  soft: 'bg-primary-50 text-primary hover:bg-primary-100',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, isLoading = false, disabled, type, className, variant = 'primary', ...rest },
  ref,
) {
  const composedClassName = [
    LAYOUT_CLASSES,
    VARIANT_CLASSES[variant],
    ...(className ? [className] : []),
  ].join(' ');

  return (
    <button
      ref={ref}
      // Default 'button' evita submit implícito; el consumidor puede sobreescribir.
      type={type ?? 'button'}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={composedClassName}
      {...rest}
    >
      {children}
    </button>
  );
});
