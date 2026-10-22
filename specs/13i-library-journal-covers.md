# Spec 13i · KAVI Library — Portadas del Journal

> **Aprobada (14 oct 2026)** con las decisiones de §9. Parte de la spec 13; va con la 13h (Lienzo creativo). Sale de
> "KAVI Journal Cover System — Fase 1: Foundation" del documento de Areli (v8), con su decisión final de
> formato único A5 y la regla universal de encuadernaciones.
>
> Regla de producto: **"The user chooses the object before they decorate the object."** Se siente como
> encuadernar un cuaderno, no como un editor de imágenes.

## 1. Crear un Journal: el objeto primero (RF-JC1 – RF-JC2)

- **RF-JC1. Pasos al crear**, cada uno con vista previa del cuaderno de verdad (girable, en libro real):
  1. **Forma:** A5 vertical u horizontal.
  2. **Encuadernación:** tapa dura, tapa blanda, espiral o cosida.
  3. **Material:** cuero, lino, terciopelo, madera, tela o pergamino, con su color.
  4. **Decorar** (opcional): se abre el lienzo de la portada.
  Se puede cambiar cualquier paso después sin perder la decoración.
- **RF-JC2.** Un Journal recién creado puede quedarse solo con su material: KAVI no impone ni un mínimo ni
  un máximo de decoración.

## 2. Forma (RF-JC3)

- **RF-JC3. Solo A5** (148 × 210 mm), **vertical u horizontal**. Otros tamaños (pocket, B5, álbum) quedan
  fuera del MVP y se agregarían como extensión. La portada sigue las reglas del lienzo (13h RF-CC4 –
  RF-CC6): coordenadas relativas, nunca reacomoda, el horizontal pide girar el teléfono. En la librería todos
  los Journals se ven a la misma escala.

## 3. Encuadernación (RF-JC4 – RF-JC6)

- **RF-JC4. Una sola lógica de portada, cuatro apariencias.** La encuadernación cambia **cómo se ve**, no qué
  se puede personalizar: portada, lomo y contraportada se decoran igual en las cuatro.

  | Encuadernación | Se ve | Lomo |
  |---|---|---|
  | **Tapa dura** | Cubierta rígida, un poco más grande que las páginas, esquinas definidas | Lomo con grosor, bisagra marcada |
  | **Tapa blanda** | Cubierta flexible, al ras de las páginas | Lomo plano y delgado |
  | **Espiral** | Perforaciones y espiral metálica en el borde | Sin lomo: el espiral es el borde (color del metal elegible) |
  | **Cosida** | Hilo visible en el borde | Lomo con costura a la vista (color del hilo elegible) |

- **RF-JC5. El lomo crece con las páginas**, con la misma cuenta en píxeles que los lomos del librero y el
  libro real (`medidaDeLomo`, 13a/13b). El Journal se ve en el librero con su lomo, como los libros.
- **RF-JC6. Posición:** el borde encuadernado va a la izquierda en vertical y en horizontal; arriba solo
  como variante del horizontal si se ve bien (no en el MVP).

## 4. Material y color (RF-JC7 – RF-JC9)

- **RF-JC7. Seis materiales del MVP:** cuero, lino, terciopelo, madera, tela y pergamino. Papel no va como
  material.
- **RF-JC8. Textura y color separados:** cada material es **una sola textura en grises** que se repite sin
  cortes (tileable) a una escala creíble para un A5: la veta de la madera sigue de largo, el grano del cuero
  no se ve repetido, el tejido del lino va derecho. El color se aplica encima (multiplicar sobre la textura,
  conservando brillo y relieve). **Nada de `cuero_rojo`, `cuero_azul`.**
- **RF-JC9.** El color del material se elige con el selector del lienzo (HEX, recientes, mis colores); sin
  paletas de KAVI. El material y su color corren por portada, lomo y contraportada; la **contraportada** usa
  el mismo de la portada por defecto y se puede cambiar. Los **cantos de las páginas** empiezan blancos y se
  recolorean (como la página del lector, 13c RF-BH5).

## 5. Decoración y tratamientos (RF-JC10 – RF-JC12)

- **RF-JC10. Decorar = el lienzo de 13h** sobre la portada, el lomo y la contraportada: texto, formas,
  marcos, esquinas, placas, motivos (dragones, flores, lazos, estrellas…), stickers e imágenes, con todo lo
  de RF-CC9.
- **RF-JC11. Tratamiento:** cada motivo, forma o texto puede verse **impreso**, **hundido** (deboss),
  **en relieve** (emboss) o **recortado** (cutout: deja ver la página de abajo) — los cuatro del MVP.
  Después: grabado, foil, metal, costura, pintado.
- **RF-JC12. Cómo se dibuja un tratamiento** (para desarrollo): el motivo es una silueta (SVG o PNG en
  grises) y el tratamiento es un estilo que se le aplica, igual para todas: *impreso* = color encima;
  *hundido* = la silueta oscurece el material con sombra interior y luz en el borde de abajo; *recortado* =
  *relieve* = lo contrario: luz arriba y sombra abajo, como si sobresaliera; *recortado* = máscara que hace un
  hueco y muestra la primera página con su sombra. Un solo código para los cuatro y para cualquier silueta.

## 6. Cómo se construye (para desarrollo)

- El Journal es una pieza de Library (`library_items`, familia creación) con su portada en `cover` (jsonb):
  `orientation`, `binding`, `material`, `color`, `back` (material/color propios o nulo), `edges`, y los
  documentos de lienzo de portada, lomo y contraportada (13h §10). Las páginas son `library_canvases` con
  contexto `journal`.
- Se pinta con el mismo motor que el libro real (StPageFlip ya hojea y da grosor); las texturas viven
  incluidas en la app (6 materiales, unos pocos cientos de KB en total) para que el Journal se vea sin red.
- Las texturas finales salen del muestrario de Areli: Claude las limpia, las pasa a grises, las hace tileables
  (sin costuras ni repetición evidente) y las prueba sobre un A5 completo antes de incluirlas.
- **Hecho T352 (14 oct 2026):** las seis texturas están en `assets/library/materials/` (gris, media 0.5, repetibles
  por los cuatro lados) y se pintan con `background-blend-mode: soft-light` sobre el color del material; las genera
  `scripts/journal/texturas.cjs` desde el muestrario.
- Una persona puede tener **varios Journals**; cada uno es su propia pieza con su portada.
- **Hecho J1 (T345, 21 oct 2026):** la portada vive en su propia columna `library_items.journal` (jsonb; migración
  `20261021120000`, solo para `kind = 'journal'`, ≤ 1 MB) en vez de `cover`, que ya guarda la imagen de portada de los
  libros; los documentos de lienzo de portada, lomo y contraportada se agregan ahí en J2. `lib/library/journal.ts`
  valida la portada y mide el lomo con la misma cuenta que un libro (`grosorDeLomo`). `JournalCover` pinta portada,
  lomo y contraportada (textura con `soft-light` sobre el color, cantos en tapa dura, espiral y puntadas con el color
  del acento); `journal/edit` crea y edita por pasos y `journal/[id]` gira el objeto. En la librería, "Nuevo Journal"
  y el Journal en la cuadrícula y en el librero. **Libro real** queda para T347, cuando el Journal tenga páginas que
  hojear.

## 7. Fases propuestas

| Fase | Qué entra |
|---|---|
| **J1 · Objeto** | Crear Journal A5 vertical/horizontal, 4 encuadernaciones, 6 materiales recolorables, lomo por páginas, cantos, contraportada; se ve en el librero y en libro real. |
| **J2 · Decorar** | Lienzo sobre portada, lomo y contraportada con tratamiento impreso. |
| **J3 · Tratamientos** | Hundido, relieve y recortado; después foil y los demás. |
| **J4 · Colecciones** | La primera colección de motivos (Fantasy / Dragon) como pack de assets en la tienda. |

## 8. Criterios de aceptación

- *Dado* un Journal A5 vertical de cuero en `#3B2A20`, *cuando* lo cambio a lino, *entonces* el color y la
  decoración se quedan y solo cambia la textura.
- *Dado* un Journal de 120 páginas en tapa dura, *cuando* le agrego 120 más, *entonces* su lomo engorda como el
  de un libro con 240 páginas en el librero.
- *Dado* un dragón con tratamiento **hundido** sobre terciopelo, *cuando* cambio el color del terciopelo,
  *entonces* el dragón sigue hundido y toma el tono del material.
- *Dado* un Journal horizontal diseñado en la computadora, *cuando* lo abro en el teléfono, *entonces* se ve
  igual y pide girarlo para verlo grande.
- *Dado* un Journal en espiral, *cuando* lo abro en libro real, *entonces* se ve el espiral en el borde y no
  hay lomo de tela.

## 9. Decisiones de Areli (14 oct 2026)

1. Relieve (emboss) **y** hundido (deboss) entran al MVP, junto con impreso y recortado.
2. Las texturas salen del muestrario de Areli; Claude las limpia y las hace repetibles.
3. Se pueden tener varios Journals, a criterio de la persona.
