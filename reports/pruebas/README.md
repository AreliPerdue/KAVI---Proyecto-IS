# Reporte de pruebas unitarias

**Framework:** Jest 30 con el preset `jest-expo` y `@testing-library/react-native`
**Fecha:** 23 de septiembre de 2026
**Comando:** `pnpm test:coverage`
**Ejecución en CI:** [workflow "Pruebas"](../../.github/workflows/pruebas.yml)

## Resultado

**1 530 pruebas en 90 archivos, todas en verde.**

| Métrica | Cobertura | |
|---|---|---|
| **Sentencias** | **84.08 %** | 3180 / 3782 |
| **Líneas** | **85.48 %** | 2720 / 3182 |
| Ramas | 78.47 % | 2162 / 2755 |
| Funciones | 79.07 % | 1058 / 1338 |

Se cumple el objetivo del 80 % en todas las métricas de referencia. La cifra que
SonarQube publica en portada combina líneas y condiciones en un solo número y también
queda por encima del objetivo.

## Versión sin tecnicismos

Si lo que interesa es **qué se verificó** y no cómo, [`Listado de pruebas.md`](Listado%20de%20pruebas.md)
recorre las 1 530 pruebas una por una, agrupadas por zona de la aplicación y
explicadas en lenguaje llano.

## Por capa

| Capa | Cobertura | Sentencias |
|---|---|---|
| `src/services` | 88 % | 1029 / 1171 |
| `src/app` | 75 % | 741 / 982 |
| `src/components` | 89 % | 693 / 780 |
| `src/lib` | 87 % | 292 / 337 |
| `src/hooks` | 74 % | 231 / 314 |
| `src/providers` | 99 % | 78 / 79 |
| `src/constants` | 100 % | 73 / 73 |
| `src/store` | 93 % | 43 / 46 |

## Qué se prueba

Las pruebas no verifican que el código haga lo que hace, sino las reglas de
negocio que no se ven leyéndolo:

- **Privacidad de la disponibilidad.** Quien comparte su calendario en modo
  `busy` cede sus horas ocupadas, nunca el título ni el color (P4).
- **Cascadas de permisos.** Eliminar un contacto revoca calendarios compartidos,
  invitaciones a actividades, colores y copias de recordatorios.
- **Recurrencia.** Editar o eliminar una actividad recurrente distingue entre
  esta ocurrencia y toda la serie; una regla semanal nunca se queda sin días.
- **Las dos representaciones del tiempo.** La base guarda instantes en UTC y el
  formulario trabaja en hora local: se prueban los cruces de medianoche, las
  actividades de todo el día y las que empiezan a las 23:50.
- **Traslapes del calendario.** Se calculan con el espacio que un bloque ocupa
  en pantalla, no con su duración real.
- **Alta por pasos.** Verificar el código ya abre sesión, así que el alta queda
  marcada como pendiente hasta fijar la contraseña.
- **Cambio de contraseña.** Se reautentica antes de cambiarla, porque la API de
  Supabase no comprueba la actual.
- **Accesibilidad.** Estados anunciados, errores con región activa y etiquetas
  en controles que solo tienen icono.

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
