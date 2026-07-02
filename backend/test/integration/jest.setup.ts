/**
 * Setup del proyecto Jest `integration`.
 *
 * Cada suite de integración levanta su propio Postgres efímero en beforeAll
 * usando startPostgresContainer() de test/utils/postgres-container.ts y lo
 * detiene en afterAll (research §11: un contenedor por suite, sin mocks).
 * Aquí solo fijamos el timeout global: el pull + arranque de la imagen
 * postgres:16 puede superar con holgura los 5 s por defecto de Jest.
 */
jest.setTimeout(120_000);
