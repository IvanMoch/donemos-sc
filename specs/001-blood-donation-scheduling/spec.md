# Feature Specification: Agendamiento de Citas para Donación de Sangre

**Feature Branch**: `001-blood-donation-scheduling`

**Created**: 2026-07-01

**Status**: Draft

**Input**: User description: "Sitio para el Banco de Sangre de San Cristóbal donde donantes puedan (1) informarse de requisitos y criterios de exclusión y (2) agendar una cita en un horario disponible, con un flujo lo más corto posible. Reemplaza el sistema actual por orden de llegada, que genera colas y donantes que se van sin donar."

## Contexto Operativo del Cliente

**Institución**: Hospital Central de San Cristóbal (Estado Táchira, Venezuela).

**Ubicación**: https://maps.app.goo.gl/Qu1wBKkyzh4RThGi6

**Horario de atención para donación**: lunes a viernes, de 7:00 a 12:00 hora local (America/Caracas). No se atiende sábados, domingos ni feriados.

**Duración de la sesión de donación**: 35 minutos por donante (base para el diseño de franjas horarias).

**Contacto público**: no se dispone de teléfono/WhatsApp/email institucional para publicar en el sitio; toda comunicación con el donante se limita a la propia página.

**Documento obligatorio en la cita presencial**: cédula de identidad vigente. El donante MUST presentarla al llegar; sin ella el banco lo rechaza.

## Contenido Informativo (fuente autoritativa)

Estos textos son la copia oficial que el sitio debe mostrar en la landing pública (base para FR-001 y FR-002). Cualquier ajuste posterior debe pasar por el banco de sangre.

### Requisitos para donar

- **Cédula de identidad vigente** (obligatoria; debe presentarse el día de la cita).
- **Edad**: entre 18 y 60 años.
- **Peso**: mínimo 50 kg.
- **Salud general**: sentirse bien, sin gripe ni fiebre.
- **Alimentación**: venir **bien desayunado**. No presentarse en ayunas.
- **Descanso**: haber dormido bien la noche anterior.

### ¿Puedo donar si…? (Consideraciones y criterios de exclusión)

- **Tatuajes y piercings**: sí puedes donar, siempre que haya pasado al menos **1 año** desde el último.
- **Alcohol**: evitar consumo **48 a 72 horas antes** de la donación.
- **Salud crónica (excluyente)**: NO es posible donar si has tenido hepatitis B o C, VIH, sífilis o problemas cardíacos graves.
- **Medicamentos**: si estás bajo tratamiento, MUST informarlo en la entrevista médica presencial.
- **Sección especial (consultar tiempos de espera con el personal)**: si acabas de pasar una infección, te vacunaste recientemente o ya donaste hace poco, MUST consultar los tiempos de espera con el personal del banco.

## Clarifications

### Session 2026-07-01

- Q: ¿El sistema debe enviar la confirmación de la cita por SMS o correo electrónico, o basta con la pantalla + comprobante descargable? → A: Solo pantalla + comprobante descargable. Sin envío por canales externos (SMS/email). Todo el flujo permanece dentro del sitio.
- Q: ¿Cómo se determinan los horarios visibles al donante? → A: El sistema mantiene el listado de citas vigentes por fecha en la base de datos del backend propio; al donante se le muestran únicamente los horarios cuyo cupo no ha sido ocupado por otro donante con anterioridad.
- Q: ¿Qué alcance tiene el panel administrativo en el MVP? → A: Listado de citas del día actual + descarga en **PDF** + filtro por intervalo de fechas elegido por el administrador + **kill switch global** para desactivar el flujo público de agendamiento. No incluye métricas, edición de contenido informativo ni gestión multi-usuario en el MVP.
- Q: ¿Cómo se verifica la elegibilidad médica del donante antes de confirmar la cita? → A: Un checkbox único de auto-declaración obligatorio en el formulario de agendamiento: el donante declara cumplir los requisitos y no aplicar a ningún criterio de exclusión. Sin checkbox marcado no se puede confirmar. La verificación clínica sigue siendo presencial en el banco.
- Q: Con el kill switch activo, ¿qué puede hacer el donante en "Consultar mi cita"? → A: Puede ver y cancelar su cita; NO puede reagendar. Cancelar libera el cupo aunque el flujo público esté pausado (útil si el banco reactiva más tarde). Reagendar queda bloqueado porque requiere el catálogo público de horarios, que está inhabilitado.
- Q: ¿Qué pasa con las citas ya confirmadas cuando el admin deshabilita su franja horaria? → A: Se cancelan automáticamente con estado "cancelada por el banco". El donante ve el nuevo estado (y la razón) al consultar con su cédula + código. Los cupos quedan liberados sin intervención manual del admin.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Agendar cita en menos de 90 segundos (Priority: P1)

Una persona interesada en donar sangre entra al sitio desde su teléfono, revisa
en la misma pantalla los requisitos y criterios de exclusión, elige uno de los
horarios disponibles mostrados, ingresa su nombre, apellido y número de
cédula, y recibe una confirmación con un código de cita — todo en menos de un
minuto y medio, sin crear cuenta ni iniciar sesión.

**Why this priority**: Este es el núcleo del producto y por sí solo entrega el
valor completo: sustituye la cola por orden de llegada por citas
pre-agendadas. Sin este flujo no hay MVP. Todos los demás flujos son
opcionales o complementarios.

**Independent Test**: Se puede probar de extremo a extremo con un único
donante ficticio y un conjunto seed de horarios disponibles: acceder al
sitio, leer requisitos, agendar, verificar código de confirmación en pantalla
y ver la capacidad del horario decrementarse.

**Acceptance Scenarios**:

1. **Given** el donante entra al sitio en un móvil de gama media con red 3G,
   **When** navega la landing y toca "Agendar cita", **Then** ve al menos los
   próximos 5 horarios con cupo disponible ordenados por fecha/hora.
2. **Given** el donante seleccionó un horario y llenó nombre, apellido y
   cédula con formato válido (V- o E- seguido de 6 a 8 dígitos) y marcó
   el checkbox de auto-declaración de elegibilidad, **When** confirma,
   **Then** el sistema le muestra una pantalla de éxito con: fecha, hora,
   dirección del banco, código único de cita y opción de guardar/imprimir
   el comprobante.
2a. **Given** el donante llenó todos los campos pero NO marcó el checkbox
    de auto-declaración, **When** intenta confirmar, **Then** el botón
    permanece deshabilitado y un texto de ayuda indica que debe declarar
    su elegibilidad para continuar.
3. **Given** los requisitos y criterios de exclusión están publicados,
   **When** el donante abre la landing, **Then** puede verlos completos sin
   scroll horizontal, con contraste 7:1 mínimo y navegación por teclado.
4. **Given** la cédula ingresada ya tiene una cita activa, **When** intenta
   agendar de nuevo, **Then** el sistema le informa que ya existe una cita y
   le ofrece consultarla o cancelarla en vez de crear una duplicada.
5. **Given** un horario tiene exactamente 1 cupo disponible, **When** dos
   donantes intentan confirmarlo simultáneamente, **Then** solo uno recibe
   confirmación y el otro ve un mensaje claro pidiéndole elegir otro
   horario, sin perder los datos ya ingresados.

---

### User Story 2 - Consultar, cancelar o reagendar mi cita (Priority: P2)

Un donante que ya agendó una cita puede volver al sitio, ingresar su cédula y
el código de confirmación, y ver el detalle de su cita con opción de
cancelarla o cambiarla a otro horario disponible.

**Why this priority**: Sin este flujo, un donante que no puede asistir se
convierte en un no-show y bloquea un cupo. Sí es crítico para eficiencia,
pero el sistema funciona (con no-shows aceptables) sin él, por eso P2.

**Independent Test**: Con una cita ya creada, verificar que al ingresar
cédula + código el donante puede ver la cita, cancelarla (el cupo se libera)
y crear una nueva sin errores.

**Acceptance Scenarios**:

1. **Given** el donante tiene una cita activa, **When** ingresa cédula +
   código correctos, **Then** ve fecha, hora, dirección y estado de la cita.
2. **Given** el donante consulta su cita, **When** toca "Cancelar", **Then**
   la cita queda en estado cancelada y el cupo del horario vuelve a estar
   disponible en tiempo real.
3. **Given** el donante quiere reagendar, **When** toca "Cambiar horario" y
   elige uno nuevo con cupo, **Then** la cita anterior se libera y la nueva
   queda confirmada con el mismo código.
4. **Given** el donante ingresa cédula o código incorrecto, **When** intenta
   consultar, **Then** ve un mensaje genérico que no revela si la cédula
   existe en el sistema (protección de datos personales).

---

### User Story 3 - Panel administrativo del banco de sangre (Priority: P3)

El personal autorizado del banco de sangre inicia sesión en un panel privado
donde puede: crear/editar/deshabilitar franjas horarias con su capacidad,
ver la lista de citas del día actual, descargar esa lista en PDF (por día o
por intervalo de fechas), y activar/desactivar el **kill switch global**
que cierra el flujo público de agendamiento cuando el banco necesita pausar
las citas.

**Why this priority**: Es un habilitador operativo. Sin panel, alguien tiene
que configurar horarios y ver citas por otro medio (base de datos, hoja de
cálculo). Es indispensable pero puede entregarse después del flujo público
si en el corto plazo el equipo técnico carga horarios manualmente.

**Independent Test**: Un usuario administrador puede autenticarse, crear una
franja horaria con capacidad 10 para mañana a las 9:00, publicarla, y luego
un donante (US1) puede verla y agendar en ella; el admin ve la nueva cita
listada.

**Acceptance Scenarios**:

1. **Given** un usuario administrador autenticado, **When** crea una franja
   con fecha, hora inicio, hora fin y capacidad, **Then** la franja aparece
   inmediatamente en la lista pública de horarios disponibles.
2. **Given** una franja tiene citas agendadas, **When** el admin intenta
   deshabilitarla, **Then** el sistema muestra la cantidad de citas
   afectadas y requiere confirmación explícita antes de proceder.
3. **Given** el admin abre la vista del día, **When** filtra por fecha,
   **Then** ve la lista ordenada por hora con nombre, cédula y estado de
   cada donante.
4. **Given** el admin necesita la lista para el día, **When** toca
   "Descargar PDF" con alcance "hoy", **Then** obtiene un archivo PDF con
   las columnas: hora, nombre, apellido, cédula, código de cita, estado.
5. **Given** el admin necesita el histórico de una semana, **When** elige
   un intervalo de fechas (inicio y fin) y toca "Descargar PDF", **Then**
   obtiene un archivo PDF con las citas de todo el intervalo agrupadas por
   día.
6. **Given** el banco necesita pausar temporalmente las citas, **When** el
   admin activa el kill switch, **Then** el flujo público muestra un
   mensaje "Agendamiento temporalmente cerrado" y bloquea toda nueva cita;
   las citas ya confirmadas siguen visibles en modo consulta.
7. **Given** el kill switch está activo, **When** el admin lo desactiva,
   **Then** el flujo público retoma su funcionamiento normal sin
   necesidad de otras acciones.

---

### Edge Cases

- **Concurrencia sobre el último cupo**: dos donantes confirman el mismo slot
  con capacidad 1 casi simultáneamente. Uno gana, el otro recibe mensaje
  claro y sus datos siguen en el formulario para reintentar.
- **Cédula con formato válido pero inexistente**: el sistema no valida
  contra un registro externo; acepta el formato y la responsabilidad
  presencial es del banco.
- **Cita en el pasado**: si la hora de la cita ya pasó, el sistema la marca
  automáticamente como "no atendida" y libera cualquier bloqueo asociado.
- **Admin deshabilita franja con citas activas**: al confirmar, esas citas
  se cancelan automáticamente con estado "cancelada por el banco"; el
  donante afectado ve el nuevo estado y la razón al consultar con su
  cédula + código. Los cupos quedan liberados (aunque la franja también
  quede deshabilitada).
- **Ventana de agendamiento**: solo se muestran horarios entre hoy y 30
  días adelante.
- **Conexión perdida durante confirmación**: si el usuario no ve la pantalla
  de éxito, al reintentar con los mismos datos el sistema detecta la cita ya
  creada por su cédula y le muestra el código en vez de duplicarla.
- **Cédula ya usada para cita pasada (atendida)**: se permite crear una
  nueva cita futura sin bloqueo (no aplica el "1 activa" a citas ya
  completadas).
- **Uso de datos ajenos**: el sistema no puede prevenirlo de forma técnica;
  la verificación de identidad se hace presencialmente en el banco.

## Requirements *(mandatory)*

### Functional Requirements

**Contenido informativo (US1)**

- **FR-001**: El sitio MUST mostrar en la landing pública los requisitos
  para donar sangre listados en la sección "Contenido Informativo >
  Requisitos para donar" de esta especificación, sin necesidad de
  autenticación. Los seis puntos (cédula, edad, peso, salud, alimentación,
  descanso) MUST ser visibles en un solo bloque legible en móvil.
- **FR-002**: El sitio MUST mostrar los criterios de exclusión y
  consideraciones listados en la sección "Contenido Informativo > ¿Puedo
  donar si…?" (tatuajes/piercings, alcohol, salud crónica, medicamentos,
  sección especial), diferenciando visualmente los criterios excluyentes
  duros (salud crónica) de los condicionales (ventanas de espera).
- **FR-002a**: El sitio MUST recordar de forma prominente que la donación
  se realiza en el **Hospital Central de San Cristóbal** (Táchira) y
  proveer un enlace al mapa de la ubicación
  (https://maps.app.goo.gl/Qu1wBKkyzh4RThGi6).
- **FR-002b**: El sitio MUST informar el horario oficial de atención para
  donación: **lunes a viernes, 7:00 a 12:00** hora de Caracas.
- **FR-003**: El contenido informativo (FR-001 y FR-002) MUST ser
  mantenible por el equipo técnico sin cambios de esquema (por ejemplo,
  archivo de texto/JSON versionado en el repositorio). El panel
  administrativo NO edita este contenido en el MVP (FR-023a).

**Flujo de agendamiento (US1)**

- **FR-004**: El sistema MUST mostrar los horarios disponibles (con cupo >
  0, no deshabilitados, en la ventana de hoy + 30 días) sin requerir
  autenticación.
- **FR-005**: El donante MUST poder agendar ingresando únicamente: nombre,
  apellido y número de cédula, más la selección de un horario. No se
  solicita ningún otro dato en el MVP.
- **FR-006**: El sistema MUST validar el formato del número de cédula
  venezolano (prefijo `V` o `E`, guion opcional, 6 a 8 dígitos).
- **FR-007**: El sistema MUST rechazar una nueva cita cuando ya exista una
  cita en estado "activa" para la misma cédula, y ofrecer un enlace a la
  vista de "Consultar mi cita" (US2).
- **FR-008**: El sistema MUST reservar el cupo en el horario elegido de
  forma atómica: no puede otorgar más citas que la capacidad configurada.
- **FR-009**: Al confirmar, el sistema MUST generar un código de cita único
  y mostrarlo al donante en una pantalla de éxito junto con: fecha, hora,
  nombre y ubicación del hospital (Hospital Central de San Cristóbal,
  Táchira) con enlace al mapa, y un recordatorio explícito de traer la
  **cédula de identidad vigente** y de venir **bien desayunado**.
- **FR-010**: El sistema MUST permitir al donante guardar el comprobante
  (imprimir o descargar) sin depender de servicios externos.
- **FR-011**: El sistema MUST mantener toda la confirmación dentro del
  sitio. NO se envía SMS ni correo electrónico ni ninguna otra notificación
  por canal externo. El único artefacto post-agendamiento es el comprobante
  descargable/imprimible en pantalla (FR-010).

**Elegibilidad**

- **FR-012**: El formulario de agendamiento MUST incluir un checkbox
  obligatorio de auto-declaración con el texto: "Declaro cumplir con los
  requisitos para donar sangre y no aplicar en ninguno de los criterios
  de exclusión listados en esta página". El botón "Confirmar cita" MUST
  permanecer deshabilitado hasta que el checkbox esté marcado.
- **FR-012a**: El sistema MUST registrar (persistir junto a la cita) el
  timestamp exacto en que el donante marcó el checkbox y confirmó la
  cita, como evidencia de la auto-declaración.
- **FR-012b**: La auto-declaración NO reemplaza la verificación clínica
  presencial en el banco; el banco conserva la potestad de rechazar al
  donante en sitio si no cumple los requisitos reales.

**Gestión de la cita por el donante (US2)**

- **FR-013**: El donante MUST poder consultar su cita ingresando cédula +
  código de cita en un formulario público.
- **FR-014**: El donante MUST poder cancelar su cita desde la vista de
  consulta; la cancelación libera el cupo del horario de forma inmediata.
- **FR-015**: El donante MUST poder reagendar cambiando su cita a otro
  horario con cupo disponible; el código de cita se conserva.
- **FR-016**: El sistema MUST responder con un mensaje genérico cuando la
  combinación cédula + código no exista, sin revelar cuál de los dos es
  incorrecto.

**Panel administrativo (US3)**

- **FR-017**: El personal del banco de sangre MUST poder autenticarse en un
  panel privado separado de la interfaz pública.
- **FR-018**: El administrador MUST poder crear franjas horarias
  especificando fecha, hora de inicio, hora de fin y capacidad máxima. La
  duración estándar de una sesión de donación es **35 minutos**; el
  sistema MUST sugerir esa duración como default al crear una franja pero
  permitir personalizarla.
- **FR-018a**: El sistema MUST impedir la creación de franjas fuera del
  horario de atención institucional (lunes a viernes, 7:00 a 12:00), a
  menos que el administrador confirme explícitamente una excepción
  (por ejemplo, jornada extraordinaria). Las excepciones MUST quedar
  registradas.
- **FR-019**: El administrador MUST poder editar la capacidad y horas de
  una franja mientras no existan citas confirmadas incompatibles con el
  cambio.
- **FR-020**: El administrador MUST poder deshabilitar una franja. Si la
  franja tiene citas activas, el sistema MUST: (a) mostrar la cantidad
  exacta de citas afectadas, (b) exigir confirmación explícita, y (c)
  al confirmar, cancelar automáticamente esas citas cambiando su estado
  a "cancelada por el banco" y registrar la acción con timestamp y
  usuario administrador responsable.
- **FR-021**: El administrador MUST poder ver la lista de citas por día,
  ordenada por hora, con nombre, apellido, cédula, código, estado.
- **FR-022**: El administrador MUST poder descargar la lista de citas en
  **PDF**, eligiendo el alcance temporal: (a) el día actual como default,
  o (b) un intervalo de fechas personalizado (fecha inicio + fecha fin).
- **FR-023**: El panel MUST incluir un **kill switch** global que, al
  activarse, deshabilita completamente el flujo público de agendamiento:
  la interfaz pública informa que el agendamiento está temporalmente
  cerrado y no acepta nuevas citas. Las citas ya confirmadas NO se
  cancelan por esta acción. El estado del kill switch MUST persistir
  hasta que un administrador lo reactive.
- **FR-023b**: Con el kill switch activo, el donante MUST poder acceder a
  "Consultar mi cita" y realizar dos acciones: (a) ver los detalles de
  su cita, (b) cancelar su cita (lo que libera el cupo). La acción de
  reagendar MUST estar deshabilitada mientras el kill switch esté
  activo, mostrando un mensaje explicativo.
- **FR-023a**: El alcance del panel administrativo en el MVP se limita a:
  gestión de franjas (FR-018 a FR-020), listado de citas del día
  (FR-021), descarga PDF con filtro por intervalo (FR-022) y kill switch
  global (FR-023). **NO** incluye en el MVP: métricas agregadas, edición
  de contenido informativo desde el panel, ni gestión multi-usuario de
  administradores.

**Reglas transversales**

- **FR-024**: Todo el flujo público MUST ser navegable con una sola mano en
  pantalla móvil (áreas táctiles ≥ 44×44px, sin gestos multi-dedo).
- **FR-025**: Todo el flujo MUST cumplir con WCAG 2.1 nivel AAA (Principio
  III de la constitución).
- **FR-026**: El sistema MUST usar la hora local America/Caracas para
  mostrar y validar horarios.
- **FR-027**: El sistema MUST tratar los datos personales (nombre,
  apellido, cédula) como información sensible: no aparecer en URLs, no
  loggearse en texto plano.

### Key Entities

- **Cita**: representa la reserva de un donante en una franja horaria.
  Atributos clave: código único, nombre, apellido, cédula, franja
  asignada, estado (activa / cancelada-por-el-donante / cancelada-por-el-
  banco / atendida / no-asistió), timestamps de creación y última
  modificación, timestamp de auto-declaración de elegibilidad, y (cuando
  aplique) referencia al administrador y razón de la cancelación.
- **Franja Horaria**: representa un intervalo de tiempo en que el banco
  atiende donantes. Atributos: fecha, hora inicio, hora fin, capacidad
  máxima, cupos ocupados (derivable de las citas activas), estado (activa /
  deshabilitada).
- **Administrador**: persona del banco autorizada al panel. Atributos:
  identificador, credenciales, rol.
- **Contenido Informativo**: bloques de texto editables para requisitos y
  criterios de exclusión, con versionado mínimo para auditoría.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 90% de los donantes completa el flujo de agendar desde la
  landing hasta la pantalla de confirmación en menos de 90 segundos.
- **SC-002**: La tasa de abandono en el flujo de agendamiento es menor al
  10% (sesiones que llegan al formulario y no confirman).
- **SC-003**: 100% de las páginas del flujo público cumplen los criterios
  WCAG 2.1 nivel AAA verificados por auditoría automatizada y muestreo
  manual.
- **SC-004**: Las llegadas sin cita al banco caen al menos 70% respecto al
  esquema actual por orden de llegada, medido durante el primer mes.
- **SC-005**: Las salidas sin donar por espera excesiva caen al menos 80%
  respecto a la línea base actual.
- **SC-006**: El sitio sostiene al menos 200 confirmaciones concurrentes en
  la hora pico sin errores visibles al usuario ni cupos sobrevendidos.
- **SC-007**: El 95% de las cargas del sitio en dispositivos móviles en 3G
  lenta muestra contenido interactivo (Time to Interactive) en menos de 5
  segundos.
- **SC-008**: El 100% de los intentos de doble-agendamiento con la misma
  cédula son detectados y redirigidos a la vista de "Consultar mi cita".
- **SC-009**: 0 casos de cupos sobrevendidos por concurrencia (medido con
  registro operativo del banco frente al log del sistema).

## Assumptions

- **Contexto geográfico e institucional**: la aplicación atiende al
  **Hospital Central de San Cristóbal** (Estado Táchira, Venezuela). El
  formato de cédula esperado es el venezolano (V/E + dígitos).
- **Sin cuenta de donante**: el donante no crea cuenta ni inicia sesión; la
  cédula funciona como identificador natural y el par (cédula, código) como
  llave para consultar la cita.
- **Una cita activa por cédula**: se permite una única cita en estado
  "activa" por cédula. Citas pasadas ya atendidas no bloquean crear una
  nueva futura.
- **Ventana de agendamiento**: solo se aceptan citas entre hoy y 30 días
  hacia adelante, filtradas al horario institucional (L–V, 7:00–12:00).
- **Duración de sesión**: 35 minutos por donante como base de diseño de
  franjas; la capacidad simultánea (número de estaciones de donación
  activas en cada franja) la configura el administrador según sus
  recursos del día.
- **Zona horaria**: America/Caracas se usa como referencia única para
  mostrar y validar horarios.
- **Contenido educativo**: los textos autoritativos están en la sección
  "Contenido Informativo" de este mismo spec. Cambios menores se aplican
  editando el archivo fuente del sitio (no requieren esquema de base de
  datos ni edición desde el panel en el MVP).
- **Sin canal de contacto público del banco**: el sitio no publica
  teléfono, WhatsApp ni correo del hospital porque el cliente no dispone
  de uno oficial. Los mensajes públicos (kill switch, error de doble
  cita, etc.) NO deben pedirle al donante que llame o escriba a un canal
  específico; deben limitarse a instrucciones dentro del sitio.
- **Documento presencial**: el donante MUST llevar cédula de identidad
  vigente al banco; el comprobante generado (FR-009) MUST recordarlo de
  forma prominente.
- **Corrección respecto al material gráfico original del banco**: el
  material impreso que provee el banco dice "come algo ligero antes"; el
  cliente aclaró que el texto correcto para el sitio es **"venir bien
  desayunado, no en ayunas"**. Esta versión prevalece.
- **Verificación presencial**: la aplicación no valida la identidad ni la
  elegibilidad médica; ambas se verifican al llegar al banco. La cita solo
  reserva el turno.
- **Notificaciones fuera del sitio**: decidido — no se envían mensajes por
  canales externos (SMS, correo). La confirmación en pantalla + comprobante
  descargable es el único canal (FR-011).
- **Panel administrativo del MVP**: alcance cerrado — franjas, listado del
  día, descarga PDF por día o por intervalo, y kill switch global
  (FR-023a). No incluye métricas, edición de contenido ni multi-usuario en
  el MVP.
- **Autenticación del panel**: se asume autenticación estándar por usuario y
  contraseña para el personal, con roles simples (administrador). No hay
  federación externa en el MVP.
- **Retención de datos personales**: se asume retención mientras la cita
  esté activa y por un periodo posterior definido por el banco para fines
  operativos y estadísticos (a confirmar con el banco en Governance de
  datos, no bloqueante para MVP).
- **Formato de exportación**: PDF con tabla legible en tamaño carta o A4,
  con encabezado del banco de sangre y rango de fechas incluido.
