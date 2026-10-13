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

- **RF-BR1.** El archivo original se guarda tal cual en R2 (decisión B2); lo que se lee es el original o, si hubo que
  convertirlo, el PDF resultante. La persona puede descargar el original.
- **RF-BR2.** Un archivo que no se puede abrir (dañado, con candado, formato raro) da un mensaje claro y no
  deja una pieza vacía en la librería.
- **RF-BR3. Sin conexión.** Lo que ya se abrió una vez queda en el dispositivo y se lee sin red; las
  anotaciones hechas sin red se guardan y suben al volver (misma idea que la cola de series del gym).
- **RF-BR4. Buscar dentro del libro:** en PDF y EPUB se busca texto y se salta a cada resultado.

## 2. Formas de leer (RF-BR5 – RF-BR8)

- **RF-BR5. Libro real.** La hoja **se dobla en 3D** al pasar, con su sombra, como papel de verdad (la
  referencia es el *flipbook* de FlipHTML5). Se lee **a pantalla completa**: sin la barra de la app ni la del
  sistema, solo el libro. Funciona en las dos orientaciones (decisión B6, enmendada el 13 oct 2026):
  - **Vertical:** una página a la vez, con el lomo a la izquierda; la hoja se dobla desde el borde derecho
    al avanzar y desde el izquierdo al regresar.
  - **Horizontal:** dos páginas a la vista, una frente a la otra, con el lomo en medio. Como en un libro de
    verdad, **la primera página (la portada) va sola, del lado derecho**; después van en pares: 2–3, 4–5… La
    barra de avance dice "pp. 2–3 de 340" (idea de KAVI Reader).
  - Girar el teléfono cambia de una a dos páginas sin perder el lugar. En tableta y web se elige por el
    ancho: dos páginas si caben, una si no.
  - **Arrastrar la esquina** dobla la hoja siguiendo el dedo (o el cursor) y deja ver la siguiente; soltar
    a medias la regresa, soltar pasada la mitad la termina de voltear.
  - Con movimiento reducido (accesibilidad), la hoja cambia sin la animación de curvatura.
- **RF-BR6. Scroll hacia abajo,** como un PDF: las páginas una debajo de otra.
- **RF-BR7. Páginas de lado,** como Kindle: una página a la vez, se desliza a la izquierda o derecha.
- **RF-BR7b. Pasar de página sin botones** (libro real y páginas de lado; 13 oct 2026). No hay flechas en
  pantalla: se pasa de página con el gesto natural de cada aparato.
  - **Tocar o hacer clic en el 20 % de cada borde:** derecho, siguiente; izquierdo, anterior.
  - **Tocar o hacer clic en el centro** muestra u oculta los controles del lector (salir, forma de leer,
    herramientas, barra de avance), para que la pantalla completa quede limpia mientras se lee.
  - **Deslizar** el dedo de derecha a izquierda (siguiente) o al revés (anterior).
  - **Web:** deslizar con dos dedos en el *trackpad* hacia los lados, las flechas **→ / ←** del teclado
    (también Re Pág / Av Pág y la barra espaciadora para avanzar) y el clic en los bordes. Un deslizamiento
    largo del *trackpad* pasa una sola página, no varias.
  - **Mantener presionado o arrastrar sobre el texto** selecciona y anota (13c, decisión B5): eso nunca
    cambia de página. Un clic que termina una selección tampoco.
- **RF-BR8.** La forma de leer se cambia desde el lector en cualquier momento y se recuerda por pieza; la
  posición se conserva al cambiar.

## 3. Avance (RF-BR9 – RF-BR10)

- **RF-BR9.** Se guarda la última posición y el porcentaje leído; la librería los muestra (13a, RF-BL3).
- **RF-BR10.** Una barra delgada abajo dice la página (o el porcentaje en EPUB) y deja saltar arrastrando.

## 4. Lo técnico

- **Motor web único** (spec 13 §5) dentro de `react-native-webview` en teléfono y directo en web. La
  comunicación con la app va por mensajes (abrir, ir a posición, aplicar tema, anotaciones).
- **Libro real:** la curvatura se pinta con Skia sobre la imagen de la página o las dos páginas (captura del
  motor), con Reanimated para seguir el dedo a 60 fps. La pantalla completa oculta la barra de estado
  (`expo-status-bar`) y la de navegación de Android; en web se usa la API de pantalla completa del navegador
  cuando la persona entra al modo.
- **Conversión de oficina (L6):** función en un servidor con LibreOffice (Gotenberg); el PDF resultante se
  guarda junto al original. Decisión B3.

## 5. Criterios de aceptación

- *Dado* un PDF, *cuando* elijo "Libro real" con el teléfono vertical, *entonces* lo veo a pantalla
  completa, una página a la vez; *cuando* toco el borde derecho, *entonces* la hoja se dobla y pasa a la
  siguiente; *cuando* giro el teléfono, *entonces* veo dos páginas con el lomo en medio, en el mismo lugar.
- *Dado* el libro real a pantalla completa, *cuando* toco el centro, *entonces* aparecen los controles;
  *cuando* vuelvo a tocarlo, *entonces* se ocultan.
- *Dado* el libro real en web, *cuando* presiono → o deslizo dos dedos a la izquierda en el *trackpad*,
  *entonces* avanza exactamente una página; *cuando* arrastro para seleccionar una frase, *entonces* no
  cambia de página.
- *Dado* el libro real, *cuando* arrastro la esquina derecha hasta la mitad y suelto, *entonces* la hoja
  regresa; *cuando* la arrastro más allá de la mitad, *entonces* da la vuelta.
- *Dado* un EPUB en la página 80, *cuando* cambio de "Páginas de lado" a "Scroll", *entonces* sigo en el
  mismo lugar del texto.
- *Dado* un libro que abrí ayer, *cuando* lo abro sin conexión, *entonces* se lee y mis subrayados nuevos
  se suben al volver la red.
