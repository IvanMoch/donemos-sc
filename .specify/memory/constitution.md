<!--
SYNC IMPACT REPORT
==================
Version change: (uninitialized template) → 1.0.0
Rationale: Initial ratification of the DonemosSC constitution. All placeholders
resolved from user-supplied rules; no prior semantic version existed.

Modified principles: N/A (initial adoption)
Added principles:
  - I. API Propia y Única
  - II. Monolito Cohesivo (Backend + Frontend)
  - III. Accesibilidad WCAG AAA (NO-NEGOCIABLE)
  - IV. Diseño SOLID
  - V. Test-Driven Development (NO-NEGOCIABLE)
  - VI. Flujo Git Flow
  - VII. Código Comentado para Visibilidad
  - VIII. Mobile-First

Added sections:
  - Restricciones Técnicas y de Calidad
  - Flujo de Desarrollo y Puertas de Calidad
  - Governance

Removed sections: none

Templates requiring updates:
  - ✅ .specify/templates/plan-template.md — Constitution Check gate is
       principle-agnostic; no textual change required, but reviewers MUST
       validate each of the 8 principles at that gate.
  - ✅ .specify/templates/spec-template.md — Success Criteria section already
       accommodates accessibility and mobile-first outcomes; no textual change
       required.
  - ✅ .specify/templates/tasks-template.md — Test-first ordering already
       matches Principle V; reviewers MUST NOT mark tests as OPTIONAL for
       DonemosSC despite the template's generic wording.
  - ⚠ No README.md o docs/quickstart.md existen todavía; deberán reflejar
       estos principios cuando se creen.

Follow-up TODOs: none.
-->

# DonemosSC Constitution

## Core Principles

### I. API Propia y Única

El sistema DonemosSC MUST consumir exclusivamente la API que este mismo proyecto
expone. El frontend y cualquier cliente interno NO PUEDEN depender de APIs de
terceros para la lógica de negocio propia. Cualquier dato o funcionalidad
externa (por ejemplo, un proveedor de pagos o un servicio de mapas) MUST ser
encapsulada detrás de un endpoint de la API interna, de modo que el frontend
solo conozca los contratos definidos en el backend de este repositorio.

**Rationale**: Garantiza soberanía sobre el contrato de datos, elimina
acoplamientos ocultos a servicios externos y facilita versionar cambios sin
romper clientes.

### II. Monolito Cohesivo (Backend + Frontend)

El repositorio MUST mantener backend y frontend en un único monolito de
código (mono-repo). Ambos comparten historia de commits, pipeline de CI y
convenciones de versionado. Está PROHIBIDO extraer el frontend o el backend a
un repositorio separado sin una enmienda formal de esta constitución.

**Rationale**: Simplifica los cambios que atraviesan capas (por ejemplo, un
cambio de contrato + su consumo), reduce la sobrecarga de coordinación y
mantiene una única fuente de verdad para tipos y esquemas compartidos.

### III. Accesibilidad WCAG AAA (NO-NEGOCIABLE)

Todo componente de UI, plantilla, correo electrónico transaccional o
documento generado MUST cumplir con las pautas WCAG 2.1 nivel AAA. Esto
incluye, sin limitarse a: contraste mínimo 7:1 para texto normal y 4.5:1 para
texto grande, navegación completa por teclado, roles y nombres accesibles
(ARIA), soporte para lector de pantalla, texto alternativo significativo,
gestión de foco visible y respeto por `prefers-reduced-motion`. Cada PR que
toque UI MUST incluir evidencia de auditoría automatizada (axe-core u
equivalente) y una verificación manual documentada del criterio afectado.

**Rationale**: El proyecto atiende a donantes y beneficiarios en San
Cristóbal; excluir a personas con discapacidad visual, motora o cognitiva
contradice la misión. Fijar AAA (no AA) obliga a diseñar con accesibilidad
desde el primer boceto.

### IV. Diseño SOLID

Todo módulo del backend y del frontend MUST respetar los cinco principios
SOLID:

- **S**ingle Responsibility: cada clase, módulo o componente tiene una única
  razón de cambio.
- **O**pen/Closed: extender el comportamiento MUST hacerse por composición o
  polimorfismo, no editando el punto de extensión existente.
- **L**iskov Substitution: subtipos MUST ser sustituibles por sus tipos base
  sin romper invariantes.
- **I**nterface Segregation: las interfaces expuestas MUST ser específicas por
  consumidor; se prohíben interfaces "todo-uno".
- **D**ependency Inversion: los módulos de alto nivel dependen de
  abstracciones, no de implementaciones concretas; la inyección de
  dependencias es obligatoria para servicios con IO (red, disco, base de
  datos).

Las revisiones de código MUST rechazar cambios que violen SOLID sin
justificación registrada en `Complexity Tracking` del plan.

**Rationale**: SOLID mantiene el monolito modular y evita que crezca como una
bola de barro, protegiendo la velocidad de entrega a mediano plazo.

### V. Test-Driven Development (NO-NEGOCIABLE)

El ciclo Red-Green-Refactor MUST aplicarse a toda funcionalidad nueva y a
todo bugfix. Ningún cambio de comportamiento puede entrar a `develop` sin que
exista al menos un test que:

1. Se escribió ANTES del código de producción.
2. Falló en un commit previo (evidencia: log de CI o referencia a commit en el
   PR).
3. Pasa con la implementación mínima que lo satisface.

Cobertura por sí sola NO ES criterio suficiente; el orden temporal (test
antes que implementación) es el que se audita. Excepciones (por ejemplo,
spikes exploratorios) MUST descartarse o reescribirse bajo TDD antes de
mergear a `develop`.

**Rationale**: TDD fuerza diseños testables (refuerza SOLID), reduce
regresiones y produce especificaciones ejecutables que documentan la
intención.

### VI. Flujo Git Flow

El proyecto MUST usar Git Flow con las siguientes ramas fijas:

- `main` — releases en producción; commits solo por merge de `release/*` o
  `hotfix/*`.
- `develop` — integración continua; commits solo por merge de `feature/*`,
  `release/*` o `hotfix/*`.
- `feature/<slug>` — trabajo de una feature; parte de `develop`, mergea a
  `develop`.
- `release/<x.y.z>` — estabilización previa a release; parte de `develop`,
  mergea a `main` y `develop`.
- `hotfix/<x.y.z>` — corrección urgente en producción; parte de `main`,
  mergea a `main` y `develop`.

Cada merge a `main` MUST etiquetarse con la versión semántica correspondiente.
Los PRs directos a `main` desde ramas que no sean `release/*` o `hotfix/*`
MUST ser rechazados por CI.

**Rationale**: Aísla el trabajo en curso de lo desplegado, hace explícita la
promoción por entornos y da un canal claro para hotfixes.

### VII. Código Comentado para Visibilidad

El código MUST incluir comentarios que expliquen el **porqué** de decisiones
no obvias: invariantes de dominio, restricciones legales (por ejemplo, ley de
donaciones), workarounds a bugs de librerías, o pasos de un algoritmo que no
se leen del nombre. Cada archivo público (endpoint, servicio, componente
principal) MUST abrir con un comentario de una a tres líneas que declare su
responsabilidad. Está PROHIBIDO comentar el **qué** cuando el nombre del
identificador ya lo dice (por ejemplo, `// suma a y b`). Los comentarios MUST
estar en español, siguiendo el idioma del dominio.

**Rationale**: El equipo incluye colaboradores no permanentes (voluntarios,
pasantes); comentar el porqué acelera el onboarding y previene decisiones
regresivas motivadas por olvido del contexto original.

### VIII. Mobile-First

Todo diseño, wireframe, componente y hoja de estilos MUST resolverse primero
para viewport móvil (ancho de referencia 360px) y solo después extenderse a
tablet y desktop mediante `min-width` media queries. Se prohíbe el patrón
inverso (desktop-first con overrides para móvil). Los objetivos de
performance MUST medirse en un perfil de red 3G lenta y CPU de gama media
(equivalente a Moto G4 en Lighthouse). Las interacciones MUST ser usables con
una sola mano y con áreas táctiles ≥ 44×44px.

**Rationale**: La telemetría prevista indica que la mayoría del tráfico será
móvil; diseñar mobile-first evita la deuda técnica típica de "adaptar
después" y protege a usuarios en dispositivos y redes modestas.

## Restricciones Técnicas y de Calidad

- **Contratos**: El contrato de la API interna (Principio I) MUST publicarse
  como esquema (OpenAPI o equivalente) versionado en el repositorio. Cambios
  de contrato requieren bump de versión de la API y actualización simultánea
  de frontend + backend en el mismo PR (permitido por el monolito, Principio
  II).
- **Herramientas de accesibilidad**: axe-core (o Pa11y) MUST correr en CI
  sobre las páginas principales; fallos de nivel AAA rompen el build.
- **Pruebas**: además de tests unitarios (Principio V), MUST existir tests de
  integración que ejerciten el contrato API real (sin mocks del backend
  propio) para todo endpoint público del frontend.
- **Rendimiento móvil**: Lighthouse Performance ≥ 90 en perfil móvil para las
  vistas críticas (donación, registro, listado de campañas). Regresiones
  bloquean el merge.
- **Comentarios y documentación**: cambios que introduzcan lógica de dominio
  nueva MUST actualizar el comentario de cabecera del archivo afectado
  (Principio VII).

## Flujo de Desarrollo y Puertas de Calidad

- **Puerta 1 — Especificación**: `/speckit-specify` produce `spec.md`. La
  spec MUST enumerar criterios de accesibilidad (AAA) y mobile-first
  aplicables.
- **Puerta 2 — Plan**: `/speckit-plan` produce `plan.md`. El bloque
  *Constitution Check* MUST validar los ocho principios explícitamente; toda
  violación va a *Complexity Tracking* con justificación.
- **Puerta 3 — Tareas**: `/speckit-tasks` produce `tasks.md`. Los tests
  (Principio V) son OBLIGATORIOS en DonemosSC pese al lenguaje "OPTIONAL" del
  template genérico; deben aparecer antes de las tareas de implementación de
  cada historia.
- **Puerta 4 — Implementación**: se hace en `feature/*` (Principio VI). El PR
  MUST demostrar: (a) tests que fallaron antes, (b) auditoría de
  accesibilidad, (c) capturas o video de la vista móvil, (d) esquema de API
  actualizado si aplica.
- **Puerta 5 — Release**: `release/*` estabiliza; el merge a `main` etiqueta
  la versión y dispara el despliegue.

## Governance

Esta constitución supersede cualquier otra guía, convención de estilo o
acuerdo verbal. Toda enmienda MUST:

1. Proponerse como PR contra `.specify/memory/constitution.md`.
2. Incluir el *Sync Impact Report* actualizado en el encabezado del archivo.
3. Bumpar `CONSTITUTION_VERSION` según SemVer:
   - **MAJOR**: se elimina o redefine un principio de forma incompatible.
   - **MINOR**: se añade un principio o se amplía materialmente una sección.
   - **PATCH**: aclaraciones, redacción o correcciones no semánticas.
4. Ser aprobada por el/la mantenedor(a) principal del proyecto.
5. Actualizar los templates dependientes en el mismo PR cuando cambien reglas
   que ellos referencian.

Toda revisión de PR MUST verificar el cumplimiento de los ocho principios.
Cuando un cambio no pueda cumplirlos, se documenta la excepción en
*Complexity Tracking* del plan; excepciones a los principios marcados como
NO-NEGOCIABLE (III y V) requieren aprobación explícita del/la mantenedor(a)
principal.

**Version**: 1.0.0 | **Ratified**: 2026-07-01 | **Last Amended**: 2026-07-01
