# Reportes

Evidencia de la fase de **pruebas y calidad**. Los tres se regeneran desde el
repositorio; ninguno se escribió a mano.

| Carpeta | Qué contiene | Cómo se regenera |
|---|---|---|
| [`pruebas/`](pruebas/) | 687 pruebas unitarias y su cobertura | `pnpm test:coverage` |
| [`calidad/`](calidad/) | Métricas de SonarQube: deuda técnica, code smells, duplicación | Workflow *calidad*, en cada push |
| [`seguridad/`](seguridad/) | Escaneo OWASP ZAP del sitio desplegado | Workflow *Escaneo de seguridad*, manual |

El informe de cierre del proyecto está en
[`Informe-de-cierre-KAVI.docx`](Informe-de-cierre-KAVI.docx) y cita los datos de
estas tres carpetas.

## Resumen

| | Resultado |
|---|---|
| Pruebas unitarias | 687 en verde, 41.13 % de cobertura |
| Deuda técnica | 40 minutos · mantenibilidad **A** |
| Code smells | 8 |
| Duplicación de código | 0.0 % |
| Vulnerabilidades de seguridad (ZAP) | 0 altas · 3 medias · 6 bajas |

Cada carpeta lleva su propio README con la lectura de los resultados, el alcance
del análisis y sus limitaciones.
