/**
 * AdminLoginForm — formulario de acceso al panel administrativo (T133).
 *
 * Autofocus en el campo `username`, error genérico en 401 para no revelar si
 * el usuario existe (FR-023 hardening). El submit hace POST /admin/auth/login
 * con `credentials: 'include'` y, al recibir 204, navega a /admin/panel.
 * 429 se comunica explícitamente como rate limit (research §10).
 */
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { loginSchema, type LoginInput } from '@donemos/shared';
import { adminApi } from '../../lib/api';
import { ApiError } from '../../lib/api-client';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';

function mensajeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) return 'Demasiados intentos. Espera un momento antes de reintentar.';
    if (err.status === 401) return 'Credenciales incorrectas.';
    if (err.status === 400) return 'Revisa los campos ingresados.';
  }
  return 'No pudimos iniciar sesión. Intenta de nuevo en unos segundos.';
}

export function AdminLoginForm(): JSX.Element {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = async (values: LoginInput): Promise<void> => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      await adminApi.login(values);
      window.location.href = '/admin/panel';
    } catch (err) {
      setServerError(mensajeError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="mx-auto flex max-w-sm flex-col gap-4"
    >
      <TextField
        label="Usuario"
        autoComplete="username"
        autoFocus
        required
        {...register('username')}
        {...(errors.username?.message && { error: errors.username.message })}
      />
      <TextField
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        required
        {...register('password')}
        {...(errors.password?.message && { error: errors.password.message })}
      />

      {serverError && (
        <p
          role="alert"
          className="rounded-md border border-primary bg-primary-50 p-3 text-sm text-primary-900"
        >
          {serverError}
        </p>
      )}

      <Button type="submit" isLoading={isSubmitting}>
        Iniciar sesión
      </Button>
    </form>
  );
}
