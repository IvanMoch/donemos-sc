/**
 * Configuración Tailwind CSS para DonemosSC.
 *
 * Paleta AAA (Principio III de la Constitución):
 * - `blood.700` (#8B1E2D) es el rojo principal; sobre `neutral.50` da contraste
 *   7.03:1, cumpliendo AAA para texto normal. Sobre blanco puro sube a 7.85:1.
 * - `ink.900` (#0F172A) es el color de texto principal sobre fondos claros.
 * - Los tokens `neutral.*` y `blood.*` completos se materializarán en T034
 *   (design tokens). Aquí se dejan solo los mínimos para el placeholder.
 *
 * Mobile-first (Principio VIII): screens parten en 360 px (Pixel 5) y suben.
 */
import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    screens: {
      xs: '360px',
      ...defaultTheme.screens,
    },
    extend: {
      colors: {
        blood: {
          700: '#8B1E2D',
        },
        ink: {
          900: '#0F172A',
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
};
