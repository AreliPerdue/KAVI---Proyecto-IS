# Spec 04 — Calendario (F2) — LA ESTRELLA

## Objetivo
El calendario es la pantalla principal y el hub de toda la app (P1). Desde él se crean, ven, editan, clasifican y comparten actividades, se gestionan reminders y se accede al módulo fitness.

## Historias de usuario
- HU-C1: Yo como persona usuaria, quiero ver mis actividades en vistas mensual, semanal y diaria para entender mi tiempo a distintos niveles.
- HU-C2: Yo como persona usuaria, quiero crear una actividad en pocos toques (título + horario + tema predefinido) para agendar sin fricción.
- HU-C3: Yo como persona usuaria, quiero editar y eliminar actividades (incluyendo "solo esta" o "toda la serie" si es recurrente).
- HU-C4: Yo como persona usuaria, quiero actividades recurrentes (diaria, semanal con días específicos, mensual) para mis rutinas.
- HU-C5: Yo como persona usuaria, quiero agregar reminders a una actividad para recibir una notificación antes de que empiece.
- HU-C6: Yo como persona usuaria, quiero filtrar el calendario por dimensión/tema para ver un área de mi vida.

## Requerimientos funcionales
### Vistas
- RF-C1. Vista **mensual**: grid de 6 semanas × 7 días con indicadores por día; tocar un día abre su lista/vista diaria. Es la **vista por defecto** al abrir el calendario. El grid es **adaptativo** (NFR-8, NFR-9): las 7 columnas y las 6 filas se reparten el espacio disponible, de modo que el mes entra completo en cualquier pantalla sin recortarse; cuántas actividades se listan por día depende del alto real de la celda, con un resumen "+N" con puntos de color para el resto —o, si ni esa fila cabe, el "+N" junto al número del día, para que siempre se lea al menos una actividad (T204)— y, cuando no cabe ni un chip, solo puntos de color. La hora se antepone al título cuando la celda es lo bastante ancha. Fines de semana y días fuera del mes se distinguen del resto. Todo escala con el tamaño de fuente del sistema.
- RF-C2. Vista **semanal**: 7 columnas con bloques horarios posicionados según hora y duración, con color del tema.
- RF-C3. Vista **diaria**: timeline del día con bloques que muestran **solo el título** — la hora ya la da su posición en la rejilla. Ningún bloque baja del alto de una línea de texto, así que una actividad de un minuto sigue siendo legible; los traslapes se calculan con ese alto pintado y no con la duración real, de modo que dos actividades muy cortas y cercanas se reparten en columnas en vez de pisarse. Despliega **las 24 horas** (00:00–23:59) —también cuando el día no tiene ninguna actividad, donde la rejilla es además la forma de crear tocando una hora (RF-C6)— y marca la **hora actual** con una línea y su etiqueta, que se refresca mientras la vista está abierta; al abrir, el scroll se sitúa en la hora actual. Es también el detalle al que se llega desde la mensual.
- RF-C4. Navegación entre fechas (swipe/flechas) y botón "Hoy". Selector de vista persistente: se recuerda la vista **elegida en el menú de vista**; abrir un día desde la mensual navega a la diaria sin cambiar esa preferencia, de modo que el calendario sigue abriendo en mensual (RF-C1).
- RF-C13. Las horas se muestran en **formato de 24 h** (`14:30`, es-MX, NFR-13). Las rejillas diaria y semanal se dibujan en **saltos de 30 minutos**, con la línea de la hora más marcada que la de la media hora.

### Creación y edición
- RF-C5. Botón flotante "+" siempre visible → formulario de actividad: título (requerido), tema (picker de temas predefinidos con icono+color, opcional), fecha, hora inicio/fin (o todo el día), descripción, recurrencia, reminders. Al elegir tema, color/icono/dimensión se auto-asignan; se pueden sobreescribir.
- RF-C6. Crear también desde la vista diaria/semanal tocando un slot vacío (hora pre-llenada, con la precisión de 30 min de la rejilla de RF-C13). El selector de hora del formulario permite cualquier **minuto de 00 a 59**, no solo múltiplos de la rejilla.
- RF-C7. Tocar una actividad → hoja de detalle con acciones: editar, eliminar, compartir, reminders, y **"Registrar entrenamiento"** si `is_gym` (ver `07-fitness.md`).
- RF-C8. Recurrencia: sin repetición / diaria / semanal (elige días) / mensual, con fin opcional (fecha o nunca→horizonte 90 días, ver spec 02). Al editar/eliminar una recurrente, preguntar "¿Solo esta ocurrencia o toda la serie?". Una ocurrencia borrada (o movida de día) **no vuelve**: su día queda excluido en la madre (`recurrence_exdates`, T249) y la base se niega a recrearlo aunque lo intente una versión vieja de la app; para saber qué día local es, la madre guarda la zona horaria de quien armó la serie (`recurrence_tz`, T272).
  - Una ocurrencia borrada con "solo esta" no vuelve a aparecer: su día queda excluido de la serie
    (`recurrence_exdates`, el `EXDATE` de la madre). Lo mismo el día original de una ocurrencia que se
    mueve a otro día. Al completar la serie, un día que ya tiene instancia (aunque con otra hora) no se
    vuelve a generar.

### Reminders (propios)
- RF-C9. Presets: al momento, 10 min, 30 min, 1 h, 1 día antes; múltiples permitidos.
- RF-C10. Se programan como notificaciones locales (Expo Notifications) al crear/editar; se cancelan y reprograman al cambiar horario o eliminar la actividad. En web: fallback a banner in-app al abrir la app si el reminder venció (P5).

### Vistas (RF-C16, RF-C17)
- RF-C16. **Cinco vistas**: día, 3 días, semana, mes y agenda. Las de 3 días y agenda se
  toman de Google Calendar por motivos distintos: la de tres días vuelve usable la rejilla
  de horas en un teléfono, donde repartir 7 columnas en 390 px deja cada bloque ilegible; y
  la agenda hace legible un mes con pocas actividades, donde la rejilla se ve casi vacía y
  hay que recorrerla con la vista para hallar las tres cosas que sí hay. La agenda solo
  pinta los días con algo agendado, y comparte el rango del mes para que "anterior" y
  "siguiente" signifiquen lo mismo en todas las vistas.
- RF-C17. **La barra de vistas se configura.** Cinco no caben legibles en una pastilla, así
  que se muestran las que cada quien fije y el resto vive en su menú, donde se fijan y se
  quitan con un alfiler. El menú nunca desaparece: es lo que garantiza que ninguna vista
  quede inalcanzable por cómo esté configurada la pastilla, y por lo mismo no se puede
  dejar la pastilla sin ninguna vista. En pantallas angostas la pastilla se reduce a un
  botón con el nombre de la vista actual, que abre el mismo menú.

  **Criterio.** *Dado* que "3 días" no está en la pastilla, *cuando* la fijo desde el menú,
  *entonces* aparece en la pastilla en su lugar del orden —día, 3 días, semana, mes,
  agenda— y no al final.

### Filtros y estados
- RF-C11. Filtro por dimensión (chips con las 7) y por tema; combinables; afectan las 5 vistas.
  El filtro alcanza **todo lo que se pinta en el calendario**, incluidas las capas derivadas
  (entrenamientos sueltos de RF-F10 y cumpleaños de RF-A10): cada una lleva su dimensión, y
  dejarlas visibles al filtrar por otra contradice el criterio de aceptación de abajo. Los
  interruptores de Perfil son independientes: deciden si esa capa existe, no si pasa el filtro.
- RF-C18. **Solo pendientes de listas.** Interruptor en la hoja de filtros que esconde las
  actividades y deja en pantalla los pendientes de listas del día. No es un filtro más de la
  misma familia: los de dimensión y tema acotan *qué actividades* se ven, y este decide *si
  se ven actividades*, así que se aplica antes y no dentro de `applyFilters`.
- RF-C12. Estados de carga (skeleton), vacío ("No tienes actividades este día") y error con retry.

## Reglas de negocio
- Actividades pueden traslaparse (sin validación de conflicto en V1; la coordinación se resuelve con disponibilidad en F4).
- `is_gym` se activa automáticamente si el tema seleccionado es "Gimnasio", y puede alternarse manualmente en el formulario.
- Zona horaria: se muestra todo en la zona del dispositivo; se guarda UTC.

## Criterios de aceptación
- Given actividades guardadas, When abro cualquier vista, Then las veo con su color/icono correcto en ≤ 3 s (P9).
- Given el formulario rápido, When escribo solo título y guardo, Then se crea con duración default de 1 h iniciando en la próxima media hora.
- Given una actividad recurrente semanal L-M-V, When la veo en el mes, Then aparecen instancias solo en esos días hasta el horizonte.
- Given que edito "solo esta ocurrencia", When guardo, Then las demás instancias no cambian.
- Given un reminder de 30 min, When llega la hora, Then recibo la notificación local con el título de la actividad (iOS y Android).
- Given filtro por dimensión "física", When lo aplico, Then solo veo actividades de esa dimensión en las 5 vistas.
- Given los entrenamientos visibles en el calendario, When filtro por una dimensión distinta de
  "física", Then dejan de verse, igual que las actividades que no pasan el filtro.

## UI
Ruta principal: `/(app)/calendar` (tab inicial). Header: mes/rango actual, selector de vista, botón filtros. FAB "+". Hoja de detalle como bottom sheet.

- RF-C14. **Visibilidad por actividad.** Al crear una actividad se elige quién ve su
  título, con tres opciones:

  | | Quién ve el título |
  |---|---|
  | **Normal** (por defecto) | Quienes tengan tu calendario «con detalles» |
  | **Algunos** | Solo las personas marcadas, y aun así con «con detalles» |
  | **Privada** | Nadie |

  En los tres casos el hueco **sigue apareciendo ocupado**: se protege el contenido,
  no la disponibilidad.

  La regla que las gobierna es que **solo restringen, nunca amplían**: el nivel dado a
  cada persona sobre el calendario es el techo. Marcar a alguien a quien compartes en
  modo «solo ocupación» no le enseña el título — lo contrario convertiría este ajuste
  en una forma de saltarse lo que decidiste para esa persona, y la interfaz lo avisa
  al marcarla.

  Se aplica en la base de datos y en dos sitios, no en uno: la RPC de disponibilidad
  no entrega el título, **y** la política de lectura no deja leer la fila. Solo con lo
  primero, una petición hecha a mano contra la tabla devolvería el título de una
  actividad privada. Una privada tampoco admite invitados, y un disparador lo rechaza
  además de la interfaz.

  **Criterio.** *Dado* un contacto con visibilidad «con detalles», *cuando* marco una
  actividad como privada, *entonces* esa persona ve el bloque como ocupado y sin
  título, mientras sigue viendo el título del resto de mis actividades.

- RF-C15. **Dónde abre la aplicación.** Con sesión iniciada abre siempre en el
  calendario, que es la pantalla principal del producto. La única excepción es la
  primera vez que se usa: ahí abre en Perfil, donde están el Nobi y el cumpleaños,
  porque un calendario vacío no dice qué hacer a continuación.

  La pestaña inicial se declara explícitamente: sin hacerlo, el enrutador elegía por
  su cuenta y la aplicación arrancaba en Compartido o en Perfil.
