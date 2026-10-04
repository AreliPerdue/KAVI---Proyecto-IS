# Gym tracker (Fitness v2)

El módulo de fitness de KAVI después del upgrade de octubre de 2026 (tareas T238 – T248). La
spec que manda es `specs/07-fitness.md`; aquí está lo que hace falta para trabajar en él.

| Documento | Para qué |
|---|---|
| [modelo-de-datos.md](modelo-de-datos.md) | Tablas, RLS, borrado suave, cola local |
| [catalogo.md](catalogo.md) | Los 530 ejercicios, cómo se generan y cómo se busca |
| [intensificadores.md](intensificadores.md) | Cómo se registra cada intensificador, agrupación y protocolo |
| [AUDITORIA.md](AUDITORIA.md) | Punto de partida, decisiones D1–D9 y plan por fases |

## Qué hay, por fase

| Fase | Tarea | Qué entrega |
|---|---|---|
| G1 | T238 – T241 | Modelo de datos v2 con RLS por dueño heredado |
| G2 | T242 | Catálogo de 530 ejercicios, buscador sin acentos, personalizados |
| G3 | T243 | Logger en vivo: series prellenadas, ✓ en dos toques, timer de descanso, cola local |
| G4 | T244 | Edición de sesiones pasadas con deshacer/rehacer y recálculo de PRs |
| G5 | T245 | 24 intensificadores, agrupaciones (superserie, circuito…) y 14 protocolos |
| G6 | T246 | Notas en sesión, ejercicio y serie; nota fija; búsqueda de notas |
| G7 | T247 | Modo Gymrat: trato, microcopy, PRs, logros, Racha de Hierro, resumen, Progreso |
| G8 | T248 | Háptico real, sonido de timers, resumen como imagen, accesibilidad, docs |

## Mapa del código

```
src/app/(app)/workout/[id].tsx     logger: en vivo, lectura y edición en una pantalla
src/app/(app)/exercise/[id].tsx    detalle de un ejercicio: mejor serie, gráficas, nota fija
src/app/(app)/progress.tsx         racha, calendario de entrenos, series por músculo, logros
src/app/(app)/(tabs)/fitness.tsx   historial, sesión en curso, racha, búsqueda de notas
src/components/fitness/            bloques, hojas (teclado, notas, intensificadores…), resumen
src/lib/gym/                       lógica pura: volumen, e1RM, PRs, series, racha, logros…
src/constants/                     exercise-catalog, intensifiers, gym-notes, gymrat
src/hooks/                         use-workouts, use-set-sync, use-exercise-history, use-gym-progress…
src/services/{supabase,demo}/      workouts.ts, exercises.ts (mismo contrato en los dos)
src/store/gym-store.ts             preferencias por dispositivo y timer de descanso
```

## Migraciones

Todas ya están aplicadas en producción (4 oct de 2026). Una base nueva las necesita en orden:

1. `20261004100000_gym_v2.sql`: esquema, triggers, RLS.
2. `20261004110000_exercise_catalog.sql`: siembra del catálogo (generada).

Se aplican con la CLI de Supabase: `supabase migration list`, `supabase db push --dry-run` y
`supabase db push`.

## Dependencias nativas (G8)

`expo-haptics`, `expo-audio`, `expo-sharing` y `react-native-view-shot`: gratuitas, las tres
primeras oficiales de Expo. **Piden recompilar la app nativa** (EAS build o `npx expo run:*`);
Expo Go y web funcionan sin recompilar. `expo-audio` está configurado sin micrófono y sin
reproducción en segundo plano: solo reproduce los pitidos de `assets/sounds/`.

## Cómo probarlo

**En el demo:** `.env` con `EXPO_PUBLIC_DEMO_MODE=true`, `npx expo start --web`, cuenta
`demo@kavi.app` / `demo1234`. El demo trae dos sesiones de v1 (una de hace una semana y otra
de hace tres), así que la racha y la conversión del texto viejo se ven desde el inicio.

**Recorrido corto:**
1. Fitness → Entrenamiento libre → Ejercicio → "banca".
2. Toca el peso, escribe 100 y luego las reps. Toca ✓: corre el descanso, con pitidos en 3-2-1.
3. Menú de la serie (toca el número): intensificador, detalles, nota y etiquetas.
4. Menú del ejercicio (⋯): nota de hoy, nota fija, agrupar, protocolo.
   Mantener presionado el número de una serie y arrastrar la cambia de lugar; "Reordenar
   ejercicios" abre una lista corta para arrastrar ejercicios.
5. Terminar sesión: resumen con equivalencia, músculos y logros, y "Compartir" como imagen.
6. Fitness → fila de la racha → Progreso.
7. Perfil → Gimnasio: unidad, esfuerzo, fórmula, descanso, sonido, Modo serio y trato.

Para ver la pausa de la racha hace falta una semana terminada sin entreno. En el navegador se
puede adelantar el reloj (Playwright: `page.clock.setSystemTime`).

## Pendientes

- **Pruebas automáticas.** Por decisión (D8) se pospusieron; la lista por fase está en
  `reports/pruebas-pendientes.md`. Antes de correr Jest hay que agregar mocks de
  `expo-haptics`, `expo-audio`, `expo-sharing` y `react-native-view-shot` en `jest.setup.js`.
- **iOS:** la app está hecha y probada en simulador; falta la cuenta de Apple Developer para
  distribuirla.

## Ideas para después

Plantillas de rutina (D9 las dejó fuera), mapa corporal en el resumen, progresión sugerida
("sube 2.5 kg") a partir de RIR, exportar historial a CSV y comparar dos sesiones lado a lado.
