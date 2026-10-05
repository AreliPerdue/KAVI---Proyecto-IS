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

  **Crear no pasa por ningún formulario.** El botón "+" crea la lista con valores por
  omisión y entra directo a ella, con el nombre enfocado y preseleccionado para que la
  primera tecla lo reemplace; debajo, el campo para empezar a listar. El **color y el
  icono** son un extra que se cambia después, desde una paleta en la barra inferior.

  *Motivo:* una lista se abre porque hay algo que apuntar **ya**. Elegir color e icono
  entre veinticinco antes de poder escribir es justo el tiempo que tarda uno en olvidar qué
  iba a anotar. El nombre se edita en el sitio, tocándolo, no en un campo etiquetado aparte.

  Una lista que nadie tocó —nombre por omisión, sin elementos ni secciones— se borra sola
  al salir: es el precio de crear sin formulario, y sin eso cada arrepentimiento dejaría una
  lista vacía en el inicio.
- **RF-L3.** Fijar una lista la manda al principio. El orden entre listas se reordena arrastrando.
- **RF-L4.** Buscar por nombre de lista y por texto de ítem, incluidos los ya completados.
- **RF-L23. La lista completa puede tener fecha.** Aparte de la de cada elemento: dice para
  cuándo tiene que estar **terminada entera**. "La maleta es para el sábado" no decide
  cuándo compras el bloqueador, así que ponerle fecha a la lista no les pone ni les quita
  fecha a sus elementos; son dos preguntas distintas y cada una se responde donde se hace.
  Pasado el día, la fecha se muestra en el acento de aviso. Es una fecha flotante, como las
  de los elementos, por la misma razón: es un día del calendario de quien la escribió.

- **RF-L22. Etiquetas.** Una lista puede llevar varias (Casa, Escuela, Trabajo…), y el inicio
  se filtra tocando una: es la forma de ver juntas las listas de un mismo tema.

  **No hay etiquetas del sistema.** Las que la app sugiere viven en el cliente; al tocar una
  se crea una etiqueta **tuya** con ese nombre, así que cualquiera se puede renombrar o
  borrar sin pedir permiso. Es distinto de los temas, que sí son del sistema porque el
  producto define su dimensión y su color; una etiqueta es solo una palabra que alguien
  eligió, y hacerla global obligaría a una tabla de personalizaciones por usuario solo para
  poder renombrar "Escuela" a "Uni".

  **Etiquetar es de quien mira, no de la lista.** En una lista compartida cada quien la
  agrupa como le sirve: que yo la guarde en "Casa" no le cambia nada a la otra persona.

  Borrar una etiqueta no borra ninguna lista: se pierde la forma de agrupar, no lo agrupado.

## Dentro de una lista (RF-L5 – RF-L10)
- **RF-L5.** Agregar un ítem escribiendo su título y confirmando; el campo se queda listo para el siguiente, porque las listas se llenan de corrido.
- **RF-L6.** Palomear y despalomear. Lo completado sale de la lista activa y baja a **Completados**, que se puede desplegar. Nada se borra al palomear: es lo que permite recuperar un dedazo.
- **RF-L7.** Editar y eliminar ítems; reordenarlos arrastrando.
- **RF-L8.** **Secciones** dentro de una lista (Frutas · Lácteos · Despensa). Un ítem pertenece a una sección o a ninguna.
- **RF-L9.** Un ítem puede tener **nota** de texto libre además del título.
- **RF-L10.** Cada lista recuerda **cómo se ve**: cuadrícula o lista de palomeo. Hay un valor por omisión global y cada lista puede sobreescribirlo.

## Fechas y calendario (RF-L11 – RF-L13)
- **RF-L11.** Un ítem puede tener: **sin fecha** (el caso normal), **fecha sin hora**, o **fecha con hora**. La hora es opcional y solo sirve para el recordatorio.

- **RF-L11b. El recordatorio es una pregunta aparte de la hora.** "Se entrega el 3" y
  "avísame el 1" se contestan por separado, así que el aviso se elige como **cuánto antes**
  —a la hora, 1 h, 1 día, 2 días, 1 semana— y no como una hora suelta. Los desfases llegan
  más lejos que los de una actividad porque responden a otra cosa: a una cita se llega y con
  diez minutos basta; un pendiente hay que **hacerlo**, y avisar dos días antes es lo que da
  tiempo de hacerlo.

  **Avisa lo que tiene recordatorio, no lo que tiene hora.** Sin recordatorio no se
  interrumpe a nadie. Cuando el elemento no tiene hora propia, el aviso se ancla a las 9:00
  del día, porque "dos días antes" de una fecha sin hora no tiene instante; la interfaz lo
  dice en vez de dejarlo a la adivinanza.

  Los avisos de listas se programan por el mismo camino que los de actividades (RF-C10) y no
  por uno propio: `syncNotifications` cancela todo antes de reprogramar, así que dos fuentes
  llamándola por separado se borrarían entre sí.
- **RF-L12. La franja de pendientes.** Al abrir un día en el calendario, **arriba de la rejilla de horas** aparece una franja con los ítems que tienen esa fecha: su icono de lista, su título y su casilla para palomear. Se puede plegar. Nunca se dibuja dentro de las horas, ni siquiera si el ítem tiene hora.

  *Motivo:* es el punto donde Lists y el calendario se vuelven un solo sistema, sin mentir sobre lo que el dato es. Un pendiente colocado a las 10:00 en la rejilla se leería como una cita, y no lo es.

- **RF-L13.** Palomear desde la franja marca el ítem igual que desde su lista: es la misma fila.
- **RF-L13b. En mes y agenda los pendientes se pintan como bloques del calendario**, con el
  círculo de palomita **en lugar de la hora** y en el color de su lista. Ahí no hay rejilla
  de horas, así que no hay nada que malinterpretar; el icono dice de un vistazo que eso no
  es una cita sino algo por hacer. En las vistas de horas siguen sin pintarse: viven en la
  franja de arriba.

  *Por qué:* convierte el calendario en la entrada a todas las formas de organizar, en vez
  de en un sitio que solo sabe de citas.
- **RF-L13c. Palomear es del círculo, no de la fila.** Tocar un elemento **abre su edición**.
  Con renglones de 44 px pegados uno a otro, palomear en cualquier parte es un dedazo
  esperando a pasar: se marca lo que no era y hay que ir a buscarlo a completados.

- **RF-L18. Lo vencido no desaparece.** Los pendientes con fecha anterior a hoy y sin
  palomear se agrupan **arriba** de los de hoy, en el acento de aviso y con su fecha
  original ("ayer", "26 sep"), más una acción para **reprogramarlos a hoy** de una sola vez.

  *Motivo:* una lista que esconde lo que no hiciste deja de ser confiable, y es el momento
  en que la persona deja de apuntar ahí. Lo vencido se mide contra **hoy**, así que solo
  aparece cuando el día abierto es hoy: mirando un día pasado o futuro, "se te pasó" no
  significa nada.

## Listas que se repiten y su historial (RF-L19 – RF-L21) — fase 3

Una rutina no es una lista que se hace una vez: es la misma lista que se vuelve a empezar.
Hoy KAVI no sabe distinguirlas, y por eso tampoco puede decir nada sobre cómo te ha ido.

- **RF-L19. Una lista puede repetirse.** Con una regla de recurrencia (diaria, ciertos días
  de la semana, mensual). Se reutiliza `lib/recurrence.ts`, que ya expande RRULE para las
  actividades: una segunda implementación abriría la puerta a que las dos difieran.
  - **RF-L19b. Inicio y fin.** Como en las actividades: la rutina empieza un día (por
    omisión hoy, porque una lista no tiene fecha propia de la que tomarlo) y puede terminar
    en otro —"lavar los trastes entre semana, hasta que acabe el semestre"—. Antes de
    empezar y después de terminar no se abren vueltas.
- **RF-L20. Cada vuelta queda registrada.** Al empezar una nueva vuelta, la anterior se
  cierra guardando **cuántos elementos se completaron de cuántos** y en qué fecha, y los
  elementos se despalomean para poder hacerla otra vez. El historial es de conteos, no de
  copias: guardar cada elemento de cada día haría crecer la tabla sin que nadie lo consulte.
- **RF-L21. Resúmenes.** A partir de ese historial: cuántas veces se completó entera una
  rutina, y qué proporción se cumplió en un conjunto de listas.

- **RF-L26. La rutina aparece en el calendario los días que le tocan.** Como **una** pieza
  por rutina y día, nunca un renglón por elemento: los elementos no tienen día propio —el
  día es de la vuelta— y una rutina de ocho pasos se comería la franja. En la vista diaria
  es una fila con su avance (1/3) y un círculo que se llena al completarla; en mes y agenda,
  un chip con el círculo en lugar de la hora. Tocarla abre la lista en la vuelta de ese día.

  Los días se **calculan** con la regla y no se leen de las vueltas: la vuelta solo existe
  desde que alguien abre la lista ese día, y el calendario tiene que mostrar el lunes que
  viene aunque nadie lo haya abierto. Ver el calendario no abre vueltas.

- **RF-L27. En web, las listas del día van a la izquierda.** En la vista diaria y con la
  ventana ancha, lo que en teléfono es la franja de arriba se vuelve un panel lateral: arriba
  lo de ese día (vencidos, rutinas, pendientes con fecha) y abajo un acceso rápido a todas las
  listas. La rejilla toma el ancho restante. En teléfono sigue la franja: ahí el ancho es lo
  que falta.

### El riesgo que esta función trae
La sección "KAVI no debe caer en la productividad tóxica" de este mismo concepto aplica
aquí más que en ningún otro lado. Un resumen que diga *"dejaste el 25 % sin completar"* es
exactamente la presión que KAVI dijo que no iba a ejercer. La redacción de los resúmenes se
escribe **antes** que la consulta que los alimenta: se cuenta lo hecho, no lo que falta
("hiciste tu rutina completa 12 de 30 días"), y no hay rachas que se rompan ni avisos por
haber fallado.

### Cuándo cierra una vuelta: el periodo de gracia
Una vuelta **no** se cierra cuando empieza la siguiente. Sigue abierta y editable hasta las
**15:00 del día siguiente**, y solo entonces caduca con el conteo que tenga.

El motivo es que la gente palomea tarde: lo de ayer se anota hoy en la mañana, y cerrar a
medianoche registraría como incumplido algo que sí se hizo. Pero las dos vueltas **no se
mezclan**: durante la gracia conviven, cada una con su fecha, y palomear en la de ayer suma
a ayer. La lista muestra la de hoy; si la de ayer sigue abierta e incompleta, aparece arriba
un aviso —"Ayer: 3 de 7"— que lleva a ella.

Una vuelta que caduca se cierra con lo que tenga. No se avisa ni se insiste.

### Qué se registra de una lista que **no** se repite
Nada nuevo, y es a propósito.

Una lista de súper no se "completa": se usa, se vacía y se vuelve a llenar. Un 60 % palomeado
ahí no es un fracaso, es una lista a media compra. Una lista de películas nunca termina. Medir
esas con porcentaje de cumplimiento produce números que no significan nada y que, peor, se
leen como reproche.

Para la pregunta que sí tiene sentido en cualquier lista —**qué hiciste**— ya está el dato:
`list_items.completed_at` guarda cuándo se palomeó cada elemento. De ahí sale "esta semana
completaste 23 cosas" sin una tabla nueva, y sirve igual para listas que se repiten y para
las que no. Y comparando `completed_at` contra `due_date` sale "a tiempo", que es la otra
mitad del caso que se pidió.

Así quedan dos mecanismos para dos preguntas distintas, en vez de uno forzado para las dos:

| Pregunta | De dónde sale |
|---|---|
| ¿Cumplí mi rutina? | `list_runs` — solo listas que se repiten |
| ¿Qué hice, y a tiempo? | `list_items.completed_at` vs `due_date` — todas |

### Decisión abierta
- **Agrupar listas para poder resumirlas.** El caso "de mis listas de trabajo" necesita
  etiquetas, que van después de lo ya planeado (fase 3).

## Hoy y Algún día (RF-L24 – RF-L25) — fase 3

Las listas responden "¿qué hay en el súper?". Estas dos vistas responden otras dos preguntas
que ninguna lista puede contestar sola, porque cruzan todas: **qué me toca** y **qué dejé
pendiente sin fecha**.

- **RF-L24. Hoy.** Reúne, de todas mis listas activas, lo que vence hoy y lo que ya venció,
  en dos grupos separados —lo atrasado arriba, en el acento de aviso— más las listas cuya
  **fecha completa** (RF-L23) es hoy o ya pasó. Desde aquí se puede palomear, abrir el
  elemento en su lista y reprogramar lo atrasado para hoy de una sola vez.

  Lo atrasado y lo de hoy no se mezclan, por lo mismo que en la franja del día: son dos
  cosas distintas y ordenarlas juntas esconde lo viejo entre lo nuevo.

- **RF-L25. Algún día.** Los pendientes **sin fecha**, agrupados por su lista, con la acción
  de ponerles día ahí mismo. Es la bandeja de triage: lo que quiero hacer pero no he
  agendado.

  **Quedan fuera las rutinas.** Los elementos de una lista que se repite nunca son "algún
  día": son los de hoy, y ya tienen su vuelta. Incluirlos llenaría la bandeja de lo que
  menos necesita decidirse.

  Sigue habiendo mucho ruido posible —una lista del súper son veinte elementos sin fecha—,
  y por eso se agrupa por lista en vez de mostrarse plana: así una lista larga se reconoce
  y se salta de un vistazo.

## Compartir (RF-L14 – RF-L17) — fase 2
- **RF-L14.** Una lista se comparte con contactos ya aceptados (misma regla que el
  calendario, spec 06). Junto a cada persona se elige entre **Ver** y **Editar** (agregar,
  editar y palomear), como un par de botones en su propia fila: es la pregunta que de verdad
  se hace al compartir, y con dos opciones se contesta sin abrir nada.

  El esquema admite además **administrar** (gestionar miembros), pero la interfaz no lo
  ofrece: mientras nadie pueda concederlo, **solo el dueño** renombra la lista, cambia su
  color y decide con quién se comparte. Queda reservado para cuando haga falta un
  co-propietario, sin otra migración de por medio.
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
Rutas: `/(app)/lists` (inicio) y `/(app)/list/[id]` (detalle). Fuera del grupo de pestañas: en el teléfono Lists es uno de los módulos de Más y se puede elegir como acceso de la barra (spec 01, RF-N6; T189b); ahí se pinta sin "Atrás", y abierta desde Más o desde el botón ○✓, apilada con "Atrás". La franja del día vive dentro del calendario, no en una ruta propia.

Acceso: botón **○✓** junto al selector de vistas del calendario, para abrir Lists sin salir de ahí — el mismo patrón con el que Fitness se abre desde una actividad de gimnasio.

Estados obligatorios en las dos pantallas: carga, vacío, error con reintento (RF-C12 aplica igual aquí).
