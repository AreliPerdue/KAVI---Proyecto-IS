# Reporte de pruebas unitarias

**Framework:** Jest 30 con el preset `jest-expo` y `@testing-library/react-native`
**Fecha:** 22 de septiembre de 2026
**Comando:** `pnpm test:coverage`
**Ejecución en CI:** [workflow "calidad"](../../.github/workflows/typecheck.yml)

## Resultado

**687 pruebas en 43 archivos, todas en verde.**

| Métrica | Cobertura | |
|---|---|---|
| Sentencias | 41.13 % | 1385 / 3367 |
| Ramas | 33.49 % | 810 / 2418 |
| Funciones | 37.37 % | 453 / 1212 |
| Líneas | 41.14 % | 1171 / 2846 |

## Por capa

| Capa | Cobertura | Sentencias |
|---|---|---|
| `src/services` | 64 % | 724 / 1133 |
| `src/app` | 0 % | 0 / 874 |
| `src/components` | 22 % | 144 / 658 |
| `src/hooks` | 50 % | 136 / 270 |
| `src/lib` | 82 % | 221 / 270 |
| `src/providers` | 99 % | 78 / 79 |
| `src/constants` | 98 % | 61 / 62 |
| `src/store` | 100 % | 21 / 21 |

## Qué se prueba

La cobertura no está repartida por igual, y es deliberado. El esfuerzo se
concentró donde un error tiene consecuencias que no se ven a simple vista:

- **Lógica de calendario** (`lib/recurrence`, `lib/dates`): expansión de reglas
  de repetición, recorte de bloques al día, búsqueda de huecos libres.
- **Reglas de negocio del backend** (`services/`): que borrar un contacto revoque
  en cascada calendarios, invitaciones y recordatorios; que la duración de un
  entrenamiento sea derivada y no una columna; que repetir una sesión no copie
  las notas.
- **Traducción de errores**: que un fallo de red no se confunda con credenciales
  incorrectas, y que los códigos de Postgres lleguen al usuario en español.
- **Accesibilidad de los componentes**: que el estado seleccionado se anuncie y
  no dependa solo del color, y que los errores de formulario se lean con
  `accessibilityLiveRegion`.

## Limitación conocida

La rúbrica pide **80 %** y el resultado es **41.13 %**. La diferencia
está casi toda en `src/app` (pantallas) y en la parte visual de
`src/components`, que requieren simular Expo Router y montar el árbol de
providers. La capa de lógica —servicios, hooks, utilidades y estado— está
sustancialmente cubierta.

## Archivos

| Archivo | Uso |
|---|---|
| `cobertura/lcov-report/index.html` | Informe navegable, línea por línea |
| `cobertura/lcov.info` | Formato estándar; lo consume SonarQube |
| `cobertura/coverage-summary.json` | Datos crudos por archivo |
