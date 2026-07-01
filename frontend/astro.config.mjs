// Configuración Astro para DonemosSC.
// El sitio es estático por defecto (mejor Lighthouse mobile) con islas React
// puntuales para el wizard de agendamiento (US1), consulta (US2) y panel admin (US3).
// View Transitions se activa en cada layout con <ViewTransitions />; aquí solo
// dejamos habilitados los integrations.

import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'static',
  integrations: [
    react(),
    tailwind({
      // El @import de Tailwind lo controlamos manualmente en src/styles/global.css
      // para poder inyectar la paleta AAA y los tokens del Principio III.
      applyBaseStyles: false,
    }),
  ],
  server: {
    port: 4321,
  },
});
