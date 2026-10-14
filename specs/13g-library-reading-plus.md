# Spec 13g · KAVI Library — Más para leer

> **Propuesta (13 oct 2026), falta aprobarla.** Parte de la spec 13. Sale de una lista de Areli con lo que
> tienen los buenos lectores (ReadEra, Kindle, Moon+). Aquí va solo lo que no estaba ya en 13a – 13f; lo que
> sí estaba se anota al final para no duplicarlo.

## 1. Más formatos (RF-BX1 – RF-BX3)

- **RF-BX1. Kindle sin candado:** MOBI y AZW3 se importan y se leen como un EPUB (foliate-js ya los abre,
  `mobi.js`). Un archivo con DRM se rechaza con su motivo, como el EPUB con candado (RF-BL14).
- **RF-BX2. Más libros de texto:** FB2 (FictionBook) y CBZ (cómic: una imagen por página), también con
  foliate. El CBZ se lee como páginas fijas, igual que un PDF.
- **RF-BX3. TXT:** un archivo de texto se lee como un libro que se reacomoda: se arma un EPUB mínimo en el
  dispositivo (un capítulo por cada línea que parezca título, "Capítulo 1", "I."), con su codificación
  detectada (UTF-8 o Latin-1).

## 2. Letra y pantalla (RF-BX4 – RF-BX6)

- **RF-BX4. Interlineado y márgenes** en EPUB y texto: tres o cuatro pasos cada uno, más la alineación
  (izquierda o justificada). Se recuerdan junto con el tamaño de letra (RF-BH2).
- **RF-BX5. Brillo dentro del lector:** una barra que baja el brillo solo mientras se lee (en el teléfono, el
  de la pantalla, y vuelve al salir; en la web, un velo oscuro sobre la página).
- **RF-BX6. Filtro de luz cálida:** un tono ámbar ajustable sobre la página para leer de noche, que se
  puede programar ("del atardecer al amanecer" o un horario). Va encima de cualquier tema (RF-BH5).

## 3. Moverse por el libro (RF-BX7 – RF-BX9)

- **RF-BX7. Índice:** la tabla de contenido del EPUB (o el esquema del PDF, si lo trae) en un panel; tocar un
  capítulo lleva a él y el capítulo actual va marcado. Sin índice, el panel lo dice.
- **RF-BX8. Más avance a la vista:** además de la página o el porcentaje (RF-BR10), cuánto falta del
  capítulo ("12 páginas para terminar el capítulo") y, con el tiempo de lectura (RF-BR11), un estimado de
  cuánto falta del libro.
- **RF-BX9. Exportar lo anotado:** subrayados y notas de un libro (RF-BH17) se exportan como Markdown o
  texto, con el capítulo y la página de cada uno, y se comparten con la hoja del sistema.

## 4. PDF y escaneos (RF-BX10 – RF-BX12)

- **RF-BX10. Recortar márgenes:** quitar el blanco de alrededor de las páginas de un PDF para que el texto
  se vea más grande; automático (lo calcula de la página) o a mano con un recuadro, para todo el libro o
  separado para páginas pares e impares.
- **RF-BX11. Partir dobles páginas:** un PDF escaneado con dos páginas por hoja se lee como páginas
  sencillas (izquierda y luego derecha), con la opción de quitarlo si no era doble.
- **RF-BX12. Texto que se reacomoda en un PDF:** un modo que saca el texto del PDF y lo muestra como un
  EPUB (letra, tamaño, tema), para PDFs de texto en pantallas chicas. Los PDF escaneados no tienen texto: se
  dice y no se ofrece.

## 5. Lo que ya estaba (no se duplica)

- Tema oscuro, sepia y propio: RF-BH5 (hecho, T288b). Letras incluidas y para dislexia: RF-BH3 (T288).
- Separadores (marcadores) y panel de anotaciones: RF-BH15, RF-BH17 (T290, T286). Subrayar: RF-BH7 (T287).
- Escuchar en voz alta con la frase resaltada: RF-BH6 (T292).
- Word, Pages, PowerPoint y Excel: se convierten a PDF al importarlos (L6, T300).
- Barra de avance con página o porcentaje: RF-BR10 (hecho, T279).

## 6. Criterios de aceptación

- *Dado* un AZW3 sin DRM, *cuando* lo importo, *entonces* se agrega con su portada y se lee como un EPUB.
- *Dado* un TXT con líneas "Capítulo 1", "Capítulo 2", *cuando* lo abro, *entonces* el índice muestra esos
  capítulos y el texto cambia de tamaño con la letra.
- *Dado* un EPUB, *cuando* abro el índice y toco el capítulo 5, *entonces* el lector va al capítulo 5 y el
  índice lo marca como actual.
- *Dado* un PDF escaneado de dos páginas por hoja, *cuando* activo "Partir dobles páginas", *entonces* leo
  la izquierda y luego la derecha, y la cuenta de páginas se duplica.
- *Dado* el filtro de luz cálida programado al atardecer, *cuando* abro un libro de noche, *entonces* la
  página se ve con el tono ámbar sin que lo active.
