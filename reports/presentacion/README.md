# Presentación del reto

La presentación y su guion **no se versionan aquí**: viven en `kaviland/`, junto al
repositorio, para tenerlos a mano el día de exponer.

- `Presentacion-KAVI.pptx` — 23 diapositivas
- `Guion-presentacion-KAVI.docx` — el texto para leer, con las acotaciones aparte

## Cómo regenerarlas

Se generan desde este repositorio, igual que el resto de los informes, para que las
cifras no puedan desviarse de lo que de verdad mide el proyecto.

```bash
npm i pptxgenjs docx playwright-core          # en un directorio temporal
node generar-fondos.mjs                        # formas orgánicas de fondo y wordmark
node recortar-nobis.mjs                        # Nobis en círculo con fondo transparente
node generar-presentacion.js  ../../../Presentacion-KAVI.pptx
node generar-guion.js         ../../../Guion-presentacion-KAVI.docx
```

`arte/` no se versiona: lo reconstruyen los dos primeros scripts. `capturas/` sí, porque
son la evidencia real —cobertura, pipeline, SonarQube, ZAP y la app— y reproducirlas
exige levantar el entorno entero.

## Las fuentes de la marca

El wordmark usa **Moirai One** y el eslogan **Poiret One**, las mismas que la app
(NFR-19). En la presentación no van como fuente sino **rasterizadas a imagen**, para que
el archivo se vea igual en cualquier computadora aunque no las tenga instaladas.

Si quieres editarlas en PowerPoint, están en `assets/fonts/` y se instalan copiándolas a
`~/Library/Fonts/`.
