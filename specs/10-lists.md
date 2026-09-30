# Spec 10 — KAVI Lists (○✓)

## Objetivo
Un espacio flexible para **todo lo que quieres recordar, hacer, conseguir, ver, planear o compartir**. No es un gestor de tareas: una lista puede ser el súper, las películas pendientes, las ideas, o los pendientes de la casa. La persona decide cómo organiza y cómo lo ve; KAVI se adapta (P2).

Si el calendario responde *cuándo*, Lists responde *qué*.

## Principio rector: un ítem, varias vistas
Un ítem es **un solo objeto** que aparece en varios contextos sin duplicarse: en su lista, en el día que le toca, en Hoy, y en el espacio compartido. Ninguna de esas vistas crea una copia; todas consultan la misma fila.

## Lists **no** es el calendario
Decisión central, y la que define el módulo entero:

- **Una actividad ocupa un rato.** Tiene inicio y fin, y por eso se dibuja como bloque en la rejilla de horas.
- **Un ítem de lista ocupa un día, o ninguno.** "Arreglar la puerta el sábado" no significa "el sábado a las 10": significa que hay que hacerlo el sábado. No tiene duración porque todavía no se sabe.

Por eso **los ítems nunca entran en la rejilla de horas**, ni siquiera cuando llevan hora (la hora sirve para el recordatorio, no para colocarlos). Y por eso `list_items` es su propia tabla y **`activities` no se toca**: para que un ítem sin fecha cupiera ahí habría que volver `start_at`/`end_at` nulables, lo que alcanza a las políticas RLS, la recurrencia, `get_availability` y cada consulta del calendario — se pondría en riesgo lo que ya funciona a cambio de ahorrar una tabla.

## Historias de usuario
- HU-L1: Quiero crear listas con su nombre, icono y color, para separar el súper de las películas y de los pendientes de la casa.
- HU-L2: Quiero agregar cosas rápido y palomearlas, para que la lista sirva mientras estoy en el súper.
- HU-L3: Quiero dividir una lista en secciones, para que el súper vaya agrupado por pasillo.
- HU-L4: Quiero ver los pendientes de un día en mi calendario sin que se confundan con mis citas, para saber qué me toca ese día.
- HU-L5: Quiero compartir una lista con alguien y que los dos podamos agregar y palomear, para llevar la casa entre dos.
- HU-L6: Quiero fijar arriba las listas que uso siempre, para no buscarlas.

## Inicio de Lists (RF-L1 – RF-L4)
- **RF-L1.** Rejilla de tarjetas estilo Google Keep, una por lista, con su icono, su nombre, su color y cuántos pendientes le quedan. Secciones: **Fijadas**, **Mis listas**, **Compartidas**.
- **RF-L2.** Crear, renombrar, duplicar, archivar y eliminar listas. Archivar no borra: saca la lista del inicio y la conserva en **Archivadas**.
- **RF-L3.** Fijar una lista la manda al principio. El orden entre listas se reordena arrastrando.
- **RF-L4.** Buscar por nombre de lista y por texto de ítem, incluidos los ya completados.

## Dentro de una lista (RF-L5 – RF-L10)
- **RF-L5.** Agregar un ítem escribiendo su título y confirmando; el campo se queda listo para el siguiente, porque las listas se llenan de corrido.
- **RF-L6.** Palomear y despalomear. Lo completado sale de la lista activa y baja a **Completados**, que se puede desplegar. Nada se borra al palomear: es lo que permite recuperar un dedazo.
- **RF-L7.** Editar y eliminar ítems; reordenarlos arrastrando.
- **RF-L8.** **Secciones** dentro de una lista (Frutas · Lácteos · Despensa). Un ítem pertenece a una sección o a ninguna.
- **RF-L9.** Un ítem puede tener **nota** de texto libre además del título.
- **RF-L10.** Cada lista recuerda **cómo se ve**: cuadrícula o lista de palomeo. Hay un valor por omisión global y cada lista puede sobreescribirlo.

## Fechas y calendario (RF-L11 – RF-L13)
- **RF-L11.** Un ítem puede tener: **sin fecha** (el caso normal), **fecha sin hora**, o **fecha con hora**. La hora es opcional y solo sirve para el recordatorio.
- **RF-L12. La franja de pendientes.** Al abrir un día en el calendario, **arriba de la rejilla de horas** aparece una franja con los ítems que tienen esa fecha: su icono de lista, su título y su casilla para palomear. Se puede plegar. Nunca se dibuja dentro de las horas, ni siquiera si el ítem tiene hora.

  *Motivo:* es el punto donde Lists y el calendario se vuelven un solo sistema, sin mentir sobre lo que el dato es. Un pendiente colocado a las 10:00 en la rejilla se leería como una cita, y no lo es.

- **RF-L13.** Palomear desde la franja marca el ítem igual que desde su lista: es la misma fila.

## Compartir (RF-L14 – RF-L17) — fase 2
- **RF-L14.** Una lista se comparte con contactos ya aceptados (misma regla que el calendario, spec 06), con tres permisos: **ver**, **editar** (agregar, editar y palomear) y **administrar** (además, gestionar miembros).
- **RF-L15.** Cada ítem guarda **quién lo agregó** y **quién lo completó**, y se muestra en las listas compartidas.
- **RF-L16.** Los cambios de una lista compartida llegan **en vivo** por Realtime, sin recargar.
- **RF-L17.** Quien comparte puede retirar el acceso; la lista desaparece del inicio de esa persona sin borrar el contenido.

## Colores e identidad visual
- El color de una lista sale de la **paleta de personas** (`constants/people-colors`), la misma de los Nobis. No se inventa un tercer sistema de color: KAVI ya tiene dos capas de significado —las 7 dimensiones y las personas— y una tercera paleta libre las volvería ruido (kavi-design §1).
- Las tarjetas siguen el lenguaje de KAVI: esquinas continuas, tipografía del sistema, color en el borde y en el relleno tenue, no de fondo pleno.
- **No** se adoptan gradientes ni superficies de vidrio: `kavi-design` §1 los descarta explícitamente por ser el aspecto genérico que KAVI evita.

## Reglas de negocio
- Una lista sin compartir es privada de su dueño, como las actividades.
- Palomear **nunca** borra. Eliminar sí, y va con confirmación.
- Archivar conserva todo; es lo que se ofrece antes de eliminar.
- Un ítem pertenece **siempre** a una lista. No hay ítems sueltos (el Inbox de una fase posterior será una lista del sistema, no una excepción al modelo).
- Los ítems completados se conservan; no hay purga automática.

## Fuera del alcance, de forma permanente
**Rastreo de precios** y **vistas previas de páginas de tiendas**. Dependen de sitios que bloquean el acceso automatizado y cambian sin aviso: la función se rompería sola y de forma invisible. Decisión de producto del 30-sep-2026, no un pendiente.

## Fases
- **Fase 1 (esta spec, RF-L1 – RF-L13):** listas, ítems, secciones, palomeo, completados, fijar, archivar, buscar, vistas por lista, fechas y la franja del día.
- **Fase 2 (RF-L14 – RF-L17):** compartir, permisos, autoría y tiempo real.
- **Fase 3:** subtareas, etiquetas, plantillas, modo compras, asignaciones, comentarios, recurrencia, Hoy y Algún día.
- **Fase 4:** imágenes (requiere Supabase Storage; es la función más cara en trabajo de todo el módulo, aunque no cueste dinero a esta escala).

## Criterios de aceptación
- *Dado* que no tengo ninguna lista, *cuando* abro Lists, *entonces* veo un estado vacío que invita a crear la primera y un botón para hacerlo.
- *Dado* una lista "Súper", *cuando* escribo "Leche" y confirmo, *entonces* el ítem aparece al final y el campo queda listo para el siguiente sin que yo lo toque.
- *Dado* un ítem palomeado, *cuando* despliego "Completados", *entonces* sigue ahí y puedo despalomearlo para devolverlo a la lista activa.
- *Dado* una lista con secciones "Frutas" y "Lácteos", *cuando* agrego un ítem dentro de "Lácteos", *entonces* queda bajo esa sección y no al final de la lista.
- *Dado* un ítem con fecha del sábado y **sin hora**, *cuando* abro el sábado en el calendario, *entonces* aparece en la franja de arriba y **no** aparece en ninguna hora de la rejilla.
- *Dado* un ítem con fecha del sábado **y hora**, *cuando* abro el sábado, *entonces* sigue en la franja de arriba: la hora no lo mueve a la rejilla.
- *Dado* un ítem visible en la franja del día, *cuando* lo palomeo ahí, *entonces* al abrir su lista ya está en "Completados".
- *Dado* que archivo una lista, *cuando* vuelvo al inicio, *entonces* no está, y la encuentro en "Archivadas" con todos sus ítems.
- *Dado* una lista compartida con permiso de "ver", *cuando* la abro, *entonces* no tengo cómo agregar ni palomear (fase 2).

## UI
Rutas: `/(app)/lists` (inicio) y `/(app)/list/[id]` (detalle). Fuera del grupo de pestañas mientras la barra siga fija en cuatro accesos; cuando exista el menú de módulos, Lists se registra ahí. La franja del día vive dentro del calendario, no en una ruta propia.

Acceso: botón **○✓** junto al selector de vistas del calendario, para abrir Lists sin salir de ahí — el mismo patrón con el que Fitness se abre desde una actividad de gimnasio.

Estados obligatorios en las dos pantallas: carga, vacío, error con reintento (RF-C12 aplica igual aquí).
