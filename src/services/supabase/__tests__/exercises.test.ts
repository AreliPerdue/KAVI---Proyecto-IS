/**
 * Catálogo contra Supabase (spec 07 v2, §4). Lo que no se ve en el esquema: los
 * personalizados llevan slug `custom-<id>` para no chocar con los del sistema, y guardar
 * preferencias manda solo el parche para no pisar la nota fija.
 */
import { fakeSupabase } from '@/services/supabase/__tests__/fake-supabase';

const mockSb = fakeSupabase();
jest.mock('@/lib/supabase', () => ({ getSupabase: () => mockSb.client }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras el mock */
const { supabaseExercises } = require('@/services/supabase/exercises') as typeof import('@/services/supabase/exercises');

beforeEach(() => {
  mockSb.llamadas.length = 0;
  mockSb.responder({ data: [], error: null });
});

it('lista sin filtrar por dueño: la RLS ya da sistema + propios', async () => {
  await supabaseExercises.list('u1');
  expect(mockSb.argsDe('eq')).toBeUndefined();
  expect(mockSb.llamadas).toContainEqual(['range', 0, 1999]);
});

it('crear un personalizado: dueño, slug custom-<id> y nombre limpio', async () => {
  mockSb.responder({ data: { id: 'x', slug: 'custom-x', name_es: 'Mi press', created_by: 'u1' }, error: null });
  await supabaseExercises.createCustom('u1', { name_es: '  Mi press ' });
  const fila = mockSb.argsDe('insert')?.[0] as { id: string; slug: string; name_es: string; created_by: string };
  expect(fila.slug).toBe(`custom-${fila.id}`);
  expect(fila.name_es).toBe('Mi press');
  expect(fila.created_by).toBe('u1');
});

it('archivar escribe archived_at', async () => {
  mockSb.responder({ data: { id: 'x' }, error: null });
  await supabaseExercises.updateCustom('x', { archived: true });
  expect((mockSb.argsDe('update')?.[0] as { archived_at: string }).archived_at).toEqual(expect.any(String));
});

it('guardar preferencias es un upsert de un solo objeto con el parche', async () => {
  mockSb.responder({ data: null, error: null });
  await supabaseExercises.savePrefs('u1', 'e1', { is_favorite: true });
  const upsert = mockSb.llamadas.find((l) => l[0] === 'upsert');
  expect(upsert?.[1]).toEqual({ owner_id: 'u1', exercise_id: 'e1', is_favorite: true });
  expect(upsert?.[2]).toEqual({ onConflict: 'owner_id,exercise_id' });
});

it('las preferencias se filtran por dueño', async () => {
  await supabaseExercises.listPrefs('u1');
  expect(mockSb.argsDe('eq')).toEqual(['owner_id', 'u1']);
});
