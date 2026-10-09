# Spec 13e · KAVI Library — Creaciones y plantillas por capas

> **Borrador (9 oct 2026).** Parte de la spec 13. Es la pieza más pesada de diseño: aquí se decide cómo
> se construye cada plantilla para que todo se pueda personalizar.

## 1. Qué se crea (RF-BP1 – RF-BP3)

- **RF-BP1. Tipos de creación:** **cuaderno** (páginas para escribir y dibujar), **diario** (páginas con
  fecha y espacios de diario), **álbum de fotos** (páginas con acomodos para fotos y texto).
- **RF-BP2.** Una creación se ve y se hojea igual que un libro (las tres formas de leer de la spec 13b, el
  *libro real* incluido) y acepta todas las herramientas de la spec 13c.
- **RF-BP3.** Se agregan, duplican, reordenan y eliminan páginas; cada página nueva se elige de las
  plantillas de página de su estilo (RF-BP8).

## 2. Estilos y colores (RF-BP4 – RF-BP6)

- **RF-BP4. Estilos:** familias completas con la misma estética. Cada estilo trae **portada**, **páginas**
  (rayada, cuadrícula, punteada, en blanco), **plantillas especiales** (RF-BP8) y **stickers** propios para
  cada tipo de creación. Ejemplo inicial: **Ciudad/viajero** (una ciudad en la portada, boletos, mapas,
  sellos de pasaporte como stickers).
- **RF-BP5. Colores de partida:** cada estilo existe en los colores de los Nobi; se elige uno al crear.
- **RF-BP6.** Estilos de la primera versión: por decidir con Areli (decisión B9); se recomienda empezar con
  **dos** muy bien hechos antes que muchos a medias.

## 3. Todo por capas (RF-BP7)

- **RF-BP7. Cada diseño está hecho de capas con nombre**, y cada capa se puede cambiar por separado:
  - **Color** de cualquier capa (el cielo, las nubes, los edificios, el marco).
  - **Variante** de una capa por otra de la misma familia: en la portada de Ciudad, cambiar los edificios
    de Ciudad de México por los de París, Tokio o Nueva York; cambiar las nubes por un atardecer.
  - **Mostrar u ocultar** capas (quitar las nubes).
  - **Agregar** stickers, texto o imágenes encima, que se vuelven capas nuevas.
  - **Restablecer** una capa o todo el diseño a como venía.
  Al tocar "Personalizar", la portada se "despieza": cada capa se ve separada un instante y luego se
  elige de una lista con su miniatura.

## 4. Plantillas especiales (RF-BP8 – RF-BP9)

- **RF-BP8. Plantillas de página** además de las básicas:
  - **Trackers:** de hábitos (mes en cuadrícula), de ánimo (un color por día), de lectura (libros del mes),
    de agua, de gastos.
  - **Acomodos de fotos:** 1, 2, 3, 4 y 6 fotos, collage, tira de fotomatón, polaroid con pie de foto.
  - **Diario:** página del día (fecha, clima, agradecimiento, notas), semana, mes.
  Todas siguen la regla de capas (RF-BP7).
- **RF-BP9.** Los trackers son **interactivos**: tocar una casilla la rellena con el color elegido; no hace
  falta dibujarla a mano.

## 5. Cómo se construye una plantilla (para diseño y desarrollo)

- Cada plantilla es un **archivo de descripción** (JSON) con su lista de capas en orden; cada capa apunta a
  un dibujo vectorial (SVG) y declara qué se puede cambiar: colores (con nombre: `cielo`, `nubes`,
  `edificios-1`), variantes permitidas, y si se puede ocultar.
- Los dibujos se hacen en Figma o Illustrator **separados por capa y con nombres**, y se exportan a SVG.
  Una variante (los edificios de París) es otro SVG que ocupa el mismo lugar que el original.
- Lo que la persona cambia se guarda como **diferencias** sobre la plantilla (`library_pages`): así, si la
  plantilla mejora, su creación la recibe sin perder lo que personalizó.
- El catálogo de estilos y plantillas vive en el cliente (`src/constants/library/`) y se puede ampliar sin
  migraciones.

## 6. Criterios de aceptación

- *Dado* un diario estilo Ciudad en color Nobi azul, *cuando* cambio los edificios a "París", *entonces* la
  portada muestra París y el cielo, las nubes y el resto quedan igual.
- *Dado* una portada personalizada, *cuando* toco "Restablecer el cielo", *entonces* solo el cielo vuelve a
  como venía.
- *Dado* un tracker de hábitos, *cuando* toco la casilla del día 5, *entonces* se rellena con el color del
  hábito.
- *Dado* un álbum, *cuando* agrego una página "3 fotos" y elijo tres de la galería, *entonces* cada una
  queda en su marco y se puede mover y recortar dentro de él.

## 7. Decisión pendiente

| # | Decisión | Recomendación |
|---|---|---|
| **B9** | Estilos de la primera versión y quién dibuja las capas (Areli, ilustración comprada con licencia, o generada y retocada). | Dos estilos (Ciudad/viajero y uno minimalista); dibujos propios o con licencia comercial clara. |
