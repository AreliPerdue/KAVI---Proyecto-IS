/**
 * Genera la migración que siembra el catálogo de ejercicios del sistema (spec 07 v2, RF-F20).
 *
 *   pnpm db:seed-exercises   (node scripts/gen-exercise-seed.mjs)
 *
 * La fuente es `src/constants/exercise-catalog.ts`, la misma que usa el modo demo, así que
 * las dos versiones del catálogo no se pueden separar. Una prueba (exercise-seed.test.ts)
 * falla si alguien cambia el catálogo y no vuelve a generar este archivo.
 *
 * El id de cada ejercicio se deriva de su slug (`uuidFrom`): es el mismo en el demo, en esta
 * migración y en cualquier base donde se corra, y volver a sembrar es un upsert, no un
 * duplicado. Es JavaScript para que `tsc` no lo revise; los dos archivos que importa son
 * TypeScript sin dependencias, y Node 22 les quita los tipos al cargarlos.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCatalog } from '../src/constants/exercise-catalog.ts';
import { uuidFrom } from '../src/lib/gym/ids.ts';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEED_FILE = 'supabase/migrations/20261004110000_exercise_catalog.sql';

const texto = (v) => (v === null ? 'null' : `'${v.replace(/'/g, "''")}'`);
const arreglo = (xs) => (xs.length === 0 ? `'{}'::text[]` : `array[${xs.map(texto).join(', ')}]::text[]`);

const catalogo = buildCatalog();
const filas = catalogo.map((e) =>
  `  (${[
    texto(uuidFrom(`exercise:${e.slug}`)),
    texto(e.slug),
    texto(e.name_es),
    texto(e.name_en),
    arreglo(e.aliases),
    texto(e.family),
    arreglo(e.primary_muscles),
    arreglo(e.secondary_muscles),
    arreglo(e.equipment),
    texto(e.movement_pattern),
    texto(e.mechanic),
    texto(e.laterality),
    texto(e.tracking_type),
  ].join(', ')})`,
);

const sql = `-- T242 · Spec 07 v2 (RF-F20, RF-F21) — Catálogo de ejercicios del sistema
--
-- GENERADO por \`pnpm db:seed-exercises\` desde src/constants/exercise-catalog.ts.
-- No se edita a mano: se cambia el catálogo y se vuelve a generar.
--
-- ${catalogo.length} ejercicios. Upsert por \`slug\`: correrla otra vez actualiza los nombres, alias y
-- músculos sin duplicar nada. Solo toca filas del sistema (\`created_by is null\`): un
-- ejercicio personalizado nunca se pisa.

insert into public.exercises
  (id, slug, name_es, name_en, aliases, family, primary_muscles, secondary_muscles, equipment, movement_pattern, mechanic, laterality, tracking_type)
values
${filas.join(',\n')}
on conflict (slug) do update set
  name_es = excluded.name_es,
  name_en = excluded.name_en,
  aliases = excluded.aliases,
  family = excluded.family,
  primary_muscles = excluded.primary_muscles,
  secondary_muscles = excluded.secondary_muscles,
  equipment = excluded.equipment,
  movement_pattern = excluded.movement_pattern,
  mechanic = excluded.mechanic,
  laterality = excluded.laterality,
  tracking_type = excluded.tracking_type
where public.exercises.created_by is null;
`;

writeFileSync(join(RAIZ, SEED_FILE), sql);
console.log(`${SEED_FILE}: ${catalogo.length} ejercicios`);
