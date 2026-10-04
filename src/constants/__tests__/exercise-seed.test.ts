/**
 * La migración del catálogo es generada (`pnpm db:seed-exercises`). Si alguien cambia el
 * catálogo y no la vuelve a generar, demo y producción tendrían catálogos distintos sin
 * que nadie lo note. Esta prueba lo nota.
 */

import { buildCatalog } from '@/constants/exercise-catalog';
import { uuidFrom } from '@/lib/gym/ids';

// `fs` solo existe al correr en Jest (Node). El proyecto no trae los tipos de Node a propósito
// —la app no corre en Node—, así que aquí se declara lo poco que se usa.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { readFileSync } = require('fs') as { readFileSync: (ruta: string, codificacion: 'utf8') => string };
declare const __dirname: string;

const sql = readFileSync(`${__dirname}/../../../supabase/migrations/20261004110000_exercise_catalog.sql`, 'utf8');
const catalogo = buildCatalog();

describe('migración del catálogo', () => {
  it('tiene una fila por ejercicio, ni más ni menos', () => {
    const filas = sql.split('\n').filter((l: string) => /^ {2}\('[0-9a-f-]{36}', /.test(l));
    expect(filas).toHaveLength(catalogo.length);
  });

  it('cada ejercicio va con su slug, su nombre y el id derivado del slug', () => {
    const faltan = catalogo.filter((e) => {
      const fila = `('${uuidFrom(`exercise:${e.slug}`)}', '${e.slug}', '${e.name_es.replace(/'/g, "''")}'`;
      return !sql.includes(fila);
    });
    expect(faltan.map((e) => e.slug)).toEqual([]);
  });

  it('es un upsert que no pisa ejercicios personalizados', () => {
    expect(sql).toContain('on conflict (slug) do update set');
    expect(sql).toContain('where public.exercises.created_by is null');
  });
});
