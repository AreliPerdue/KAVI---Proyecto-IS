# Spec 13 · KAVI Library

> **Borrador (9 oct 2026).** Escrita a partir de la visión de Areli; nada de esto se implementa hasta
> aprobar las decisiones de §9. Es la spec general: el detalle vive en cinco partes que se aprueban por
> separado.
>
> | Parte | Qué cubre | Requisitos |
> |---|---|---|
> | `13a-library-shelf.md` | La librería: vistas, libreros, orden y filtros, agregar libros | RF-BL |
> | `13b-library-reading.md` | Formatos y formas de leer (libro real, scroll, páginas de lado) | RF-BR |
> | `13c-library-tools.md` | Herramientas sobre la página: subrayar, notas, lápiz, stickers, voz… | RF-BH |
> | `13d-library-score-cards.md` | Fichas de calificación y su resumen | RF-BF |
> | `13e-library-creations.md` | Cuadernos, diarios y álbumes; plantillas por capas | RF-BP |

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
4. **Privado por omisión (P4).** Los libros, las anotaciones y las fichas son de quien los subió. Compartir
   queda fuera de esta versión (§7).
5. **Multiplataforma con excepciones escritas (P5).** Lo que dependa del hardware (Apple Pencil, girar el
   teléfono) se dice en su requisito y tiene alternativa en las otras plataformas.

## 4. Cómo se conecta con el resto de KAVI (P1, P6)

- **Se desarrolla aparte.** Mientras no esté pulido, Library vive como módulo **oculto**: no aparece en Más
  ni se puede elegir para la barra (RF-N3/N6). Se entra por una ruta de laboratorio solo en desarrollo y
  en el demo. "Conectarlo a la app" (§8, etapa L7) es mostrarlo en Más y en la barra, sin tocar nada más.
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
- **Archivos en Supabase Storage**, en un bucket privado con RLS por dueño (P4). La base guarda los
  metadatos; el archivo se descarga y se guarda en el dispositivo para leer sin conexión.
- **Las anotaciones se guardan por posición estable:** en PDF, página y coordenadas relativas (0–1); en
  EPUB, su CFI. Así sobreviven a cambiar el tamaño de letra o la pantalla.
- **Formatos de oficina** (Word, PowerPoint, Excel y sus equivalentes de Apple) no se pueden pintar fiel en
  el teléfono: se **convierten a PDF** al importarlos (decisión B3).

## 6. Modelo de datos (borrador; toda tabla con RLS desde su creación)

| Tabla | Qué guarda |
|---|---|
| `library_items` | Cada pieza: dueño, familia (libro/creación), tipo (pdf, epub, docx…, cuaderno, diario, álbum), título, autor(es), portada, color dominante (hex), géneros, categoría, fecha en que se agregó, ruta del archivo, número de páginas, progreso y última posición. |
| `library_shelves` / `library_shelf_items` | Los libreros propios y qué piezas tiene cada uno, con su orden. |
| `library_annotations` | Cada anotación: pieza, tipo, posición (página + coordenadas o CFI), contenido (`jsonb`: texto, color, trazo, sticker, rotación, tamaño), orden de capa y si está guardada o "quitada" (los stickers se quitan y se vuelven a poner). |
| `library_card_templates` / `library_cards` | Diseños de ficha y las fichas pegadas a cada pieza, con sus valores y dónde van. |
| `library_pages` | Las páginas de una creación: plantilla, capas y su contenido. |
| `library_fonts` | Las fuentes que subió cada persona (archivo en Storage). |

El catálogo de plantillas, estilos, stickers y fuentes incluidas vive en el cliente
(`src/constants/library/`), como el catálogo de ejercicios.

## 7. Fuera de esta versión

Compartir piezas o anotaciones con contactos · tienda o compra de libros · DRM (libros con candado de
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
| **L7** | Conectar: Library visible en Más y en la barra, y ligada a actividades de Lectura. | 13 |

Cada etapa termina con su incremento probado (P7) y se puede usar sola.

## 9. Decisiones pendientes (se aprueban antes de L1)

| # | Decisión | Recomendación |
|---|---|---|
| **B1** | Enmendar P8 para traer KAVI Library al alcance (V2), desarrollado oculto hasta L7. | Sí. |
| **B2** | Espacio: el plan gratis de Supabase da 1 GB de Storage en total y 50 MB por archivo. ¿Límite por persona, o plan de pago? | Empezar con 50 MB por archivo y 500 MB por persona, y avisar al acercarse. |
| **B3** | Formatos de oficina: convertir a PDF en un servidor (Gotenberg/LibreOffice en un contenedor; Vercel no lo corre) o mostrar solo lo que se puede en el cliente (Word como texto, Excel como tabla, sin PowerPoint). | Etapa L6 aparte; empezar con Word y Excel en el cliente y decidir el servidor ahí. |
| **B4** | Diccionario: no hay uno gratis que sirva igual en las tres plataformas y en español. | Inglés con *Free Dictionary API*; español con el diccionario del sistema donde exista (iOS) y un enlace a la RAE en lo demás. |
| **B5** | Gesto para el diccionario: doble toque o mantener presionado. | Mantener presionado selecciona la palabra (es lo que el teléfono ya hace) y el menú ofrece "Definir". |
| **B6** | ¿El *libro real* obliga a girar el teléfono, o lo sugiere? | Obliga en teléfono (es lo que pediste); en tableta y web se adapta al ancho. |
| **B7** | Escuchar el texto: voz del sistema (gratis, sin red) o voces naturales de pago. | Voz del sistema (`expo-speech` / Web Speech). |
| **B8** | Nombre del módulo en la interfaz. | "Biblioteca" / "Library" (KAVI Library). |
| **B9** | Estilos de la primera versión y quién dibuja las capas (detalle en 13e §7). | Dos estilos muy bien hechos: Ciudad/viajero y uno minimalista. |
