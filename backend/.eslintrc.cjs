/**
 * Configuración ESLint del backend NestJS de DonemosSC.
 *
 * Hereda la base del monorepo (.eslintrc.cjs raíz) y ajusta el entorno a Node
 * puro (sin browser). Las reglas específicas de NestJS (decoradores, DI) no
 * necesitan plugin adicional: @typescript-eslint las cubre.
 */
module.exports = {
  env: {
    node: true,
    browser: false,
    jest: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    // El backend loguea exclusivamente vía pino (T027); console queda vetado.
    'no-console': 'error',
    // Desactivada en backend: la inyección de dependencias de NestJS usa el
    // tipo del parámetro del constructor como token en runtime (vía
    // emitDecoratorMetadata). Sin linting con información de tipos, esta regla
    // marca como "solo tipo" los providers inyectados y forzar `import type`
    // rompería la DI. Se prefiere apagarla a habilitar type-aware linting.
    '@typescript-eslint/consistent-type-imports': 'off',
  },
  ignorePatterns: ['dist/', 'node_modules/', 'coverage/', 'prisma/migrations/'],
};
