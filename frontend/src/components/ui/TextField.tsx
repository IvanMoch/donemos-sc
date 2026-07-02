/**
 * <TextField /> — input de texto accesible base para el wizard.
 *
 * Requisitos AAA (Principio III):
 *  - Label siempre visible y asociado por id/htmlFor (no placeholder-only).
 *  - `aria-invalid` + `aria-describedby` cuando hay error, para que el lector
 *    de pantalla anuncie tanto que el campo es inválido como el mensaje
 *    concreto (SC 3.3.1 + 3.3.3).
 *  - `aria-required` explícito además del atributo `required` nativo.
 *  - Altura mínima 44px (Principio VIII + SC 2.5.5) — se hereda de `min-h-touch`.
 *  - Foco visible AAA vía el plugin transversal del tailwind.config.mjs.
 *
 * Comportamiento controlado: el componente delega estado al padre (react-hook-form
 * en el wizard). No mantiene value interno.
 */
import { forwardRef, useId, type InputHTMLAttributes } from 'react';

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  error?: string;
  hint?: string;
}

const BASE_INPUT_CLASSES = [
  'block w-full min-h-touch px-3 py-2',
  'rounded-md border border-neutral-400',
  'bg-paper text-ink placeholder:text-neutral-400',
  'text-base',
  'transition-colors duration-[220ms] ease-in-out',
  'hover:border-ink',
  'aria-[invalid=true]:border-primary aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-primary',
].join(' ');

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, required, className, name, ...rest },
  ref,
) {
  const reactId = useId();
  const inputId = `${reactId}-${name ?? 'field'}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;
  const composedClassName = className
    ? `${BASE_INPUT_CLASSES} ${className}`
    : BASE_INPUT_CLASSES;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-1 text-primary">
            *
          </span>
        )}
      </label>
      <input
        ref={ref}
        id={inputId}
        name={name}
        required={required}
        aria-required={required ? 'true' : undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={composedClassName}
        {...rest}
      />
      {hint && (
        <p id={hintId} className="text-sm text-ink-700">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-medium text-primary" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});
