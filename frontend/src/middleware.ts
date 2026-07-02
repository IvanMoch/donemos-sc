/**
 * Middleware Astro (T139): protege las rutas /admin/**.
 *
 * Antes de renderizar cualquier página en /admin (excepto /admin/login),
 * hace un fetch a `GET /admin/me` reenviando la cookie del request. Si el
 * backend responde !=200, redirigimos a /admin/login. Si responde 200,
 * dejamos pasar y adjuntamos el perfil en `locals.adminUser` para que las
 * páginas puedan mostrarlo.
 *
 * No usamos `apiClient` acá porque en SSR no hay browser cookie jar —
 * necesitamos reenviar el header Cookie explícitamente al backend.
 */
import { defineMiddleware } from 'astro:middleware';

interface AdminProfile {
  id: string;
  username: string;
  displayName?: string;
}

declare global {
  namespace App {
    interface Locals {
      adminUser?: AdminProfile;
    }
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  const esRutaAdmin = pathname.startsWith('/admin');
  const esLogin = pathname === '/admin/login' || pathname === '/admin/login/';
  if (!esRutaAdmin || esLogin) {
    return next();
  }

  const baseUrl =
    typeof import.meta.env !== 'undefined'
      ? (import.meta.env.PUBLIC_API_BASE_URL as string | undefined)
      : undefined;
  if (!baseUrl) {
    // Sin API URL definida no podemos verificar la sesión: redirigimos a login
    // por seguridad (fail-closed).
    return context.redirect('/admin/login');
  }

  const cookieHeader = context.request.headers.get('cookie') ?? '';
  try {
    const url = `${baseUrl.replace(/\/$/, '')}/admin/me`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        cookie: cookieHeader,
      },
    });
    if (!response.ok) {
      return context.redirect('/admin/login');
    }
    const profile = (await response.json()) as AdminProfile;
    context.locals.adminUser = profile;
    return next();
  } catch (_err) {
    return context.redirect('/admin/login');
  }
});
