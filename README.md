# KAVI

App multiplataforma (iOS, Android y web) de planificación personal. El calendario es el centro: las actividades se clasifican con temas ligados a las 7 dimensiones del bienestar, se comparten con contactos (con reminders compartidos) y las de gimnasio abren un mini gym tracker.

Stack: Expo SDK 57 · Expo Router · TypeScript strict · Supabase (Auth, Postgres, RLS, Realtime) · TanStack Query · Zustand · date-fns.

## Empezar
```bash
pnpm install
cp .env.example .env        # por defecto EXPO_PUBLIC_DEMO_MODE=true (sin backend, cuenta demo@kavi.app / demo1234)
                            # para Supabase: DEMO_MODE=false + EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY
pnpm start                  # Expo dev server (i = iOS, a = Android, w = web)
pnpm ios / pnpm android     # recompila la app nativa (necesario tras instalar módulos nativos)
```

## Verificación
```bash
pnpm typecheck              # tsc --noEmit — debe quedar limpio antes de marcar una tarea
pnpm lint                   # expo lint
```
`pnpm typecheck` se ejecuta además en CI (`.github/workflows/typecheck.yml`) en cada push y PR.

## Base de datos (Supabase CLI)
```bash
pnpm db:migration nombre    # nueva migración en supabase/migrations/
pnpm db:reset               # recrea la BD local desde migraciones + seeds
pnpm db:push                # aplica migraciones al proyecto remoto
pnpm db:types               # regenera src/types/database.ts
```

## Desarrollo guiado por specs (SDD)
- `CLAUDE.md` — reglas de trabajo para Claude Code (leer primero)
- `specs/00-constitution.md` — principios del proyecto
- `specs/01`…`08` — visión, modelo de datos, auth, calendario, temas, compartido, fitness y NFR
- `plan.md` — arquitectura y decisiones técnicas
- `tasks.md` — tareas por fase con dependencias e hitos (fuente de verdad del avance)
- `.claude/skills/kavi-dev` y `.claude/skills/kavi-design` — reglas de ingeniería y de diseño

## Estructura
```
src/app/          rutas Expo Router: (auth), (app)
src/components/   ui/ (primitivas del sistema de diseño), calendar/
src/services/     único acceso a Supabase
src/hooks/        hooks con TanStack Query
src/lib/          supabase client, fechas, notificaciones
src/constants/    tokens de diseño, dimensiones, temas
src/providers/    AuthProvider
src/types/        database.ts generado
supabase/         config.toml y migrations/
```
