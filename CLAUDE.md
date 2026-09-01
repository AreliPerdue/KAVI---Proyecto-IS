# CLAUDE.md — KAVI

Guía de trabajo para Claude Code. Este proyecto se desarrolla con **Spec-Driven Development (SDD)**: las specs mandan, el código las implementa.

## Qué es KAVI
App multiplataforma (iOS, Android, web) de planificación personal. El **calendario es la estrella**: todo se gestiona desde él. Las actividades se clasifican con temas predefinidos ligados a las 7 dimensiones del bienestar. Incluye calendario compartido con reminders compartidos y un mini gym tracker accesible desde actividades de gimnasio.

## Stack (no negociable)
- React Native + **Expo SDK 57** + **Expo Router** (file-based routing)
- TypeScript en modo `strict`
- **Supabase**: Auth, PostgreSQL, Row Level Security, Realtime
- Expo Notifications para reminders (notificaciones locales programadas)
- Idioma de la UI: **español**

## Flujo SDD obligatorio
1. Lee `specs/00-constitution.md` (principios) antes de cualquier cambio.
2. Cada feature tiene su spec en `specs/`. **Nunca implementes algo que no esté en una spec.** Si falta, propón primero la actualización de la spec.
3. `plan.md` define la arquitectura y decisiones técnicas. Respétalo.
4. `tasks.md` es la fuente de verdad del avance:
   - Trabaja las tareas **en orden**, respetando dependencias.
   - Marca `[x]` al completar cada tarea en el mismo commit.
   - Una tarea = un cambio pequeño y verificable.
5. Cada tarea termina cuando cumple los **criterios de aceptación** de su spec (formato Given/When/Then).

## Reglas de implementación
- Toda tabla nueva lleva políticas RLS desde su creación (ver `specs/02-data-model.md`). Nunca desactives RLS.
- Acceso a datos solo a través de la capa `src/services/` — nunca llamadas a Supabase directamente desde componentes.
- Componentes de UI en `src/components/`, pantallas (rutas Expo Router) en `src/app/` — en SDK 57 `src/app/` tiene precedencia sobre `app/` raíz; este repo usa `src/app/`.
- Fechas: guardar siempre en UTC (`timestamptz`); mostrar en zona local con `date-fns`.
- Sin secretos en el repo: credenciales en `.env` (usar `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`), `.env` en `.gitignore`.
- Commits pequeños y frecuentes con prefijo de tarea: `[T042] Crear vista semanal`.
- Al terminar una fase de `tasks.md`, ejecuta las pruebas de esa fase y valida en las 3 plataformas cuando aplique.

## Skills obligatorias (reglas de desarrollo y diseño)
Antes de escribir código aplica las skills del proyecto en `.claude/skills/`:
- **`kavi-dev`** — reglas de ingeniería (capas, TypeScript, Supabase, React Native/Expo). Sintetiza `vercel-react-native-skills`.
- **`kavi-design`** — sistema de diseño, tokens, patrones de pantalla, redacción es-MX, accesibilidad y checklist de entrega UI. Sintetiza `frontend-design` y `ui-ux-pro-max`.
Las tres skills de origen (`ui-ux-pro-max`, `vercel-react-native-skills`, `frontend-design`) siguen disponibles para consultas puntuales; `kavi-dev`/`kavi-design` son la regla vigente y ya adaptada a KAVI. Toda tarea con UI cierra con el checklist de `kavi-design`; toda tarea cierra con el checklist de `kavi-dev`.

## Estructura del repo (objetivo)
```
kavi/
├── src/
│   ├── app/              # rutas Expo Router: (auth), (app)
│   ├── components/       # UI reutilizable (ui/, calendar/)
│   ├── services/         # acceso a Supabase (auth, activities, shares, workouts…)
│   ├── hooks/
│   ├── lib/              # supabase client, fechas, notificaciones
│   ├── constants/        # dimensiones, temas predefinidos, colores
│   └── types/            # tipos TS (generados de la BD cuando sea posible)
├── supabase/
│   └── migrations/       # SQL versionado (esquema + RLS + seeds)
├── specs/                # ESTE directorio manda
├── plan.md
└── tasks.md
```

## Modo demo (frontend sin backend)
`.env` con `EXPO_PUBLIC_DEMO_MODE=true` activa el backend en memoria (`src/services/demo/`). Cuenta: `demo@kavi.app` / `demo1234`. Toda función nueva de datos se implementa en Supabase y en demo (ver skill `kavi-dev`).

## Comandos
- `npx expo start` — desarrollo
- `pnpm typecheck` (= `npx tsc --noEmit`) — verificación de tipos (correr antes de marcar una tarea)
- `npx expo start --web` — validar web

## Prioridades cuando haya conflicto
1. Constitution → 2. Spec de la feature → 3. plan.md → 4. Preferencia del desarrollador. Si una decisión contradice una spec, detente y pregunta.
