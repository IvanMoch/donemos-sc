/**
 * Setup del proyecto Jest `contract`.
 *
 * Los contract tests arrancan la app Nest real contra un Postgres efímero
 * (testcontainers): el pull + arranque de la imagen y las migraciones superan
 * con facilidad los 5 s por defecto de Jest, así que se amplía el timeout global.
 */
jest.setTimeout(120_000);
