/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Extensión de Astro.locals con el perfil admin cargado por el middleware.
// Va aquí (no en middleware.ts) para evitar `namespace` dentro de
// `declare global`, que ESLint rechaza con @typescript-eslint/no-namespace.
declare namespace App {
  interface Locals {
    adminUser?: {
      id: string;
      username: string;
      displayName?: string;
    };
  }
}
