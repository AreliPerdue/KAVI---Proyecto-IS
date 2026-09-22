# Reporte de pruebas unitarias

**Framework:** Jest 30 con el preset `jest-expo` y `@testing-library/react-native`
**Fecha:** 22 de septiembre de 2026
**Comando:** `pnpm test:coverage`
**Ejecución en CI:** [workflow "calidad"](../../.github/workflows/typecheck.yml)

## Resultado

**1 171 pruebas en 72 archivos, todas en verde.**

| Métrica | Cobertura | |
|---|---|---|
| **Sentencias** | **80.17 %** | 2701 / 3369 |
| **Líneas** | **81.56 %** | 2323 / 2848 |
| Ramas | 72.7 % | 1761 / 2422 |
| Funciones | 74.13 % | 900 / 1214 |

Se cumple el objetivo del 80 % en sentencias y líneas.

## Por capa

| Capa | Cobertura | Sentencias |
|---|---|---|
| `src/services` | 86 % | 972 / 1133 |
| `src/app` | 72 % | 632 / 876 |
| `src/components` | 79 % | 519 / 658 |
| `src/hooks` | 70 % | 190 / 270 |
| `src/lib` | 84 % | 227 / 270 |
| `src/providers` | 99 % | 78 / 79 |
| `src/constants` | 100 % | 62 / 62 |
| `src/store` | 100 % | 21 / 21 |

## Qué se prueba

Las pruebas no verifican que el código haga lo que hace, sino las reglas de
negocio que no se ven leyéndolo:

- **Cascadas de permisos.** Eliminar un contacto revoca calendarios compartidos,
  invitaciones a actividades, colores y copias de recordatorios.
- **Recurrencia.** Editar o eliminar una actividad recurrente distingue entre
  esta ocurrencia y toda la serie; la expansión se materializa en el cliente.
- **Traslapes del calendario.** Se calculan con el espacio que un bloque ocupa
  en pantalla, no con su duración real.
- **Alta por pasos.** Verificar el código ya abre sesión, así que el alta queda
  marcada como pendiente hasta fijar la contraseña.
- **Cambio de contraseña.** Se reautentica antes de cambiarla, porque la API de
  Supabase no comprueba la actual.
- **Accesibilidad.** Estados anunciados, errores con región activa y etiquetas
  en controles que solo tienen icono.

## Sobre la diferencia con SonarQube

SonarQube reporta un porcentaje menor porque su métrica combina líneas y
condiciones en una sola cifra, mientras que Jest las informa por separado. Ambas
son correctas: miden cosas distintas. La cifra comparable con el objetivo del
80 % es la de sentencias y líneas de este reporte.

## Hallazgos

Escribir estas pruebas destapó dos defectos reales, ya corregidos:

1. **Falta de estado de error** en las pantallas de Disponibilidad y Compartir
   actividad: un fallo al cargar contactos dejaba la pantalla en blanco, sin
   explicación ni forma de reintentar (NFR-11).
2. **Detección de fallo de red incompleta** en la capa de datos: los errores de
   PostgREST llegan como objetos planos y no se reconocían como falta de
   conexión. Queda documentado en `services/supabase/__tests__/errors.test.ts`.

## Archivos

| Archivo | Uso |
|---|---|
| `cobertura/lcov-report/index.html` | Informe navegable, línea por línea |
| `cobertura/lcov.info` | Formato estándar; lo consume SonarQube |
| `cobertura/coverage-summary.json` | Datos crudos por archivo |
