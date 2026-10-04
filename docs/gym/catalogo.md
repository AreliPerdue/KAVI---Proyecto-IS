# Gym tracker · catálogo de ejercicios

530 ejercicios del sistema más los personalizados de cada persona (spec 07 v2, §4).

## De dónde sale

- **Fuente única:** `src/constants/exercise-catalog.ts`. `FAMILIES` agrupa por grupo muscular
  y familia; `buildCatalog()` infiere equipo, lateralidad y `tracking_type` del nombre y arma
  los alias.
- **Modo demo:** usa `buildCatalog()` directamente (`src/lib/gym/catalog.ts`).
- **Supabase:** la migración `20261004110000_exercise_catalog.sql` se **genera** con
  `pnpm db:seed-exercises` (`scripts/gen-exercise-seed.mjs`). Es un `upsert` por `slug` que
  solo toca filas del sistema (`created_by is null`).
- **Ids estables:** el id de un ejercicio del sistema es `uuidFrom('exercise:<slug>')`. Es el
  mismo en el demo, en la migración y en cualquier base, así que volver a sembrar no duplica.

**Para agregar o cambiar ejercicios:** edita `exercise-catalog.ts`, corre
`pnpm db:seed-exercises` y crea una migración nueva con el resultado (no edites una migración
ya aplicada). Nunca quites un ejercicio: puede estar referenciado por sesiones.

## Taxonomía

`MUSCLES` (músculos finos, p. ej. "Pecho superior"), `EQUIPMENT`, `PATTERNS` y
`TRACKING_TYPES` (`weight_reps`, `bodyweight_reps`, `weighted_bodyweight`,
`assisted_bodyweight`, por tiempo, por distancia…). El `tracking_type` decide qué columnas
muestra el logger (`columnsFor` en `src/lib/gym/sets.ts`) y cómo se calcula la carga
(`segmentLoadKg` en `volume.ts`).

Para el volumen semanal, los músculos finos se agrupan en 12 grupos (`MUSCLE_GROUPS` en
`src/lib/gym/muscles.ts`).

## Búsqueda

`src/lib/gym/search.ts`:

- Sin acentos ni mayúsculas (`normalizar`); busca en nombre en español, en inglés y en alias.
- Solo por **inicio de palabra**: "rdl" encuentra "Peso muerto rumano con barra (RDL)" y no "hurdle".
- El índice se arma una vez por catálogo (`buildSearchIndex`), no en cada tecla.
- `isExactExercise` evita ofrecer "crear" algo que ya existe con otro nombre o alias.

El selector (`src/components/fitness/exercise-picker.tsx`) es una lista virtualizada con
filtros por músculo y equipo, favoritos, recientes y "Crear ejercicio".

## Personalizados

Slug `custom-<uuid>`, `created_by` = la persona; solo ella los ve. Se pueden editar y
archivar (`archived_at`); archivar los oculta del selector sin romper el historial.

## Texto de v1

Las sesiones de v1 guardaban "4 × 8/8/6/6 · 80 kg" como texto. Al abrir Fitness, la conversión
(`useLegacyConversion`, `src/lib/gym/legacy.ts`) intenta ligar el nombre al catálogo
(`matchCatalog`) y crear series estructuradas. Si el texto es ambiguo, no adivina: el ejercicio
se queda con su texto original visible y una nota de por qué. Las series creadas así llevan
`from_legacy = true`, y el texto de v1 nunca se borra.
