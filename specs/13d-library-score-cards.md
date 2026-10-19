# Spec 13d · KAVI Library — Fichas de calificación

> **Aprobada (12 oct 2026).** Parte de la spec 13.

## 1. Qué es

Una **ficha** es la tarjeta que mucha gente hace en su diario de lectura: estrellas, género, qué le gustó
más, qué tan *spicy* estuvo, frase favorita. En KAVI se diseña una vez, se pega a cada libro, y todas se
ven juntas en un resumen.

## 2. Diseñar la ficha (RF-BF1 – RF-BF5)

- **RF-BF1. Plantillas incluidas** para empezar: "Reseña rápida" (estrellas del 1 al 5, calificación del 1
  al 10 —las dos, como en KAVI Reader— y notas), "Diario de lectura"
  (estrellas, género, fechas de inicio y fin, frase favorita, notas) y "Romance" (estrellas, picante,
  *tropes*, personaje favorito). Todas se pueden copiar y cambiar.
- **RF-BF2. Campos** que se agregan, quitan y reordenan:
  - **Escala** (1 a 5 o 1 a 10) con el símbolo que se elija: estrellas, corazones, chiles, calaveras…
  - **Opción** (una o varias de una lista propia): género, *tropes*, formato.
  - **Texto** corto o largo: qué me gustó, qué no, frase favorita.
  - **Fecha:** empecé, terminé.
  - **Sí/no:** ¿lo volvería a leer?, ¿lo recomiendo?
- **RF-BF3. Aspecto:** colores (los de los Nobi o propios), fondo, tipo de letra y **stickers** decorativos
  (los de la spec 13c).
- **RF-BF4. Dónde va pegada:** portada, contraportada, primera página o última página. Se ve ahí como una
  tarjeta física (con una sombra ligera) y se toca para abrirla.
- **RF-BF5.** Cambiar el diseño de una plantilla pregunta si aplicarlo también a las fichas ya llenas; los
  valores de un campo que se quitó se conservan ocultos hasta que se borre a propósito.
- **Hecho (T293, 19 oct 2026).** La ficha es una **tarjeta aparte** y no un módulo del lienzo (decisión de Areli
  del 19 oct; ver 13h §11). Cuando llegue el lienzo, una ficha se podrá mostrar en un recorte.
  - **Plantillas incluidas:** la primera vez que la persona entra a **Fichas** (en la librería, junto a Mis
    fragmentos) se crean las tres en su cuenta, en el idioma de la app. Se editan como cualquier otra, y
    también se duplican o se borran (avisando cuántas fichas llenas se van con ella).
  - **Editor:** vista previa al momento; nombre; campos que se agregan (con una explicación de cada tipo),
    se editan en su hoja, se arrastran por el asa o se suben y bajan, y se quitan. Hasta 20 campos.
  - **Escala:** 5 o 10, con estrellas, corazones, chiles, calaveras, lágrimas, destellos, tazas o rayos.
  - **Aspecto:** el color (paleta de los Nobi o HEX propio); el fondo (liso, papel con banda de color,
    rayas, cuadrícula o puntos); la letra (sistema, con serifa, máquina o manuscrita, esta última del
    sistema en el teléfono y Patrick Hand en la web); y hasta 3 stickers de la colección, uno por esquina,
    chico, mediano o grande y un poco ladeados. La tarjeta es de papel claro aunque la app esté en oscuro.
  - **RF-BF5:** si el diseño ya tiene fichas llenas, al guardar se pregunta **Aplicar a todas** o **Solo a las
    nuevas**. "Solo a las nuevas" archiva la versión de antes (`archived`): sus fichas la siguen usando y ya
    no se ofrece para nuevas. Los valores van por id de campo, así que quitar o renombrar un campo no
    pierde nada.

## 3. Llenar la ficha (RF-BF6 – RF-BF7)

- **RF-BF6.** Al terminar un libro (100 % leído) KAVI ofrece llenar su ficha, sin obligar.
- **RF-BF7.** Una pieza puede tener una ficha por plantilla (por ejemplo, la "Reseña rápida" y la de
  "Romance" a la vez).

## 4. Resumen de fichas (RF-BF8 – RF-BF10)

- **RF-BF8.** Una sección propia dentro de Library ("Mis reseñas") muestra **todas** las fichas como
  tarjetas, con la portada de su libro.
- **RF-BF9.** Se ordenan y filtran por cualquier campo de escala, opción o fecha: "mis 5 estrellas", "todos
  los de picante 4 o más", "lo que leí en 2026".
- **RF-BF10.** Totales sencillos arriba: libros calificados, promedio de estrellas, género más leído. Sin
  gráficas complicadas en esta versión.

## 5. Datos

- `library_card_templates`: dueño, nombre, campos (`jsonb`: tipo, etiqueta, opciones, símbolo, orden),
  aspecto (`{ color, background, font, stickers: [{ sticker, corner, size, rot }] }`) y `archived` (T293).
- `library_cards`: pieza, plantilla, valores (`jsonb` por id de campo), lugar donde va pegada, fechas.
- Los valores se guardan por **id de campo**, no por etiqueta, para que renombrar un campo no pierda nada.

## 6. Criterios de aceptación

- *Dado* la plantilla "Romance", *cuando* le agrego un campo "Escena favorita" de texto, *entonces* aparece
  en las fichas nuevas y en las ya llenas como campo vacío.
- *Dado* una ficha pegada en la contraportada, *cuando* llego al final del libro, *entonces* la veo como
  tarjeta y tocarla la abre.
- *Dado* 30 fichas, *cuando* filtro "picante ≥ 4" en Mis reseñas, *entonces* veo solo esas, con su portada.
- *Dado* que renombro "Estrellas" a "Calificación", *cuando* abro una ficha vieja, *entonces* conserva su
  valor.
