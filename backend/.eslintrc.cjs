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
  },
  ignorePatterns: ['dist/', 'node_modules/', 'coverage/'],
};
