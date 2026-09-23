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
- RF-C1. Vista **mensual**: grid de 6 semanas × 7 días con indicadores por día; tocar un día abre su lista/vista diaria. Es la **vista por defecto** al abrir el calendario. El grid es **adaptativo** (NFR-8, NFR-9): las 7 columnas y las 6 filas se reparten el espacio disponible, de modo que el mes entra completo en cualquier pantalla sin recortarse; cuántas actividades se listan por día depende del alto real de la celda, con un resumen "+N" con puntos de color para el resto y, cuando no cabe ni un chip, solo puntos de color. La hora se antepone al título cuando la celda es lo bastante ancha. Fines de semana y días fuera del mes se distinguen del resto. Todo escala con el tamaño de fuente del sistema.
- RF-C2. Vista **semanal**: 7 columnas con bloques horarios posicionados según hora y duración, con color del tema.
- RF-C3. Vista **diaria**: timeline del día con bloques que muestran **solo el título** — la hora ya la da su posición en la rejilla. Ningún bloque baja del alto de una línea de texto, así que una actividad de un minuto sigue siendo legible; los traslapes se calculan con ese alto pintado y no con la duración real, de modo que dos actividades muy cortas y cercanas se reparten en columnas en vez de pisarse. Despliega **las 24 horas** (00:00–23:59) —también cuando el día no tiene ninguna actividad, donde la rejilla es además la forma de crear tocando una hora (RF-C6)— y marca la **hora actual** con una línea y su etiqueta, que se refresca mientras la vista está abierta; al abrir, el scroll se sitúa en la hora actual. Es también el detalle al que se llega desde la mensual.
- RF-C4. Navegación entre fechas (swipe/flechas) y botón "Hoy". Selector de vista persistente: se recuerda la vista **elegida en el menú de vista**; abrir un día desde la mensual navega a la diaria sin cambiar esa preferencia, de modo que el calendario sigue abriendo en mensual (RF-C1).
- RF-C13. Las horas se muestran en **formato de 24 h** (`14:30`, es-MX, NFR-13). Las rejillas diaria y semanal se dibujan en **saltos de 30 minutos**, con la línea de la hora más marcada que la de la media hora.

### Creación y edición
- RF-C5. Botón flotante "+" siempre visible → formulario de actividad: título (requerido), tema (picker de temas predefinidos con icono+color, opcional), fecha, hora inicio/fin (o todo el día), descripción, recurrencia, reminders. Al elegir tema, color/icono/dimensión se auto-asignan; se pueden sobreescribir.
- RF-C6. Crear también desde la vista diaria/semanal tocando un slot vacío (hora pre-llenada, con la precisión de 30 min de la rejilla de RF-C13). El selector de hora del formulario permite cualquier **minuto de 00 a 59**, no solo múltiplos de la rejilla.
- RF-C7. Tocar una actividad → hoja de detalle con acciones: editar, eliminar, compartir, reminders, y **"Registrar entrenamiento"** si `is_gym` (ver `07-fitness.md`).
- RF-C8. Recurrencia: sin repetición / diaria / semanal (elige días) / mensual, con fin opcional (fecha o nunca→horizonte 90 días, ver spec 02). Al editar/eliminar una recurrente, preguntar "¿Solo esta ocurrencia o toda la serie?".

### Reminders (propios)
- RF-C9. Presets: al momento, 10 min, 30 min, 1 h, 1 día antes; múltiples permitidos.
- RF-C10. Se programan como notificaciones locales (Expo Notifications) al crear/editar; se cancelan y reprograman al cambiar horario o eliminar la actividad. En web: fallback a banner in-app al abrir la app si el reminder venció (P5).

### Filtros y estados
- RF-C11. Filtro por dimensión (chips con las 7) y por tema; combinables; afectan las 3 vistas.
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
- Given filtro por dimensión "física", When lo aplico, Then solo veo actividades de esa dimensión en las 3 vistas.

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
