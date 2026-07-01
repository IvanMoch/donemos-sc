# <!-- Título breve del PR (feat/fix/test/docs/chore): descripción corta -->

## Resumen

<!-- 1-3 líneas que explican qué hace este PR y por qué -->

## T-IDs cerrados

<!-- Enlaza los IDs de tasks.md que este PR completa. Ejemplo: T068, T069, T070. Marca los checkboxes en tasks.md dentro del mismo PR. -->

- Closes #<issue-id>

## Cambios principales

<!-- Bullet points de qué archivos/módulos tocó -->

-

## Checklist obligatorio (Constitución + tasks.md)

- [ ] **TDD (Principio V, NO-NEGOCIABLE)**: Existe al menos un commit con un test rojo previo al commit de implementación. Enlace o hash: `<hash>`
- [ ] **CI en verde**: lint + tests backend + tests frontend + axe-core AAA + Lighthouse mobile
- [ ] **Accesibilidad WCAG AAA (Principio III, NO-NEGOCIABLE)**: contrastes ≥ 7:1, navegación por teclado, `prefers-reduced-motion` respetado. Reporte adjunto si toca UI.
- [ ] **Mobile-first (Principio VIII)**: capturas en 360×800 de cada pantalla nueva/modificada
- [ ] **Comentarios en español (Principio VII)**: cabecera de responsabilidad en archivos públicos + porqué en decisiones no obvias
- [ ] **Contratos OpenAPI actualizados** si cambió el shape público o admin (`contracts/public-api.openapi.yaml`, `contracts/admin-api.openapi.yaml`)
- [ ] **Sin PII en logs ni URLs** (FR-027 de la spec)
- [ ] **T-IDs marcados** como completados en `tasks.md`
- [ ] **Revisado por el otro colaborador** (1 aprobación)

## Capturas / evidencia

<!-- Móvil (360×800) obligatorio si toca UI. Reporte axe si aplica. PDF de ejemplo si es T127. -->

## Notas para el revisor

<!-- Cualquier contexto útil para revisar: decisiones no obvias, alternativas descartadas, dudas -->

## Excepción a la Constitución

<!-- Solo si aplica. Referenciar la sección de Complexity Tracking del plan.md que documenta la violación. -->
