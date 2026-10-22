# Spec 13h · KAVI Library — Lienzo creativo: Recortes y Journal

> **Aprobada (14 oct 2026)** con las decisiones de §14. Parte de la spec 13. Sale del documento conceptual de
> Areli "KAVI Library — Recortes / Journal" (v8). **Reemplaza la spec 13e** (ver §11) y los recortes del lector
> de la 13c (RF-BH19 – RF-BH21) ahora se llaman **Fragmentos**.
>
> Principio: **"KAVI gives you the canvas. You give it the color."** KAVI pone el lienzo, la estructura y
> las piezas; la persona pone el color, la personalidad y el whimsy.

## 1. Dos lugares, un solo lienzo (RF-CC1 – RF-CC3)

- **RF-CC1. Recortes = "yo con este libro".** Viven dentro de un libro: Library → libro → **Mi libreta** →
  Recortes. Guardan la experiencia de esa lectura: personajes, fan art, quotes, teorías, momentos, playlists,
  moodboards, reseña, DNF. Un libro puede tener muchos recortes; cada recorte es de un solo libro.
- **RF-CC2. Journal = "yo como lector".** Vive a nivel de toda la biblioteca. La persona puede tener **los
  Journals que quiera** (uno por año, uno de fantasía…); se ven en el librero como piezas.
  Habla de la persona: Get to Know the Reader, su año lector, estadísticas, premios, eras, metas. Es un
  **cuaderno**: tiene portada (spec 13i) y páginas, y cada página es un lienzo.
- **RF-CC3. Un solo editor.** Recortes y páginas del Journal usan el mismo **Lienzo creativo**: las mismas
  piezas, módulos, herramientas, color, plantillas y biblioteca personal. No hay dos editores.

**Diferencia con lo que ya existe:** una **nota** o post-it (13c) es información rápida sobre la página; una
**ficha** (13d) evalúa el libro con campos; un **recorte** es composición visual y memoria. Un recorte puede
llevar texto, pero nunca debe sentirse como un formulario ni como una nota grande.

## 2. El lienzo es una página del lector, no una página web (RF-CC4 – RF-CC7)

- **RF-CC4. Un recorte es una página como las del visor de PDF** (decisión de Areli del 14 oct 2026: misma
  medida estándar para compartir el zoom, los stickers, los post-its, las asas y las formas de leer que ya
  existen). La proporción es la de la serie ISO A, **1 : √2** (la de A4 y **A5**, la misma del Journal),
  **vertical u horizontal**. Se elige al crear; la proporción nunca cambia. Un recorte y una página del
  Journal se abren en el mismo visor que un PDF: scroll, páginas de lado o libro real.
- **RF-CC5. Sin reacomodo.** Todo se guarda en coordenadas relativas al lienzo (x, y, ancho de 0 a 1, más
  proporción y giro). En computadora, tableta y teléfono se ve **idéntico**, solo más grande o más chico.
  La interfaz alrededor sí se adapta (paneles a los lados en web, hojas abajo en el teléfono); el lienzo no.
- **RF-CC6.** Un lienzo horizontal en el teléfono pide girarlo; sin girar se ve completo pero chico.
- **RF-CC7. Acercar:** pellizco o rueda con ⌘/Ctrl, como en el lector; "Ajustar" vuelve a verlo entero.

## 3. Todo se puede cambiar (RF-CC8 – RF-CC10)

- **RF-CC8. "If it's on the canvas, you can change it."** Nada viene bloqueado por la plantilla.
- **RF-CC9. Cada elemento**, cuando tenga sentido: mover, cambiar de tamaño (las 8 asas de KAVI), girar,
  duplicar, borrar (botón, Supr o Retroceso), traer al frente / mandar atrás, bloquear, **agrupar y
  desagrupar**, opacidad, color, borde, sombra, tamaño y tipo de letra, y **variante** (p. ej. polaroid
  clásica ↔ mini ↔ con cinta).
- **RF-CC10.** Deshacer y rehacer en todo; se guarda solo (sin red, en la cola del dispositivo, como lo
  anotado).

## 4. Color sin paletas de KAVI (RF-CC11 – RF-CC13)

- **RF-CC11.** La interfaz de KAVI sigue monocroma. El lienzo puede ser de cualquier color, pero **KAVI no
  trae paletas** ("KAVI Pink", "Ocean"…): plantillas y piezas empiezan en neutros (blanco, papel, grises,
  tinta).
- **RF-CC12. Selector de color:** rueda/cuadro de color, **campo HEX**, **colores recientes** y **mis
  colores** (paleta que la persona guarda y reutiliza en cualquier recorte o página). Se aplica a fondo,
  texto, bordes, papeles, formas y stickers recolorables.
- **RF-CC13.** Las piezas recolorables están hechas en escala de grises con textura; el color se aplica
  encima conservando sombras y textura (no hay un archivo por color).

## 5. Piezas: módulos y assets (RF-CC14 – RF-CC17)

- **RF-CC14. Módulos** (tienen contenido): **texto**, **imagen** (con formas de recorte), **polaroid**
  (componente estrella: clásica, mini, con pie, con cinta, doble, pila, tira de película), **quote** (cita,
  quién, capítulo, comentario), **rating** (estrellas, corazones, número), **forma**, **color** (muestra de
  paleta), **sticker** (incluye los Nobi y la tienda, 13c RF-BH13b), **papel** (scrap) y **libro**
  (referencia a un libro de Library: portada y título; tocarlo lo abre). Después: mood, character, song,
  tag, fecha/lugar, progreso, ranking, timeline, teoría, predicción, lección, checklist.
- **RF-CC15. Assets** (decoración): papeles rasgados, arrugados, rayados, cuadriculados, punteados, de
  libreta, de periódico, con esquina doblada o perforaciones; notas y etiquetas (memo, ticket, bookmark,
  etiqueta con agujero, papel con clip o cinta); cintas (washi); formas (corazones, estrellas, flores,
  blobs, marcos irregulares, burbujas simples); doodles (sparkles, flechas, ramas, lazos, costuras).
  **Dirección visual:** papel realista en grises con fibras y bordes orgánicos, linework delicado; **nada
  estilo cómic**; sin fondo; recolorables con un HEX.
- **RF-CC16. Nobi y stickers son opcionales:** ninguna plantilla los trae por fuerza; se agregan desde
  **+ Agregar**.
- **RF-CC17. Los assets llegan como los stickers:** packs en la nube que se descargan (13c RF-BH13b); unos
  básicos vienen incluidos para que el lienzo sirva sin red desde el primer día.

## 6. Plantillas (RF-CC18 – RF-CC21)

- **RF-CC18.** Una plantilla es un **punto de partida**: un acomodo inicial de módulos y assets en neutros.
  Al usarla se copia al recorte; después todo se mueve, se borra o se cambia. No hay una plantilla por cada
  variación pequeña.
- **RF-CC19. Lienzo en blanco** siempre disponible, con **+ Agregar**.
- **RF-CC20. Guardar como plantilla:** un recorte o página personalizado se guarda en **Mis plantillas**
  (con nombre y miniatura) y se reutiliza para otros personajes, libros o páginas.
- **RF-CC21. Plantillas de inicio (MVP):**
  - **Recortes:** Book Review, Character Collage, Favorite Quotes, Reading Experience, DNF Graveyard.
  - **Journal:** Get to Know the Reader.
  - Después: Moodboard, Character Analysis, Theory Board, Predictions, Soundtrack, Book DNA, Book Passport,
    Emotional Damage Report, Would I Survive?, Reading Year, Reading Stats, Reading Awards, Reading Eras…
    Cada plantilla tiene su nombre **en español y en inglés** (spec 12): "Reseña del libro" / "Book Review",
    "Collage de personaje" / "Character Collage", "Cementerio DNF" / "DNF Graveyard", etc.

## 7. Journal usa los datos de Library (RF-CC22)

- **RF-CC22.** El Journal no duplica libros: el módulo **libro** apunta a uno de Library. Las plantillas de
  estadísticas y año lector (fase posterior) leen los datos reales: libros terminados, páginas, tiempo de
  lectura (13b RF-BR11 – BR13), fichas (13d).

## 8. Mi libreta de un libro (RF-CC23 – RF-CC24)

- **RF-CC23.** En el detalle del libro, **Mi libreta** junta lo personal de esa lectura: **Recortes**,
  **Fragmentos** (lo que se recortó al leer, §11) y, cuando existan, **fichas** (13d). Cada recorte se ve
  como miniatura; tocarlo lo abre; **+ Nuevo recorte** pregunta plantilla o lienzo en blanco y el formato.
- **RF-CC24.** Un fragmento o un subrayado se puede **pegar en un recorte** como quote o imagen.

## 9. Compartir (RF-CC25)

- **RF-CC25.** Todo es **privado**. **Exportar como imagen** (PNG del lienzo a buena resolución) y
  compartirla con la hoja del sistema. Compartir plantillas entre personas queda fuera del MVP.

## 10. Cómo se construye (para desarrollo)

- **Un lienzo = un documento JSON** con su formato y su lista de elementos en orden de capa; cada elemento:
  `id`, `type` (módulo o asset), `x`, `y`, `w`, `ar`, `rot`, `z`, `locked`, `group`, `style` (color, opacidad,
  borde, sombra, letra) y `content` (texto, imagen, referencia…). Coordenadas de 0 a 1 respecto al lienzo.
- **Se dibuja en el motor del lector**: el recorte es una página en blanco de proporción 1 : √2 (un "PDF" de
  una o más páginas que arma el motor) y sus elementos van en la misma capa que lo pegado (`annotations.js`:
  asas, giro, arrastre, escribir directo, capas, stickers de la tienda). Los módulos nuevos (polaroid, quote,
  papel…) son tipos nuevos de esa capa. Así se reutilizan zoom, pellizco, Supr, deshacer, cola sin red y libro
  real, se ve igual en web e iOS/Android, y exportar a imagen es dibujar la página en un `<canvas>`.
- **Recolorear** una pieza en grises: `mix-blend-mode`/filtro en el motor (multiplicar el color sobre la
  textura) y lo mismo al exportar.
- **Datos (spec 02):** `library_canvases` (dueño, contexto `book` o `journal`, `item_id` o `journal_id`,
  título, formato, orientación, `doc` jsonb, versión, miniatura en R2) y `library_canvas_templates` (Mis
  plantillas: nombre, formato, `doc`, miniatura). "Mis colores" va en el perfil. RLS: solo lo propio. Las
  imágenes subidas van a R2 como las de las anotaciones (y se borran a la hora si se quitan, T333).
- **Plantillas de KAVI** en el cliente (`src/constants/library/canvas-templates/`), igual que el catálogo de
  ejercicios: crecen sin migraciones.

- **Hecho (C1, T351, 21 oct 2026):**
  - **La página:** el motor arma un PDF de páginas en blanco A5 (`public/reader/blank.js`, mensaje `openCanvas`) y
    lo abre como cualquier PDF, entera a la vista (páginas de lado). Así el recorte comparte zoom, pellizco y la
    capa de lo pegado.
  - **Elementos:** texto, imagen, forma y sticker son lo pegado de esa capa. La forma es un tipo nuevo (rectángulo,
    óvalo, corazón, estrella, mancha) en gris neutro, que se estira y se gira.
  - **Lo elegido:** escribir (texto), traer al frente, mandar atrás, bloquear, duplicar, **elegir varios**,
    agrupar, desagrupar y quitar (también con Supr). Un grupo se elige y se mueve junto con un contorno punteado;
    para cambiar el tamaño o girar uno, se desagrupa. Soltar un grupo es un solo paso (`moves`) para deshacer.
  - **Guardar:** el documento vive en el editor con deshacer y rehacer, y se guarda solo 0.6 s después del último
    cambio en la cola sin red (`op: 'canvas'`), con `version` que sube en cada guardado. Las imágenes van a R2 en
    la carpeta del libro, como las pegadas al leer.
  - **Datos:** `library_canvases` (migración `20261020170000`) se adelantó de C2 a C1, porque C1 ya guarda. RLS:
    solo lo propio y de un libro propio; al borrar el libro se van sus recortes; documento de 1 MB como máximo.
  - **Entrada provisional:** "Nuevo recorte" en el menú ⋯ del libro (vertical u horizontal) abre el lienzo. Mi
    libreta, la lista con miniaturas, el color, exportar y borrar un recorte son C2 (T342).

- **Hecho (C2, T342, 21 oct 2026):**
  - **Mi libreta** (RF-CC23): en el menú ⋯ del libro (reemplaza la entrada provisional de T351). Recortes con su
    miniatura (dibujada en la app a escala, sin guardar una imagen aparte), "Nuevo recorte" con la forma de la página,
    tocar para abrir y ⋯ → Borrar recorte (con confirmación; sus imágenes se borran de R2). Abajo, Fragmentos de ese
    libro (se abren ya filtrados) y sus Fichas.
  - **"+ Agregar"** (RF-CC19) junta texto, imagen, forma y sticker; la barra sin nada elegido es Agregar, Fondo y
    Exportar. Tocar el nombre del recorte lo cambia.
  - **Color** (RF-CC12): cuadro de saturación y brillo, barra de tono, **HEX**, **recientes** (en el dispositivo,
    12) y **Mis colores** (en la cuenta, hasta 30, tabla `library_saved_colors` privada; migración
    `20261021100000`). Se aplica al fondo de la página, al texto, a las formas y al borde.
  - **Estilo de lo elegido** (RF-CC9): color, opacidad (100/75/50/25 %), borde (sin, fino, grueso, con su color) y
    sombra; se aplica a todo el grupo y se deshace. Los recolorables con textura (RF-CC13) llegan con los assets (C3).
  - **Exportar** (RF-CC25): el motor dibuja la página en un `<canvas>` (`public/reader/export.js`, PNG de 1600 px
    de ancho) y se comparte con la hoja del sistema; en la web, la del navegador o se descarga.
  - **Imágenes:** quitar una deja su archivo una hora (por si se deshace) y el borrado revisa que el recorte ya no
    la use.

- **Hecho (C3, módulos, T343a, 21 oct 2026):**
  - **Polaroid** en siete variantes: clásica, mini, con pie, con cinta, doble (2 fotos), en pila y tira de película
    (3 fotos). Se agrega eligiendo la variante; **Poner foto** (en la doble y la tira, primero el hueco), **Pie de
    foto** y **Cambiar polaroid** (conserva las fotos que caben; las que sobran se borran de R2 a la hora). El color
    de su papel se cambia en Estilo. No se deforma desde las esquinas.
  - **Cita:** la cita (obligatoria), quién la dice, capítulo y un comentario; se escribe en su hoja antes de pegarla
    y se edita con doble toque o "Editar cita". Letra con serifa, que crece con la caja.
  - **Calificación:** estrellas o corazones del 0 al 5 de medio en medio, o un número del 0 al 10; al pegarla se
    abre su hoja; cambiar de escala conserva la calificación (5 estrellas = 10).
  - **Libro** (RF-CC22): se elige de la Biblioteca, se ve con su portada (o su color y título) y "Abrir libro" lo
    abre; si el libro se borra, queda un libro sin título en gris.
  - Los cuatro se pintan en el motor (`public/reader/modules.js`), se exportan igual (`export.js`) y salen en la
    miniatura de Mi libreta. Doble toque abre la hoja de cada uno.
- **Hecho (C3, assets, T343b, 21 oct 2026):** decisión de Areli: el arte lo genera Claude.
  - **"Papeles y más"** en "+ Agregar", con 24 piezas en cuatro pestañas:
    - **Papeles:** rasgado, arrugado, hoja de libreta, cuadriculado, punteado, esquina doblada, con fibras y tira
      rasgada.
    - **Notas:** memo, boleto, etiqueta y marcapáginas.
    - **Cintas washi:** lisa, rayas, puntos y cuadros.
    - **Doodles:** destellos, flecha, rama, moño, costura, y corazón, estrella y círculo a mano.
  - **Cómo se hacen:** las genera `scripts/library/assets-lienzo.mjs` con canvas en Chrome y semilla fija: ruido de
    fibras, orillas rasgadas, pliegues que se desvanecen y trazo a mano con temblor. Salen en PNG gris con paleta de
    256 tonos (1,4 MB las 24).
  - **Van incluidas:** viven en `public/reader/lienzo/basicos/` y dentro del motor del teléfono (`KAVI_ASSETS`), así
    que sirven sin red (RF-CC17).
  - **Color (RF-CC13):** se elige en Estilo.
    - Los de textura (papeles, notas y cintas) llevan una capa del color recortada con su forma y el gris encima
      multiplicando, así conservan fibras, pliegues y rayas.
    - Los doodles toman el color en su trazo.
    - Exportar hace lo mismo en el `<canvas>`. La miniatura de Mi libreta los tiñe enteros.
  - **Pendiente (T343c):** que más packs de assets lleguen por la tienda en la nube, como los stickers (T337).

- **Hecho (C4, plantillas, T344, 21 oct 2026):**
  - **Nuevo recorte** ofrece tres formas de empezar: en blanco (vertical u horizontal), una de las **plantillas de
    KAVI** o una de **Mis plantillas**. Cada plantilla se ve en miniatura, con el libro del recorte puesto.
  - **Plantillas de KAVI** (`constants/canvas-templates.ts`, en la app): Reseña del libro, Collage de personaje, Citas
    favoritas, Experiencia de lectura y Cementerio DNF.
    - Van en neutros, sin colores ni Nobi, y con texto de ejemplo en el idioma de la app.
    - Están hechas con las piezas de C1–C3.
    - El recorte nace con el nombre de la plantilla.
  - **Usar una plantilla** la copia con ids nuevos (también de sus grupos). Su libro, "este libro", se vuelve el libro
    donde se hace el recorte.
  - **Guardar como plantilla** (RF-CC20), en la barra del recorte: pide un nombre.
    - Guarda el acomodo y el texto, pero no las fotos ni las imágenes propias: las polaroids quedan con sus huecos.
    - El libro del recorte se guarda como "este libro".
    - Se guarda en `library_canvas_templates` (migración `20261021110000`, solo del dueño).
    - Mantener presionada una plantilla propia la borra; los recortes hechos con ella no cambian.

## 11. Qué cambia en otras specs

- **13e (cuadernos, diarios, álbumes por capas) se reemplaza:** el cuaderno pasa a ser el **Journal** con
  portada (13i) y páginas-lienzo; los diarios y álbumes se vuelven **plantillas de página** del Journal; los
  trackers, módulos de una fase posterior. Los estilos "Moderno/luxury" y "Cottagecore con dragones" dejan de
  ser estilos de color fijo (chocaba con RF-CC11) y pasan a ser **colecciones de assets** recolorables (la
  primera, Fantasy / Dragon, como dice el documento). RF-BP5 ("cada estilo en los colores de los Nobi") se
  elimina.
- **13c RF-BH19 – RF-BH21 ("Recortes" del lector, T317) se renombran a "Fragmentos"**, para no chocar con los
  Recortes de aquí. Siguen igual: recortar texto o imagen al leer, y ahora se pegan en un recorte (RF-CC24).
- **13d (fichas):** la plantilla Book Review puede llevar el módulo **rating**; la ficha completa sigue siendo
  aparte. Decidido al llegar a L4 (19 oct 2026): la ficha sigue **aparte** (13d); el lienzo podrá mostrar una.

## 12. Fases propuestas

| Fase | Qué entra | Depende de |
|---|---|---|
| **C1 · Lienzo base** | Motor `canvas` (A5 vertical/horizontal, sin reacomodo, zoom), elementos con las 8 asas, giro, capas, agrupar, deshacer, guardar con cola sin red; módulos **texto, imagen, forma, sticker**. | Lo pegado (13c) |
| **C2 · Recortes** | Mi libreta en el libro, lista de recortes con miniatura, lienzo en blanco, + Agregar, color (HEX, recientes, mis colores), opacidad/borde/sombra, exportar imagen. | C1 |
| **C3 · Polaroids y papeles** | Módulo polaroid y sus variantes, quote, rating, libro; primer pack de **assets** (papeles, cintas, doodles) recolorables en la tienda. | C2, tienda (T337) |
| **C4 · Plantillas** | Las 5 de Recortes, **Guardar como plantilla** y Mis plantillas. | C3 |
| **C5 · Journal** | El Journal con páginas-lienzo y Get to Know the Reader; su portada es la spec 13i. | C4, 13i |
| **C6 · Más** | Módulos y plantillas avanzados, Journal con datos (año, estadísticas, premios), fragmentos pegados (T317). | C5 |

## 13. Criterios de aceptación

- *Dado* un recorte A5 vertical hecho en la computadora, *cuando* lo abro en el teléfono, *entonces* cada
  elemento está en el mismo lugar, tamaño, giro y capa (solo cambia la escala).
- *Dado* un recorte desde Character Collage, *cuando* borro un espacio de imagen y agrego cinco polaroids,
  *entonces* la plantilla no lo impide y nada queda bloqueado.
- *Dado* un papel rasgado en grises, *cuando* escribo `#7A1E3A` en HEX, *entonces* toma ese color conservando
  su textura, y el color queda en "recientes".
- *Dado* un recorte personalizado, *cuando* elijo **Guardar como plantilla** y lo uso en otro libro,
  *entonces* empiezo con el mismo acomodo y contenido de ejemplo, y el original no cambia.
- *Dado* un recorte, *cuando* elijo **Exportar**, *entonces* obtengo una imagen igual a lo que veo.
- *Dado* una plantilla de KAVI, *cuando* la abro, *entonces* no trae colores ni Nobi puestos.

## 14. Decisiones de Areli (14 oct 2026)

1. Los recortes del lector (13c, T317) se llaman **Fragmentos**.
2. Se aprueba **reemplazar la 13e** como dice §11.
3. Los Recortes usan **la medida de página del visor de PDF** (1 : √2, como A5), para compartir zoom,
   stickers y todo lo que ya existe (RF-CC4).
4. Tratamientos del MVP: impreso, hundido (deboss), **relieve (emboss)** y recortado (13i).
5. Los primeros assets/texturas salen del **muestrario de Areli, limpiado y hecho repetible por Claude**.
6. Se pueden tener **varios Journals**, los que la persona quiera.
7. Las plantillas tienen nombre **en los dos idiomas**.
