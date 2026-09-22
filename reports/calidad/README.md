# Reporte de calidad de código — SonarQube Cloud

**Proyecto:** [AreliPerdue_KAVI---Proyecto-IS](https://sonarcloud.io/summary/overall?id=AreliPerdue_KAVI---Proyecto-IS)
**Fecha:** 22 de septiembre de 2026
**Análisis:** vía GitHub Actions (`SonarSource/sonarqube-scan-action@v7`), con la cobertura de Jest conectada
**Ejecución:** [workflow "Pruebas"](../../.github/workflows/pruebas.yml)

## Métricas

| Métrica | Valor |
|---|---|
| Líneas de código | 11 183 |
| **Deuda técnica** | **0 minutos** |
| Calificación de mantenibilidad | **A** |
| Calificación de fiabilidad | **A** |
| Calificación de seguridad | **A** |
| **Code smells** | **0** |
| Bugs | 0 |
| Vulnerabilidades | 0 |
| Security hotspots | 0 |
| **Duplicación de código** | **0.0 %** |
| Cobertura | **81.8 %** |
| Complejidad ciclomática | 2 481 |
| Complejidad cognitiva | 1 281 |

Las dos métricas que pedía explícitamente la rúbrica son **deuda técnica** y
**code smells**, ambas en cero tras corregir los 15 hallazgos del primer
análisis. No es una cifra inflada: el código ya pasaba por ESLint con 83 reglas
activas y TypeScript en modo `strict` antes de llegar a SonarQube, así que lo
que quedaba era poco y concreto.

La **duplicación en 0.0 %** confirma que la lógica compartida está factorizada
en lugar de copiada: `services/demo` y `services/supabase` implementan los
mismos contratos sin repetir código.

### Sobre la cifra de cobertura

SonarQube publica **81.8 %**, que combina líneas y condiciones en un solo
número. Jest las informa por separado: **84.9 % de líneas** y **77.6 % de
condiciones**. Las dos son correctas y miden cosas distintas; el detalle está en
el [reporte de pruebas](../pruebas/).

## Qué se corrigió

El primer análisis devolvió 15 hallazgos. Se corrigieron todos.

### Defectos reales

| Archivo | Problema |
|---|---|
| `components/ui/text-field.tsx` | Una condición devolvía el mismo valor en ambas ramas: un resto de trabajo en curso que desactivaba el anillo de foco |
| `app/(app)/workout/[id].tsx` | El mismo patrón, con un título duplicado |
| `lib/recurrence.ts` (×2) | `.sort()` sobre números sin comparador: el orden por defecto de JavaScript es lexicográfico, así que `[0, 2, 10].sort()` da `[0, 10, 2]`. Con días de la semana (0–6) no fallaba hoy, pero se rompía ante cualquier cambio de rango |
| `hooks/use-availability.ts` | `.sort()` sobre los ids que forman la clave de caché. Se resolvió con un orden fijo por punto de código y **no** con `localeCompare`, que depende del idioma del dispositivo y habría hecho la clave inestable entre usuarios |
| `lib/dates.ts` | El bucle que busca huecos libres reasignaba su propia variable de avance dentro del cuerpo; reescrito como `while`, que es lo que de verdad hace |

### Riesgos revisados y eliminados

Los dos avisos de `Math.random()` no eran usos de seguridad —un identificador
de formulario y un sufijo de username, ninguno secreto—, pero ambos se
sustituyeron por alternativas deterministas que además son mejores:

| Archivo | Antes | Ahora |
|---|---|---|
| `components/calendar/workout-draft.tsx` | `Date.now()` + aleatorio | Un contador, que no puede colisionar |
| `lib/username.ts` | Sufijo aleatorio de 4 dígitos | Marca de tiempo en base 36, que no choca con los sufijos numéricos ya probados |

También se simplificaron dos expresiones regulares con cuantificadores que
podían backtrackear de forma superlineal, y se cerraron cinco avisos menores de
estilo (`parseInt` sin `Number.`, un literal como valor por defecto de
parámetro).

## Relación con el escaneo de seguridad

Este análisis es estático: mira el código. El escaneo de [OWASP ZAP](../seguridad/)
es dinámico: mira la aplicación desplegada. Son complementarios y por eso
encuentran cosas distintas — ZAP detectó cabeceras HTTP ausentes, que no son
visibles leyendo el código fuente.

## Archivos

| Archivo | Contenido |
|---|---|
| `sonarqube-metricas.json` | Métricas crudas de la API |
| `sonarqube-hallazgos.json` | Hallazgos abiertos: actualmente ninguno |
