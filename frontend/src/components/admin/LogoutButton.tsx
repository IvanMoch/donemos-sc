/**
 * LogoutButton — botón cliente que llama POST /admin/auth/logout y navega a
 * /admin/login. Se usa en el AdminLayout. Se hace desde el cliente para
 * evitar tener que crear un endpoint intermedio en el server; el backend
 * borra la cookie con Set-Cookie: session=; y el navegador la aplica.
 */
import { useState } from 'react';
import { adminApi } from '../../lib/api';

export function LogoutButton(): JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const onClick = async (): Promise<void> => {
    setIsSubmitting(true);
    try {
      await adminApi.logout();
    } catch (_err) {
      // Aunque falle, forzamos ir a la pantalla de login — la sesión local queda inválida.
    } finally {
      window.location.href = '/admin/login';
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isSubmitting}
      aria-busy={isSubmitting}
      className="rounded-md border border-neutral-300 bg-paper px-3 py-1 text-sm font-medium text-ink hover:bg-neutral-100 disabled:opacity-70"
    >
      {isSubmitting ? 'Cerrando…' : 'Cerrar sesión'}
    </button>
  );
}
