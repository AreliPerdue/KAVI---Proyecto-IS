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
pnpm test                   # las 1 287 pruebas (~20 s)
pnpm test:watch             # las vuelve a correr al guardar, mientras desarrollas
pnpm test:coverage          # además mide la cobertura y la escribe en reports/pruebas/
pnpm test:listado           # regenera reports/pruebas/Listado de pruebas.md
```

Solo una parte:

```bash
npx jest calendar                        # los archivos cuya ruta contenga "calendar"
npx jest -t "no envia sin contraseña"    # una prueba concreta por su nombre
```

### En CI

El workflow [**Pruebas**](.github/workflows/pruebas.yml) corre tipos, pruebas y lint
en cada push a `main` y en cada pull request, y **también a mano**: Actions →
*Pruebas* → *Run workflow*. Ahí se puede acotar a una parte con el campo *filtro*
(por ejemplo `calendar`), útil cuando solo hace falta comprobar una zona.

Los tres pasos siguen adelante aunque uno falle, para que una sola ejecución
enseñe todos los problemas de golpe. El resumen —cuántas pruebas pasaron, cuáles
se rompieron y con qué error, y la cobertura— aparece en la propia página de la
ejecución, sin tener que abrir los registros.

La cobertura tiene un suelo del 80 %: si baja de ahí, el build falla. Está en
`coverageThreshold`, en `jest.config.js`.

### Añadir una prueba

Basta crear el archivo; no hay que registrarlo en ningún sitio. Jest recoge todo
lo que encaje con `src/**/__tests__/**/*.test.ts(x)`, así que una prueba nueva
para `src/components/ui/button.tsx` va en
`src/components/ui/__tests__/button.test.tsx`. Las utilidades compartidas ya
montadas están en `jest.setup.js` (router, gestos, animaciones) y en
`src/hooks/__tests__/query-wrapper.tsx`.

## Modo demo
Con `EXPO_PUBLIC_DEMO_MODE=true` la app funciona sin backend con datos en memoria (se reinician al recargar).
- Entra con cualquier correo y una contraseña de 8+ caracteres, o con `demo@kavi.app` / `demo1234`.
- Cuentas seed para probar el compartido (misma contraseña): `ana@kavi.app`, `luis@kavi.app`, `maria@kavi.app`, `pedro@kavi.app`. Desde Perfil se cambia de cuenta con un toque.
- Deep links web: `/calendar?view=week&date=2026-09-07`, `/activity/new?date=…&start=…`.

## Base de datos (Supabase CLI)
```bash
pnpm db:migration nombre    # nueva migración en supabase/migrations/
pnpm db:reset               # recrea la BD local desde migraciones + seeds
pnpm db:push                # aplica migraciones al proyecto remoto
pnpm db:types               # regenera src/types/database.ts
```

## Manuales

- **[Manual de usuario](docs/manual-de-usuario.md)** — cómo se usa la app: cuenta, calendario, actividades, temas, compartido, recordatorios, gimnasio y modo demo.
- **[Manual técnico](docs/manual-tecnico.md)** — comandos y dónde escribirlos, cómo añadir una prueba, cómo funciona el pipeline, despliegue y las trampas que conviene no repetir.

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

## Licencia

**Todos los derechos reservados** — Copyright (c) 2026 Areli Perdue.

Este repositorio es públicamente visible por requisitos de las herramientas de
análisis de calidad y seguridad, lo que **no** concede ninguna licencia de uso.
Se permite leerlo, citarlo con atribución y clonarlo para evaluarlo; no se
permite reutilizarlo ni distribuirlo sin autorización escrita. Los términos
completos están en [`LICENSE`](LICENSE).

Las tipografías de marca (`assets/fonts/`) son de terceros y conservan su propia
licencia, SIL Open Font License 1.1: ver [`assets/fonts/OFL.txt`](assets/fonts/OFL.txt).
