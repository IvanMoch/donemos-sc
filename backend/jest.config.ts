/**
 * Configuración Jest del backend DonemosSC — tres proyectos (Principio V, TDD):
 *
 *  - unit:        specs junto al código (src/**\/*.spec.ts), sin I/O externo.
 *  - contract:    tests de contrato por endpoint (test/contract), Supertest
 *                 contra la app Nest real.
 *  - integration: tests contra Postgres real vía @testcontainers/postgresql
 *                 (research §11) — cada suite levanta su contenedor con el
 *                 helper de test/utils/postgres-container.ts. Se ejecutan con
 *                 --runInBand (script test:integration) para no competir por
 *                 recursos de Docker.
 */
import type { Config } from 'jest';

// Base común: ts-jest con el tsconfig del backend (decoradores + strict) y
// resolución del paquete compartido como fuente TS directa.
const proyectoBase = {
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@donemos/shared$': '<rootDir>/../packages/shared/src/index.ts',
    '^@donemos/shared/(.*)$': '<rootDir>/../packages/shared/src/$1',
  },
} satisfies Partial<Config>;

const config: Config = {
  projects: [
    {
      ...proyectoBase,
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
    },
    {
      ...proyectoBase,
      displayName: 'contract',
      testMatch: ['<rootDir>/test/contract/**/*.spec.ts'],
      // Los contract tests arrancan la app real contra Postgres efímero: el
      // setup amplía el timeout como en integration.
      setupFilesAfterEnv: ['<rootDir>/test/contract/jest.setup.ts'],
    },
    {
      ...proyectoBase,
      displayName: 'integration',
      testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
      // El timeout amplio (arrancar Postgres efímero tarda) lo fija el setup
      // con jest.setTimeout — testTimeout no es opción válida por-proyecto.
      setupFilesAfterEnv: ['<rootDir>/test/integration/jest.setup.ts'],
    },
  ],
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts'],
};

export default config;
