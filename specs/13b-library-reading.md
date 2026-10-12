# Spec 13b · KAVI Library — Formatos y formas de leer

> **Aprobada (12 oct 2026).** Parte de la spec 13.

## 1. Formatos (RF-BR1 – RF-BR4)

| Formato | Cómo se lee | Etapa |
|---|---|---|
| **PDF** | Tal cual, con pdf.js (página fija). | L1 |
| **EPUB** | Texto que se reacomoda (cambia de letra y tamaño), con foliate-js/epub.js. | L1 |
| **Word (.docx) / Pages** | Convertido a PDF al importar; luego, como cualquier PDF (decisión B3). | L6 |
| **PowerPoint (.pptx) / Keynote** | Convertido a PDF: una diapositiva por página. | L6 |
| **Excel (.xlsx) / Numbers** | Convertido a PDF: cada hoja, en páginas (decisión B3). | L6 |
| **Cuadernos, diarios, álbumes** | Creaciones de KAVI (spec 13e). | L5 |

- **RF-BR1.** El archivo original se guarda tal cual en Storage; lo que se lee es el original o, si hubo que
  convertirlo, el PDF resultante. La persona puede descargar el original.
- **RF-BR2.** Un archivo que no se puede abrir (dañado, con candado, formato raro) da un mensaje claro y no
  deja una pieza vacía en la librería.
- **RF-BR3. Sin conexión.** Lo que ya se abrió una vez queda en el dispositivo y se lee sin red; las
  anotaciones hechas sin red se guardan y suben al volver (misma idea que la cola de series del gym).
- **RF-BR4. Buscar dentro del libro:** en PDF y EPUB se busca texto y se salta a cada resultado.

## 2. Formas de leer (RF-BR5 – RF-BR8)

- **RF-BR5. Libro real.** Dos páginas a la vista, una frente a la otra, con el lomo en medio. Pasar de
  página es **arrastrar la esquina** (la hoja se curva y deja ver la siguiente mientras se arrastra) o un
  toque en el borde (la hoja da la vuelta sola). Soltar a medias regresa la hoja.
  - **En teléfono obliga a girar a horizontal** (decisión B6): al entrar, si el teléfono está vertical, se
    muestra "Gira tu teléfono" con una animación, y la pantalla queda fija en horizontal mientras dure.
  - En tableta y web se adapta: dos páginas si cabe, una si no.
  - Con movimiento reducido (accesibilidad), la hoja cambia sin la animación de curvatura.
- **RF-BR6. Scroll hacia abajo,** como un PDF: las páginas una debajo de otra.
- **RF-BR7. Páginas de lado,** como Kindle: una página a la vez, se desliza a la izquierda o derecha.
- **RF-BR8.** La forma de leer se cambia desde el lector en cualquier momento y se recuerda por pieza; la
  posición se conserva al cambiar.

## 3. Avance (RF-BR9 – RF-BR10)

- **RF-BR9.** Se guarda la última posición y el porcentaje leído; la librería los muestra (13a, RF-BL3).
- **RF-BR10.** Una barra delgada abajo dice la página (o el porcentaje en EPUB) y deja saltar arrastrando.

## 4. Lo técnico

- **Motor web único** (spec 13 §5) dentro de `react-native-webview` en teléfono y directo en web. La
  comunicación con la app va por mensajes (abrir, ir a posición, aplicar tema, anotaciones).
- **Libro real:** la curvatura se pinta con Skia sobre la imagen de las dos páginas (captura del motor), con
  Reanimated para seguir el dedo a 60 fps; `expo-screen-orientation` fija la horizontal.
- **Conversión de oficina (L6):** función en un servidor con LibreOffice (Gotenberg); el PDF resultante se
  guarda junto al original. Decisión B3.

## 5. Criterios de aceptación

- *Dado* un PDF, *cuando* elijo "Libro real" en el teléfono vertical, *entonces* KAVI me pide girarlo y,
  al girarlo, veo dos páginas con el lomo en medio.
- *Dado* el libro real, *cuando* arrastro la esquina derecha hasta la mitad y suelto, *entonces* la hoja
  regresa; *cuando* la arrastro más allá de la mitad, *entonces* da la vuelta.
- *Dado* un EPUB en la página 80, *cuando* cambio de "Páginas de lado" a "Scroll", *entonces* sigo en el
  mismo lugar del texto.
- *Dado* un libro que abrí ayer, *cuando* lo abro sin conexión, *entonces* se lee y mis subrayados nuevos
  se suben al volver la red.
