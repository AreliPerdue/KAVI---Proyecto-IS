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

## Backend Supabase

El esquema vive en `supabase/migrations/` (9 migraciones). Todo por consola:

```bash
npx supabase login                                  # una vez, abre el navegador
npx supabase link --project-ref evoroilcnsaciusotnqh # pide la contraseña de la BD
pnpm db:push                                        # aplica las migraciones
```

A partir del `link`, cada migración nueva se sube solo con `pnpm db:push`.

Sin `login`/`link`, en un comando (la cadena está en Project Settings → Database →
Connection string → URI, con la contraseña ya dentro):

```bash
npx supabase db push --db-url "postgresql://postgres.evoroilcnsaciusotnqh:CONTRASENA@aws-0-REGION.pooler.supabase.com:6543/postgres"
```

Añade `--dry-run` para ver qué aplicaría sin tocar nada.

### Pruebas de RLS
`supabase/tests/rls.sql` verifica con tres usuarios que nadie ve lo ajeno, que la
visibilidad `busy` no expone filas, que los recordatorios compartidos se silencian por
separado y que el rol admin no da acceso a contenido:

```bash
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql
```

Si termina sin error, pasó. No deja datos: borra sus cuentas de prueba al final.

### Modo administrador
Regístrate en la app y luego, por consola:

```bash
psql "$DB_URL" -c "update public.profiles set role='adminkavi' \
  where id=(select id from auth.users where email='tu-correo@ejemplo.com');"
```

El panel aparece en Perfil → Administración. Ver `specs/09-admin.md`.

## Verificación
```bash
pnpm typecheck              # tsc --noEmit — debe quedar limpio antes de marcar una tarea
pnpm lint                   # expo lint (ESLint + reglas de React Compiler)
```

## Modo demo
Con `EXPO_PUBLIC_DEMO_MODE=true` la app funciona sin backend con datos en memoria (se reinician al recargar).
- Entra con cualquier correo y una contraseña de 8+ caracteres, o con `demo@kavi.app` / `demo1234`.
- Cuentas seed para probar el compartido (misma contraseña): `ana@kavi.app`, `luis@kavi.app`, `maria@kavi.app`, `pedro@kavi.app`. Desde Perfil se cambia de cuenta con un toque.
- Deep links web: `/calendar?view=week&date=2026-09-07`, `/activity/new?date=…&start=…`.
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
