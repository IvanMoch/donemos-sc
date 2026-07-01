/**
 * Configuración ESLint raíz para el monorepo DonemosSC.
 *
 * Alcance: archivos .ts / .tsx / .js / .astro de backend, frontend y packages/shared.
 * Cada workspace puede extender esta base añadiendo su propia config específica
 * (por ejemplo, reglas React en frontend/.eslintrc.cjs o reglas NestJS en backend/).
 *
 * La regla del Principio VII (comentario de cabecera de responsabilidad en archivos
 * públicos) se declara aquí como recordatorio; se activará como error una vez que
 * las carpetas src/ estén pobladas y podamos calibrar el warning sin ruido masivo
 * en el scaffolding.
 */
module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    '@typescript-eslint/consistent-type-imports': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.astro/',
    '.turbo/',
    'coverage/',
    'playwright-report/',
    'test-results/',
    '**/*.d.ts',
  ],
};
