# Spec 13 · KAVI Library

> **Aprobada (12 oct 2026).** Escrita a partir de la visión de Areli el 9 oct; las decisiones B1–B9 de §9
> se aprobaron el 12 oct (T274). Es la spec general: el detalle vive en seis partes. El club de lectura
> (13f) se agregó el 12 oct (T304) con sus decisiones C1–C6.
>
> | Parte | Qué cubre | Requisitos |
> |---|---|---|
> | `13a-library-shelf.md` | La librería: vistas, libreros, orden y filtros, agregar libros | RF-BL |
> | `13b-library-reading.md` | Formatos y formas de leer (libro real, scroll, páginas de lado) | RF-BR |
> | `13c-library-tools.md` | Herramientas sobre la página: subrayar, notas, lápiz, stickers, voz… | RF-BH |
> | `13d-library-score-cards.md` | Fichas de calificación y su resumen | RF-BF |
> | `13e-library-creations.md` | Cuadernos, diarios y álbumes; plantillas por capas | RF-BP |
> | `13f-library-book-club.md` | Club de lectura: leer un PDF o EPUB con contactos, juntos y en vivo | RF-BC |

## 1. Qué es

**KAVI Library** es el módulo de la dimensión **intelectual**: un lugar para leer, anotar y crear, que se
siente como tener libros, cuadernos, diarios y álbumes de verdad. La meta es la mezcla de lo mejor de
Preview, Kindle, Canva, OneNote, Docs, PowerPoint, Excel y Paint, pero con la calidez de lo físico:
páginas que se pasan, post-its que se pegan, stickers que se rotan, separadores en el borde.

Es grande a propósito, y por eso se construye **por capas** (§8): primero un núcleo que ya sirve (librería
+ leer PDF y EPUB + subrayar y anotar), y encima, una a una, las piezas que lo vuelven especial.

## 2. Glosario

- **Pieza:** cualquier cosa de la librería. Hay dos familias:
  - **Libro:** un archivo que se importa y se lee (PDF, EPUB, documentos de oficina). Su contenido no se
    edita; encima se anota.
  - **Creación:** algo que se hace dentro de KAVI desde una plantilla: **cuaderno**, **diario**, **álbum de
    fotos**. Su contenido sí se edita.
- **Librero:** una colección propia de piezas, como un librero de la casa. Una pieza puede estar en varios.
- **Anotación:** lo que se pone **encima** de una página: subrayado, nota, trazo, sticker, post-it,
  separador, imagen. Nunca modifica el archivo original.
- **Ficha:** una tarjeta de calificación (estrellas, género, picante, notas…) que se pega a una pieza.
- **Plantilla:** el diseño de partida de una creación o de una página (portada, rayado, tracker, acomodo
  de fotos), hecho **por capas** que se pueden cambiar una por una.
- **Estilo:** una familia de plantillas con la misma estética (por ejemplo, *Ciudad/viajero*), disponible
  en varios colores.

## 3. Principios del módulo

1. **Lo físico manda.** Si en papel se puede (pegar, rotar, quitar y volver a poner, doblar la esquina),
   aquí también, y con el mismo gesto que uno haría con la mano.
2. **El original no se toca.** Las anotaciones viven aparte del archivo; borrarlas deja el libro como
   llegó, y se pueden exportar.
3. **Todo es personalizable, pero nada lo exige.** Cada pieza trae valores por omisión bonitos (los colores
   de los Nobi); personalizar es opcional (P2).
4. **Privado por omisión (P4).** Los libros, las anotaciones y las fichas son de quien los subió. Lo único
   que se comparte es un libro dentro de un **club de lectura** (13f), con contactos que se invitan y que
   aceptan.
5. **Multiplataforma con excepciones escritas (P5).** Lo que dependa del hardware (Apple Pencil, girar el
   teléfono) se dice en su requisito y tiene alternativa en las otras plataformas.

## 4. Cómo se conecta con el resto de KAVI (P1, P6)

- **Se desarrolla aparte.** Mientras no esté pulido, Library vive como módulo **oculto**: no aparece en Más
  ni se puede elegir para la barra (RF-N3/N6), y no está en `constants/modules`. Se entra por una ruta de
  laboratorio (`/(app)/library`) desde **Perfil → En desarrollo → Biblioteca**, en todas las versiones:
  hoy la app solo la usan Areli y sus testers (decisión del 12 oct 2026), y la pantalla avisa que está en
  construcción. "Conectarlo a la app" (§8, etapa L7) es registrarlo en `constants/modules`, mostrarlo en
  Más y en la barra, y quitar la fila de Perfil, sin tocar nada más.
- **Con el calendario** (al conectarlo): una actividad con el tema **Lectura** puede ligarse a una pieza
  ("leer *Rayuela* 30 min"); desde la actividad se abre el libro en la página donde iba, igual que una
  actividad de gimnasio abre su sesión. Library nunca modifica el calendario (P6).
- **Con el idioma (spec 12):** toda la interfaz en español e inglés; el contenido de los libros es el que
  es.

## 5. Lo técnico de fondo (resumen; el detalle está en cada parte)

- **Un solo motor de lectura web.** PDF (pdf.js) y EPUB (foliate-js o epub.js) se pintan con tecnología
  web en las tres plataformas: en el navegador directo y en el teléfono dentro de un WebView. Así un
  subrayado se ve igual en todos lados y se programa una sola vez (P5). La capa de anotaciones vive en el
  mismo motor.
- **Dibujo y animación nativos donde importa:** el lápiz (Apple Pencil, dedo) y el paso de página del modo
  *libro real* se dibujan con Skia y Reanimated, que ya usa la app.
- **Archivos en Cloudflare R2** (decisión B2, enmendada el 12 oct 2026), en un bucket privado con una
  carpeta por persona (`<uid>/<pieza>/<archivo>`). Todo lo demás —metadatos, anotaciones, fichas, tope de
  espacio— sigue en Supabase.
  - Las llaves de R2 nunca están en la app: viven en la función de Vercel `api/library-files`, que revisa la
    sesión de Supabase y, con la RLS de `library_items`, que la ruta sea de una pieza de quien pide (P4).
  - La función solo **firma direcciones temporales**; el archivo va directo entre el dispositivo y R2.
  - La firma de subida fija el tamaño: el archivo principal debe medir lo que dice su fila (la que cuida
    el tope de 500 MB) y una portada, como mucho 5 MB.
  - El archivo se descarga y se guarda en el dispositivo para leer sin conexión.
  - En el modo demo los archivos siguen en memoria.
- **Las anotaciones se guardan por posición estable:** en PDF, página y coordenadas relativas (0–1); en
  EPUB, su CFI. Así sobreviven a cambiar el tamaño de letra o la pantalla.
- **Formatos de oficina** (Word, PowerPoint, Excel y sus equivalentes de Apple) no se pueden pintar fiel en
  el teléfono: se **convierten a PDF** al importarlos y desde ahí se tratan como cualquier PDF —subrayar,
  anotar, todo— (decisión B3). La conversión corre en un servicio aparte; dónde se aloja se decide en L6.

## 6. Modelo de datos (borrador; toda tabla con RLS desde su creación)

| Tabla | Qué guarda |
|---|---|
| `library_items` | Cada pieza: dueño, familia (libro/creación), tipo (pdf, epub, docx…, cuaderno, diario, álbum), título, autor(es), portada, color dominante (hex), géneros, categoría, fecha en que se agregó, ruta del archivo, número de páginas, progreso y última posición. Con RF-BL19 – RF-BL20 suma editorial, lugar de publicación, edición, capítulos, sinopsis, y lomo y contraportada (ruta y color de cada uno). |
| `library_shelves` / `library_shelf_items` | Los libreros propios y qué piezas tiene cada uno, con su orden. |
| `library_annotations` | Cada anotación: pieza, tipo, posición (página + coordenadas o CFI), contenido (`jsonb`: texto, color, trazo, sticker, rotación, tamaño), orden de capa y si está guardada o "quitada" (los stickers se quitan y se vuelven a poner). |
| `library_card_templates` / `library_cards` | Diseños de ficha y las fichas pegadas a cada pieza, con sus valores y dónde van. |
| `library_pages` | Las páginas de una creación: plantilla, capas y su contenido. |
| `library_fonts` | Las fuentes que subió cada persona (archivo en Storage). |
| `library_series` | Las sagas de cada persona (nombre); cada libro guarda su saga y su número (`series_id`, `series_index`) (13a, RF-BL24). |
| `library_links` | Enlaces entre piezas: de, a, tipo (precuela, secuela, spin-off, mismo universo, relacionado, notas) (13a, RF-BL27). |
| `library_clips` | Los recortes: pieza (se queda en nulo si se borra, con el título guardado), tipo (texto o imagen), texto o ruta de la imagen en R2, posición, nota y fecha (13c, RF-BH19 – RF-BH21). |
| `library_clubs` / `library_club_members` | Los clubes de lectura, sus miembros y la copia de cada quien (13f §5). Las anotaciones del club son filas de `library_annotations` con `club_id`. |

El catálogo de plantillas, estilos, stickers y fuentes incluidas vive en el cliente
(`src/constants/library/`), como el catálogo de ejercicios.

**Aplicado en producción el 12 oct 2026** (`20261012100000_library.sql`, T275): las ocho tablas con RLS por
dueño (las hijas además comprueban que la pieza y el librero sean de quien escribe), el tope de 500 MB por
persona en la base (`library_quota`) y el bucket privado `library` de Supabase Storage con 50 MB por archivo
y una carpeta por persona. **Eliminar la cuenta** (RF-A12) borra también sus archivos: un almacén de archivos
no se borra en cascada con la base, así que la app vacía la carpeta antes de llamar a `delete_my_account`.

**Archivos en R2 (T313, 12 oct 2026).** Con el cambio de B2, los archivos pasan a Cloudflare R2 y el bucket
`library` de Supabase queda sin uso; se quita en una migración cuando se confirme que está vacío.

## 7. Fuera de esta versión

Compartir piezas o anotaciones con contactos fuera de un club de lectura (13f) · llamada de voz del club
(13f §6) · tienda o compra de libros · DRM (libros con candado de
Kindle, Apple Books o Google Play no se pueden abrir: solo archivos libres) · OCR de escaneos ·
traducción · sincronizar con Kindle o Goodreads · editar el texto de un PDF o EPUB (se anota encima, no se
reescribe) · colaboración en tiempo real en una creación.

## 8. Etapas

| Etapa | Qué entrega | Partes |
|---|---|---|
| **L0** | Spec aprobada (decisiones de §9), enmienda a la constitución, datos y Storage diseñados. | 13 |
| **L1** | Núcleo: librería con portadas, agregar PDF y EPUB, leer en scroll, progreso. | 13a, 13b |
| **L2** | Las tres formas de leer, incluido el *libro real* en horizontal con paso de página. | 13b |
| **L3** | Herramientas: subrayar, notas, separadores, post-its, stickers, zoom, letra, tema; luego lápiz, voz y diccionario. | 13c |
| **L4** | Fichas de calificación y su resumen. | 13d |
| **L5** | Creaciones: cuadernos, diarios y álbumes con plantillas por capas; trackers. | 13e |
| **L6** | Formatos de oficina (conversión a PDF) y fuentes propias. | 13b, 13c |
| **LC** | Club de lectura: copia para cada miembro, anotar juntos, avance de cada quien y sesión en vivo. | 13f |
| **L7** | Conectar: Library visible en Más y en la barra, y ligada a actividades de Lectura. | 13 |

Cada etapa termina con su incremento probado (P7) y se puede usar sola.

## 9. Decisiones (aprobadas el 12 oct 2026)

| # | Decisión | Lo aprobado |
|---|---|---|
| **B1** | ¿Library entra al alcance? | **Sí**, como V2 por enmienda a P8, y se desarrolla **oculto** hasta L7. |
| **B2** | ¿Dónde viven los archivos? | **Con límites:** 50 MB por archivo y 500 MB por persona, con aviso al acercarse. Se sincroniza entre dispositivos. **Enmienda (12 oct 2026):** los archivos van en **Cloudflare R2** y no en Supabase Storage. El plan gratis de Supabase da 1 GB en total y cobra la descarga; R2 da 10 GB gratis y **no cobra descargas**, que es lo que más gasta leer libros. Todo lo demás de KAVI sigue en Supabase. |
| **B3** | Formatos de oficina | **Se convierten a PDF** al importarlos y se tratan como PDF (subrayar, anotar…). Servicio de conversión aparte (LibreOffice/Gotenberg); su alojamiento se decide en L6. |
| **B4** | Diccionario | **Mixto y gratis:** inglés con *Free Dictionary API*; español con el diccionario del sistema donde exista (iPhone) y un enlace a la RAE en lo demás. |
| **B5** | Gesto para definir | **Mantener presionado** selecciona la palabra y el menú ofrece Definir, Subrayar, Copiar y Escuchar. |
| **B6** | Libro real en teléfono | ~~Obliga a girar a horizontal~~. **Enmienda (13 oct 2026):** funciona en las dos orientaciones y a pantalla completa: en vertical, una página que se dobla en 3D (como FlipHTML5); en horizontal, dos páginas con el lomo en medio. Se pasa de página con toques en los bordes, deslizando, con el *trackpad* o las flechas; el centro muestra los controles (13b, RF-BR5 y RF-BR7b). |
| **B7** | Escuchar | **Voz del sistema** (`expo-speech` / Web Speech) para empezar. Más adelante, una voz propia (la de Areli) por API: queda en el largo plazo de `tasks.md`. |
| **B8** | Nombre | **"Biblioteca"** en español y **"Library"** en inglés; el nombre largo es KAVI Library. |
| **B9** | Estilos de inicio | **Dos muy bien hechos:** **Moderno/luxury** (la portada de ciudad con edificios intercambiables vive aquí) y **Cottagecore** tierno, con dragones. Detalle en 13e. |
