# Spec 13c · KAVI Library — Herramientas sobre la página

> **Aprobada (12 oct 2026).** Parte de la spec 13. Todo lo de aquí es una **anotación**: vive encima de la
> página, nunca cambia el archivo (spec 13 §3), y funciona igual en libros y en creaciones.

## 1. Leer mejor (RF-BH1 – RF-BH6)

- **RF-BH1. Zoom** con pellizco (o Ctrl/⌘ y rueda en web) en cualquier forma de leer; doble toque vuelve al
  ajuste de página.
- **RF-BH2. Tamaño de letra** (EPUB y creaciones; en PDF el equivalente es el zoom).
- **RF-BH3. Tipo de letra:** una selección incluida (con serifas, sin serifas, para dislexia, manuscrita) y
  las que suba la persona (RF-BH4).
- **Hecho (T288, 13 oct 2026).**
  - **Zoom en PDF:** pellizco (o Ctrl/⌘ y la rueda, o pellizcar en el trackpad) hasta 400 %; al soltar, la
    página se vuelve a pintar a ese tamaño, nítida, dejando quieto lo que estaba bajo los dedos. Acercada, se
    recorre con el dedo o la rueda y no pasa de hoja (el centro sigue mostrando los controles). Una pastilla
    "150 % · Ajustar a la página" (y el doble toque) vuelve a la página entera. Cambiar de forma de leer
    también la ajusta.
  - **Libro real:** el pellizco acerca la hoja; acercada, arrastrar la mueve (no la dobla) y el doble toque o
    la pastilla la ajustan.
  - **EPUB:** el pellizco y Ctrl/⌘ + rueda cambian el **tamaño de letra** (en pasos de 10 %, 70 – 200 %),
    que es lo que cuenta en un libro que se reacomoda; también en la hoja "Lectura" con **A− / A+**. El libro
    real se vuelve a acomodar en el mismo lugar.
  - **Letras incluidas** (OFL, Fontsource): Original (la del libro), **Con serifas** (Literata), **Sin
    serifas** (Atkinson Hyperlegible), **Para dislexia** (OpenDyslexic) y **Manuscrita** (Patrick Hand); solo
    alfabeto latino, normal y negrita. Viajan dentro del motor (en el teléfono, sin red) y su licencia va
    junto a los archivos en `/reader/vendor/fonts/`. Tamaño y letra son uno para todos los libros y se
    recuerdan en el dispositivo.
- **RF-BH4. Fuentes propias.** Se suben archivos `.ttf`/`.otf`/`.woff2`. Antes de la primera, un aviso que
  hay que aceptar: *"Tú eres responsable de tener la licencia de las fuentes que subas. Usa fuentes libres o
  que te pertenezcan."* Se guardan en R2, como los libros, y se usan en todos los dispositivos de la persona.
- **RF-BH5. Tema del lector:** claro, oscuro, sepia, y personalizado (color de la página y de la letra por
  separado). Independiente del tema de la app.
  - **Hecho (T288b, 13 oct 2026).** En la hoja **"Lectura"** del lector (la de la forma de leer), con una
    muestra de cómo se ve. Oscuro es fondo negro `#000000` y letra `#F2F2F2`; sepia, `#F4ECD8` y `#5B4636`.
    En "Propio" se eligen página y letra de una paleta o en hex; si juntos no llegan a 4.5:1 de contraste,
    se avisa pero se deja. Es uno para todos los libros y se recuerda en el dispositivo.
  - EPUB: el texto toma la letra y el fondo la página (lo que el libro pinte de otro color se iguala). PDF:
    un filtro de dos tonos (lo blanco al color de la página, lo negro al de la letra; las fotos quedan en esos
    dos tonos); con página blanca, el PDF queda tal cual. Funciona en las tres formas de leer.
- **RF-BH6. Escuchar.** Un botón lee en voz alta desde donde va la página (voz del sistema, decisión B7),
  resaltando la frase que se está leyendo; velocidad ajustable; sigue con la pantalla bloqueada en teléfono.

## 2. Marcar (RF-BH7 – RF-BH9)

- **RF-BH7. Subrayar:** seleccionar texto ofrece colores (los de los Nobi) y estilos (resaltado, subrayado,
  tachado). Tocar un subrayado deja cambiarlo, agregarle nota o quitarlo.
- **RF-BH8. Definir:** al seleccionar una palabra, el menú ofrece **Definir** (decisión B5), que muestra el
  significado sin salir del libro (fuente según decisión B4).
- **RF-BH9. Copiar** el texto seleccionado (solo de libros sin restricción).
- **Hecho (T287, 13 oct 2026).** Al seleccionar texto (scroll o páginas de lado), la barra de abajo cambia
  a la de lo seleccionado: cuatro colores a la mano (el último usado primero; amarillo, verde lima, azul
  cielo y rosa), el **estilo** (un toque pasa de resaltado a subrayado a tachado), **Definir** (solo si es
  una palabra) y **Copiar**. Tocar un color subraya y suelta la selección. Tocar un subrayado abre su hoja:
  estilo, la paleta completa de los Nobi, una **nota** (hasta 1000 letras) y **Quitar subrayado**. Todo entra
  al deshacer y al panel (con su nota).
  - Se guarda el texto subrayado con espacios sencillos (hasta 2000 letras). En PDF, un rectángulo por renglón
    en 0–1 de su página; en EPUB, el CFI del rango, que foliate vuelve a dibujar sobre las mismas palabras
    aunque cambie la letra o la forma de leer.
  - **También en el libro real (T330, 13 oct 2026, pedido de Areli).** Con mouse, arrastrar sobre el texto
    selecciona; la hoja solo se dobla si el arrastre empieza en una esquina del libro. Con el dedo, mantener
    presionado selecciona y deslizar pasa de hoja. Cada hoja de un PDF lleva su capa de texto; en EPUB, la
    selección de la hoja se traduce al CFI del capítulo, así el subrayado es el mismo en las tres formas de
    leer. Tocar un subrayado abre su hoja. (Lo pegado sigue sin tocarse ahí: arrastrar es doblar la hoja.)
  - **Definir (B4):** en inglés, **Wiktionary** (hasta seis acepciones con su ejemplo, sin HTML; cita la
    fuente) y, si no responde, la Free Dictionary API; cada uno se corta a los 8 s y lo dice. No se busca en
    inglés si el libro está en español (el EPUB dice su idioma), si la palabra tiene letras del español
    (acentos, ñ) o si Wiktionary solo la tiene en español. Abajo, un enlace para seguir afuera según el
    idioma de la app: en español, **Buscar en la RAE**; en inglés, **Merriam-Webster** para una palabra en
    inglés y **WordReference** (su traducción) para una en español —la RAE no sirve a quien lee la app en
    inglés— (14 oct 2026, pedido de Areli). (Enmienda del 13 oct 2026: a la Free Dictionary API le faltaban palabras comunes.) El diccionario del sistema
    del iPhone necesita un módulo nativo: queda pendiente para cuando haya cuenta de Apple Developer.
  - **Copiar:** un PDF que prohíbe copiar (permisos del archivo) deja subrayar pero el botón dice "Este libro
    no deja copiar su texto". La web permite `en.wiktionary.org` y `api.dictionaryapi.dev` en su CSP.

## 3. Escribir (RF-BH10 – RF-BH12)

- **RF-BH10. Cuadros de texto** en cualquier lugar de la página: se escriben, se mueven, se cambian de tamaño
  y de color. Es la forma de escribir en web.
- **RF-BH11. Lápiz y dedo** (teléfono y tableta): pluma, marcador, lápiz de color y borrador, con grosor y
  color. Con **Apple Pencil**, presión e inclinación; con el dedo, trazo de grosor fijo. Un modo "solo lápiz"
  evita que la palma o el dedo dibujen sin querer.
  - Excepción de plataforma (P5): en web se dibuja con mouse o lápiz de tableta, sin presión.
- **RF-BH12. Imágenes:** se insertan desde la galería o la cámara, se mueven, rotan y cambian de tamaño.
- **Hecho (T289, 14 oct 2026).**
  - **Cuadro de texto:** herramienta en la barra; se toca dónde va y se escribe **ahí mismo** sobre la página
    (sin hoja aparte). Sin fondo, con la letra del color del tema del lector; desde **Color** se elige otro
    (tinta, papel, la portada o los Nobi) y el tamaño de la letra (50 – 300 %). Estirarlo reacomoda sus
    renglones; vacío, se quita.
  - **Imagen:** en el teléfono, de la galería o la cámara; en la web, un archivo. Se reduce a JPEG (1200 px) y
    se toca dónde va, ya con su proporción. Se ve al instante y sube a R2 en la carpeta del libro
    (`<persona>/<libro>/anotaciones/<id>.jpg`, hasta 5 MB; la función de archivos lo permite). Sin conexión no
    se puede pegar (se dice y se quita). Se gira con el asa de arriba (se queda en los ángulos rectos cerca de
    ellos) o 90° con **Girar**. Quitarla no borra el archivo, así deshacer la trae de vuelta.
  - Los dos tienen las 8 asas, capa, candado, deshacer y panel, en PDF y EPUB, y se ven en el libro real.

## 4. Pegar cosas, como en papel (RF-BH13 – RF-BH16)

- **RF-BH13. Stickers:** de una colección incluida (por estilo, spec 13e) o de una imagen propia. Se colocan
  en cualquier parte, se **rotan** con dos dedos, cambian de tamaño, se **quitan** y quedan en una charola
  ("Quitados") de donde se **vuelven a poner** —como un sticker reutilizable—.
- **RF-BH14. Post-its:** cuadrados de color (paleta de los Nobi) con texto o trazo; se pegan, se mueven, se
  rotan un poco y se pueden **doblar** para que solo se vea una esquina. Tocar uno doblado lo abre.
- **RF-BH15. Separadores:** las pestañitas que salen del borde. La persona elige **en qué borde** (arriba,
  abajo, izquierda o derecha) y **a qué altura**; llevan color y una palabra corta. Se ven desde fuera, en
  el canto del libro, y tocar uno salta a su página.
- **RF-BH16. Capas:** lo pegado lleva orden (traer al frente, mandar atrás) y se puede **bloquear** para no
  moverlo sin querer.
  - **Hecho (T286, 13 oct 2026).** Tocar algo pegado lo elige (con un aro); abajo del lector aparecen
    **Escribir · Traer al frente · Mandar atrás · Bloquear · Quitar · Listo**. Lo bloqueado lleva un candado
    al elegirlo, avisa "Bloqueado: no se mueve hasta que lo desbloquees" y no se arrastra. Tocar la página
    suelta lo elegido. Dos toques seguidos sobre un post-it lo abren para escribir.
  - En el **libro real** lo pegado se ve en su hoja, pero se pega y se mueve en scroll o en páginas de lado:
    ahí arrastrar es doblar la hoja (excepción de forma, no de plataforma).
- **Post-it básico (adelantado de RF-BH14 en T286, a pedido de Areli):** el botón **Pegar post-it** de la
  barra; el siguiente toque en la página lo pega ahí, elegido y abierto para escribir (hasta 280 letras) y
  elegir su color de la paleta de los Nobi. El siguiente sale del último color usado. Se arrastra a otro
  lugar o, en scroll, a otra página. Girarlo, doblarlo y el trazo siguen en T290.
- **Post-it estirable y del color de la portada (T329, 13 oct 2026, pedido de Areli).** Elegido y sin
  candado, lleva **8 asas al estilo KAVI**: una "L" en cada esquina y una rayita en medio de cada lado, en
  tinta con un halo claro, cada una con 32 px para tomarla (14 oct: antes eran circulitos y franjas, y jalar
  una también arrastraba la nota; ya no se mueve al estirarla). Se escribe **directo en el post-it** (doble
  toque o **Escribir**), sin hoja aparte; el color se elige desde **Color**. La letra sigue al lado más corto. Jalar una
  cambia el ancho y el alto sin mover la orilla de enfrente; ya no tiene que ser cuadrado (la posición guarda
  su proporción, `ar` = alto entre ancho, entre 0.25 y 4; mínimo 48 px por lado y sin salirse de la página).
  La letra crece con el ancho. En la hoja del post-it, el **color de la portada** del libro sale primero en la
  paleta, con su hex.

## 5. Encontrar lo anotado (RF-BH17 – RF-BH18)

- **RF-BH17.** Un panel lista todo lo anotado de la pieza —subrayados, notas, post-its, separadores— con su
  página; tocar uno salta ahí. Se filtra por tipo y color.
  - **Hecho (T286).** Botón **Anotaciones** arriba del lector. En el orden del libro (PDF: página y altura;
    EPUB: avance y luego el CFI), cada fila con su tipo, color, texto y "p. 12" o "34 %". Solo se ofrecen
    filtros que encuentran algo. Tocar una fila lleva ahí y la deja elegida. Lo quitado (la charola de
    stickers) no sale.
- **RF-BH18.** Deshacer y rehacer en todo lo de esta spec (como el logger del gym, RF-F40).
  - **Hecho (T286).** Deshacer y rehacer en la barra de abajo. Cada paso guarda la fila completa de antes;
    la pila vive en el lector y se olvida al salir.

## 6. Recortes (RF-BH19 – RF-BH21) — 13 oct 2026

Como recortar de un libro o de una revista: se guarda un pedazo para después.

- **RF-BH19. Recorte de texto.** Al seleccionar texto, el menú (decisión B5) ofrece **"Recortar"**: se
  guarda el fragmento con su libro, su página (o CFI) y la fecha, como los *clippings* de Kindle. En libros
  que prohíben copiar (RF-BH9) se guarda solo la referencia, sin el texto.
- **RF-BH20. Recorte de imagen.** Desde las herramientas, **"Recortar imagen"**: se marca un rectángulo sobre
  la página (un dibujo, una tabla, un pedazo de la página) y se guarda como imagen, con su libro y página.
- **RF-BH21. Mis recortes.** Una sección de Library junta todos los recortes, de texto y de imagen, con su
  libro, más recientes primero; se filtran por libro y por tipo, se les puede escribir una nota, y tocar uno
  abre el libro en ese lugar. Un recorte de imagen se puede **pegar** en un cuaderno, diario o álbum (13e)
  como imagen o sticker, y uno de texto, como cuadro de texto. Borrar el libro no borra sus recortes: se
  quedan con su título.

## 7. Lo técnico

- Las anotaciones se guardan en `library_annotations` con posición estable (spec 13 §5) y se pintan en una
  capa propia: en el motor web para subrayados y cuadros de texto; con Skia para el lápiz.
  - **Capa del motor (T286):** `public/reader/annotations.js`. Lo pegado en PDF guarda `{ page, x, y, w }`
    (esquina y ancho relativos a la página) y se pinta en una capa dentro de cada página; en EPUB guarda
    `{ cfi, x, w, fraction }`: el CFI del renglón donde empieza, la x en la columna y cuánto del libro
    llevaba (para el panel). Así sigue junto al mismo texto si cambia la letra o la pantalla.
  - Se guarda primero en la cola del dispositivo (RF-BR3) y sube después; sin red, el libro se abre con la
    última copia de sus anotaciones.
- El lápiz usa `react-native-skia` con eventos de puntero (presión de Apple Pencil en iOS).
- Escuchar: `expo-speech` en teléfono y la Web Speech API en web.

## 8. Criterios de aceptación

- *Dado* un párrafo, *cuando* lo selecciono y elijo amarillo, *entonces* queda subrayado y aparece en el
  panel de anotaciones con su página.
- *Dado* un sticker puesto, *cuando* lo quito, *entonces* desaparece de la página y aparece en "Quitados";
  *cuando* lo arrastro de vuelta, *entonces* queda donde lo suelte, con su rotación.
- *Dado* un separador rojo en el borde superior de la página 50, *cuando* cierro el libro y lo vuelvo a
  abrir, *entonces* lo veo en el canto y tocarlo me lleva a la página 50.
- *Dado* que subo una fuente, *cuando* es la primera, *entonces* debo aceptar el aviso de licencias antes de
  que se guarde.
- *Dado* un EPUB con subrayados, *cuando* cambio el tamaño de letra, *entonces* los subrayados siguen sobre
  las mismas palabras.
- *Dado* un párrafo seleccionado, *cuando* elijo "Recortar", *entonces* aparece en Mis recortes con su libro y
  página, y tocarlo me lleva ahí.
- *Dado* un PDF con un mapa, *cuando* marco un rectángulo sobre el mapa con "Recortar imagen", *entonces* se
  guarda como imagen en Mis recortes y la puedo pegar en un cuaderno.
