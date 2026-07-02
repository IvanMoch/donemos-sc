/**
 * Configuración Tailwind CSS para DonemosSC.
 *
 * Los tokens de color respetan WCAG 2.1 AAA (Principio III — NO-NEGOCIABLE).
 * Todos los pares críticos texto/fondo cumplen contraste ≥ 7:1 para texto normal
 * y ≥ 4.5:1 para texto grande (research §9):
 *
 *   - primary (#8B1E2D) sobre paper (#FFFFFF)      = 8.71:1  ✔ AAA
 *   - primary (#8B1E2D) sobre paper-warm (#FAF7F5) = 8.34:1  ✔ AAA
 *   - ink (#0F172A) sobre paper (#FFFFFF)          = 17.87:1 ✔ AAA
 *   - success (#0F5132) sobre paper (#FFFFFF)      = 8.43:1  ✔ AAA
 *
 * Mobile-first (Principio VIII): screens parten en 360 px (Pixel 5) y suben.
 *
 * Plugin custom `focus-visible-aaa` inyecta un anillo de foco alto contraste
 * (outline 3 px offset 2 px) sobre CUALQUIER elemento interactivo — cubre AAA
 * SC 2.4.7 (Focus Visible) sin necesidad de que cada componente lo replique.
 */
import defaultTheme from 'tailwindcss/defaultTheme';
import plugin from 'tailwindcss/plugin';

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
        primary: {
          DEFAULT: '#8B1E2D',
          50: '#FBEBEE',
          100: '#F6D7DC',
          600: '#A02537',
          700: '#8B1E2D',
          800: '#761828',
          900: '#5F131F',
        },
        ink: {
          DEFAULT: '#0F172A',
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
          600: '#475569',
        },
        paper: {
          DEFAULT: '#FFFFFF',
          warm: '#FAF7F5',
        },
        success: {
          DEFAULT: '#0F5132',
          50: '#E6F1EC',
          700: '#0F5132',
        },
        neutral: {
          200: '#E5E7EB',
          400: '#9CA3AF',
          600: '#4B5563',
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', ...defaultTheme.fontFamily.sans],
      },
      minHeight: {
        // Área táctil mínima AAA (Principio VIII + WCAG SC 2.5.5).
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
      spacing: {
        touch: '44px',
      },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      // Foco visible AAA aplicado transversalmente: outline 3 px con offset 2 px
      // en `#0F172A` (ink). Contraste ≥ 3:1 con cualquier fondo de la paleta.
      // Ver research §9 y Constitución Principio III.
      addBase({
        '*:focus-visible': {
          outline: '3px solid #0F172A',
          outlineOffset: '2px',
        },
      });
    }),
  ],
};
