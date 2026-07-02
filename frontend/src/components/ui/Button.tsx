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
 *  - Contraste primary sobre paper = 8.71:1 (research §9).
 *
 * Sin variantes de estilo por ahora — el MVP solo requiere un botón primario.
 * Las variantes secundarias (ghost, danger) entran en el módulo del wizard
 * cuando se justifiquen.
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
}

const BASE_CLASSES = [
  'inline-flex items-center justify-center',
  'min-h-touch min-w-touch px-6 py-2',
  'rounded-md',
  'bg-primary text-paper',
  'font-medium text-base',
  'transition-colors duration-[220ms] ease-in-out',
  'hover:bg-primary-800',
  'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, isLoading = false, disabled, type, className, ...rest },
  ref,
) {
  const composedClassName = className ? `${BASE_CLASSES} ${className}` : BASE_CLASSES;

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
