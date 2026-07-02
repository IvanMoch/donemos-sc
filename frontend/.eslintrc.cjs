/**
 * ESLint específico del workspace frontend. Extiende la config raíz y añade
 * reglas para archivos Astro (parser dedicado) y comportamiento por defecto
 * para tests Vitest/Playwright.
 */
module.exports = {
  root: false,
  extends: ['../.eslintrc.cjs'],
  overrides: [
    {
      files: ['*.astro'],
      parser: 'astro-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.astro'],
      },
      rules: {
        // Astro genera su propio bundle; deshabilitamos reglas que asumen
        // módulos JS puros. Reglas específicas de Astro entran en T033 si aplica.
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
    {
      files: ['test/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
      env: { node: true, browser: true },
    },
  ],
  ignorePatterns: ['dist/', '.astro/', 'playwright-report/', 'test-results/', 'node_modules/'],
};
