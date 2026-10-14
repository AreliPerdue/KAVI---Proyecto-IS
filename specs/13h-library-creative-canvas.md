# Spec 13h · KAVI Library — Lienzo creativo: Recortes y Journal

> **Propuesta (14 oct 2026), falta aprobarla.** Parte de la spec 13. Sale del documento conceptual de Areli
> "KAVI Library — Recortes / Journal" (v8). Si se aprueba, **reemplaza la spec 13e** (ver §11) y cambia el
> nombre de los recortes del lector de la 13c (RF-BH19 – RF-BH21, ver §11).
>
> Principio: **"KAVI gives you the canvas. You give it the color."** KAVI pone el lienzo, la estructura y
> las piezas; la persona pone el color, la personalidad y el whimsy.

## 1. Dos lugares, un solo lienzo (RF-CC1 – RF-CC3)

- **RF-CC1. Recortes = "yo con este libro".** Viven dentro de un libro: Library → libro → **Mi libreta** →
  Recortes. Guardan la experiencia de esa lectura: personajes, fan art, quotes, teorías, momentos, playlists,
  moodboards, reseña, DNF. Un libro puede tener muchos recortes; cada recorte es de un solo libro.
- **RF-CC2. Journal = "yo como lector".** Vive a nivel de toda la biblioteca (una entrada propia en Library).
  Habla de la persona: Get to Know the Reader, su año lector, estadísticas, premios, eras, metas. Es un
  **cuaderno**: tiene portada (spec 13i) y páginas, y cada página es un lienzo.
- **RF-CC3. Un solo editor.** Recortes y páginas del Journal usan el mismo **Lienzo creativo**: las mismas
  piezas, módulos, herramientas, color, plantillas y biblioteca personal. No hay dos editores.

**Diferencia con lo que ya existe:** una **nota** o post-it (13c) es información rápida sobre la página; una
**ficha** (13d) evalúa el libro con campos; un **recorte** es composición visual y memoria. Un recorte puede
llevar texto, pero nunca debe sentirse como un formulario ni como una nota grande.

## 2. El lienzo es un objeto, no una página web (RF-CC4 – RF-CC7)

- **RF-CC4. Formato A5** (148 × 210 mm), **vertical u horizontal**, para Recortes y para páginas del
  Journal. Se elige al crear; la proporción nunca cambia.
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
    Los nombres se muestran traducidos en español (spec 12).

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
- **Se dibuja en el motor web** que ya usa el lector (WebView en el teléfono): una página `canvas` que
  reutiliza lo de `annotations.js` (asas, giro, arrastre, escribir directo, capas) y sus pruebas. Así el
  lienzo se ve igual en web e iOS/Android y exportar a imagen es dibujarlo en un `<canvas>`.
- **Recolorear** una pieza en grises: `mix-blend-mode`/filtro en el motor (multiplicar el color sobre la
  textura) y lo mismo al exportar.
- **Datos (spec 02):** `library_canvases` (dueño, contexto `book` o `journal`, `item_id` o `journal_id`,
  título, formato, orientación, `doc` jsonb, versión, miniatura en R2) y `library_canvas_templates` (Mis
  plantillas: nombre, formato, `doc`, miniatura). "Mis colores" va en el perfil. RLS: solo lo propio. Las
  imágenes subidas van a R2 como las de las anotaciones (y se borran a la hora si se quitan, T333).
- **Plantillas de KAVI** en el cliente (`src/constants/library/canvas-templates/`), igual que el catálogo de
  ejercicios: crecen sin migraciones.

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
  aparte. Se decide al llegar a L4 si la ficha se vuelve un módulo del lienzo.

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

## 14. Por decidir con Areli

1. ¿Aprobar el cambio de nombre de los recortes del lector (T317) a **Fragmentos**?
2. ¿Los Recortes también en **A5** (como el Journal), o un lienzo más libre (cuadrado, alto de historia)?
3. ¿Se aprueba **reemplazar 13e** como dice §11?
4. ¿Quién produce los primeros assets (papeles, cintas, doodles)? Con un muestrario en grises yo los preparo
   para que se repitan sin cortes y se recoloreen; las ilustraciones nuevas son tuyas o con licencia.
5. ¿Nombres de las plantillas en inglés (como en el documento) o traducidos en la app en español?
