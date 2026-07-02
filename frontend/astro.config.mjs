/**
 * Configuración Astro para DonemosSC.
 *
 * output: 'server' con adapter Node.js standalone — necesario para leer el
 * estado del kill switch (research §5) desde el servidor antes de renderizar
 * el wizard. Las páginas puramente estáticas (landing, requisitos, criterios,
 * confirmación) se marcan con `export const prerender = true;` en su .astro
 * para conservar Lighthouse mobile alto y no pagar SSR en cada request.
 *
 * View Transitions: en Astro 5 el flag `experimental.viewTransitions` ya no
 * existe — el componente `<ClientRouter />` (importado de `astro:transitions`
 * desde el BaseLayout) es la API estable. Se materializa en T038.
 *
 * Islas React puntuales: wizard de agendamiento (US1), formulario de consulta
 * (US2), panel administrativo (US3). El resto se sirve como HTML estático.
 */

import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [
    react(),
    tailwind({
      // Los estilos base los inyectamos manualmente vía tokens.css + global.css
      // desde el BaseLayout — así los tokens AAA (T034/T035) llegan antes que
      // la capa base de Tailwind.
      applyBaseStyles: false,
    }),
  ],
  server: {
    port: 4321,
  },
});
