# Reporte de calidad de código — SonarQube Cloud

**Proyecto:** [AreliPerdue_KAVI---Proyecto-IS](https://sonarcloud.io/summary/overall?id=AreliPerdue_KAVI---Proyecto-IS)
**Fecha:** 22 de septiembre de 2026
**Análisis:** vía GitHub Actions (`SonarSource/sonarqube-scan-action@v7`), con la cobertura de Jest conectada
**Ejecución:** [workflow "calidad"](../../.github/workflows/typecheck.yml)

## Métricas

| Métrica | Valor |
|---|---|
| Líneas de código | 11 167 |
| **Deuda técnica** | **40 minutos** |
| Calificación de mantenibilidad | **A** |
| Calificación de fiabilidad | D |
| Calificación de seguridad | C |
| **Code smells** | **8** |
| Bugs | 5 |
| Vulnerabilidades | 2 |
| Security hotspots | 0 |
| **Duplicación de código** | **0.0 %** |
| Cobertura | 36.7 % |
| Complejidad ciclomática | 2 473 |
| Complejidad cognitiva | 1 277 |

Las dos métricas que pedía explícitamente la rúbrica son **deuda técnica
(40 minutos)** y **code smells (8)**. Para 11 167 líneas son cifras bajas, y es
consecuencia directa de que el código ya pasaba por ESLint con 83 reglas
activas y TypeScript en modo `strict` antes de llegar a SonarQube.

La **duplicación en 0.0 %** confirma que la lógica compartida está factorizada
en lugar de copiada: `services/demo` y `services/supabase` implementan los
mismos contratos sin repetir código.

## Hallazgos

### Bugs (5)

| Archivo | Descripción |
|---|---|
| `components/ui/text-field.tsx:38` | Una condición devuelve el mismo valor sea verdadera o falsa |
| `app/(app)/workout/[id].tsx:90` | Igual que la anterior |
| `lib/recurrence.ts:27` y `:102` | `.sort()` sobre números sin función de comparación |
| `hooks/use-availability.ts:12` | `.sort()` sobre cadenas sin `localeCompare` |

**Sobre los `.sort()`:** el orden por defecto de JavaScript es lexicográfico, así
que `[0, 2, 10].sort()` devuelve `[0, 10, 2]`. En `recurrence.ts` los valores son
días de la semana (0–6, un solo dígito), donde lexicográfico y numérico coinciden
— no hay error hoy, pero es frágil ante cualquier cambio de rango.

**Sobre `text-field.tsx:38`:** es un resto de depuración que desactiva el anillo
de foco. SonarQube lo detectó por su cuenta, lo que confirma que merece
corregirse.

### Vulnerabilidades (2)

Ambas son el mismo aviso: uso de `Math.random()`, que no es criptográficamente
seguro.

| Archivo | Uso real | Valoración |
|---|---|---|
| `lib/username.ts:46` | Sufijo numérico cuando todos los nombres propuestos están ocupados | No es un secreto: el username es público y su unicidad la garantiza un índice único en la base |
| `components/calendar/workout-draft.tsx:19` | Identificador temporal de un ejercicio en el formulario, antes de guardar | No sale del cliente ni se persiste |

Ninguno de los dos genera credenciales, tokens ni identificadores con valor de
seguridad. Se documentan como **aceptados con justificación**, no como pendientes.

## Relación con el escaneo de seguridad

Este análisis es estático: mira el código. El escaneo de [OWASP ZAP](../seguridad/)
es dinámico: mira la aplicación desplegada. Son complementarios y por eso
encuentran cosas distintas — ZAP detectó cabeceras HTTP ausentes, que no son
visibles leyendo el código fuente.

## Archivos

| Archivo | Contenido |
|---|---|
| `sonarqube-metricas.json` | Métricas crudas de la API |
| `sonarqube-hallazgos.json` | Bugs, vulnerabilidades y code smells con archivo y línea |
