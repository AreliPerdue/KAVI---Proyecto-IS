# Spec 13a · KAVI Library — La librería

> **Aprobada (12 oct 2026).** Parte de la spec 13; ver ahí el glosario, el modelo de datos y las decisiones.

## 1. Qué ve la persona

Al abrir Library aparece **su librería**: todas sus piezas (libros y creaciones), con un selector de vista
arriba, un buscador, y los controles de orden y filtros. Abajo, el botón **+** para agregar.

## 2. Vistas (RF-BL1 – RF-BL3)

- **RF-BL1. Portadas en rejilla.** Cada pieza es su portada a tamaño de libro (proporción 2:3), en columnas
  que se ajustan al ancho (2 en teléfono, 4–6 en web). Debajo, título y autor en una línea cada uno.
- **RF-BL2. Librero.** Las piezas se ven **de lomo**, paradas una junto a otra sobre repisas, como un
  librero de verdad. El lomo lleva el color dominante de la portada y el título en vertical. El grosor del
  lomo sale del número de páginas (con un mínimo y un máximo para que se pueda tocar). Tocar un lomo lo
  "saca" del librero con una animación corta y muestra su portada antes de abrirlo.
- **RF-BL3. Lista.** Una fila por pieza: portada chica a la izquierda, título, autor y avance ("p. 120 de
  340") a la derecha.
- **RF-BL4.** La vista elegida se recuerda en el dispositivo, como la del calendario.

## 3. Libreros propios (RF-BL5 – RF-BL7)

- **RF-BL5.** Además de "Todos", la persona puede crear **libreros** con nombre, color e icono ("Por leer",
  "Favoritos", "Escuela"). Es opcional: quien no quiera organizar, no ve ningún paso extra (P2).
- **RF-BL6.** Una pieza puede estar en varios libreros a la vez; quitarla de uno no la borra.
- **RF-BL7.** Los libreros se eligen como pestañas arriba de la librería y se reordenan arrastrando. Dentro
  de un librero las piezas también se reordenan arrastrando (mismo gesto que en Listas).

## 4. Orden y filtros (RF-BL8 – RF-BL10)

- **RF-BL8. Ordenar por:** título (A–Z), autor, categoría, fecha en que se agregó, o "como las acomodé"
  (el orden manual del librero).
- **RF-BL9. Categoría** es una sola por pieza y la elige la persona (con sugerencias: Novela, Escuela,
  Trabajo, Recetas…). Es distinta del **género**, que puede ser varios y viene del archivo si lo trae.
- **RF-BL10. Filtros** combinables: fecha en que se agregó (rango), género, autor y **color** —se elige un
  color y aparecen las piezas cuya portada se le parece (por distancia de color, no por igualdad exacta)—.
  Los filtros activos se ven como chips que se quitan con una X, y el botón de filtros lleva su cuenta,
  igual que en el calendario.

## 5. Agregar piezas (RF-BL11 – RF-BL14)

- **RF-BL11.** El **+** ofrece: "Importar un libro" (elige un archivo) y "Crear" (cuaderno, diario, álbum
  → spec 13e). Mientras no existan las creaciones (L5), el **+** abre directo el selector de archivos.
- **RF-BL12.** Al importar, KAVI lee del archivo lo que pueda —título, autor, portada, géneros, número de
  páginas— y deja corregir todo antes de guardar. Si no hay portada, genera una con el título sobre un
  color de los Nobi.
  - **EPUB:** título, autores, temas (como géneros) y la imagen de portada salen de su paquete OPF.
  - **PDF:** título, autor, palabras clave (como géneros) y páginas salen de su ficha interna. Su portada es
    la **primera página dibujada**, como la muestra el Finder: el motor de lectura la dibuja después de
    subir el libro y se guarda en R2 con su color dominante (T279). Mientras, y si no se pudo dibujar, se
    ve la portada generada. Los PDF que se subieron antes reciben la suya la próxima vez que se abre la
    librería.
  - Si el archivo no trae título, se propone el nombre del archivo sin extensión.
  - Varios autores se escriben separados por comas; lo que trae el archivo se guarda tal cual mientras no
    se toque (un autor "Cortázar, Julio" no se parte en dos).
- **RF-BL13. Color de la portada:** se calcula el color dominante al importar (o al cambiar la portada) y se
  guarda como hex; es lo que usan el lomo (RF-BL2) y el filtro de color (RF-BL10).
- **RF-BL14.** Formatos que se aceptan y su límite de tamaño: los de la spec 13b y la decisión B2. El formato
  se reconoce por el contenido, no por el nombre. Un archivo con candado se rechaza con un mensaje claro de
  por qué y no deja nada en la librería:
  - **DRM de tienda:** EPUB con `rights.xml` (Adobe), `sinf.xml` (Apple) o capítulos cifrados; PDF con un
    manejador de cifrado que no es el estándar.
  - **PDF que pide contraseña para abrirse:** se rechaza.
  - **PDF que solo restringe imprimir o copiar** (contraseña de dueño, la de usuario vacía): **se acepta**,
    porque cualquier lector lo abre. Se comprueba con el método del estándar (ISO 32000, revisiones 2 a 6),
    sin descifrar el libro. Sus textos internos van cifrados, así que el título sale del nombre del archivo.
  - Las fuentes ofuscadas de un EPUB libre no cuentan como candado.

## 6. Cada pieza (RF-BL15 – RF-BL17)

- **RF-BL15.** Mantener presionada una pieza la selecciona, como en Listas (RF-L28): con varias se puede
  mover a un librero, cambiar categoría, o eliminar. Mientras se selecciona, tocar una pieza la elige o la
  suelta en vez de abrirla, se esconde el **+** y "Atrás" (Android) sale de la selección. El menú de cada
  pieza se abre con su botón **⋯** —en web no hay pulsación larga con mouse— y desde ahí también se puede
  empezar a seleccionar. (T281, 13 oct 2026)
- **RF-BL16.** El menú de una pieza: abrir, editar datos (título, autor, portada, categoría, géneros),
  agregar a librero, ver su ficha (13d), eliminar. Eliminar pide confirmación y dice que también se borran
  sus anotaciones y fichas.
- **RF-BL17.** Cada pieza recuerda dónde se quedó; abrirla vuelve ahí.

## 7. Buscar (RF-BL18)

- **RF-BL18.** El buscador encuentra por título, autor, categoría y género. Buscar **dentro** del texto de
  los libros es de la spec 13b.

## 8. Lo que venía de KAVI Reader (RF-BL19 – RF-BL22)

Areli empezó Library en marzo de 2026 como un proyecto aparte, **KAVI Reader** (repos `kavi_reader` e
`interactive-reader`, Next.js con pdf.js). Lo descartó, pero tenía estas ideas que no estaban en esta spec
(agregadas el 12 oct 2026):

- **RF-BL19. Más datos del libro**, todos opcionales, en "Editar datos" (RF-BL16) y en la hoja de importar
  bajo "Más datos": **editorial**, **lugar de publicación**, **edición**, **número de capítulos** y
  **sinopsis**. Un EPUB los propone de su OPF (`dc:publisher`, `dc:description`); un PDF no los trae.
- **RF-BL20. Portada, lomo y contraportada.** Además de la portada, se pueden poner imágenes propias del
  **lomo** y de la **contraportada**, cada una con su color. El librero (RF-BL2) usa la imagen del lomo si la
  hay; la contraportada se ve al final del libro real (13b) y es donde puede ir pegada una ficha (13d,
  RF-BF4). Sin imagen, el lomo y la contraportada salen del color de la portada.
- **RF-BL21. Cuentagotas.** El color de cada parte se calcula solo (RF-BL13), pero se puede cambiar tocando un
  punto de su imagen, que toma ese color, o escribiendo el hex. Se ve una muestra junto al valor.
- **RF-BL22. Encabezado de la librería** con el wordmark **KAVI Library** (Moirai One + Poiret One, dentro de
  `components/ui/Wordmark`, como el de la app) y un saludo con el nombre: "Qué gusto verte de nuevo, Areli".

## 9. Portada propia (RF-BL23) — 13 oct 2026

- **RF-BL23. Cambiar la portada.** Por omisión cada libro muestra la portada que trae el archivo (la imagen
  del EPUB o la primera página del PDF, RF-BL12). Desde el menú de la pieza (RF-BL16) → **"Cambiar
  portada"** se pone otra imagen:
  - **Teléfono:** elegirla de la galería, tomar una foto o elegir un archivo de imagen; o **pegarla** si hay
    una imagen copiada.
  - **Web:** elegir un archivo, **arrastrarla** sobre la portada (se ilumina al pasar por encima) o
    **pegarla** con ⌘V / Ctrl+V.
  - Antes de guardarla se ve cómo queda en proporción de libro (2:3), con su color dominante calculado
    (RF-BL13), que después se puede cambiar con el cuentagotas (RF-BL21).
  - **"Volver a la original"** regresa a la portada del archivo.
  - La imagen se reduce a 1200 px de ancho si es más ancha (nunca se agranda) y se guarda en JPEG, así
    sirven igual JPEG, PNG, WebP o HEIC (fotos de iPhone). Queda en R2 en la carpeta del libro, **aparte**
    de la del archivo (`custom_cover_path`): por eso volver a la original no tiene que sacarla otra vez del
    archivo. La función de archivos acepta portadas de hasta 5 MB. (T314, 13 oct 2026)

## 10. Sagas y libros enlazados (RF-BL24 – RF-BL27) — 13 oct 2026

- **RF-BL24. Sagas.** Un libro puede pertenecer a una **saga** (serie) con su **número** dentro de ella
  ("Una corte de rosas y espinas", #1). La saga y el número se ponen al editar los datos (RF-BL16) o al
  importar; si el EPUB los trae (`belongs-to-collection` de EPUB 3 o `calibre:series`), KAVI los propone.
  Varios libros se pueden poner en la misma saga a la vez con la selección múltiple (RF-BL15).
- **RF-BL25. Cómo se ven las sagas: lo elige la persona.** Un ajuste de la librería, recordado en el
  dispositivo como la vista (RF-BL4):
  - **Apiladas:** cada saga es una sola pila de portadas ("ACOTAR · 5 libros"); tocarla abre la saga con
    sus libros en orden.
  - **Sueltas:** cada libro en su lugar, con una etiqueta "ACOTAR #2".
  En cualquiera de las dos se puede ordenar y filtrar por saga (RF-BL8, RF-BL10), y dentro de una saga el
  orden es siempre el número.
- **RF-BL26. El siguiente de la saga.** Al terminar un libro (100 %), además de la ficha (13d, RF-BF6),
  KAVI ofrece "Seguir con #3: …" si el siguiente ya está en la librería.
- **RF-BL27. Libros enlazados.** Fuera de las sagas, un libro se puede **enlazar** con otro libro o con una
  creación propia (13e):
  - **Entre libros**, con el tipo de enlace: *precuela*, *secuela*, *spin-off*, *mismo universo* o
    *relacionado* (libre). El enlace se ve en los dos libros, cada uno con su sentido: si A es precuela de B,
    B dice que A es su precuela.
  - **Libro ↔ cuaderno o diario:** por ejemplo, el cuaderno de notas de una saga o el diario de lectura. Se
    abre uno desde el otro. (Las creaciones llegan en L5; hasta entonces solo se enlazan libros.)
  - Los enlaces se ven en "Detalles" del libro, y tocar uno abre la otra pieza.

## 11. Criterios de aceptación

- *Dado* que tengo 20 libros, *cuando* elijo la vista Librero, *entonces* los veo de lomo sobre repisas, con
  el color de su portada y el título en vertical.
- *Dado* un librero "Por leer", *cuando* agrego un libro que ya está en "Favoritos", *entonces* aparece en
  los dos, y quitarlo de uno no lo saca del otro.
- *Dado* que filtro por un azul, *cuando* aplico el filtro, *entonces* veo los libros de portada azulada y
  un chip con ese color que lo quita.
- *Dado* un PDF sin portada, *cuando* lo importo, *entonces* aparece con una portada generada con su título.
- *Dado* un EPUB con candado, *cuando* intento importarlo, *entonces* KAVI me dice que no se puede abrir
  porque tiene protección y no lo agrega.
- *Dado* un PDF que solo prohíbe imprimir, *cuando* lo importo, *entonces* se agrega; *dado* uno que pide
  contraseña para abrirse, *entonces* KAVI me dice por qué no y no lo agrega.
- *Dado* un libro con imagen de lomo, *cuando* veo el librero, *entonces* su lomo es esa imagen; *cuando* toco
  un punto dorado de la portada con el cuentagotas, *entonces* el color de la portada pasa a ese dorado.
- *Dado* un PDF con la portada de su primera página, *cuando* arrastro una imagen sobre ella en la web (o la
  pego con ⌘V), *entonces* veo cómo queda y, al guardar, es su portada; *cuando* elijo "Volver a la
  original", *entonces* regresa la primera página.
- *Dado* cinco libros de la misma saga con su número, *cuando* elijo "Apiladas", *entonces* veo una pila
  "ACOTAR · 5 libros" y al tocarla los libros en orden; *cuando* elijo "Sueltas", *entonces* cada libro
  aparece con "ACOTAR #n".
- *Dado* que termino el #2 de una saga y tengo el #3, *cuando* llego al 100 %, *entonces* KAVI me ofrece
  seguir con el #3.
- *Dado* que enlazo A como precuela de B, *cuando* abro los detalles de B, *entonces* dice que A es su
  precuela y tocarlo abre A.
