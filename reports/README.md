# Reportes

Evidencia de la fase de **pruebas y calidad**. Todos se regeneran desde el
repositorio; ninguno se escribió a mano.

## Resumen

| | Resultado |
|---|---|
| Pruebas automáticas | **1 514 en verde**, 0 fallidas |
| Cobertura del código | **83.6 %** de sentencias · 85.2 % de líneas |
| Deuda técnica | **0 minutos** · mantenibilidad **A** |
| Bugs · vulnerabilidades · code smells | **0 · 0 · 0** · fiabilidad y seguridad **A** |
| Duplicación de código | **0.0 %** |
| Escaneo de seguridad (ZAP) | 0 altas · 1 media · 2 bajas |

## Qué hay en cada carpeta

| Carpeta | Qué contiene | Cómo se regenera |
|---|---|---|
| [`pruebas/`](pruebas/) | Las 1 514 pruebas y su cobertura | `pnpm test:coverage` |
| [`calidad/`](calidad/) | Métricas de SonarQube: deuda técnica, code smells, duplicación | Workflow *calidad*, en cada push |
| [`seguridad/`](seguridad/) | Escaneo OWASP ZAP del sitio desplegado, antes y después de corregirlo | Workflow *Escaneo de seguridad*, manual |

Cada carpeta lleva su propio README con la lectura de los resultados, el alcance
del análisis y sus limitaciones.

## Para leer sin tecnicismos

**[Qué se probó en KAVI, y qué salió](pruebas/Listado%20de%20pruebas.md)** recorre las
1 514 pruebas una por una, agrupadas por zona de la aplicación —crear cuenta,
calendario, compartir, gimnasio…— y explicadas sin lenguaje técnico. Es el
documento a leer si lo que interesa es *qué se verificó*, no cómo.

## Informe de cierre

El informe de cierre del proyecto está en
[`Informe-de-cierre-KAVI.docx`](Informe-de-cierre-KAVI.docx): comparación entre
lo planificado y lo ejecutado, lecciones aprendidas y plan de mejora continua,
con las cifras de estas tres carpetas.

Se genera desde el repositorio, no se escribe a mano:

```bash
node reports/generar-informe-de-cierre.js reports/Informe-de-cierre-KAVI.docx
```

Así las cifras que cita no pueden desviarse de las que miden las herramientas.
Para entregarlo en PDF, ábrelo en Word y exporta.
