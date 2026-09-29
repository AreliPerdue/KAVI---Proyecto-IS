# Presentación del reto

La presentación y su guion **no se versionan aquí**: viven en `kaviland/`, junto al
repositorio, para tenerlos a mano el día de exponer.

- `Presentacion-KAVI.pptx` — 37 diapositivas, con el texto hablado en las notas de cada una

## Cómo regenerarlas

Se generan desde este repositorio, igual que el resto de los informes, para que las
cifras no puedan desviarse de lo que de verdad mide el proyecto.

```bash
npm i pptxgenjs docx playwright-core          # en un directorio temporal
node generar-fondos.mjs                        # formas orgánicas de fondo y wordmark
node recortar-nobis.mjs                        # Nobis en círculo con fondo transparente
node generar-presentacion.js  ../../../Presentacion-KAVI.pptx
```

`arte/` no se versiona: lo reconstruyen los dos primeros scripts. `capturas/` sí, porque
son la evidencia real —cobertura, pipeline, SonarQube, ZAP y la app— y reproducirlas
exige levantar el entorno entero.

## Tipografía

Dos fuentes, no una: **Century Gothic** para títulos y cifras —geométrica y redondeada,
de la misma familia visual que el wordmark— y **Corbel** para el texto de leer. Las dos
vienen con Microsoft Office en Mac y en Windows, así que el archivo se ve igual en
cualquier computadora.

## Las fuentes de la marca

El wordmark usa **Moirai One** y el eslogan **Poiret One**, las mismas que la app
(NFR-19). En la presentación no van como fuente sino **rasterizadas a imagen**, para que
el archivo se vea igual en cualquier computadora aunque no las tenga instaladas.

Si quieres editarlas en PowerPoint, están en `assets/fonts/` y se instalan copiándolas a
`~/Library/Fonts/`.

## Revisión visual

`./revisar.sh` convierte la presentación a PDF con **LibreOffice**, que es lo único
que funciona sin intervención: PowerPoint solo exporta por AppleScript y eso falla en
cuanto queda un proceso colgado o el archivo está abierto.

**Una advertencia sobre el render:** LibreOffice no encuentra Century Gothic ni Corbel
aunque estén instaladas, y las sustituye por una serif. Sirve para comprobar
composición —posiciones, solapes, elementos cortados— pero **no** el aspecto
tipográfico real. Para eso hay que abrir el archivo en PowerPoint.

La geometría exacta se comprueba aparte, leyendo las cajas del propio `.pptx`: que
ningún elemento salga del lienzo y que ninguna caja de texto se solape con otra.
