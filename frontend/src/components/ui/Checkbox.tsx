/**
 * <Checkbox /> — checkbox accesible base para DonemosSC.
 *
 * Componente crítico del flujo: la auto-declaración de elegibilidad (FR-011)
 * exige que el donante marque explícitamente el checkbox antes de continuar.
 * Cualquier problema de accesibilidad aquí bloquea a usuarios que navegan
 * por teclado o con lector de pantalla.
 *
 * Cumple AAA (Principio III):
 *  - Label visible siempre asociado por id/htmlFor.
 *  - aria-invalid + aria-describedby cuando hay error.
 *  - El input nativo mantiene Space como toggle (no reimplementamos con div
 *    + onClick, lo que rompería lectores de pantalla).
 *  - Contenedor con área táctil ≥ 44×44 px (Principio VIII) — el checkbox
 *    nativo tiende a ser ~13 px, así que agrandamos su área de clic mediante
 *    padding en el <label> y un `flex items-center` con `min-h-touch`.
 *  - Foco visible AAA vía plugin transversal.
 */
import { forwardRef, useId, type InputHTMLAttributes } from 'react';

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> {
  label: string;
  error?: string;
  hint?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, error, hint, name, className, ...rest },
  ref,
) {
  const reactId = useId();
  const inputId = `${reactId}-${name ?? 'checkbox'}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className="flex min-h-touch cursor-pointer items-start gap-3 py-2 text-base text-ink"
      >
        <input
          ref={ref}
          id={inputId}
          name={name}
          type="checkbox"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className="mt-1 h-5 w-5 shrink-0 accent-primary"
          {...rest}
        />
        <span>{label}</span>
      </label>
      {hint && (
        <p id={hintId} className="ml-8 text-sm text-ink-700">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          className="ml-8 text-sm font-medium text-primary"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
});
