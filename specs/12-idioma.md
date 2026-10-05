# Spec 12 — Idioma de la interfaz: español e inglés

Aprobada el 5 oct 2026 (T196). KAVI nació en español de México y sigue siéndolo por omisión para quien
tiene el teléfono en español; el inglés abre la app a quien no.

## Decisiones (5 oct 2026)

- **Por omisión, el idioma del teléfono o del navegador:** si está en español (cualquier variante), español;
  en cualquier otro idioma, inglés. Se puede fijar a mano en Perfil.
- **Inglés de EE. UU.** (`en-US`): fechas como "Mon, Oct 5", semana desde el lunes igual que en español.
- **Por fases:** (1) base y acceso, calendario, compartido, listas, perfil y navegación; (2) Fitness completo:
  glosario, catálogo de ejercicios, humor del gym; (3) aviso de privacidad, correos y notificaciones.
- **Aviso de privacidad en inglés como referencia:** se traduce, pero dice que la versión que vale es la de
  español, porque se emite conforme a la ley mexicana.

## Requerimientos funcionales

- RF-I1. **Elegir idioma.** Perfil → Presentación → "Idioma": Sistema · Español · English. "Sistema" sigue al
  teléfono (regla de arriba). Es una preferencia del dispositivo, como la apariencia.
- RF-I2. **Cambio inmediato.** Cambiar el idioma cambia toda la interfaz sin reiniciar la app ni perder lo que
  estaba abierto.
- RF-I3. **Fechas y horas en el idioma elegido.** Nombres de días y meses y el orden de la fecha siguen el
  idioma ("lun 5 oct" / "Mon, Oct 5"). El reloj de 12 o 24 h sigue siendo su propio ajuste; si la persona
  nunca lo eligió, en inglés arranca en 12 h y en español en 24 h.
- RF-I4. **Lo que escribe la persona no se traduce:** títulos de actividades, listas, notas, nombres de temas
  propios y de contactos se ven tal cual.
- RF-I5. **Lo que trae KAVI sí:** temas del sistema y dimensiones, nombres de ejercicios del catálogo,
  músculos, glosario, mensajes de error y estados vacíos. Lo que la base guarda en español (temas del sistema,
  catálogo) se traduce al mostrarlo, por su identificador; la base no cambia.
- RF-I6. **Lo que reciben otras personas va en el idioma de quien lo recibe** cuando KAVI lo sabe (correo al
  adulto, fase 3). Si no lo sabe, en español.
- RF-I7. **Accesibilidad:** las etiquetas para lector de pantalla se traducen igual que el texto visible.
- RF-I8. **Sin textos sueltos:** todo texto de interfaz vive en los diccionarios de `src/i18n/`. Un texto nuevo
  se agrega en los dos idiomas en el mismo cambio.

## Criterios de aceptación

- Given un teléfono en inglés y una instalación nueva, When abro KAVI, Then el inicio de sesión está en inglés.
- Given KAVI en español, When elijo "English" en Perfil, Then toda la pantalla cambia a inglés sin reiniciar,
  y el calendario dice "Mon", "Tue"… y "October 2026".
- Given una actividad que titulé "Gimnasio", When cambio a inglés, Then su título sigue siendo "Gimnasio",
  pero el tema del sistema "Ejercicio" se ve como "Exercise".
- Given que nunca elegí formato de hora, When cambio a inglés, Then las horas se ven en 12 h; When las fijo en
  24 h, Then se quedan en 24 h aunque cambie de idioma.

## Técnico

- Diccionarios propios en TypeScript, sin librería: `src/i18n/es/*.ts` manda y `en/*.ts` tiene el tipo de
  español, así que un texto que falte en inglés no compila. Los textos con datos o plurales son funciones
  (`(n) => …`), lo que evita depender de `Intl.PluralRules`, que el motor del teléfono puede no traer.
  `useT()` en componentes (se repinta al cambiar el idioma) y `t()` fuera de React. Detección con `Intl`
  (sin módulo nativo, no pide recompilar).
- `lib/dates.ts` toma el locale de `date-fns` del idioma activo.
- La redacción en español sigue `kavi-design` §4; en inglés, el mismo tono: directo, frases cortas, sin jerga.
