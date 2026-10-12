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
  → spec 13e).
- **RF-BL12.** Al importar, KAVI lee del archivo lo que pueda —título, autor, portada, géneros, número de
  páginas— y deja corregir todo antes de guardar. Si no hay portada, genera una con el título sobre un
  color de los Nobi.
- **RF-BL13. Color de la portada:** se calcula el color dominante al importar (o al cambiar la portada) y se
  guarda como hex; es lo que usan el lomo (RF-BL2) y el filtro de color (RF-BL10).
- **RF-BL14.** Formatos que se aceptan y su límite de tamaño: los de la spec 13b y la decisión B2. Un
  archivo con candado (DRM) se rechaza con un mensaje claro de por qué.

## 6. Cada pieza (RF-BL15 – RF-BL17)

- **RF-BL15.** Mantener presionada una pieza la selecciona, como en Listas (RF-L28): con varias se puede
  mover a un librero, cambiar categoría, o eliminar.
- **RF-BL16.** El menú de una pieza: abrir, editar datos (título, autor, portada, categoría, géneros),
  agregar a librero, ver su ficha (13d), eliminar. Eliminar pide confirmación y dice que también se borran
  sus anotaciones y fichas.
- **RF-BL17.** Cada pieza recuerda dónde se quedó; abrirla vuelve ahí.

## 7. Buscar (RF-BL18)

- **RF-BL18.** El buscador encuentra por título, autor, categoría y género. Buscar **dentro** del texto de
  los libros es de la spec 13b.

## 8. Criterios de aceptación

- *Dado* que tengo 20 libros, *cuando* elijo la vista Librero, *entonces* los veo de lomo sobre repisas, con
  el color de su portada y el título en vertical.
- *Dado* un librero "Por leer", *cuando* agrego un libro que ya está en "Favoritos", *entonces* aparece en
  los dos, y quitarlo de uno no lo saca del otro.
- *Dado* que filtro por un azul, *cuando* aplico el filtro, *entonces* veo los libros de portada azulada y
  un chip con ese color que lo quita.
- *Dado* un PDF sin portada, *cuando* lo importo, *entonces* aparece con una portada generada con su título.
- *Dado* un EPUB con candado, *cuando* intento importarlo, *entonces* KAVI me dice que no se puede abrir
  porque tiene protección y no lo agrega.
